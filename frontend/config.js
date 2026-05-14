// CetaScope frontend — runtime configuration
//
// `apiBase` points at the deployed HuggingFace Space.
// For local development against a backend on port 7860, swap to
// 'http://localhost:7860' (the backend's CORS allowlist accepts
// http://localhost:5173 as a frontend origin by default).

window.CETA_CONFIG = {
  apiBase: 'https://swhaleai-marine-mammals-api.hf.space',
  // Public URL of the logo on Supabase Storage. Run scripts/upload_logo.py
  // once, then paste the URL it prints here. Used for top-bar branding and
  // for the favicon (injected dynamically below so we don't have to keep
  // the URL in sync across multiple HTML files).
  logoUrl: 'https://rqmiyhfowuenbpcofsvp.supabase.co/storage/v1/object/public/species-images/brand/logo.png',
};

// Inject favicon from config so we have a single source of truth.
(function () {
  const url = window.CETA_CONFIG.logoUrl;
  if (!url) return;
  const link = document.createElement('link');
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = url;
  document.head.appendChild(link);
})();
