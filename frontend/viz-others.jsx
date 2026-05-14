// Top species, choropleth, conservation history, and text-only views

(function () {
  const { useState, useRef, useEffect, useMemo } = React;

  // ---------- TopSpeciesViz ----------
  function TopSpeciesViz({ data, zone }) {
    if (!Array.isArray(data) || data.length === 0) {
      return (
        <div className="txt-wrap">
          <div className="txt-card">
            <h2 className="serif">Aucune espèce à classer</h2>
            <p>La requête n'a pas retourné de résultats.</p>
          </div>
        </div>
      );
    }
    const max = Math.max(...data.map(d => d.count)) || 1;
    return (
      <div className="top-wrap viz-fade-in">
        <div className="top-head">
          <div>
            <div className="eyebrow">Classement</div>
            <h1>
              Espèces les plus observées
              {zone && <span style={{color:'var(--muted)'}}> · {zone.name_fr}</span>}
            </h1>
          </div>
          <div style={{
            fontFamily:'var(--mono)', fontSize:12, color:'var(--muted)',
            letterSpacing:'0.1em', textTransform:'uppercase'
          }}>
            {data.length} espèces · {data.reduce((s,d)=>s+d.count,0).toLocaleString('fr-FR')} obs.
          </div>
        </div>
        <div className="top-list">
          {data.map((row, i) => (
            <div className="top-row" key={row.species_id}>
              <div className="rank">{String(i+1).padStart(2,'0')}</div>
              <div className="name">
                <span className="fr">{row.common_name_fr}</span>
                <span className="sci">{row.scientific_name}</span>
              </div>
              <div className="bar">
                <div className="bar-fill" style={{ width: `${(row.count/max)*100}%` }} />
              </div>
              <div className="count">{row.count.toLocaleString('fr-FR')}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------- ChoroplethViz ----------
  // Renders a small inset world map with the zone bbox shaded.
  // Falls back to plain stats card if d3/world atlas unavailable.
  function ChoroplethViz({ data, style }) {
    const wrapRef = useRef(null);
    const [size, setSize] = useState({ w: 900, h: 600 });
    const [world, setWorld] = useState(null);

    useEffect(() => {
      function measure() {
        if (!wrapRef.current) return;
        const r = wrapRef.current.getBoundingClientRect();
        setSize({ w: Math.max(400, r.width), h: Math.max(300, r.height) });
      }
      measure();
      const ob = new ResizeObserver(measure);
      if (wrapRef.current) ob.observe(wrapRef.current);
      return () => ob.disconnect();
    }, []);

    useEffect(() => {
      fetch('https://unpkg.com/world-atlas@2/land-110m.json')
        .then(r => r.json())
        .then(topo => setWorld(window.topojson.feature(topo, topo.objects.land)))
        .catch(() => setWorld({ type: 'FeatureCollection', features: [] }));
    }, []);

    const projection = useMemo(() => {
      if (!window.d3) return null;
      const w = size.w, h = size.h;
      return window.d3.geoNaturalEarth1()
        .scale(Math.min(w / 6.3, h / 3.2))
        .translate([w / 2, h / 2 + 12]);
    }, [size]);
    const pathGen = useMemo(() => projection && window.d3 ? window.d3.geoPath(projection) : null, [projection]);
    const landPath = useMemo(() => world && pathGen ? pathGen(world) : '', [world, pathGen]);
    const graticule = useMemo(() => {
      if (!window.d3 || !pathGen) return null;
      try { return pathGen(window.d3.geoGraticule().step([30, 30])()); } catch { return null; }
    }, [pathGen]);

    // Zone polygon — prefer real GeoJSON geom from the backend, fall back to bbox.
    const zonePath = useMemo(() => {
      if (!pathGen || !data) return '';
      if (data.geom && data.geom.coordinates) {
        try { return pathGen(data.geom); } catch { /* fall through */ }
      }
      if (data.bbox) {
        const [w, s, e, n] = data.bbox;
        const ring = [];
        const steps = 30;
        for (let i = 0; i <= steps; i++) ring.push([w + (e-w)*i/steps, s]);
        for (let i = 0; i <= steps; i++) ring.push([e, s + (n-s)*i/steps]);
        for (let i = 0; i <= steps; i++) ring.push([e + (w-e)*i/steps, n]);
        for (let i = 0; i <= steps; i++) ring.push([w, n + (s-n)*i/steps]);
        const poly = { type: 'Polygon', coordinates: [ring] };
        try { return pathGen(poly); } catch { return ''; }
      }
      return '';
    }, [data, pathGen]);

    return (
      <div className={`cho-wrap map-style-${style||'minimal'}`} ref={wrapRef}>
        <svg className="cho-svg" viewBox={`0 0 ${size.w} ${size.h}`} preserveAspectRatio="xMidYMid meet">
          <rect className="ocean" x="0" y="0" width={size.w} height={size.h} />
          {graticule && <path className="graticule" d={graticule} style={{fill:'none',stroke:'var(--rule-2)',strokeWidth:0.4}} />}
          {landPath && <path className="land" d={landPath} />}
          {zonePath && <path className="zone" d={zonePath} />}
        </svg>
        <div className="cho-stats-panel viz-fade-in">
          <div className="name">{data.name_fr}</div>
          <div className="subname">{data.name}</div>
          <div className="metric">
            <div className="label">Observations</div>
            <div className="val">{(data.observation_count || 0).toLocaleString('fr-FR')}</div>
          </div>
          <div className="metric">
            <div className="label">Densité</div>
            <div className="val">{(data.observation_density || 0).toFixed(2)}<span className="unit">obs/km²</span></div>
          </div>
          <div className="metric">
            <div className="label">Espèces distinctes</div>
            <div className="val">{data.species_count}</div>
          </div>
        </div>
        <div className="source-pill">OBIS · IHO</div>
      </div>
    );
  }

  // ---------- ConservationViz ----------
  function ConservationViz({ data, species }) {
    if (!Array.isArray(data) || data.length === 0) {
      return (
        <div className="txt-wrap">
          <div className="txt-card">
            <h2 className="serif">Pas d'historique IUCN</h2>
            <p>Aucune évaluation IUCN n'est encore enregistrée pour cette espèce.</p>
          </div>
        </div>
      );
    }
    const IUCN_LABELS = {
      EX:'Éteint', EW:'Éteint à l’état sauvage', CR:'En danger critique',
      EN:'En danger', VU:'Vulnérable', NT:'Quasi menacé',
      LC:'Préoccupation mineure', DD:'Données insuffisantes', NE:'Non évalué'
    };
    const IUCN_RANK = { EX:9, EW:8, CR:7, EN:6, VU:5, NT:4, LC:3, DD:2, NE:1 };
    const IUCN_COLORS = {
      EX:'#4A2E1A', EW:'#6D3F23', CR:'#B7251A', EN:'#D9622A',
      VU:'#C99846', NT:'#97A861', LC:'#4F7C4A', DD:'#6E7884', NE:'#B8B0A0'
    };

    const wrapRef = useRef(null);
    const [size, setSize] = useState({ w: 800, h: 360 });
    useEffect(() => {
      function measure() {
        if (!wrapRef.current) return;
        const r = wrapRef.current.getBoundingClientRect();
        setSize({ w: Math.max(420, r.width), h: Math.max(240, r.height) });
      }
      measure();
      const ob = new ResizeObserver(measure);
      if (wrapRef.current) ob.observe(wrapRef.current);
      return () => ob.disconnect();
    }, []);

    const margin = { t: 30, r: 40, b: 50, l: 60 };
    const w = size.w - margin.l - margin.r;
    const h = size.h - margin.t - margin.b;
    const years = data.map(d => d.year);
    const minY = Math.min(...years) - 2;
    const maxY = 2024;
    const x = (yr) => margin.l + ((yr - minY) / (maxY - minY)) * w;
    const ranks = [3, 4, 5, 6, 7]; // LC, NT, VU, EN, CR
    const y = (r) => {
      const idx = ranks.indexOf(r);
      if (idx < 0) return margin.t + h/2;
      return margin.t + h - (idx / (ranks.length - 1)) * h;
    };

    const current = data[data.length - 1];

    return (
      <div className="cons-wrap viz-fade-in">
        <div className="cons-head">
          <div className="cons-meta">
            <div className="eyebrow">
              {data.length} évaluation{data.length > 1 ? 's' : ''} · {data[0].year}–{data[data.length-1].year}
            </div>
          </div>
          <div className="cons-current">
            <span className="now">Statut actuel · {current.year}</span>
            <span className="pill">
              <span className="iucn-dot" style={{background: IUCN_COLORS[current.iucn_status], width: 12, height: 12, borderRadius: 3}}></span>
              <strong>{current.iucn_status}</strong>
              <span style={{color:'var(--muted)'}}>·</span>
              {IUCN_LABELS[current.iucn_status]}
            </span>
          </div>
        </div>
        <div className="cons-timeline" ref={wrapRef}>
          <svg viewBox={`0 0 ${size.w} ${size.h}`} preserveAspectRatio="none">
            {/* y axis levels */}
            {ranks.map(r => {
              const code = Object.keys(IUCN_RANK).find(k => IUCN_RANK[k] === r);
              return (
                <g key={r}>
                  <line x1={margin.l} x2={margin.l + w} y1={y(r)} y2={y(r)}
                    stroke="var(--rule-2)" strokeDasharray="2 3" />
                  <text x={margin.l - 8} y={y(r) + 3} textAnchor="end"
                    style={{fontFamily:'var(--mono)',fontSize:11,fill:'var(--muted)'}}>{code}</text>
                </g>
              );
            })}
            {/* x axis */}
            <line x1={margin.l} x2={margin.l + w} y1={margin.t + h} y2={margin.t + h} stroke="var(--rule)" />
            {Array.from({length: 6}, (_, i) => minY + Math.round((maxY-minY) * i/5)).map(yr => (
              <text key={yr} x={x(yr)} y={margin.t + h + 18} textAnchor="middle"
                style={{fontFamily:'var(--mono)',fontSize:11,fill:'var(--muted)'}}>{yr}</text>
            ))}
            {/* connecting line — step */}
            <path
              d={data.map((d, i) => {
                if (i === 0) return `M ${x(d.year)} ${y(IUCN_RANK[d.iucn_status])}`;
                const prev = data[i-1];
                return `L ${x(d.year)} ${y(IUCN_RANK[prev.iucn_status])} L ${x(d.year)} ${y(IUCN_RANK[d.iucn_status])}`;
              }).join(' ') + ` L ${x(maxY)} ${y(IUCN_RANK[current.iucn_status])}`}
              fill="none" stroke="var(--ocean)" strokeWidth="2"
            />
            {/* event dots */}
            {data.map((d, i) => (
              <g key={i}>
                <circle cx={x(d.year)} cy={y(IUCN_RANK[d.iucn_status])} r="6"
                  fill={IUCN_COLORS[d.iucn_status]} stroke="var(--paper)" strokeWidth="2" />
                <text x={x(d.year)} y={y(IUCN_RANK[d.iucn_status]) - 14} textAnchor="middle"
                  style={{fontFamily:'var(--mono)',fontSize:11,fill:'var(--ink)'}}>{d.iucn_status}</text>
                <text x={x(d.year)} y={y(IUCN_RANK[d.iucn_status]) + 22} textAnchor="middle"
                  style={{fontFamily:'var(--mono)',fontSize:10,fill:'var(--muted)'}}>{d.year}</text>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  }

  // ---------- TextViz ----------
  function TextViz({ message }) {
    return (
      <div className="txt-wrap viz-fade-in">
        <div className="txt-card">
          <div className="icon">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="13" />
              <circle cx="12" cy="16.5" r="0.6" fill="currentColor" />
            </svg>
          </div>
          <h2 className="serif">Pas de visualisation pour cette question</h2>
          <p>{message || 'La conversation continue à droite. Essaie une autre formulation, ou suggère une espèce / une zone.'}</p>
        </div>
      </div>
    );
  }

  window.TopSpeciesViz = TopSpeciesViz;
  window.ChoroplethViz = ChoroplethViz;
  window.ConservationViz = ConservationViz;
  window.TextViz = TextViz;
})();
