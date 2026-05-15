// CetaScope — Wikipedia image fetcher
//
// Resolves a species' photo URL from Wikipedia's MediaWiki "pageimages" API.
// Tries en.wikipedia.org with the scientific name first (most reliable for
// cetaceans), then falls back to fr.wikipedia.org with the common French name.
//
// Results (url or null = "no image found") are cached in localStorage so the
// app makes at most one request per species, ever. In-memory inflight tracking
// dedupes concurrent calls (multiple cards mounting at once).

(function () {
  const CACHE_KEY = 'cetascope.images.v1';
  const inflight = new Map();
  let memCache = null;

  function readCache() {
    if (memCache) return memCache;
    try { memCache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); }
    catch { memCache = {}; }
    return memCache;
  }
  function persist() {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(readCache())); } catch {}
  }

  async function fetchFromWiki(host, title) {
    const params = new URLSearchParams({
      action: 'query',
      format: 'json',
      prop: 'pageimages',
      piprop: 'thumbnail',
      pithumbsize: '480',
      redirects: '1',
      titles: title,
      origin: '*', // enables CORS for browser clients
    });
    const url = `https://${host}/w/api.php?${params.toString()}`;
    let r;
    try {
      r = await fetch(url);
    } catch { return null; }
    if (!r.ok) return null;
    let data;
    try { data = await r.json(); } catch { return null; }
    const pages = (data && data.query && data.query.pages) || {};
    for (const k of Object.keys(pages)) {
      const t = pages[k] && pages[k].thumbnail && pages[k].thumbnail.source;
      if (t) return t;
    }
    return null;
  }

  async function resolve(scientificName, commonNameFr) {
    if (!scientificName) return null;
    // English Wikipedia with scientific name (worldwide standard for species)
    let url = await fetchFromWiki('en.wikipedia.org', scientificName);
    if (url) return url;
    // French Wikipedia with common French name as fallback
    if (commonNameFr) {
      url = await fetchFromWiki('fr.wikipedia.org', commonNameFr);
      if (url) return url;
    }
    return null;
  }

  // Cached peek — returns the URL if known, undefined if never fetched, or
  // null if previously fetched and not found. Used by React components to
  // render synchronously when the cache is warm.
  function peek(scientificName) {
    if (!scientificName) return undefined;
    const c = readCache();
    return scientificName in c ? c[scientificName] : undefined;
  }

  async function get(scientificName, commonNameFr) {
    if (!scientificName) return null;
    const c = readCache();
    if (scientificName in c) return c[scientificName];
    if (inflight.has(scientificName)) return inflight.get(scientificName);
    const p = resolve(scientificName, commonNameFr)
      .then(url => {
        if (typeof url === 'string') {
          c[scientificName] = url;
          persist();
        }
        inflight.delete(scientificName);
        return url;
      })
      .catch(() => {
        inflight.delete(scientificName);
        return null;
      });
    inflight.set(scientificName, p);
    return p;
  }

  function clear() {
    memCache = {};
    try { localStorage.removeItem(CACHE_KEY); } catch {}
  }

  // Purge null entries left by previous bug (network errors cached as null)
  (function purgeStalseNulls() {
    const c = readCache();
    const nullKeys = Object.keys(c).filter(k => c[k] === null);
    if (nullKeys.length === 0) return;
    nullKeys.forEach(k => delete c[k]);
    memCache = c;
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch {}
  })();

  window.CetaImages = { get, peek, clear };
})();
