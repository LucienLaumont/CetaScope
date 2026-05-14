-- ============================================================
-- 006 — Image URL par espèce
-- ============================================================
-- Stocke le lien public d'une photo curée (Supabase Storage).
-- Le frontend tombe en fallback sur Wikipedia puis sur la silhouette SVG
-- si cette colonne est nulle.

ALTER TABLE species
    ADD COLUMN IF NOT EXISTS image_url TEXT;
