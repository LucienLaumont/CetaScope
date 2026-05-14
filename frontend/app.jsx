// CetaScope — main App orchestrator (real API)
//
// Differences vs the design's mock-data version:
//   • Species / zones load asynchronously from GET /species and GET /zones.
//   • Each user question becomes a POST /chat call (see bot.js).
//   • Title strings for chat thumbnails / viz header are derived from the
//     enriched response (_species / _zone / _years), with graceful fallbacks
//     when those refs are missing.

(function () {
  const { useState, useMemo, useCallback, useEffect } = React;
  const { useTweaks } = window;

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "mapStyle": "minimal"
  }/*EDITMODE-END*/;

  function App() {
    const [tweaks] = useTweaks(TWEAK_DEFAULTS);

    // ----- Async bootstrap: species + zones -----
    const [species, setSpecies] = useState([]);
    const [zones, setZones] = useState([]);
    const [bootLoading, setBootLoading] = useState(true);
    const [bootError, setBootError] = useState(null);

    useEffect(() => {
      let cancelled = false;
      Promise.all([
        window.CETA.api.loadSpecies(100),
        window.CETA.api.loadZones(),
      ]).then(([sp, zn]) => {
        if (cancelled) return;
        setSpecies(sp);
        setZones(zn);
        // Cache species dir for bot.js enrichments (top_species)
        window.CETA._speciesDir = new Map(sp.map(s => [s.id, s]));
        setBootLoading(false);
      }).catch(err => {
        if (cancelled) return;
        console.error('CetaScope boot failed', err);
        setBootError(err.message || String(err));
        setBootLoading(false);
      });
      return () => { cancelled = true; };
    }, []);

    // ----- Chat state -----
    const [history, setHistory] = useState([]);
    const [activeMsgId, setActiveMsgId] = useState(null);
    const [activeViz, setActiveViz] = useState(null);
    const [isTyping, setIsTyping] = useState(false);

    const totals = useMemo(() => ({
      observations: species.reduce((s, sp) => s + (sp.observation_count || 0), 0),
      species: species.length,
    }), [species]);

    const suggestions = window.CETA_BOT.defaultSuggestions;

    const send = useCallback(async (query) => {
      const id = Date.now();
      setHistory(h => [...h, { id, role: 'user', text: query }]);
      setIsTyping(true);

      const resp = await window.CETA_BOT.resolve(query);
      const botId = id + 1;

      let vizMeta = null;
      if (resp.type !== 'text') {
        let title = '';
        let count = null;
        if (resp.type === 'map') {
          title = resp._species
            ? `Observations ${window.CETA.withDeForPlural(resp._species)}`
            : 'Observations';
          count = resp.data?.features?.length || 0;
        } else if (resp.type === 'time_series') {
          title = resp._species ? `Évolution — ${resp._species.common_name_fr}` : 'Évolution annuelle';
        } else if (resp.type === 'profile') {
          title = `Fiche — ${resp.data?.common_name_fr || resp.data?.scientific_name || 'Espèce'}`;
        } else if (resp.type === 'top_species') {
          title = `Top espèces${resp._zone ? ' · ' + resp._zone.name_fr : ''}`;
        } else if (resp.type === 'choropleth') {
          title = resp._zone?.name_fr || resp.data?.name_fr || 'Zone';
        } else if (resp.type === 'conservation') {
          title = resp._species ? `IUCN — ${resp._species.common_name_fr}` : 'Historique IUCN';
        }
        vizMeta = { type: resp.type, title, count };
      }

      setHistory(h => [...h, {
        id: botId, role: 'bot', text: resp.message,
        viz: vizMeta,
        _full: resp,
      }]);

      if (resp.type !== 'text') {
        setActiveViz(resp);
        setActiveMsgId(botId);
      }
      setIsTyping(false);
    }, []);

    const onSelectMessage = useCallback((msgId) => {
      const msg = history.find(m => m.id === msgId);
      if (!msg || !msg._full || msg._full.type === 'text') return;
      setActiveViz(msg._full);
      setActiveMsgId(msgId);
    }, [history]);

    const onClear = useCallback(() => {
      setHistory([]); setActiveViz(null); setActiveMsgId(null);
    }, []);

    const onReset = onClear;

    // ----- Navigation across past viz -----
    const vizMessages = useMemo(() =>
      history.filter(m => m.role === 'bot' && m._full && m._full.type !== 'text'),
      [history]);

    const activeIndex = activeMsgId
      ? vizMessages.findIndex(m => m.id === activeMsgId)
      : -1;

    const canGoPrev = activeIndex > 0 || (activeIndex === -1 && vizMessages.length > 0);
    const canGoNext = activeIndex >= 0 && activeIndex < vizMessages.length - 1;

    const onPrev = useCallback(() => {
      if (activeIndex > 0) {
        const m = vizMessages[activeIndex - 1];
        setActiveViz(m._full); setActiveMsgId(m.id);
      } else if (activeIndex === -1 && vizMessages.length > 0) {
        const m = vizMessages[vizMessages.length - 1];
        setActiveViz(m._full); setActiveMsgId(m.id);
      }
    }, [activeIndex, vizMessages]);

    const onNext = useCallback(() => {
      if (activeIndex >= 0 && activeIndex < vizMessages.length - 1) {
        const m = vizMessages[activeIndex + 1];
        setActiveViz(m._full); setActiveMsgId(m.id);
      }
    }, [activeIndex, vizMessages]);

    const onGoHome = useCallback(() => {
      setActiveViz(null); setActiveMsgId(null);
    }, []);

    // Keyboard shortcuts
    useEffect(() => {
      function onKey(e) {
        const t = e.target;
        if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT' || t.isContentEditable)) return;
        if (e.key === 'ArrowLeft' && canGoPrev) { e.preventDefault(); onPrev(); }
        else if (e.key === 'ArrowRight' && canGoNext) { e.preventDefault(); onNext(); }
        else if (e.key === 'Escape' && activeViz) { e.preventDefault(); onGoHome(); }
      }
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }, [onPrev, onNext, onGoHome, canGoPrev, canGoNext, activeViz]);

    // Ask for a species' profile from the home grid
    const onAskSpecies = useCallback((sp) => {
      send(`Profil ${window.CETA.withDeArticle(sp)}`);
    }, [send]);

    const vizPaneContent = activeViz
      ? <VizPane viz={activeViz} mapStyle={tweaks.mapStyle} />
      : <window.Home
          species={species}
          loading={bootLoading}
          error={bootError}
          totals={totals}
          zonesCount={zones.length}
          onAskSpecies={onAskSpecies}
          onAskSuggestion={send}
        />;

    const navBar = (vizMessages.length > 0 || activeViz) && (
      <VizNavBar
        canGoPrev={canGoPrev} canGoNext={canGoNext}
        onPrev={onPrev} onNext={onNext} onHome={onGoHome}
        activeIndex={activeIndex} total={vizMessages.length}
        onAtHome={!activeViz}
        vizMessages={vizMessages}
        activeMsgId={activeMsgId}
        onJumpTo={onSelectMessage}
      />
    );

    return (
      <div className="app">
        <window.Header
          onReset={onReset}
          observationsTotal={totals.observations}
          speciesTotal={totals.species}
          apiOnline={!bootError}
        />

        <div className="workspace">
          <div className="viz-pane">
            {navBar}
            {vizPaneContent}
          </div>
          <window.ChatPanel
            history={history}
            onSend={send}
            suggestions={suggestions}
            isTyping={isTyping}
            activeMsgId={activeMsgId}
            onSelectMessage={onSelectMessage}
            onClear={onClear}
          />
        </div>
      </div>
    );
  }

  // ----- Viz nav bar -----
  function VizNavBar({
    canGoPrev, canGoNext, onPrev, onNext, onHome,
    activeIndex, total, onAtHome,
    vizMessages, activeMsgId, onJumpTo
  }) {
    return (
      <div className="viz-nav-bar">
        <div className="viz-nav-left">
          <button className="vnav-btn vnav-home" onClick={onHome} disabled={onAtHome} title="Vue d'accueil (Esc)">
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M2 7 L8 2 L14 7 V14 H10 V10 H6 V14 H2 Z" strokeLinejoin="round" />
            </svg>
            <span>Accueil</span>
          </button>
          <span className="vnav-divider"></span>
          <button className="vnav-btn vnav-icon" onClick={onPrev} disabled={!canGoPrev} title="Précédent (←)">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M10 3 L5 8 L10 13" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span className="vnav-counter">
            {activeIndex >= 0 ? `${activeIndex+1} / ${total}` : `— / ${total}`}
          </span>
          <button className="vnav-btn vnav-icon" onClick={onNext} disabled={!canGoNext} title="Suivant (→)">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M6 3 L11 8 L6 13" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {vizMessages.length > 1 && (
          <div className="viz-nav-trail">
            {vizMessages.map((m, i) => (
              <button
                key={m.id}
                className={`trail-dot trail-${m.viz?.type || 'text'}${m.id === activeMsgId ? ' active' : ''}`}
                onClick={() => onJumpTo(m.id)}
                title={`${i+1}. ${m.viz?.title || ''}`}
              >
                <span className="trail-dot-inner"></span>
              </button>
            ))}
          </div>
        )}

        <div className="viz-nav-hint">
          <kbd>←</kbd> <kbd>→</kbd> naviguer · <kbd>Esc</kbd> accueil
        </div>
      </div>
    );
  }

  // ----- Viz pane: header + body -----
  function VizPane({ viz, mapStyle }) {
    const { type, data, _species, _zone, _years } = viz;

    let title, sub, chips = [];
    switch (type) {
      case 'map':
        title = _species ? `Observations ${window.CETA.withDeForPlural(_species)}` : 'Observations de cétacés';
        sub = `${(data?.features?.length || 0).toLocaleString('fr-FR')} points`;
        if (_species) chips.push(<span className="chip" key="sp"><span style={{fontStyle:'italic'}}>{_species.scientific_name}</span></span>);
        if (_zone)    chips.push(<span className="chip" key="z">{_zone.name_fr}</span>);
        if (_years)   chips.push(<span className="chip chip-mono" key="y">{_years.min}{_years.max !== _years.min ? `–${_years.max}` : ''}</span>);
        break;
      case 'choropleth':
        title = "Densité d'observations";
        sub = _zone?.name_fr || data?.name_fr;
        break;
      case 'time_series':
        title = 'Évolution annuelle';
        sub = data && data.length
          ? `${data[0].year} – ${data[data.length-1].year}`
          : '';
        break;
      case 'profile':
        title = "Fiche d'espèce";
        sub = data?.scientific_name;
        break;
      case 'top_species':
        title = 'Espèces les plus observées';
        sub = _zone ? _zone.name_fr : 'Mondial';
        break;
      case 'conservation':
        title = 'Historique de conservation IUCN';
        sub = _species?.common_name_fr;
        break;
      default:
        title = 'Réponse'; sub = '';
    }

    return (
      <>
        <div className="viz-header">
          <div className="viz-header-titles">
            <div style={{
              fontFamily:'var(--mono)', fontSize:10, color:'var(--muted)',
              letterSpacing:'0.16em', textTransform:'uppercase', marginBottom:4
            }}>{vizKind(type)}</div>
            <h1>{title}</h1>
            {sub && <div className="sub"><span>{sub}</span></div>}
          </div>
          <div className="viz-chips">{chips}</div>
        </div>
        <div className="viz-body viz-fade-in" key={type + (_species?.id||'') + (_zone?.id||'') + (_years?.min||'')}>
          {type === 'map'         && <window.MapViz data={data} style={mapStyle} />}
          {type === 'choropleth'  && <window.ChoroplethViz data={data} style={mapStyle} />}
          {type === 'time_series' && <window.TimeSeriesViz data={data} species={_species} />}
          {type === 'profile'     && <window.ProfileViz data={data} />}
          {type === 'top_species' && <window.TopSpeciesViz data={data} zone={_zone} />}
          {type === 'conservation'&& <window.ConservationViz data={data} species={_species} />}
          {type === 'text'        && <window.TextViz message={viz.message} />}
        </div>
      </>
    );
  }

  function vizKind(t) {
    return ({
      map:"Carte d'observations", choropleth:'Carte de densité',
      time_series:'Série temporelle', profile:"Fiche d'espèce",
      top_species:'Classement', conservation:'Timeline IUCN', text:'Réponse textuelle'
    })[t] || t;
  }

  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(<App />);
})();
