// World map viz: fetches world-atlas TopoJSON and renders with d3-geo + d3-zoom
// Pan with drag, zoom with wheel. Buttons for +/-/reset.

(function () {
  const { useEffect, useRef, useState, useMemo } = React;

  // Module-level cache for the world atlas
  let _worldCache = null;
  let _worldPromise = null;

  async function loadWorld() {
    if (_worldCache) return _worldCache;
    if (_worldPromise) return _worldPromise;
    _worldPromise = fetch('https://unpkg.com/world-atlas@2/land-110m.json')
      .then(r => r.json())
      .then(topo => {
        const land = window.topojson.feature(topo, topo.objects.land);
        _worldCache = land;
        return land;
      });
    return _worldPromise;
  }

  function MapViz({ data, style }) {
    const wrapRef = useRef(null);
    const svgRef = useRef(null);
    const zoomRef = useRef(null);
    const [size, setSize] = useState({ w: 1200, h: 800 });
    const [world, setWorld] = useState(null);
    const [hover, setHover] = useState(null);
    const [transform, setTransform] = useState({ k: 1, x: 0, y: 0 });

    useEffect(() => {
      loadWorld().then(setWorld).catch(err => {
        console.warn('world atlas failed', err);
        setWorld({ type: 'FeatureCollection', features: [] });
      });
    }, []);

    useEffect(() => {
      function measure() {
        if (!wrapRef.current) return;
        const r = wrapRef.current.getBoundingClientRect();
        setSize({ w: Math.max(400, r.width), h: Math.max(300, r.height) });
      }
      measure();
      const obs = new ResizeObserver(measure);
      if (wrapRef.current) obs.observe(wrapRef.current);
      return () => obs.disconnect();
    }, []);

    // Set up d3-zoom on the SVG once
    useEffect(() => {
      if (!svgRef.current || !window.d3) return;
      const svg = window.d3.select(svgRef.current);
      const zoom = window.d3.zoom()
        .scaleExtent([1, 14])
        .filter((e) => {
          // allow wheel without ctrl, drag without buttons (default mouse)
          return !e.ctrlKey && !e.button;
        })
        .on('zoom', (e) => {
          setTransform({ k: e.transform.k, x: e.transform.x, y: e.transform.y });
        });
      zoomRef.current = zoom;
      svg.call(zoom);
      return () => { svg.on('.zoom', null); };
    }, [size.w, size.h]);

    function zoomBy(factor) {
      if (!zoomRef.current || !svgRef.current || !window.d3) return;
      window.d3.select(svgRef.current).transition().duration(220)
        .call(zoomRef.current.scaleBy, factor);
    }
    function zoomReset() {
      if (!zoomRef.current || !svgRef.current || !window.d3) return;
      window.d3.select(svgRef.current).transition().duration(280)
        .call(zoomRef.current.transform, window.d3.zoomIdentity);
    }

    const projection = useMemo(() => {
      if (!window.d3) return null;
      const w = size.w, h = size.h;
      return window.d3.geoNaturalEarth1()
        .scale(Math.min(w / 6.0, h / 3.1))
        .translate([w / 2, h / 2 + 12]);
    }, [size]);

    const pathGen = useMemo(() => {
      if (!projection || !window.d3) return null;
      return window.d3.geoPath(projection);
    }, [projection]);

    const features = (data && data.features) || [];

    // Project points once
    const points = useMemo(() => {
      if (!projection) return [];
      return features.map(f => {
        const [lng, lat] = f.geometry.coordinates;
        const xy = projection([lng, lat]);
        if (!xy) return null;
        return { x: xy[0], y: xy[1], f };
      }).filter(Boolean);
    }, [features, projection]);

    const graticule = useMemo(() => {
      if (!window.d3 || !pathGen) return null;
      try { return pathGen(window.d3.geoGraticule().step([30, 30])()); }
      catch (e) { return null; }
    }, [pathGen]);

    const landPath = useMemo(() => {
      if (!world || !pathGen) return '';
      try { return pathGen(world); } catch (e) { return ''; }
    }, [world, pathGen]);

    function handleEnter(p, e) {
      const r = wrapRef.current.getBoundingClientRect();
      setHover({
        x: e.clientX - r.left,
        y: e.clientY - r.top,
        f: p.f
      });
    }

    // Count by species for legend
    const speciesGroups = useMemo(() => {
      const m = new Map();
      for (const f of features) {
        const sci = f.properties.scientific_name;
        const fr = f.properties.common_name_fr;
        if (!m.has(sci)) m.set(sci, { sci, fr, count: 0 });
        m.get(sci).count++;
      }
      return [...m.values()].sort((a, b) => b.count - a.count);
    }, [features]);

    // Inverse scale for points so they stay roughly the same screen size
    const pointR = 4.2 / Math.sqrt(transform.k);

    return (
      <div className={`map-wrap map-style-${style || 'minimal'}`} ref={wrapRef}>
        <svg
          ref={svgRef}
          className="map-svg"
          viewBox={`0 0 ${size.w} ${size.h}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <rect className="ocean" x="0" y="0" width={size.w} height={size.h} />
          <g transform={`translate(${transform.x},${transform.y}) scale(${transform.k})`}>
            {graticule && <path className="graticule" d={graticule} />}
            {landPath && <path className="land" d={landPath} />}
            {points.map((p, i) => (
              <circle
                key={i}
                className="point"
                cx={p.x} cy={p.y} r={pointR}
                onMouseEnter={(e) => handleEnter(p, e)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: 'crosshair' }}
              />
            ))}
          </g>
        </svg>

        {hover && (
          <div className="map-tooltip" style={{ left: hover.x, top: hover.y }}>
            <div className="tt-name">{hover.f.properties.common_name_fr}</div>
            <div className="tt-sci">{hover.f.properties.scientific_name}</div>
            <div className="tt-row"><span>Date</span> <b>{hover.f.properties.observed_at}</b></div>
            <div className="tt-row"><span>Individus</span> <b>{hover.f.properties.individual_count}</b></div>
            <div className="tt-row"><span>Source</span> <b>{hover.f.properties.source}</b></div>
          </div>
        )}

        <div className="map-controls">
          <button onClick={() => zoomBy(1.6)} aria-label="Zoom +" title="Zoomer">+</button>
          <button onClick={() => zoomBy(1/1.6)} aria-label="Zoom -" title="Dézoomer">−</button>
          <button onClick={zoomReset} aria-label="Réinitialiser" title="Réinitialiser" style={{fontSize:11, fontFamily:'var(--mono)'}}>⌂</button>
        </div>

        <div className="map-legend">
          <div className="lg-row">
            <span className="lg-dot"></span>
            <span style={{fontFamily:'var(--mono)',fontSize:12,color:'var(--ink)',letterSpacing:'0.06em',textTransform:'uppercase'}}>Observations</span>
            <span className="lg-count">{features.length}</span>
          </div>
          {speciesGroups.length > 0 && <hr />}
          {speciesGroups.slice(0, 5).map(g => (
            <div className="lg-row" key={g.sci}>
              <span style={{fontFamily:'var(--serif)',fontStyle:'italic',fontSize:13,color:'var(--ink-2)'}}>{g.fr}</span>
              <span className="lg-count">{g.count}</span>
            </div>
          ))}
          <hr />
          <div className="lg-row" style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--muted)',letterSpacing:'0.08em',textTransform:'uppercase'}}>
            Zoom · {transform.k.toFixed(1)}×
          </div>
        </div>

        <div className="source-pill">OBIS</div>
      </div>
    );
  }

  window.MapViz = MapViz;
})();
