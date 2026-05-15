// CetaScope — API data layer
// Replaces the mock data.js. Fetches species and zones from the FastAPI backend
// and exposes the same window.CETA surface the JSX components rely on
// (silhouettes, French article helpers, normalized field names).

(function () {
  const API = (window.CETA_CONFIG && window.CETA_CONFIG.apiBase) || '';

  // ---------- Silhouettes (kept client-side: backend has no illustrations) ----------
  // SVG viewBox 100x40.
  const SIL = {
    orca:
      'M5 22 Q14 15 26 13 Q36 12 42 13 L46 14 L47 3 L53 3 L54 14 Q70 14 84 19 L90 21 L96 25 L86 26 L94 32 L84 28 Q60 30 28 30 Q14 30 5 22 Z',
    blue_whale:
      'M3 24 Q12 14 30 13 Q50 12 70 14 Q86 16 96 22 L93 26 L88 25 L87 28 Q70 30 50 30 Q28 31 14 28 Q6 26 3 24 Z',
    sperm_whale:
      'M5 18 Q8 13 18 12 L40 11 L44 13 Q60 14 78 18 Q90 22 95 25 L92 27 L86 26 L84 29 Q66 31 46 30 Q24 30 10 27 Q4 25 5 18 Z',
    narwhal:
      'M8 22 Q14 14 26 13 Q42 12 56 14 Q72 17 86 22 Q92 24 94 27 L90 28 L86 27 L84 30 Q70 31 54 30 Q34 30 18 27 Q10 25 8 22 Z M86 22 L99 18 L99 19 L87 23',
    bottlenose:
      'M2 22 L8 20 L12 18 Q14 14 18 13 L24 14 L30 11 Q42 9 56 12 Q72 16 86 22 Q90 24 92 26 L88 27 Q70 29 50 28 Q28 28 14 25 Q6 23 2 22 Z',
    common_dolphin:
      'M4 22 Q10 20 14 18 L16 16 L20 13 Q22 11 26 13 L30 11 Q40 9 50 11 Q66 13 82 19 Q90 22 93 25 L89 27 Q72 29 54 28 Q34 28 18 26 Q8 24 4 22 Z',
    beluga:
      'M4 22 Q6 14 18 11 Q30 9 48 10 Q66 11 82 16 Q92 19 96 23 L92 25 Q70 28 48 28 Q26 28 12 25 Q4 23 4 22 Z',
    porpoise:
      'M6 22 L10 19 L14 17 Q18 14 26 13 L32 10 L34 13 Q48 13 62 17 Q76 21 84 24 L80 26 Q66 28 50 28 Q30 28 16 26 Q8 24 6 22 Z'
  };

  // Mapping genus → silhouette + group. Falls back to bottlenose / dolphins.
  const GENUS_META = {
    // Mysticetes
    Balaenoptera: { kind: 'blue_whale', group: 'whales' },
    Megaptera:    { kind: 'blue_whale', group: 'whales' },
    Eubalaena:    { kind: 'blue_whale', group: 'whales' },
    Balaena:      { kind: 'blue_whale', group: 'whales' },
    Eschrichtius: { kind: 'blue_whale', group: 'whales' },
    Caperea:      { kind: 'blue_whale', group: 'whales' },
    // Sperm whales
    Physeter:     { kind: 'sperm_whale', group: 'whales' },
    Kogia:        { kind: 'sperm_whale', group: 'whales' },
    // Beaked whales
    Ziphius:      { kind: 'sperm_whale', group: 'whales' },
    Hyperoodon:   { kind: 'sperm_whale', group: 'whales' },
    Mesoplodon:   { kind: 'sperm_whale', group: 'whales' },
    Berardius:    { kind: 'sperm_whale', group: 'whales' },
    Tasmacetus:   { kind: 'sperm_whale', group: 'whales' },
    Indopacetus:  { kind: 'sperm_whale', group: 'whales' },
    // Delphinidae
    Orcinus:        { kind: 'orca', group: 'dolphins' },
    Pseudorca:      { kind: 'orca', group: 'dolphins' },
    Feresa:         { kind: 'orca', group: 'dolphins' },
    Globicephala:   { kind: 'orca', group: 'dolphins' },
    Tursiops:       { kind: 'bottlenose', group: 'dolphins' },
    Delphinus:      { kind: 'common_dolphin', group: 'dolphins' },
    Stenella:       { kind: 'common_dolphin', group: 'dolphins' },
    Lagenorhynchus: { kind: 'common_dolphin', group: 'dolphins' },
    Lagenodelphis:  { kind: 'common_dolphin', group: 'dolphins' },
    Lissodelphis:   { kind: 'common_dolphin', group: 'dolphins' },
    Cephalorhynchus:{ kind: 'common_dolphin', group: 'dolphins' },
    Grampus:        { kind: 'bottlenose', group: 'dolphins' },
    Peponocephala:  { kind: 'bottlenose', group: 'dolphins' },
    Sousa:          { kind: 'bottlenose', group: 'dolphins' },
    Sotalia:        { kind: 'common_dolphin', group: 'dolphins' },
    Steno:          { kind: 'common_dolphin', group: 'dolphins' },
    Orcaella:       { kind: 'bottlenose', group: 'dolphins' },
    // River dolphins
    Inia:           { kind: 'common_dolphin', group: 'dolphins' },
    Pontoporia:     { kind: 'common_dolphin', group: 'dolphins' },
    Platanista:     { kind: 'common_dolphin', group: 'dolphins' },
    Lipotes:        { kind: 'common_dolphin', group: 'dolphins' },
    // Monodontidae (arctic)
    Monodon:        { kind: 'narwhal', group: 'arctic' },
    Delphinapterus: { kind: 'beluga',  group: 'arctic' },
    // Porpoises
    Phocoena:     { kind: 'porpoise', group: 'porpoises' },
    Phocoenoides: { kind: 'porpoise', group: 'porpoises' },
    Neophocaena:  { kind: 'porpoise', group: 'porpoises' },
  };

  function metaFor(scientificName) {
    if (!scientificName) return { kind: 'bottlenose', group: 'dolphins' };
    const genus = scientificName.split(/\s+/)[0];
    return GENUS_META[genus] || { kind: 'bottlenose', group: 'dolphins' };
  }

  function silhouette(kind) {
    return SIL[kind] || SIL.bottlenose;
  }

  // ---------- French article helpers ----------
  // The real chatbot generates message text in French, but the click-to-ask
  // flow (cards in the home grid → query the bot) still needs grammatically
  // correct articles. Heuristic: starts-with-vowel → l'…
  const VOWEL_START = /^[aeiouhéèêà]/i;
  const FEMININE_HINTS = /\b(baleine|orque|dauphine|otarie)\b/i;

  function lowerName(sp) {
    return (sp.common_name_fr || sp.scientific_name || '').toLowerCase();
  }
  function startsVowel(sp) {
    return VOWEL_START.test(lowerName(sp));
  }
  function isFeminine(sp) {
    return FEMININE_HINTS.test(lowerName(sp));
  }
  function withLeArticle(sp) {
    const n = lowerName(sp);
    if (startsVowel(sp)) return "l'" + n;
    return (isFeminine(sp) ? 'la ' : 'le ') + n;
  }
  function withDeArticle(sp) {
    const n = lowerName(sp);
    if (startsVowel(sp)) return "de l'" + n;
    return (isFeminine(sp) ? 'de la ' : 'du ') + n;
  }
  function pluralName(sp) {
    const w = lowerName(sp).split(' ');
    return w.map(t => /s$|x$/.test(t) ? t : t + 's').join(' ');
  }
  function withDeForPlural(sp) {
    const pl = pluralName(sp);
    return startsVowel(sp) ? "d'" + pl : 'de ' + pl;
  }

  // ---------- Normalization ----------
  // Adapt a backend Species (SpeciesListItem or full SpeciesDB) into the shape
  // the design components were written against.
  function normalizeSpecies(s) {
    if (!s) return null;
    const meta = metaFor(s.scientific_name);
    return {
      // identity
      id: s.id,
      scientific_name: s.scientific_name,
      common_name_fr: s.common_name_fr || s.common_name_en || s.scientific_name,
      common_name_en: s.common_name_en,
      // taxonomy (only present on detail responses)
      order: s.order_name || 'Cetacea',
      family: s.family_name || '',
      // visual / grouping
      kind: meta.kind,
      group: meta.group,
      // conservation
      iucn: s.iucn_status || 'NE',
      trend: s.population_trend || 'unknown',
      // morphology
      length_min: s.length_m_min,
      length_max: s.length_m_max,
      weight_min: s.weight_kg_min,
      weight_max: s.weight_kg_max,
      // biology
      lifespan: s.lifespan_years ? `${s.lifespan_years} ans` : null,
      gestation: s.gestation_days ? `${s.gestation_days} jours` : null,
      echolocation: s.is_echolocating === true,
      habitat: s.habitat_type || null,
      // activity
      observation_count: s.observation_count || 0,
      // curated photo URL (Supabase Storage). null → frontend falls back to Wikipedia.
      image_url: s.image_url || null,
    };
  }

  function normalizeZone(z) {
    if (!z) return null;
    return {
      id: z.id,
      name: z.name,
      name_fr: z.name_fr || z.name,
      zone_type: z.zone_type,
      observation_count: z.observation_count || 0,
    };
  }

  // ---------- Backend fetch helpers ----------
  async function fetchJSON(path, opts) {
    const r = await fetch(API + path, opts);
    if (!r.ok) throw new Error(`API ${path} → ${r.status}`);
    return r.json();
  }

  async function loadSpecies(limit = 100) {
    const data = await fetchJSON(`/species?limit=${limit}`);
    return (data.items || []).map(normalizeSpecies).filter(Boolean);
  }
  async function loadSpeciesDetail(id) {
    return normalizeSpecies(await fetchJSON(`/species/${id}`));
  }
  async function loadZones() {
    const data = await fetchJSON('/zones');
    return (Array.isArray(data) ? data : []).map(normalizeZone).filter(Boolean);
  }
  async function loadIUCNDistribution() {
    return fetchJSON('/analytics/conservation-status');
  }
  async function loadMapObservations(speciesId) {
    return fetchJSON(`/map/observations?species_id=${speciesId}`);
  }
  async function loadTimeSeries(speciesId) {
    return fetchJSON(`/analytics/time-series/${speciesId}`);
  }
  async function loadConservationHistory(speciesId) {
    return fetchJSON(`/species/${speciesId}/conservation-history`);
  }

  // ---------- Groups (used by Home) ----------
  const groups = [
    {
      id: 'whales',
      label: 'Baleines',
      taxon: 'Mysticètes & physétéridés',
      blurb: "Géants océaniques — du krill filtré par fanons aux calmars chassés à 2 000 mètres."
    },
    {
      id: 'dolphins',
      label: 'Dauphins & orques',
      taxon: 'Delphinidae',
      blurb: 'Cétacés à dents au sommet de leurs chaînes alimentaires, hautement sociaux.'
    },
    {
      id: 'arctic',
      label: 'Cétacés arctiques',
      taxon: 'Monodontidae',
      blurb: "Espèces blanches ou armées d'une défense, inféodées aux eaux polaires."
    },
    {
      id: 'porpoises',
      label: 'Marsouins',
      taxon: 'Phocoenidae',
      blurb: 'Petits cétacés discrets des eaux côtières tempérées.'
    }
  ];

  // ---------- localStorage cache (stale-while-revalidate) ----------
  // The home grid + zones list only change at the monthly OBIS sync, so we
  // can show the cached snapshot instantly on every reload and refresh in
  // the background. TTL is mostly informational here.
  const CACHE_VERSION = 'v1';
  const CACHE_TTL_MS = 24 * 3600 * 1000;

  function cacheKey(name) {
    return `cetascope.cache.${name}.${CACHE_VERSION}`;
  }
  function readCache(name) {
    try {
      const raw = localStorage.getItem(cacheKey(name));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.ts !== 'number') return null;
      return { data: parsed.data, age: Date.now() - parsed.ts };
    } catch { return null; }
  }
  function writeCache(name, data) {
    try {
      localStorage.setItem(cacheKey(name), JSON.stringify({ ts: Date.now(), data }));
    } catch { /* quota / private mode — silently ignore */ }
  }
  function clearCache() {
    for (const k of ['species', 'zones']) {
      try { localStorage.removeItem(cacheKey(k)); } catch {}
    }
  }

  // ---------- Public surface ----------
  window.CETA = {
    // sync helpers used directly inside React render
    silhouette, SIL,
    withLeArticle, withDeArticle, withDeForPlural, pluralName, lowerName,
    groups,
    metaFor, normalizeSpecies, normalizeZone,
    // async loaders — used on mount
    api: {
      loadSpecies, loadSpeciesDetail, loadZones, loadIUCNDistribution,
      loadMapObservations, loadTimeSeries, loadConservationHistory,
      base: API,
      readCache, writeCache, clearCache, CACHE_TTL_MS,
    },
  };
})();
