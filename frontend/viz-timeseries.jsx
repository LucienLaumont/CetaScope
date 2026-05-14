// Time series viz — bar chart of annual observations

(function () {
  const { useState, useRef, useEffect, useMemo } = React;

  function TimeSeriesViz({ data, species }) {
    const wrapRef = useRef(null);
    const [size, setSize] = useState({ w: 800, h: 400 });
    const [hover, setHover] = useState(null);

    if (!Array.isArray(data) || data.length === 0) {
      return (
        <div className="txt-wrap">
          <div className="txt-card">
            <h2 className="serif">Pas encore de série temporelle</h2>
            <p>Aucune observation annuelle n'est encore enregistrée pour cette espèce.</p>
          </div>
        </div>
      );
    }

    useEffect(() => {
      function measure() {
        if (!wrapRef.current) return;
        const r = wrapRef.current.getBoundingClientRect();
        setSize({ w: Math.max(400, r.width), h: Math.max(280, r.height) });
      }
      measure();
      const ob = new ResizeObserver(measure);
      if (wrapRef.current) ob.observe(wrapRef.current);
      return () => ob.disconnect();
    }, []);

    const margin = { t: 10, r: 20, b: 28, l: 44 };
    const w = size.w - margin.l - margin.r;
    const h = size.h - margin.t - margin.b;

    const max = useMemo(() => Math.max(...data.map(d => d.count)) * 1.1, [data]);
    const total = useMemo(() => data.reduce((s, d) => s + d.count, 0), [data]);
    const last5 = data.slice(-5).reduce((s, d) => s + d.count, 0);
    const prev5 = data.slice(-10, -5).reduce((s, d) => s + d.count, 0);
    const delta = prev5 ? Math.round((last5 - prev5) / prev5 * 100) : 0;
    const peakYear = data.reduce((a, b) => b.count > a.count ? b : a).year;

    const x = (i) => margin.l + (i / (data.length - 1)) * w;
    const barW = Math.max(2, w / data.length * 0.78);
    const y = (v) => margin.t + h - (v / max) * h;

    // Ticks
    const yTicks = useMemo(() => {
      const ticks = [];
      const step = Math.ceil(max / 4 / 10) * 10;
      for (let v = 0; v <= max; v += step) ticks.push(v);
      return ticks;
    }, [max]);
    const xTicks = useMemo(() => {
      return data.filter((d, i) => d.year % 5 === 0);
    }, [data]);

    return (
      <div className="ts-wrap">
        <div className="ts-stats">
          {species && (
            <div className="ts-stat">
              <div className="label">Espèce</div>
              <div className="value serif">{species.common_name_fr}</div>
              <div style={{fontStyle:'italic',color:'var(--muted)',fontSize:13,marginTop:2}}>{species.scientific_name}</div>
            </div>
          )}
          <div className="ts-stat">
            <div className="label">Période</div>
            <div className="value">{data[0].year}<span style={{color:'var(--muted)',fontSize:18}}> – </span>{data[data.length-1].year}</div>
          </div>
          <div className="ts-stat">
            <div className="label">Total cumulé</div>
            <div className="value">{total.toLocaleString('fr-FR')}</div>
          </div>
          <div className="ts-stat">
            <div className="label">5 dernières années</div>
            <div className="value">
              {last5.toLocaleString('fr-FR')}
              <span className={`delta${delta < 0 ? ' down' : ''}`}>{delta >= 0 ? '+' : ''}{delta}%</span>
            </div>
          </div>
          <div className="ts-stat">
            <div className="label">Pic d'observations</div>
            <div className="value">{peakYear}</div>
          </div>
        </div>
        <div className="ts-chart" ref={wrapRef}>
          <svg viewBox={`0 0 ${size.w} ${size.h}`} preserveAspectRatio="none">
            {/* y grid */}
            <g className="ts-grid">
              {yTicks.map(t => (
                <line key={t} x1={margin.l} x2={margin.l + w} y1={y(t)} y2={y(t)} />
              ))}
            </g>
            {/* y axis */}
            <g className="ts-axis">
              {yTicks.map(t => (
                <text key={t} x={margin.l - 6} y={y(t) + 3} textAnchor="end">{t}</text>
              ))}
            </g>
            {/* x axis */}
            <g className="ts-axis">
              <line x1={margin.l} x2={margin.l + w} y1={margin.t + h} y2={margin.t + h} />
              {xTicks.map(d => {
                const i = data.indexOf(d);
                return <text key={d.year} x={x(i)} y={margin.t + h + 14} textAnchor="middle">{d.year}</text>;
              })}
            </g>
            {/* bars */}
            {data.map((d, i) => (
              <rect
                key={d.year}
                className={`ts-bar${hover === i ? ' hover' : ''}`}
                x={x(i) - barW/2}
                y={y(d.count)}
                width={barW}
                height={margin.t + h - y(d.count)}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
              />
            ))}
            {/* hover tooltip */}
            {hover != null && (
              <g style={{pointerEvents:'none'}}>
                <line
                  x1={x(hover)} x2={x(hover)}
                  y1={margin.t} y2={margin.t + h}
                  stroke="var(--ink)" strokeOpacity="0.2" strokeDasharray="2 2"
                />
                <g transform={`translate(${x(hover)}, ${y(data[hover].count) - 8})`}>
                  <rect x="-30" y="-22" width="60" height="20" rx="4" fill="var(--ink)" />
                  <text x="0" y="-8" textAnchor="middle" fill="var(--paper)" style={{fontSize:11,fontFamily:'var(--mono)'}}>
                    {data[hover].year} · {data[hover].count}
                  </text>
                </g>
              </g>
            )}
          </svg>
        </div>
      </div>
    );
  }

  window.TimeSeriesViz = TimeSeriesViz;
})();
