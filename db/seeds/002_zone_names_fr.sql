-- ============================================================
-- 002 — Noms français des zones géographiques (IHO World Seas v3) [A faire après la 005_fuzzy_search.sql]
-- ============================================================

-- Océans
UPDATE geographic_zones SET name_fr = 'Océan Atlantique Nord'     WHERE name = 'North Atlantic Ocean';
UPDATE geographic_zones SET name_fr = 'Océan Atlantique Sud'      WHERE name = 'South Atlantic Ocean';
UPDATE geographic_zones SET name_fr = 'Océan Pacifique Nord'      WHERE name = 'North Pacific Ocean';
UPDATE geographic_zones SET name_fr = 'Océan Pacifique Sud'       WHERE name = 'South Pacific Ocean';
UPDATE geographic_zones SET name_fr = 'Océan Indien'              WHERE name = 'Indian Ocean';
UPDATE geographic_zones SET name_fr = 'Océan Arctique'            WHERE name = 'Arctic Ocean';
UPDATE geographic_zones SET name_fr = 'Océan Austral'             WHERE name = 'Southern Ocean';

-- Europe / Atlantique Nord-Est
UPDATE geographic_zones SET name_fr = 'Mer Méditerranée'          WHERE name = 'Mediterranean Sea';
UPDATE geographic_zones SET name_fr = 'Mer Noire'                 WHERE name = 'Black Sea';
UPDATE geographic_zones SET name_fr = 'Mer Adriatique'            WHERE name = 'Adriatic Sea';
UPDATE geographic_zones SET name_fr = 'Mer Égée'                  WHERE name = 'Aegean Sea';
UPDATE geographic_zones SET name_fr = 'Mer Ionienne'              WHERE name = 'Ionian Sea';
UPDATE geographic_zones SET name_fr = 'Mer Tyrrhénienne'          WHERE name = 'Tyrrhenian Sea';
UPDATE geographic_zones SET name_fr = 'Mer Ligurienne'            WHERE name = 'Ligurian Sea';
UPDATE geographic_zones SET name_fr = 'Mer d''Alboran'            WHERE name = 'Alboran Sea';
UPDATE geographic_zones SET name_fr = 'Mer de Marmara'            WHERE name = 'Sea of Marmara';
UPDATE geographic_zones SET name_fr = 'Mer du Nord'               WHERE name = 'North Sea';
UPDATE geographic_zones SET name_fr = 'Mer Baltique'              WHERE name = 'Baltic Sea';
UPDATE geographic_zones SET name_fr = 'Mer de Norvège'            WHERE name = 'Norwegian Sea';
UPDATE geographic_zones SET name_fr = 'Mer du Groenland'          WHERE name = 'Greenland Sea';
UPDATE geographic_zones SET name_fr = 'Mer de Barents'            WHERE name = 'Barentsz Sea';
UPDATE geographic_zones SET name_fr = 'Mer d''Irlande'            WHERE name = 'Irish Sea';
UPDATE geographic_zones SET name_fr = 'Manche'                    WHERE name = 'English Channel';
UPDATE geographic_zones SET name_fr = 'Golfe de Gascogne'         WHERE name = 'Bay of Biscay';
UPDATE geographic_zones SET name_fr = 'Mer Blanche'               WHERE name = 'White Sea';
UPDATE geographic_zones SET name_fr = 'Mer de Kara'               WHERE name = 'Kara Sea';
UPDATE geographic_zones SET name_fr = 'Mer de Laptev'             WHERE name = 'Laptev Sea';
UPDATE geographic_zones SET name_fr = 'Mer de Sibérie Orientale'  WHERE name = 'East Siberian Sea';
UPDATE geographic_zones SET name_fr = 'Mer des Tchouktches'       WHERE name = 'Chukchi Sea';

-- Amériques
UPDATE geographic_zones SET name_fr = 'Mer des Caraïbes'          WHERE name = 'Caribbean Sea';
UPDATE geographic_zones SET name_fr = 'Golfe du Mexique'          WHERE name = 'Gulf of Mexico';
UPDATE geographic_zones SET name_fr = 'Baie d''Hudson'            WHERE name = 'Hudson Bay';
UPDATE geographic_zones SET name_fr = 'Mer de Beaufort'           WHERE name = 'Beaufort Sea';
UPDATE geographic_zones SET name_fr = 'Détroit de Davis'          WHERE name = 'Davis Strait';
UPDATE geographic_zones SET name_fr = 'Détroit du Danemark'       WHERE name = 'Denmark Strait';
UPDATE geographic_zones SET name_fr = 'Mer du Labrador'           WHERE name = 'Labrador Sea';
UPDATE geographic_zones SET name_fr = 'Golfe du Saint-Laurent'    WHERE name = 'Gulf of St. Lawrence';
UPDATE geographic_zones SET name_fr = 'Golfe de Californie'       WHERE name = 'Gulf of California';
UPDATE geographic_zones SET name_fr = 'Golfe d''Alaska'           WHERE name = 'Gulf of Alaska';

