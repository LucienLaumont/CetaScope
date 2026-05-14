// Header, Home (species grouped by family), Chat panel
//
// The Home component reads `species` from the App, which loads them
// asynchronously from GET /species. Cards are grouped client-side by
// genus → family-group lookup baked into api.js.

(function () {
  const { useState, useEffect, useRef } = React;

  // ---------- BrandMark — abstract cetacean silhouette ----------
  function BrandMark() {
    return (
      <svg className="brand-mark" viewBox="0 0 32 32" fill="none">
        <path
          d="M3 18 Q5 12 14 11 Q22 10 27 13 L29 10 L29 14 Q30 16 29 18 Q22 22 12 22 Q6 22 3 18 Z"
          fill="currentColor"
        />
        <circle cx="24" cy="14.5" r="0.9" fill="var(--paper)" />
        <path d="M2 24 Q12 21 16 24 Q20 27 30 24" stroke="currentColor" strokeWidth="0.9" fill="none" opacity="0.45" />
      </svg>
    );
  }

  // ---------- Header ----------
  function Header({ onReset, observationsTotal, speciesTotal, apiOnline }) {
    return (
      <header className="header">
        <button onClick={onReset} style={{
          background: 'none', border: 0, cursor: 'pointer', color: 'var(--ink)',
          display: 'flex', alignItems: 'center', gap: 10, padding: 0
        }}>
          <BrandMark />
          <span className="brand-name">Ceta<span className="lo">Scope</span></span>
        </button>
        <div className="header-right">
          <span style={{display:'flex',alignItems:'center',gap:6}}>
            <span className="dot" style={apiOnline ? {} : {background:'var(--coral)'}}></span>
            {apiOnline ? 'API en ligne' : 'API hors ligne'}
          </span>
          <span>
            {observationsTotal != null ? observationsTotal.toLocaleString('fr-FR') + ' observations' : '…'}
            {speciesTotal != null ? ` · ${speciesTotal} espèces` : ''}
          </span>
          <span style={{fontFamily:'var(--mono)',fontSize:11,opacity:0.7}}>v0.2 — OBIS</span>
        </div>
      </header>
    );
  }

  // ---------- Home (default state: species index by group) ----------
  function Home({ species, loading, error, totals, onAskSpecies, onAskSuggestion, zonesCount }) {
    const groups = window.CETA.groups;

    if (loading) {
      return (
        <div className="home viz-fade-in">
          <div className="home-hero">
            <div className="home-eyebrow">CetaScope · Chargement</div>
            <h1 className="home-h1 serif">
              <span style={{color:'var(--muted)'}}>Connexion à l'API en cours…</span>
            </h1>
            <p className="home-lede">
              <span className="loading-dot"></span>
              <span className="loading-dot"></span>
              <span className="loading-dot"></span>
            </p>
          </div>
        </div>
      );
    }
    if (error) {
      return (
        <div className="home viz-fade-in">
          <div className="home-hero">
            <div className="home-eyebrow" style={{color:'var(--coral)'}}>CetaScope · Erreur</div>
            <h1 className="home-h1 serif">
              Impossible de joindre l'API.
            </h1>
            <p className="home-lede">
              Vérifie que le backend FastAPI tourne sur <strong>{window.CETA.api.base || '(racine)'}</strong> et
              que cet hôte est autorisé dans la liste CORS.
              <br/><br/>
              <span style={{fontFamily:'var(--mono)',fontSize:13,color:'var(--coral)'}}>{String(error)}</span>
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="home viz-fade-in">
        <div className="home-hero">
          <div className="home-eyebrow">CetaScope · Cartographie scientifique</div>
          <h1 className="home-h1 serif">
            Une conversation avec l'océan,<br/>
            <span style={{color:'var(--muted)'}}>guidée par la donnée.</span>
          </h1>
          <p className="home-lede">
            Interroge en français une base de plus de <strong>{(totals?.observations || 0).toLocaleString('fr-FR')}</strong> observations
            scientifiques de cétacés issues d'<strong>OBIS</strong>,
            sur <strong>{totals?.species || species.length} espèces</strong>. Le chatbot transforme ta question
            en carte, courbe, fiche ou classement.
          </p>
          <div className="home-meta">
            <div className="home-meta-item">
              <div className="home-meta-num">{(totals?.observations || 0).toLocaleString('fr-FR')}</div>
              <div className="home-meta-label">Observations agrégées</div>
            </div>
            <div className="home-meta-item">
              <div className="home-meta-num">{totals?.species || species.length}</div>
              <div className="home-meta-label">Espèces de cétacés</div>
            </div>
            <div className="home-meta-item">
              <div className="home-meta-num">{zonesCount ?? '—'}</div>
              <div className="home-meta-label">Zones océaniques</div>
            </div>
            <div className="home-meta-item">
              <div className="home-meta-num">OBIS</div>
              <div className="home-meta-label">Source scientifique</div>
            </div>
          </div>
        </div>

        <div className="home-divider">
          <div className="home-section-eyebrow">Index des espèces · Cliquer pour ouvrir une fiche</div>
        </div>

        {groups.map(g => {
          const list = species.filter(sp => sp.group === g.id);
          if (!list.length) return null;
          // Sort by observation count desc within a group
          const sorted = [...list].sort((a, b) => (b.observation_count || 0) - (a.observation_count || 0));
          return (
            <section className="home-group" key={g.id}>
              <header className="home-group-head">
                <div className="home-group-label">
                  <h2>{g.label}</h2>
                  <div className="home-group-taxon">{g.taxon} · {list.length} espèce{list.length>1?'s':''}</div>
                </div>
                <p className="home-group-blurb">{g.blurb}</p>
              </header>
              <div className="home-group-grid">
                {sorted.map(sp => (
                  <SpeciesCard key={sp.id} sp={sp} onClick={() => onAskSpecies(sp)} />
                ))}
              </div>
            </section>
          );
        })}

        <div style={{ height: 48 }} />
      </div>
    );
  }

  function SpeciesCard({ sp, onClick }) {
    return (
      <div className="species-card" onClick={onClick}>
        <div className="species-card-illus">
          <svg viewBox="0 0 100 40" preserveAspectRatio="xMidYMid meet">
            <path className="silhouette" d={window.CETA.silhouette(sp.kind)} />
          </svg>
        </div>
        <div className="species-card-body">
          <div className="species-card-fr">{sp.common_name_fr}</div>
          <div className="species-card-sci">{sp.scientific_name}</div>
          <div className="species-card-foot">
            <span className={`iucn iucn-${sp.iucn}`}>
              <span className="iucn-dot"></span>{sp.iucn}
            </span>
            <span style={{fontFamily:'var(--mono)'}}>{(sp.observation_count || 0).toLocaleString('fr-FR')} obs.</span>
          </div>
        </div>
      </div>
    );
  }

  // ---------- Chat panel ----------
  function VizThumbIcon({ kind }) {
    const stroke = 'currentColor';
    switch (kind) {
      case 'map':
        return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5">
          <path d="M3 6 L9 4 L15 6 L21 4 V18 L15 20 L9 18 L3 20 Z"/>
          <line x1="9" y1="4" x2="9" y2="18"/><line x1="15" y1="6" x2="15" y2="20"/>
          <circle cx="12" cy="11" r="1.6" fill={stroke} stroke="none"/>
        </svg>;
      case 'time_series':
        return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5">
          <line x1="4" y1="20" x2="20" y2="20"/><line x1="4" y1="4" x2="4" y2="20"/>
          <rect x="6" y="12" width="2.4" height="8"/><rect x="10" y="9" width="2.4" height="11"/>
          <rect x="14" y="6" width="2.4" height="14"/><rect x="18" y="14" width="2.4" height="6"/>
        </svg>;
      case 'profile':
        return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5">
          <rect x="4" y="3" width="16" height="18" rx="1"/>
          <line x1="7" y1="8" x2="14" y2="8"/><line x1="7" y1="12" x2="17" y2="12"/>
          <line x1="7" y1="16" x2="15" y2="16"/>
        </svg>;
      case 'top_species':
        return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5">
          <rect x="4" y="6" width="13" height="2.4"/><rect x="4" y="11" width="10" height="2.4"/>
          <rect x="4" y="16" width="7" height="2.4"/>
        </svg>;
      case 'choropleth':
        return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5">
          <path d="M4 6 L9 4 L15 6 L20 4 V18 L15 20 L9 18 L4 20 Z"/>
          <path d="M9 4 L15 6 L15 20 L9 18 Z" fill={stroke} fillOpacity="0.25" stroke="none"/>
        </svg>;
      case 'conservation':
        return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5">
          <line x1="4" y1="12" x2="20" y2="12"/>
          <circle cx="7" cy="12" r="2"/><circle cx="12" cy="9" r="2"/><circle cx="17" cy="14" r="2"/>
        </svg>;
      default:
        return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="1.5">
          <circle cx="12" cy="12" r="9"/><circle cx="12" cy="8" r="0.6" fill={stroke}/>
          <line x1="12" y1="11" x2="12" y2="17"/>
        </svg>;
    }
  }
  const VIZ_LABELS = {
    map:"Carte d'observations", choropleth:'Densité par zone',
    time_series:'Série temporelle', profile:'Fiche espèce',
    top_species:'Classement', conservation:'Historique IUCN',
    text:'Réponse'
  };

  // Render bot text with **bold** support
  function FormattedText({ text }) {
    if (!text) return null;
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return <>{parts.map((p, i) =>
      p.startsWith('**') && p.endsWith('**')
        ? <strong key={i}>{p.slice(2, -2)}</strong>
        : <span key={i}>{p}</span>
    )}</>;
  }

  function ChatPanel({
    history, onSend, suggestions, isTyping,
    activeMsgId, onSelectMessage, onClear
  }) {
    const [input, setInput] = useState('');
    const taRef = useRef(null);
    const streamRef = useRef(null);

    useEffect(() => {
      if (streamRef.current) {
        streamRef.current.scrollTop = streamRef.current.scrollHeight;
      }
    }, [history, isTyping]);

    function submit() {
      const v = input.trim();
      if (!v) return;
      onSend(v);
      setInput('');
      if (taRef.current) taRef.current.style.height = 'auto';
    }

    function onKey(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submit();
      }
    }

    function autoGrow(e) {
      e.target.style.height = 'auto';
      e.target.style.height = Math.min(120, e.target.scrollHeight) + 'px';
      setInput(e.target.value);
    }

    return (
      <div className="chat-panel">
        <div className="chat-head">
          <div>
            <div className="title serif">Assistant CetaScope</div>
            <div className="sub">Pose ta question en français</div>
          </div>
          <div className="chat-head-actions">
            {history.length > 0 && (
              <button className="icon-btn" onClick={onClear} title="Effacer la conversation">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 4 L13 4"/><path d="M5 4 V2 H11 V4"/>
                  <path d="M4 4 L5 14 H11 L12 4"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="chat-stream" ref={streamRef}>
          {history.length === 0 && (
            <div style={{padding:'4px 4px 0'}}>
              <div className="eyebrow" style={{marginBottom:10}}>Pour commencer</div>
              <div style={{fontFamily:'var(--serif)', fontSize:15, color:'var(--ink-2)', lineHeight:1.55, marginBottom:14}}>
                Demande-moi des observations, le profil d'une espèce, une tendance,
                ou les statistiques d'une zone océanique.
              </div>
              <div className="suggestions">
                {suggestions.map(s => (
                  <button key={s} className="suggestion-chip" onClick={() => onSend(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {history.map(msg => (
            <React.Fragment key={msg.id}>
              {msg.role === 'user' ? (
                <div className="bubble user">
                  <div className="bubble-meta">Toi</div>
                  <div className="bubble-body">{msg.text}</div>
                </div>
              ) : (
                <div className="bubble bot">
                  <div className="bubble-meta">CetaScope</div>
                  <div className="bubble-body"><FormattedText text={msg.text} /></div>
                  {msg.viz && msg.viz.type !== 'text' && (
                    <div
                      className={`viz-thumb${activeMsgId === msg.id ? ' active' : ''}`}
                      onClick={() => onSelectMessage(msg.id)}
                    >
                      <span className="viz-thumb-icon"><VizThumbIcon kind={msg.viz.type} /></span>
                      <div className="viz-thumb-text">
                        <div className="t1">{msg.viz.title || VIZ_LABELS[msg.viz.type]}</div>
                        <div className="t2">{VIZ_LABELS[msg.viz.type]}{msg.viz.count ? ` · ${msg.viz.count.toLocaleString('fr-FR')} pts` : ''}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </React.Fragment>
          ))}

          {isTyping && (
            <div className="bubble bot">
              <div className="bubble-meta">CetaScope</div>
              <div className="bubble-body bot-typing">
                <span className="loading-dot"></span>
                <span className="loading-dot"></span>
                <span className="loading-dot"></span>
              </div>
            </div>
          )}
        </div>

        <div className="chat-input-wrap">
          {history.length > 0 && history.length < 8 && (
            <div className="suggestions">
              {suggestions.slice(0, 3).map(s => (
                <button key={s} className="suggestion-chip" onClick={() => onSend(s)}>{s}</button>
              ))}
            </div>
          )}
          <div className="chat-input">
            <textarea
              ref={taRef}
              rows="1"
              placeholder="Ex. observations d'orques dans l'Atlantique entre 2010 et 2020…"
              value={input}
              onChange={autoGrow}
              onKeyDown={onKey}
            />
            <button className="send-btn" onClick={submit} disabled={!input.trim()}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M3 8 H13 M9 4 L13 8 L9 12"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  window.Header = Header;
  window.Home = Home;
  window.ChatPanel = ChatPanel;
})();
