// Header, Home (species grouped by family), Chat panel
//
// The Home component reads `species` from the App, which loads them
// asynchronously from GET /species. Cards are grouped client-side by
// genus → family-group lookup baked into api.js.

(function () {
  const { useState, useEffect, useRef } = React;

  // ---------- BrandMark — custom logo image ----------
  function BrandMark() {
    return <img className="brand-mark" src="logo.png" alt="CetaScope" />;
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

  // Strip accents + lowercase — used by the home search bar to match species
  // names regardless of diacritics.
  function fold(s) {
    return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  // ---------- Home (default state: species index by group) ----------
  function Home({ species, loading, error, totals, onAskSpecies, onAskSuggestion, zonesCount }) {
    const groups = window.CETA.groups;
    const [search, setSearch] = useState('');
    const [expanded, setExpanded] = useState(() => new Set());
    const searchRef = useRef(null);

    function toggleGroup(id) {
      setExpanded(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
    function expandAll() {
      setExpanded(new Set(groups.map(g => g.id)));
    }
    function collapseAll() {
      setExpanded(new Set());
    }

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

        <div className="home-search-block">
          <div className="home-search-input-wrap">
            <svg className="home-search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="7" cy="7" r="4.5" />
              <line x1="10.5" y1="10.5" x2="14" y2="14" strokeLinecap="round" />
            </svg>
            <input
              ref={searchRef}
              type="text"
              className="home-search-input"
              placeholder="Rechercher une espèce — orque, baleine bleue, narval…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') setSearch(''); }}
            />
            {search && (
              <button
                type="button"
                className="home-search-clear"
                onClick={() => { setSearch(''); searchRef.current?.focus(); }}
                title="Effacer (Esc)"
              >
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 4 L12 12 M12 4 L4 12" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="home-index-bar">
          <div className="home-section-eyebrow">
            Index des espèces · {species.length} au total
          </div>
          <div className="home-index-actions">
            <button type="button" className="home-link-btn" onClick={expandAll}>Tout déplier</button>
            <span className="home-link-sep">·</span>
            <button type="button" className="home-link-btn" onClick={collapseAll}>Tout replier</button>
          </div>
        </div>

        {(() => {
          const q = fold(search.trim());
          const isSearching = q.length > 0;
          const matchSpecies = sp => {
            if (!isSearching) return true;
            return [sp.common_name_fr, sp.common_name_en, sp.scientific_name]
              .filter(Boolean)
              .some(f => fold(f).includes(q));
          };
          const groupedRows = groups.map(g => {
            const all = species.filter(sp => sp.group === g.id);
            const matched = all.filter(matchSpecies);
            return { ...g, all, matched };
          });
          const totalMatched = groupedRows.reduce((s, g) => s + g.matched.length, 0);

          if (isSearching && totalMatched === 0) {
            return (
              <div className="home-no-results">
                <h3 className="serif">Aucune espèce ne correspond à « {search} »</h3>
                <p>Essaie un autre nom — français, anglais ou scientifique.</p>
              </div>
            );
          }

          return (
            <>
              {groupedRows.map(g => {
                if (!g.all.length) return null;
                if (isSearching && g.matched.length === 0) return null;
                const open = isSearching ? true : expanded.has(g.id);
                const sorted = [...g.matched].sort(
                  (a, b) => (b.observation_count || 0) - (a.observation_count || 0)
                );
                return (
                  <section className={`home-group${open ? ' open' : ''}`} key={g.id}>
                    <button
                      type="button"
                      className="home-group-head home-group-head-btn"
                      onClick={() => toggleGroup(g.id)}
                      aria-expanded={open}
                      disabled={isSearching}
                    >
                      <div className="home-group-label">
                        <h2>{g.label}</h2>
                        <div className="home-group-taxon">
                          {g.taxon} ·{' '}
                          {isSearching
                            ? `${g.matched.length} / ${g.all.length} affichée${g.matched.length>1?'s':''}`
                            : `${g.all.length} espèce${g.all.length>1?'s':''}`}
                        </div>
                      </div>
                      <p className="home-group-blurb">{g.blurb}</p>
                      <span className="home-group-chevron" aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M4 6 L8 10 L12 6" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    </button>
                    {open && (
                      <div className="home-group-grid">
                        {sorted.map(sp => (
                          <SpeciesCard key={sp.id} sp={sp} onClick={() => onAskSpecies(sp)} />
                        ))}
                      </div>
                    )}
                  </section>
                );
              })}
            </>
          );
        })()}

        <div style={{ height: 48 }} />
      </div>
    );
  }

  // Hook: resolve a species photo. Priority:
  //   1. Curated DB url (sp.image_url) — Supabase Storage, set via upload script
  //   2. Wikipedia thumbnail (cached in localStorage)
  //   3. null → caller keeps the SVG silhouette fallback
  function useSpeciesImage(sp) {
    const dbUrl = sp?.image_url || null;
    const wikiPeek = !dbUrl && window.CetaImages
      ? window.CetaImages.peek(sp?.scientific_name)
      : undefined;
    const initial = dbUrl || (typeof wikiPeek === 'string' ? wikiPeek : null);
    const [url, setUrl] = useState(initial);
    const [loaded, setLoaded] = useState(false);
    useEffect(() => {
      // Reset loaded state when the species (and hence URL) changes
      setLoaded(false);
      if (dbUrl) { setUrl(dbUrl); return; }
      if (!sp || !sp.scientific_name || !window.CetaImages) { setUrl(null); return; }
      let cancelled = false;
      window.CetaImages.get(sp.scientific_name, sp.common_name_fr).then(u => {
        if (cancelled) return;
        setUrl(typeof u === 'string' ? u : null);
      });
      return () => { cancelled = true; };
    }, [sp?.scientific_name, sp?.common_name_fr, dbUrl]);
    return { url, loaded, onLoaded: () => setLoaded(true) };
  }

  function SpeciesCard({ sp, onClick }) {
    const { url, loaded, onLoaded } = useSpeciesImage(sp);
    return (
      <div className="species-card" onClick={onClick}>
        <div className="species-card-illus">
          <svg viewBox="0 0 100 40" preserveAspectRatio="xMidYMid meet">
            <path className="silhouette" d={window.CETA.silhouette(sp.kind)} />
          </svg>
          {url && (
            <img
              className={`species-card-photo${loaded ? ' loaded' : ''}`}
              src={url}
              alt={sp.common_name_fr}
              loading="lazy"
              onLoad={onLoaded}
              onError={() => { /* keep silhouette */ }}
            />
          )}
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

  // ---------- Typing indicator (rotating thematic phrases) ----------
  const TYPING_PHRASES = [
    'Plongée dans la base…',
    'Triangulation au sonar…',
    'Analyse du souffle…',
    'Mesure de la nageoire caudale…',
    'Décodage des chants…',
    'Identification de l’espèce…',
    'Repérage des bancs…',
    'Comptage des individus…',
    'Lecture du registre IUCN…',
    'Croisement avec OBIS…',
    'Consultation de WoRMS…',
    'Échantillonnage acoustique…',
    'Cartographie des routes migratoires…',
    'Récupération des observations…',
    'Suivi par satellite…',
  ];

  function TypingIndicator() {
    const [idx, setIdx] = useState(() => Math.floor(Math.random() * TYPING_PHRASES.length));
    useEffect(() => {
      let timeoutId;
      // Returns a fresh random delay between 2s and 4s, recomputed on every tick
      const randomDelay = () => 2000 + Math.random() * 2000;
      const tick = () => {
        setIdx(prev => (prev + 1) % TYPING_PHRASES.length);
        timeoutId = setTimeout(tick, randomDelay());
      };
      timeoutId = setTimeout(tick, randomDelay());
      return () => clearTimeout(timeoutId);
    }, []);
    return (
      <>
        <span key={idx} className="bot-typing-text">{TYPING_PHRASES[idx]}</span>
        <span className="loading-dot"></span>
        <span className="loading-dot"></span>
        <span className="loading-dot"></span>
      </>
    );
  }

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
                <TypingIndicator />
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
              placeholder="Ex. Fiche de l'espèce Cachalot"
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
  window.useSpeciesImage = useSpeciesImage;
})();
