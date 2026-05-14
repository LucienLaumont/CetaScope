// Profile viz — species data sheet (real API)
//
// Expects a species already normalized by window.CETA.normalizeSpecies, i.e.
// fields renamed to the design conventions: iucn, trend, length_min, etc.
// Any of the structured fields may be missing on real backend rows; each
// section is null-guarded.

(function () {
  const IUCN_LABELS = {
    EX: 'Éteint', EW: "Éteint à l'état sauvage", CR: 'En danger critique',
    EN: 'En danger', VU: 'Vulnérable', NT: 'Quasi menacé',
    LC: 'Préoccupation mineure', DD: 'Données insuffisantes', NE: 'Non évalué'
  };
  const TREND_LABELS = {
    increasing: '↗ En augmentation',
    decreasing: '↘ En déclin',
    stable: '→ Stable',
    unknown: '? Inconnue'
  };
  const HABITAT_LABELS = {
    'Oceanic': 'Océanique',
    'Coastal & Oceanic': 'Côtier & océanique',
    'Estuarine': 'Estuarien',
    'Freshwater': 'Eau douce',
  };
  const IUCN_ORDER = ['EX','EW','CR','EN','VU','NT','LC','DD','NE'];

  function fmtRange(min, max, unit) {
    if (min == null && max == null) return '—';
    if (min == null) return `≤ ${max.toLocaleString('fr-FR')} ${unit}`;
    if (max == null) return `≥ ${min.toLocaleString('fr-FR')} ${unit}`;
    return `${min.toLocaleString('fr-FR')} – ${max.toLocaleString('fr-FR')} ${unit}`;
  }
  function fmtWeightRange(minKg, maxKg) {
    if (minKg == null && maxKg == null) return '—';
    const toUnit = v => v >= 1000 ? (v / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' t' : v.toLocaleString('fr-FR') + ' kg';
    if (minKg == null) return `≤ ${toUnit(maxKg)}`;
    if (maxKg == null) return `≥ ${toUnit(minKg)}`;
    return `${toUnit(minKg)} – ${toUnit(maxKg)}`;
  }

  function ProfileViz({ data }) {
    if (!data) return null;
    const sp = data;
    const sil = window.CETA.silhouette(sp.kind);
    const habitatLabel = sp.habitat ? (HABITAT_LABELS[sp.habitat] || sp.habitat) : null;

    return (
      <div className="profile-wrap viz-fade-in">
        <div className="profile-head">
          <div className="profile-portrait">
            <svg viewBox="0 0 100 40" preserveAspectRatio="xMidYMid meet">
              <path className="silhouette" d={sil} />
            </svg>
          </div>
          <div>
            <h1 className="profile-title">{sp.common_name_fr}</h1>
            <div className="profile-sci">{sp.scientific_name}</div>
            <div className="profile-tax">
              {sp.order && <span>{sp.order}</span>}
              {sp.family && <span>{sp.family}</span>}
              {sp.common_name_en && <span>{sp.common_name_en}</span>}
            </div>
            <div className="profile-pills">
              <span className={`chip iucn iucn-${sp.iucn}`}>
                <span className="iucn-dot"></span>
                <span>{sp.iucn}</span>
                <span style={{color:'var(--muted)',marginLeft:4}}>{IUCN_LABELS[sp.iucn] || ''}</span>
              </span>
              {sp.trend && <span className="chip">{TREND_LABELS[sp.trend]}</span>}
              {habitatLabel && <span className="chip">{habitatLabel}</span>}
              {sp.echolocation && <span className="chip">⏤ Écholocation</span>}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24 }}>
          <div className="iucn-bar">
            {IUCN_ORDER.map(code => (
              <div
                key={code}
                className={`seg seg-${code}${sp.iucn === code ? ' active' : ''}`}
                title={`${code} · ${IUCN_LABELS[code]}`}
              />
            ))}
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--muted)',
            letterSpacing: '0.06em'
          }}>
            <span>← MENACE CROISSANTE</span>
            <span>PRÉOCCUPATION MINEURE →</span>
          </div>
        </div>

        <div className="profile-grid">
          <div className="profile-section">
            <h3>Morphologie</h3>
            <div className="profile-prop">
              <div className="k">Longueur</div>
              <div className="v num">{fmtRange(sp.length_min, sp.length_max, 'm')}</div>
            </div>
            <div className="profile-prop">
              <div className="k">Poids</div>
              <div className="v num">{fmtWeightRange(sp.weight_min, sp.weight_max)}</div>
            </div>
            <div className="profile-prop">
              <div className="k">Habitat</div>
              <div className="v">{habitatLabel || '—'}</div>
            </div>
            <div className="profile-prop">
              <div className="k">Écholocation</div>
              <div className="v">{sp.echolocation == null ? '—' : (sp.echolocation ? 'Oui' : 'Non')}</div>
            </div>
          </div>

          <div className="profile-section">
            <h3>Biologie</h3>
            <div className="profile-prop">
              <div className="k">Durée de vie</div>
              <div className="v num">{sp.lifespan || '—'}</div>
            </div>
            <div className="profile-prop">
              <div className="k">Gestation</div>
              <div className="v num">{sp.gestation || '—'}</div>
            </div>
            <div className="profile-prop">
              <div className="k">Statut IUCN</div>
              <div className="v">
                <span className={`iucn iucn-${sp.iucn}`}>
                  <span className="iucn-dot"></span>{sp.iucn} · {IUCN_LABELS[sp.iucn] || ''}
                </span>
              </div>
            </div>
            <div className="profile-prop">
              <div className="k">Tendance pop.</div>
              <div className="v">{TREND_LABELS[sp.trend] || '—'}</div>
            </div>
          </div>

          <div className="profile-section" style={{ gridColumn: '1 / -1' }}>
            <h3>Activité dans la base</h3>
            <div className="profile-prop">
              <div className="k">Observations totales</div>
              <div className="v num">{(sp.observation_count || 0).toLocaleString('fr-FR')}</div>
            </div>
            <div className="profile-prop">
              <div className="k">Source</div>
              <div className="v">OBIS</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  window.ProfileViz = ProfileViz;
})();
