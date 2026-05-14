// CetaScope frontend — runtime configuration
//
// `apiBase` points at the deployed HuggingFace Space.
// For local development against a backend on port 7860, swap to
// 'http://localhost:7860' (the backend's CORS allowlist accepts
// http://localhost:5173 as a frontend origin by default).

window.CETA_CONFIG = {
  apiBase: 'https://swhaleai-marine-mammals-api.hf.space',
};
