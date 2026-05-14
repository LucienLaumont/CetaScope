# CetaScope — Spécification UX

> Document destiné à Claude Design pour la conception de l'interface frontend.
> Priorité : expérience utilisateur et connexion à l'API. Ne pas se concentrer sur l'UI (couleurs, typographies, espacements).

---

## Vision du produit

CetaScope est un portail d'**exploration des données d'observation de mammifères marins** (cétacés). Il agrège des milliers d'observations scientifiques provenant de bases de données mondiales (OBIS, GBIF) pour ~90 espèces de baleines, dauphins et marsouins.

### Qui l'utilise

- Chercheurs et biologistes marins souhaitant explorer rapidement une espèce ou une zone
- Naturalistes et amateurs éclairés curieux des tendances de population
- Profil commun : **non-technique**, à l'aise avec le langage naturel, pas avec les formulaires de filtres

### Promesse UX

> Explorer des données complexes via une conversation naturelle — sans formulaire, sans filtre manuel, sans navigation entre pages.

L'utilisateur **pose une question en français** et l'interface **met à jour la visualisation** en conséquence. C'est le chatbot qui pilote ce qui est affiché.

---

## Principe central : le chatbot comme pilote des visualisations

L'interface repose sur **un seul mécanisme d'interaction** : le chatbot.

Il n'y a pas de :
- Menus déroulants pour filtrer par espèce ou zone
- Boutons pour changer de type de graphique
- Navigation entre plusieurs pages de visualisation

À la place : l'utilisateur écrit une question, et la **zone de visualisation** — carte ou graphique — se transforme automatiquement selon la nature de la réponse.

### Modèle mental à transmettre à l'utilisateur

```
Je pose une question   →   Le chatbot l'analyse   →   La vue se met à jour
```

Exemples :
- "Montre-moi les observations d'orques" → une carte apparaît avec des points
- "Comment évoluent les observations de dauphins communs ?" → un graphique temporel apparaît
- "Quel est le statut de conservation du narval ?" → une fiche espèce apparaît

### Ce que l'interface NE fait PAS

- Elle ne maintient pas l'historique de conversation côté serveur : chaque question est traitée de façon indépendante (stateless)
- Elle ne permet pas de combiner plusieurs visualisations simultanément : une question = une visualisation
- Elle ne traduit pas : le chatbot répond toujours en français, les questions doivent être posées en français

---

## Architecture de l'interface

L'interface se compose de **deux zones fonctionnelles** :

### Zone 1 — Chatbot (input/output conversationnel)

- Champ de saisie pour la question de l'utilisateur
- Historique des échanges (géré côté frontend uniquement, le backend est stateless)
- Chaque réponse du chatbot contient un message texte court (1-2 phrases)
- La réponse peut ou non être accompagnée d'une visualisation

### Zone 2 — Visualisation (carte ou graphique)

- Zone dynamique qui change de type selon la réponse du chatbot
- Par défaut (au chargement) : peut afficher une carte générale ou rester vide
- Se met à jour à chaque réponse chatbot contenant des données
- Affiche 7 types différents (voir section suivante)

---

## Les 7 types de visualisation

Le backend renvoie un champ `type` dans chaque réponse chatbot. Ce champ détermine ce que la zone de visualisation doit afficher.

### `map` — Carte de points d'observation

**Déclenché par :** questions sur les observations géolocalisées d'une espèce, d'une zone, d'une période.

**Ce que l'utilisateur voit :**
- Une carte du monde (projection géographique standard)
- Des points représentant des observations individuelles
- Au survol d'un point : nom français de l'espèce, date d'observation, nombre d'individus, source (OBIS ou GBIF)

**Filtres possibles via le chatbot (combinables) :**
- Espèce (ex : "observations d'orques")
- Zone océanique (ex : "dans l'Atlantique Nord")
- Période (ex : "entre 2005 et 2015")

**Exemples de questions :**
- "Montre-moi les observations d'orques"
- "Où a-t-on observé des dauphins communs dans le Pacifique ?"
- "Observations de baleines bleues entre 2010 et 2020"

