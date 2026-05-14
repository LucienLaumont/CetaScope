// CetaScope — chatbot connector
// Replaces the fake bot.js. Forwards the user query to POST /chat and
// returns the same { type, data, message } shape the design components expect.
//
// Carries forward _species, _zone, _years so the viz header chips (and the
// app-side context tracking) keep working. Those derived fields come from
// either the API response's data payload or — for refinements like "et
// pour ces points sur 2015-2020" — from the previous turn's context.

(function () {
  const API_BASE = (window.CETA_CONFIG && window.CETA_CONFIG.apiBase) || '';
  const D = window.CETA;

  // Map a response `type` + `data` payload into the design's enriched shape.
  // The real API does not return _species / _zone / _years; we derive them
  // either from the data or from cached lookups.
  function enrich(resp) {
    const out = { type: resp.type, data: resp.data, message: resp.message };

    switch (resp.type) {
      case 'map': {
        // FeatureCollection — derive species from the first feature if uniform.
        const feats = (resp.data && resp.data.features) || [];
        if (feats.length) {
          const firstSpId = feats[0].properties?.species_id;
          const uniformSpecies = feats.every(f => f.properties?.species_id === firstSpId);
          if (uniformSpecies && firstSpId != null) {
            // Synthesize a minimal species ref from feature properties
            const p = feats[0].properties;
            out._species = D.normalizeSpecies({
              id: firstSpId,
              scientific_name: p.scientific_name,
              common_name_fr: p.common_name_fr,
            });
          }
          // Derive year range from observed_at dates
          const years = feats
            .map(f => f.properties?.observed_at)
            .filter(Boolean)
            .map(d => parseInt(String(d).slice(0, 4), 10))
            .filter(y => Number.isFinite(y));
          if (years.length) {
            out._years = { min: Math.min(...years), max: Math.max(...years) };
          }
        }
        break;
      }
      case 'choropleth': {
        out._zone = D.normalizeZone(resp.data);
        // Derive bbox from GeoJSON geom so the viz can highlight the region.
        const g = resp.data?.geom;
        const bbox = bboxOfGeom(g);
        if (bbox) out.data = { ...resp.data, bbox, name_fr: resp.data.name_fr || resp.data.name };
        break;
      }
      case 'time_series': {
        // No species reference in the response — leave undefined; the chips
        // will simply omit the species name in that case.
        break;
      }
      case 'profile': {
        const sp = D.normalizeSpecies(resp.data);
        out.data = sp;
        out._species = sp;
        break;
      }
      case 'top_species': {
        // Each row is { species_id, scientific_name, count }; enrich with
        // common_name_fr from the cached species directory if available.
        const dir = window.CETA._speciesDir || new Map();
        out.data = (resp.data || []).map(row => ({
          ...row,
          common_name_fr: dir.get(row.species_id)?.common_name_fr || row.scientific_name,
        }));
        break;
      }
      case 'conservation': {
        // [{year, iucn_status, scope}] — no species name in payload. The
        // header label will show whatever is in `message`.
        break;
      }
      default:
        break;
    }
    return out;
  }

  // Compute [west, south, east, north] from a GeoJSON Polygon / MultiPolygon.
  function bboxOfGeom(g) {
    if (!g || !g.coordinates) return null;
    let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity;
    function ring(r) {
      for (const [lng, lat] of r) {
        if (lng < w) w = lng;
        if (lng > e) e = lng;
        if (lat < s) s = lat;
        if (lat > n) n = lat;
      }
    }
    if (g.type === 'Polygon') {
      g.coordinates.forEach(ring);
    } else if (g.type === 'MultiPolygon') {
      g.coordinates.forEach(poly => poly.forEach(ring));
    }
    if (!isFinite(w)) return null;
    return [w, s, e, n];
  }

  async function resolve(query) {
    let resp;
    try {
      const r = await fetch(API_BASE + '/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        return {
          type: 'text', data: null,
          message: `Erreur API (${r.status}). ${text || ''}`.trim(),
        };
      }
      resp = await r.json();
    } catch (err) {
      return {
        type: 'text', data: null,
        message: `Impossible de joindre l'API : ${err.message}. Vérifie que le backend tourne et que ${API_BASE} est joignable.`,
      };
    }
    return enrich(resp || { type: 'text', message: '' });
  }

  const defaultSuggestions = [
    "Montre-moi les observations d'orques",
    "Quel est le profil du cachalot ?",
    "Évolution des observations de dauphins communs",
    "Densité d'observations en Méditerranée",
    "Top espèces dans l'Atlantique Nord",
    "Historique IUCN du narval",
  ];

  window.CETA_BOT = { resolve, defaultSuggestions };
})();