-- Océan Indien
UPDATE geographic_zones SET name_fr = 'Mer Rouge'                 WHERE name = 'Red Sea';
UPDATE geographic_zones SET name_fr = 'Mer d''Arabie'             WHERE name = 'Arabian Sea';
UPDATE geographic_zones SET name_fr = 'Golfe Persique'            WHERE name = 'Persian Gulf';
UPDATE geographic_zones SET name_fr = 'Golfe d''Oman'             WHERE name = 'Gulf of Oman';
UPDATE geographic_zones SET name_fr = 'Golfe d''Aden'             WHERE name = 'Gulf of Aden';
UPDATE geographic_zones SET name_fr = 'Golfe du Bengale'          WHERE name = 'Bay of Bengal';
UPDATE geographic_zones SET name_fr = 'Mer d''Andaman'            WHERE name = 'Andaman Sea';
UPDATE geographic_zones SET name_fr = 'Mer des Laquedives'        WHERE name = 'Laccadive Sea';
UPDATE geographic_zones SET name_fr = 'Canal du Mozambique'       WHERE name = 'Mozambique Channel';

-- Pacifique
UPDATE geographic_zones SET name_fr = 'Mer de Béring'             WHERE name = 'Bering Sea';
UPDATE geographic_zones SET name_fr = 'Mer d''Okhotsk'            WHERE name = 'Sea of Okhotsk';
UPDATE geographic_zones SET name_fr = 'Mer du Japon'              WHERE name = 'Japan Sea';
UPDATE geographic_zones SET name_fr = 'Mer de Chine orientale'    WHERE name = 'Eastern China Sea';
UPDATE geographic_zones SET name_fr = 'Mer de Chine Méridionale'  WHERE name = 'South China Sea';
UPDATE geographic_zones SET name_fr = 'Mer Jaune'                 WHERE name = 'Yellow Sea';
UPDATE geographic_zones SET name_fr = 'Mer des Philippines'       WHERE name = 'Philippine Sea';
UPDATE geographic_zones SET name_fr = 'Mer de Corail'             WHERE name = 'Coral Sea';
UPDATE geographic_zones SET name_fr = 'Mer de Tasman'             WHERE name = 'Tasman Sea';
UPDATE geographic_zones SET name_fr = 'Mer de Célèbes'            WHERE name = 'Celebes Sea';
UPDATE geographic_zones SET name_fr = 'Mer de Java'               WHERE name = 'Java Sea';
UPDATE geographic_zones SET name_fr = 'Mer de Banda'              WHERE name = 'Banda Sea';
UPDATE geographic_zones SET name_fr = 'Mer de Timor'              WHERE name = 'Timor Sea';
UPDATE geographic_zones SET name_fr = 'Mer d''Arafura'            WHERE name = 'Arafura Sea';
UPDATE geographic_zones SET name_fr = 'Mer des Moluques'          WHERE name = 'Molucca Sea';
UPDATE geographic_zones SET name_fr = 'Mer de Sulu'               WHERE name = 'Sulu Sea';
UPDATE geographic_zones SET name_fr = 'Mer de Florès'             WHERE name = 'Flores Sea';
UPDATE geographic_zones SET name_fr = 'Mer de Bali'               WHERE name = 'Bali Sea';
UPDATE geographic_zones SET name_fr = 'Mer de Savu'               WHERE name = 'Savu Sea';
UPDATE geographic_zones SET name_fr = 'Golfe de Thaïlande'        WHERE name = 'Gulf of Thailand';
UPDATE geographic_zones SET name_fr = 'Golfe du Tonkin'           WHERE name = 'Gulf of Tonkin';

-- Compléments noms français manquants