**Format de données reçu (`data`) :**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": { "type": "Point", "coordinates": [longitude, latitude] },
      "properties": {
        "id": 1234,
        "species_id": 42,
        "scientific_name": "Orcinus orca",
        "common_name_fr": "Orque",
        "observed_at": "2018-07-14",
        "individual_count": 3,
        "source": "OBIS"
      }
    }
  ]
}
```

---

### `choropleth` — Carte de densité par zone océanique

**Déclenché par :** questions sur la densité d'observations ou les statistiques d'une zone géographique.

**Ce que l'utilisateur voit :**
- Un polygone coloré représentant une zone océanique (mer, océan)
- Une légende ou annotation indiquant les statistiques de la zone

**Informations affichées :**
- Nom de la zone (en français)
- Nombre total d'observations
- Densité : observations par km²
- Nombre d'espèces différentes observées dans la zone

**Exemples de questions :**
- "Quelle est la densité d'observations en Méditerranée ?"
- "Statistiques de la mer du Nord"

**Format de données reçu (`data`) :**
```json
{
  "id": 7,
  "name": "Mediterranean Sea",
  "name_fr": "Mer Méditerranée",
  "geom": { "type": "MultiPolygon", "coordinates": [...] },
  "observation_count": 4521,
  "observation_density": 0.87,
  "species_count": 23
}
```

---

### `time_series` — Évolution annuelle des observations

**Déclenché par :** questions sur l'évolution temporelle des observations d'une espèce.

**Ce que l'utilisateur voit :**
- Un graphique (courbe ou barres) avec les années en abscisse et le nombre d'observations en ordonnée
- Le nom de l'espèce comme titre

**Exemples de questions :**
- "Comment évoluent les observations de dauphins communs ?"
- "Tendance des observations de cachalots au fil du temps"
- "Montre-moi l'historique des observations de baleines à bosse"

**Format de données reçu (`data`) :**
```json
[
  { "year": 2000, "count": 145 },
  { "year": 2001, "count": 203 },
  ...
]
```

---

### `profile` — Fiche complète d'une espèce

**Déclenché par :** questions sur une espèce spécifique (identité, biologie, taille, statut).

**Ce que l'utilisateur voit :**
- Une fiche structurée avec toutes les informations connues sur l'espèce

**Informations affichées (toutes optionnelles si absentes) :**
- Identité : nom commun (FR et EN), nom scientifique, ordre, famille
- Conservation : statut IUCN (EX/EW/CR/EN/VU/NT/LC/DD/NE), tendance de population (increasing/decreasing/stable/unknown)
- Morphologie : longueur (min–max en mètres), poids (min–max en kg)
- Biologie : durée de vie, gestation, écholocation (oui/non), habitat (Océanique/Côtier/Estuarien/Eau douce)
- Activité : nombre total d'observations dans la base

**Référence des statuts IUCN :**
| Code | Signification |
|------|--------------|
| EX | Éteint |
| EW | Éteint à l'état sauvage |
| CR | En danger critique |
| EN | En danger |
| VU | Vulnérable |
| NT | Quasi menacé |
| LC | Préoccupation mineure |
| DD | Données insuffisantes |
| NE | Non évalué |

**Exemples de questions :**
- "Quel est le profil du cachalot ?"
- "Donne-moi des infos sur le dauphin de Commerson"
- "Taille et poids du rorqual bleu"

**Format de données reçu (`data`) :** objet espèce complet (voir schéma dans `shared/cetascope_shared/models/species.py`)

---

### `top_species` — Classement des espèces les plus observées

**Déclenché par :** questions sur les espèces les plus fréquemment rencontrées.

**Ce que l'utilisateur voit :**
- Un classement (liste ordonnée ou graphique en barres horizontales)
- Chaque entrée : nom scientifique de l'espèce + nombre d'observations
- Optionnellement filtré par zone géographique

**Exemples de questions :**
- "Quelles sont les espèces les plus observées ?"
- "Top 10 des espèces dans l'Atlantique Nord"
- "Espèces les plus communes en Méditerranée"

**Format de données reçu (`data`) :**
```json
[
  { "species_id": 12, "scientific_name": "Delphinus delphis", "count": 8430 },
  { "species_id": 42, "scientific_name": "Orcinus orca", "count": 6215 },
  ...
]
```

---

### `conservation` — Historique des statuts IUCN

**Déclenché par :** questions sur l'évolution du statut de conservation d'une espèce.

**Ce que l'utilisateur voit :**
- Une timeline ou un graphique chronologique montrant comment le statut IUCN d'une espèce a changé au fil des années
- Chaque point : année + statut (code IUCN) + portée (global ou régional)

**Exemples de questions :**
- "Montre l'historique IUCN du narval"
- "Comment le statut de conservation de la baleine boréale a-t-il évolué ?"

**Format de données reçu (`data`) :**
```json
[
  { "year": 1996, "iucn_status": "VU", "scope": "global" },
  { "year": 2008, "iucn_status": "LC", "scope": "global" },
  ...
]
```

---

### `text` — Réponse textuelle seule

**Déclenché par :** questions hors scope ou sans résultat correspondant.

**Ce que l'utilisateur voit :**
- Uniquement le message texte du chatbot dans la zone de conversation
- La zone de visualisation ne change pas (reste telle quelle)

**Exemples :**
- Question ambiguë sans espèce ou zone identifiable
- Aucune observation trouvée pour les critères demandés
- Question hors domaine (le chatbot le signale en français)

---

## Contrat API

### Point d'entrée unique du chatbot

```
POST /chat
Content-Type: application/json

