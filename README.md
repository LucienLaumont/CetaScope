---
title: CetaScope API
emoji: 🐋
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
license: mit
short_description: Dashboard for Cetacea
---

# 🐋 CetaScope

> Dashboard d'exploration des mammifères marins via chatbot en langage naturel.

[![Frontend](https://img.shields.io/badge/Frontend-GitHub%20Pages-blue?logo=github)](https://lucienlaumont.github.io/cetascope)
[![API](https://img.shields.io/badge/API-HuggingFace%20Spaces-yellow?logo=huggingface)](https://swhaleai-marine-mammals-api.hf.space)
[![Python](https://img.shields.io/badge/Python-3.12-3776ab?logo=python&logoColor=white)](https://www.python.org)
[![License](https://img.shields.io/badge/Licence-MIT-green)](LICENSE)

---

## Aperçu

CetaScope est une application web full-stack qui permet d'explorer **des millions d'observations de cétacés** à travers une interface conversationnelle en français. Pose une question, obtiens une carte, un graphique ou une fiche espèce — sans ligne de code.

Les données sont synchronisées automatiquement depuis OBIS, GBIF et l'IUCN via des pipelines GitHub Actions, et enrichies par Gemini AI (morphologie, biologie).
---

## Fonctionnalités

- **Chatbot en français** propulsé par Gemini 2.0 Flash — cartes, séries temporelles, fiches espèce
- **7 types de visualisations** : carte d'observations, choroplèthe, évolution annuelle, profil espèce, top espèces, timeline IUCN, réponse texte
- **Navigation directe** — clic sur une espèce → profil immédiat sans passer par le chat
- **Boutons de navigation rapide** sur chaque profil (Observations · Évolution · Historique IUCN)
- **Historique de navigation** — trail dots, flèches ← →, bouton retour navigateur
- **Cache intelligent** — données en localStorage, images Wikipedia mises en cache, chargement instantané
- **Pipeline automatisé** — synchronisation hebdomadaire/mensuelle via GitHub Actions
- **90 espèces couvertes** — de la baleine bleue au marsouin commun

---

## Architecture

```
┌─────────────────────────┐     ┌──────────────────────────┐     ┌───────────────────────┐
│  Frontend               │     │  Backend                 │     │  Base de données      │
│  React 18 · D3.js       │────▶│  FastAPI · asyncpg       │────▶│  PostgreSQL 15        │
│  GitHub Pages           │     │  HuggingFace Spaces      │     │  PostGIS · Supabase   │
└─────────────────────────┘     └──────────────────────────┘     └───────────────────────┘
                                          ▲
                                          │
                                ┌─────────────────────┐
                                │  GitHub Actions      │
                                │  Sync OBIS/GBIF      │
                                │  Enrichissement LLM  │
                                └─────────────────────┘
```

---

## Stack technique

| Couche | Technologie | Rôle |
|--------|-------------|------|
| Frontend | React 18 (CDN, sans bundler), D3.js, TopoJSON | Interface, visualisations |
| Backend | FastAPI, asyncpg, Pydantic v2, httpx | API REST + chatbot |
| LLM | Gemini 2.0 Flash (Google AI) | Parsing requêtes NL + enrichissement |
| Base de données | PostgreSQL 15 + PostGIS (Supabase) | Observations, espèces, zones |
| CI/CD | GitHub Actions | Déploiement frontend + sync données |
| Hébergement | GitHub Pages + HuggingFace Spaces (Docker) | 100% gratuit |

---

## Sources de données

| Source | Usage |
|--------|-------|
| [OBIS](https://obis.org) | Observations marines mondiales (source primaire) |
| [GBIF](https://www.gbif.org) | Observations (source secondaire / fallback) |
| [WoRMS](https://www.marinespecies.org) | Taxonomie des cétacés |
| [IUCN Red List](https://www.iucnredlist.org) | Statuts de conservation |
| [Gemini AI](https://ai.google.dev) | Enrichissement morphologie & biologie |
| [Wikipedia](https://www.wikipedia.org) | Photos des espèces |

---

## Démarrage local

### Prérequis

- Python 3.12+
- PostgreSQL 15 avec extension PostGIS
- [`uv`](https://docs.astral.sh/uv/) (gestionnaire de paquets Python)
- Fichier `.env` à la racine (voir `.env.example`)

### Backend

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload --port 7860
```

L'API est disponible sur `http://localhost:7860`. La documentation Swagger est accessible sur `/docs`.

### Frontend

Modifier `frontend/config.js` pour pointer vers le backend local :

```js
window.CETA_CONFIG = {
  apiBase: 'http://localhost:7860',
  // ...
};
```

Puis ouvrir `frontend/index.html` directement dans le navigateur, ou le servir statiquement :

```bash
cd frontend
python -m http.server 3000
```

### Scripts de données

```bash
cd scripts
uv sync

# Récupérer les espèces depuis WoRMS
uv run python fetch_species.py

# Enrichir les données (IUCN, morphologie, biologie)
uv run python enrich_iucn.py
uv run python enrich_morpho.py
uv run python enrich_biology.py

# Récupérer les observations OBIS/GBIF
uv run python fetch_observations.py
```

---

## API — Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `POST` | `/chat` | Chatbot — requête NL → type de viz + données |
| `GET` | `/species` | Liste et recherche d'espèces (pagination) |
| `GET` | `/species/{id}` | Fiche détaillée d'une espèce |
| `GET` | `/species/{id}/conservation-history` | Timeline IUCN |
| `GET` | `/map/observations` | Points d'observation GeoJSON (filtrable) |
| `GET` | `/analytics/time-series/{id}` | Évolution annuelle des observations |
| `GET` | `/analytics/top-species` | Classement des espèces les plus observées |
| `GET` | `/analytics/conservation-status` | Distribution des statuts IUCN |
| `GET` | `/zones/{id}/choropleth` | Densité d'observations par zone |
| `GET` | `/health` | État de l'API |

Le chatbot retourne toujours un objet `{ type, data, message }` permettant au frontend de choisir la visualisation adaptée.

---

## Pipeline de données (GitHub Actions)

| Workflow | Déclencheur | Action |
|----------|-------------|--------|
| `deploy-pages.yml` | Push sur `main` (frontend/) | Déploiement GitHub Pages |
| `sync-species.yml` | Mensuel (1er du mois, 3h UTC) | WoRMS + IUCN + enrichissement Gemini |
| `sync-observations.yml` | Hebdomadaire (lundi, 4h UTC) | OBIS/GBIF + données environnementales |

---

## Structure du projet

```
cetascope/
├── frontend/          # Interface React (statique, sans bundler)
├── backend/           # API FastAPI
│   └── app/
│       ├── routers/   # Routes par domaine (species, map, analytics…)
│       ├── services/  # Logique métier
│       └── models/    # Schémas Pydantic
├── shared/            # Package Pydantic partagé (backend + scripts)
├── scripts/           # Scripts de synchronisation et d'enrichissement
├── db/                # Migrations SQL
├── docs/              # Spécification UX + screenshots
└── .github/workflows/ # CI/CD
```

---

## Contact

**Lucien Laumont** — [lucienlaumont36@gmail.com](mailto:lucienlaumont36@gmail.com)

Projet portfolio — contributions non sollicitées.

---

## Licence

[MIT](LICENSE) © 2025 Lucien Laumont