UPDATE geographic_zones SET name_fr = 'Mer d''Andaman (ou mer de Birmanie)' WHERE name = 'Andaman or Burma Sea';
UPDATE geographic_zones SET name_fr = 'Baie de Baffin' WHERE name = 'Baffin Bay';
UPDATE geographic_zones SET name_fr = 'Mer des Baléares (mer Ibérique)' WHERE name = 'Balearic (Iberian Sea)';
UPDATE geographic_zones SET name_fr = 'Mer de Barents' WHERE name = 'Barentsz Sea';
UPDATE geographic_zones SET name_fr = 'Détroit de Bass' WHERE name = 'Bass Strait';
UPDATE geographic_zones SET name_fr = 'Baie de Fundy' WHERE name = 'Bay of Fundy';
UPDATE geographic_zones SET name_fr = 'Mer de Bismarck' WHERE name = 'Bismarck Sea';
UPDATE geographic_zones SET name_fr = 'Canal de Bristol' WHERE name = 'Bristol Channel';
UPDATE geographic_zones SET name_fr = 'Mer Celtique' WHERE name = 'Celtic Sea';
UPDATE geographic_zones SET name_fr = 'Mer de Céram' WHERE name = 'Ceram Sea';
UPDATE geographic_zones SET name_fr = 'Mer de Chine orientale' WHERE name = 'Eastern China Sea';
UPDATE geographic_zones SET name_fr = 'Grande Baie australienne' WHERE name = 'Great Australian Bight';
UPDATE geographic_zones SET name_fr = 'Golfe d''Aqaba' WHERE name = 'Gulf of Aqaba';
UPDATE geographic_zones SET name_fr = 'Golfe de Boni' WHERE name = 'Gulf of Boni';
UPDATE geographic_zones SET name_fr = 'Golfe de Botnie' WHERE name = 'Gulf of Bothnia';
UPDATE geographic_zones SET name_fr = 'Golfe de Finlande' WHERE name = 'Gulf of Finland';
UPDATE geographic_zones SET name_fr = 'Golfe de Guinée' WHERE name = 'Gulf of Guinea';
UPDATE geographic_zones SET name_fr = 'Golfe de Riga' WHERE name = 'Gulf of Riga';
UPDATE geographic_zones SET name_fr = 'Golfe du Saint-Laurent' WHERE name = 'Gulf of St. Lawrence';
UPDATE geographic_zones SET name_fr = 'Golfe de Suez' WHERE name = 'Gulf of Suez';
UPDATE geographic_zones SET name_fr = 'Golfe de Tomini' WHERE name = 'Gulf of Tomini';
UPDATE geographic_zones SET name_fr = 'Mer de Halmahera' WHERE name = 'Halmahera Sea';
UPDATE geographic_zones SET name_fr = 'Détroit d''Hudson' WHERE name = 'Hudson Strait';
UPDATE geographic_zones SET name_fr = 'Mers intérieures au large de la côte ouest de l''Écosse' WHERE name = 'Inner Seas off the West Coast of Scotland';
UPDATE geographic_zones SET name_fr = 'Mer d''Irlande et canal Saint-Georges' WHERE name = 'Irish Sea and St. George''s Channel';
UPDATE geographic_zones SET name_fr = 'Mer du Japon' WHERE name = 'Japan Sea';
UPDATE geographic_zones SET name_fr = 'Kattegat' WHERE name = 'Kattegat';
UPDATE geographic_zones SET name_fr = 'Mer de Lincoln' WHERE name = 'Lincoln Sea';
UPDATE geographic_zones SET name_fr = 'Détroit de Makassar' WHERE name = 'Makassar Strait';
UPDATE geographic_zones SET name_fr = 'Détroit de Malacca' WHERE name = 'Malacca Strait';
UPDATE geographic_zones SET name_fr = 'Mer Méditerranée orientale' WHERE name = 'Mediterranean Sea - Eastern Basin';
UPDATE geographic_zones SET name_fr = 'Mer Méditerranée occidentale' WHERE name = 'Mediterranean Sea - Western Basin';
UPDATE geographic_zones SET name_fr = 'Mer des Moluques' WHERE name = 'Molukka Sea';
UPDATE geographic_zones SET name_fr = 'Rio de la Plata' WHERE name = 'Rio de La Plata';
UPDATE geographic_zones SET name_fr = 'Mer d''Azov' WHERE name = 'Sea of Azov';
UPDATE geographic_zones SET name_fr = 'Mer intérieure de Seto' WHERE name = 'Seto Naikai or Inland Sea';
UPDATE geographic_zones SET name_fr = 'Détroit de Singapour' WHERE name = 'Singapore Strait';
UPDATE geographic_zones SET name_fr = 'Skagerrak' WHERE name = 'Skagerrak';
UPDATE geographic_zones SET name_fr = 'Mer des Salomon' WHERE name = 'Solomon Sea';
UPDATE geographic_zones SET name_fr = 'Détroit de Gibraltar' WHERE name = 'Strait of Gibraltar';
UPDATE geographic_zones SET name_fr = 'Eaux côtières du sud-est de l''Alaska et de la Colombie-Britannique' WHERE name = 'The Coastal Waters of Southeast Alaska and British Columbia';
UPDATE geographic_zones SET name_fr = 'Passages du Nord-Ouest' WHERE name = 'The Northwestern Passages';