{ "query": "question en français" }
```

**Réponse :**
```json
{
  "type": "map" | "choropleth" | "time_series" | "profile" | "top_species" | "conservation" | "text",
  "data": { ... } | [ ... ] | null,
  "message": "Réponse textuelle du chatbot en français"
}
```

**Comportement :**
- `type` détermine quel composant de visualisation afficher
- `data` contient les données brutes à passer au composant (null si `type === "text"`)
- `message` est toujours présent — c'est ce que le chatbot dit à l'utilisateur

---

### Endpoints directs (pour rechargement ou état initial)

Ces endpoints permettent de re-charger une visualisation sans repasser par le chat (ex : refresh de page, état initial).

| Endpoint | Usage UX |
|----------|----------|
| `GET /map/observations?species_id=&zone_id=&year_min=&year_max=` | Recharger la carte avec les mêmes filtres |
| `GET /analytics/time-series/{species_id}` | Recharger une courbe temporelle |
| `GET /analytics/top-species?zone_id=&limit=` | Recharger le classement |
| `GET /analytics/conservation-status` | Distribution globale des statuts IUCN (vue d'ensemble) |
| `GET /zones/{zone_id}/choropleth` | Recharger un choropleth |
| `GET /species/{species_id}` | Recharger une fiche espèce |
| `GET /species/{species_id}/conservation-history` | Recharger la timeline conservation |

---

## Flux utilisateurs complets

### Flux 1 — Exploration d'une espèce

1. L'utilisateur arrive sur l'interface (visualisation vide ou par défaut)
2. Il écrit : "Montre-moi les observations d'orques"
3. Le chatbot retourne `type: "map"` avec les points d'observation d'*Orcinus orca* dans le monde
4. La carte se met à jour avec ces points
5. L'utilisateur affine : "Seulement dans l'Atlantique Nord entre 2015 et 2022"
6. Le chatbot retourne une nouvelle réponse `type: "map"` avec les filtres appliqués
7. La carte se met à jour
8. L'utilisateur demande : "Donne-moi le profil de cette espèce"
9. Le chatbot retourne `type: "profile"` avec la fiche de l'orque
10. La zone de visualisation affiche désormais la fiche espèce

### Flux 2 — Analyse d'une zone géographique

1. L'utilisateur écrit : "Quelles espèces observe-t-on le plus en Méditerranée ?"
2. Le chatbot retourne `type: "top_species"` avec le classement filtré par zone
3. L'utilisateur demande : "Densité d'observations dans cette mer ?"
4. Le chatbot retourne `type: "choropleth"` avec le polygone Méditerranée coloré

### Flux 3 — Suivi de conservation

1. L'utilisateur écrit : "Comment va la population de baleines bleues ?"
2. Le chatbot retourne `type: "profile"` avec le statut IUCN actuel et la tendance
3. L'utilisateur demande : "Et son évolution historique ?"
4. Le chatbot retourne `type: "conservation"` avec la timeline IUCN

---

## Contraintes et comportements à anticiper

### Résolution automatique des noms

Le chatbot accepte les noms approximatifs, en français ou en anglais :
- "orque" → *Orcinus orca*
- "dauphin commun" → *Delphinus delphis*
- "Pacifique" → "North Pacific Ocean" ou "South Pacific Ocean" selon le contexte

Le frontend **n'a pas à gérer la résolution de noms** — c'est entièrement côté chatbot.

### Aucun résultat

Si le chatbot ne trouve pas de données, il répond `type: "text"` avec une explication. La zone de visualisation ne doit **pas se vider** dans ce cas — elle conserve la dernière visualisation affichée.

### Limites de données

- La carte (`map`) est limitée à **500 points** par réponse chatbot (limitation de performance)
- Le classement (`top_species`) retourne au maximum **50 espèces**
- Les séries temporelles couvrent les années **depuis 1900**

### Langue

- Le chatbot répond **toujours en français**
- Les questions peuvent être posées en français ou en anglais (le backend gère les deux)
- Les noms d'espèces sont affichés en **français** quand disponibles (`common_name_fr`)

---

## Données de référence

### Espèces (~90 cétacés)

Quelques exemples pour guider le design :

| Nom français | Nom scientifique | Statut IUCN |
|---|---|---|
| Orque | *Orcinus orca* | DD |
| Baleine bleue | *Balaenoptera musculus* | EN |
| Grand dauphin | *Tursiops truncatus* | LC |
| Cachalot | *Physeter macrocephalus* | VU |
| Narval | *Monodon monoceros* | LC |
| Dauphin commun | *Delphinus delphis* | LC |
| Béluga | *Delphinapterus leucas* | LC |
| Marsouin commun | *Phocoena phocoena* | LC |

### Zones géographiques

Grandes zones océaniques mondiales (noms IHO) : mer Méditerranée, Atlantique Nord, Pacifique Nord, océan Indien, mer du Nord, Antarctique, etc. — toutes avec noms français disponibles.

---

## Ce que Claude Design doit produire

À partir de ce document, le design doit permettre à un utilisateur de :

1. **Voir immédiatement** où poser sa question (zone chatbot visible et accessible)
2. **Comprendre** que la zone de droite/principale va réagir à sa question
3. **Lire facilement** chacun des 7 types de visualisation sur la même zone d'affichage
4. **Suivre le fil** de la conversation sans perdre le contexte de la visualisation en cours
5. **Comprendre** une réponse `text` sans se demander si quelque chose a planté

Le design doit être pensé pour un usage **desktop** en priorité (données scientifiques, longues sessions d'exploration), avec une interface en **deux panneaux** : chatbot à droite, visualisation principale à gauche et en bas.
