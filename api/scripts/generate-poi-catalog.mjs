import { readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const SOURCE_URL =
  'https://raw.githubusercontent.com/Flightmussy/detourmap-places/main/data/places-compact.json';
const WIKIDATA_ENDPOINT = 'https://query.wikidata.org/sparql';
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const OUTPUT = new URL('../src/pois/poi.catalog.ts', import.meta.url);

const sovereignStatesQuery = `
  SELECT ?iso WHERE {
    ?country wdt:P31 wd:Q3624078;
             wdt:P297 ?iso.
  }
`;

async function fetchJson(url, attempt = 0) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Sterna-MVP/1.0 (POI catalogue generator)' },
  });
  if (response.status === 429 && attempt < 4) {
    const retryAfter =
      Number(response.headers.get('retry-after')) || 2 ** attempt;
    await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
    return fetchJson(url, attempt + 1);
  }
  if (!response.ok)
    throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

async function countryCodes() {
  const url = `${WIKIDATA_ENDPOINT}?query=${encodeURIComponent(sovereignStatesQuery)}&format=json`;
  const data = await fetchJson(url);
  const codes = new Set(
    data.results.bindings.map((binding) => binding.iso.value),
  );

  // Wikidata models Denmark as a constituent country instead of an instance
  // of "sovereign state", and (as of this writing) no longer satisfies both
  // P31/P297 for Vatican City either — a live, editable dataset, so this
  // drifts occasionally. Taiwan and Kosovo are deliberately excluded from
  // Sterna's agreed MVP scope: 193 UN members + Palestine + Vatican City.
  codes.add('DK');
  codes.add('VA');
  codes.delete('TW');
  codes.delete('XK');
  return [...codes].sort();
}

async function wikidataEntities(ids, props = 'claims|labels') {
  const entities = {};
  for (let offset = 0; offset < ids.length; offset += 50) {
    const batch = ids.slice(offset, offset + 50);
    const url = `${WIKIDATA_API}?action=wbgetentities&format=json&languages=en&props=${encodeURIComponent(props)}&ids=${batch.join('|')}&origin=*`;
    const data = await fetchJson(url);
    Object.assign(entities, data.entities);
  }
  return entities;
}

function claimValue(entity, property) {
  return entity?.claims?.[property]?.[0]?.mainsnak?.datavalue?.value ?? null;
}

function entityId(entity, property) {
  return claimValue(entity, property)?.id ?? null;
}

function yearFromClaim(entity, property) {
  const time = claimValue(entity, property)?.time;
  const match = typeof time === 'string' ? time.match(/^([+-]\d+)/) : null;
  return match ? Number(match[1]) : null;
}

function quantityFromClaim(entity, property, labels) {
  const claim = claimValue(entity, property);
  const amount = claim?.amount;
  const value = typeof amount === 'string' ? Number(amount) : Number.NaN;
  if (!Number.isFinite(value)) return null;
  const unitId =
    typeof claim.unit === 'string' && claim.unit.includes('/Q')
      ? claim.unit.split('/').at(-1)
      : null;
  const unit = labelFor(labels, unitId);
  const rounded = Math.round(value * 10) / 10;
  return unit
    ? `${rounded.toLocaleString('en-US')} ${unit}${rounded === 1 ? '' : 's'}`
    : rounded.toLocaleString('en-US');
}

function labelFor(labels, id) {
  return id ? (labels[id]?.labels?.en?.value ?? null) : null;
}

function sentence(value) {
  const text = value.trim().replace(/\s+/g, ' ');
  if (!text) return '';
  const capitalized = text[0].toUpperCase() + text.slice(1);
  return /[.!?]$/.test(capitalized) ? capitalized : `${capitalized}.`;
}

const appealByCategory = {
  ancient:
    'Its surviving remains offer a tangible connection with the people, traditions and events that shaped the region.',
  monument:
    'Its form and symbolism make it a memorable expression of local history and identity.',
  sacred:
    'Its architecture and living traditions reveal an important part of the spiritual and cultural life of the region.',
  beach:
    'Its shoreline and surrounding landscape offer a striking encounter with the country’s natural beauty.',
  waterfall:
    'The movement, sound and scale of the water create a powerful natural spectacle best appreciated on site.',
  cave: 'Its underground formations and atmosphere reveal a landscape hidden from the surface world.',
  volcanic:
    'Its dramatic terrain provides a close view of the geological forces that continue to shape the landscape.',
  natural:
    'Its scenery and ecosystems showcase a distinctive part of the country’s natural heritage.',
  tower:
    'Its distinctive silhouette and views have made it an enduring landmark of the surrounding area.',
  structure:
    'Its design reflects the engineering, craftsmanship and ambitions of the period in which it was created.',
  castle:
    'Its architecture and setting preserve stories of power, defence and daily life across generations.',
  military:
    'The site preserves an important and often complex chapter of the region’s history.',
  abandoned:
    'Its remaining structures create an evocative link with a place and way of life that have changed over time.',
  macabre:
    'The site invites thoughtful reflection on difficult events and the importance of preserving their memory.',
  museum:
    'Its collections bring together objects and stories that make the country’s history and creativity easier to understand.',
  garden:
    'Its carefully shaped landscapes provide a peaceful way to experience local plants, design and outdoor culture.',
  leisure:
    'Its atmosphere and activities make it a lively place to experience the destination beyond its monuments.',
};

// Upstream currently exposes the bridge's construction date as the year 1000.
// Keep the verified opening year until that Wikidata-derived value is fixed.
const yearOverrides = { Q54495: 1932 };

// The Wikidata-linked Commons file is sometimes missing, low resolution, or
// not representative of the place (e.g. a detail shot instead of a full
// view). Override with a better Commons filename (as used in the file's own
// "Special:Redirect/file/<name>" URL) when one is identified. Keyed by the
// place's Wikidata QID (row[columns.id]) rather than country code, since a
// country can now contribute more than one POI.
const imageOverrides = {
  // Palace of the Shirvanshahs (AZ): Wikidata-linked image was a close-up
  // of a wall/relief detail, not the palace itself.
  Q338889: 'Palace_of_Shirvanshahs_common.JPG',
  // Nidhe Israel Synagogue (BB): Wikidata-linked image was obscured by
  // foliage and a parked car.
  Q2975704: '161115_Nidhe_Israel_Synagogue.jpg',
  // Sofala (MZ): Wikidata-linked image was a 17th-century engraving, not a
  // photo.
  Q1361151: 'Les ruines du Fort de Sofala en 2018.jpg',
  // Pipeline Mosque (GM): Wikidata-linked image was a cluttered street
  // scene (billboards, cars).
  Q1408792: 'Kanifing Pipeline mosque 2025 1A.jpg',
  // Adulis (ER): Wikidata-linked image was a historical map, not a photo
  // of the site.
  Q378940: 'Adulis (8529061940).jpg',
  // Mount Longonot (KE): Wikidata-linked file ("Copy of IMG 1654.jpg") no
  // longer exists on Commons — was a dead link.
  Q1520750: 'Mount Longonot in Kenya 01.jpg',
  // Angkor Wat (KH): Wikidata-linked image was low-resolution and had
  // tourists in frame.
  Q43473: 'Angkor Wat with its reflection (cropped).jpg',
  // Pinatubo (PH): Wikidata-linked image was low-resolution (480x360).
  Q1451: 'Crater Lake at the Mount Pinatubo Caldera in the Philippines.jpg',
  // Found while extending coverage to up to 5 POIs/country: heuristic scan
  // (low resolution / non-photo Commons category) flagged these, verified
  // visually against the best alternative Commons search turned up.
  // Red Fort (IN): tagged under a national-flag photo category, not a full
  // view of the fort.
  Q45957: 'Red Fort in Delhi 03-2016 img3.jpg',
  // Katla (IS): a low-resolution 1918 archival photo.
  Q201914: 'Katla Volcano from the South.jpg',
  // Avukana Buddha statue (LK): low resolution.
  Q3491563: 'Avukana Buddha Statue 15.JPG',
  // National Museum of Qatar (QA): Wikidata-linked file no longer exists on
  // Commons — dead link.
  Q3084218: 'National Museum of Qatar 11.jpg',
  // Hegra (SA): Wikidata-linked file no longer exists on Commons — dead
  // link.
  Q27356: "27, Hegra (Mada'in Salih), Saudi Arabia.jpg",
  // Fakr ad-Din Mosque (SO): Wikidata-linked image was an 1882 engraving,
  // not a photo.
  Q186169: 'Fakr-ad-din-mosque.jpg',
  // Laetoli (TZ): low-resolution distant landscape; the footprints are the
  // actual notable feature.
  Q672146: 'Laetoli Footprints Site A (2).jpg',
  // Niagara Falls (US): extreme aspect ratio (4:1 panorama) that would
  // still crop heavily even against the app's clamped detail-page ratio.
  Q34221: 'Horseshoe Falls (Niagara Falls).jpg',
  // Mauna Kea (US): low resolution.
  Q131230: 'Mauna Kea from the sky.jpg',
  // Botanic Gardens St. Vincent (VC): showed a parrot instead of the
  // gardens.
  Q4948422:
    'St. Vincent, Karibik - Botanical Garden of Kingstown - panoramio.jpg',
  // Ngonye Falls (ZM): low resolution; an aerial shot is available.
  Q1650303: 'Ngonye falls at Zambezi river, Zambia (aerial view).jpg',
  // Great Zimbabwe (ZW): low-resolution close-up of one wall section.
  Q209217: 'Great Zimbabwe - aerial view.jpg',
  // Dharahara (NP): a low-resolution pre-1934 archival photo.
  Q5269090: 'DHARAHARA TOWER.jpg',
  // Mount Elgon (UG): Wikidata-linked image was a topographic map, not a
  // photo.
  Q732838: 'Mount Elgon-Wagagai.jpg',
};

function historicalDate(year) {
  if (!Number.isInteger(year)) return null;
  if (year < 0) {
    return `Its documented history reaches back to approximately ${Math.abs(year)} BCE.`;
  }
  return `Its documented history dates to approximately ${year}.`;
}

function descriptionFor(row, entity, labels) {
  const baseDescription = sentence(row[columns.desc]);
  const appeal = appealByCategory[row[columns.cat]] ?? appealByCategory.natural;
  const details = [];
  const year =
    yearOverrides[row[columns.id]] ??
    row[columns.year] ??
    yearFromClaim(entity, 'P571') ??
    yearFromClaim(entity, 'P1619');
  const dateDetail = historicalDate(year);
  if (dateDetail) details.push(dateDetail);

  const architect = labelFor(labels, entityId(entity, 'P84'));
  const creator = labelFor(labels, entityId(entity, 'P170'));
  if (architect) details.push(`Its design is credited to ${architect}.`);
  else if (creator) details.push(`Its creation is associated with ${creator}.`);

  const purpose = labelFor(labels, entityId(entity, 'P366'));
  if (purpose) {
    details.push(`One of its documented purposes is ${purpose}.`);
  }

  const height = quantityFromClaim(entity, 'P2048', labels);
  const elevation = quantityFromClaim(entity, 'P2044', labels);
  const length = quantityFromClaim(entity, 'P2043', labels);
  const width = quantityFromClaim(entity, 'P2049', labels);
  const depth = quantityFromClaim(entity, 'P4511', labels);
  if (height) {
    details.push(`The structure reaches approximately ${height} in height.`);
  } else if (elevation) {
    details.push(`The site stands approximately ${elevation} above sea level.`);
  }
  if (length) {
    details.push(`It extends for approximately ${length}.`);
  } else if (depth) {
    details.push(`Its recorded depth is approximately ${depth}.`);
  } else if (width) {
    details.push(`Its recorded width is approximately ${width}.`);
  }

  const style = labelFor(labels, entityId(entity, 'P149'));
  const material = labelFor(labels, entityId(entity, 'P186'));
  if (style) details.push(`Its architecture is associated with ${style}.`);
  if (material) details.push(`A notable construction material is ${material}.`);

  const namesake = labelFor(labels, entityId(entity, 'P138'));
  if (namesake) details.push(`The place takes its name from ${namesake}.`);

  const designation = labelFor(labels, entityId(entity, 'P1435'));
  if (designation) {
    details.push(`It holds the heritage designation “${designation}”.`);
  }

  return [baseDescription, appeal, ...details.slice(0, 4)].join(' ');
}

const sourcePath = join(tmpdir(), 'sterna-places.json');
let source;
try {
  source = JSON.parse(await readFile(sourcePath, 'utf8'));
} catch {
  source = await fetchJson(SOURCE_URL);
}

const columns = Object.fromEntries(
  source.columns.map((column, index) => [column, index]),
);
const codes = await countryCodes();
// Every country's slot 0 is chosen exactly as before (override, then most
// linked, then any-category/country-name fallback) so the existing 195
// primary POIs — and the image fixes tied to them — do not change. Slots
// 1..MAX_EXTRA_POIS_PER_COUNTRY-1 add further distinct, tourist-category
// places per country, most-linked first, so a well-documented country
// contributes more rows than a sparsely-documented one.
const MAX_POIS_PER_COUNTRY = 5;
const firstByCountry = new Map();
const countryNameFallbacks = { NL: 'Netherlands' };
const landmarkOverrides = {
  AT: 'Schönbrunn Palace',
  CH: 'Matterhorn',
  DE: 'Brandenburg Gate',
  NZ: 'Milford Sound / Piopiotahi',
  PL: 'Wawel Castle',
  UA: 'Saint Sophia Cathedral',
  YE: "Great Mosque of Sana'a",
};
const pointLikeCategories = new Set([
  'ancient',
  'monument',
  'sacred',
  'waterfall',
  'cave',
  'volcanic',
  'tower',
  'structure',
  'castle',
  'museum',
  'garden',
  'leisure',
]);

for (const [iso, title] of Object.entries(landmarkOverrides)) {
  const row = source.rows.find(
    (candidate) =>
      candidate[columns.iso] === iso && candidate[columns.name] === title,
  );
  if (!row) throw new Error(`Missing landmark override ${iso}: ${title}`);
  firstByCountry.set(iso, row);
}

// The source is ordered by Wikidata sitelink count. The first row for a
// country is therefore its most widely documented place.
for (const row of source.rows) {
  const iso = row[columns.iso];
  if (
    codes.includes(iso) &&
    pointLikeCategories.has(row[columns.cat]) &&
    !firstByCountry.has(iso)
  ) {
    firstByCountry.set(iso, row);
  }
}

// Small states do not always have a monument-like record. Preserve complete
// coverage by falling back to their most notable natural place.
for (const row of source.rows) {
  const iso = row[columns.iso];
  if (codes.includes(iso) && !firstByCountry.has(iso)) {
    firstByCountry.set(iso, row);
  }
}

for (const [iso, countryName] of Object.entries(countryNameFallbacks)) {
  if (firstByCountry.has(iso)) continue;
  const matchingRows = source.rows.filter(
    (candidate) => candidate[columns.country] === countryName,
  );
  const row =
    matchingRows.find((candidate) =>
      pointLikeCategories.has(candidate[columns.cat]),
    ) ?? matchingRows[0];
  if (row) firstByCountry.set(iso, row);
}

const missing = codes.filter((code) => !firstByCountry.has(code));
if (codes.length !== 195 || missing.length) {
  throw new Error(
    `Expected 195 covered countries, received ${codes.length}; missing: ${missing.join(', ')}`,
  );
}

// Beyond each country's slot 0 (picked above), add up to
// MAX_POIS_PER_COUNTRY - 1 further distinct tourist-category places, in the
// source's existing most-linked-first order. A country with fewer
// qualifying places simply contributes fewer rows.
const extraByCountry = new Map(codes.map((code) => [code, []]));
for (const row of source.rows) {
  const iso = row[columns.iso];
  if (!codes.includes(iso)) continue;
  if (!pointLikeCategories.has(row[columns.cat])) continue;
  if (row === firstByCountry.get(iso)) continue;
  const extras = extraByCountry.get(iso);
  if (extras.length < MAX_POIS_PER_COUNTRY - 1) extras.push(row);
}
const rowsByCountry = new Map(
  codes.map((code) => [
    code,
    [firstByCountry.get(code), ...extraByCountry.get(code)],
  ]),
);

const selectedRows = codes.flatMap((code) => rowsByCountry.get(code));
const entities = await wikidataEntities(
  selectedRows.map((row) => row[columns.id]),
);
const linkedIds = new Set();
for (const entity of Object.values(entities)) {
  for (const property of [
    'P84',
    'P170',
    'P366',
    'P149',
    'P186',
    'P138',
    'P1435',
  ]) {
    const id = entityId(entity, property);
    if (id) linkedIds.add(id);
  }
  for (const property of ['P2048', 'P2044', 'P2043', 'P2049', 'P4511']) {
    const unit = claimValue(entity, property)?.unit;
    if (typeof unit === 'string' && unit.includes('/Q')) {
      linkedIds.add(unit.split('/').at(-1));
    }
  }
}
const labels = await wikidataEntities([...linkedIds], 'labels');

const pois = codes.flatMap((countryCode) =>
  rowsByCountry.get(countryCode).map((row) => {
    const name = row[columns.name];
    const qid = row[columns.id];
    const entity = entities[qid];
    return {
      countryCode,
      title: name,
      description: descriptionFor(row, entity, labels),
      longitude: row[columns.lon],
      latitude: row[columns.lat],
      // Unlike row[columns.img] (already percent-encoded by the upstream
      // dataset), imageOverrides holds plain Commons filenames and must be
      // encoded here.
      imageUrl: `https://commons.wikimedia.org/wiki/Special:Redirect/file/${imageOverrides[qid] ? encodeURIComponent(imageOverrides[qid]) : row[columns.img]}?width=1600`,
    };
  }),
);

const generated = `/**
 * Generated by scripts/generate-poi-catalog.mjs from Detourmap Places.
 * Source data is CC0 and derived from Wikidata. Image URLs resolve to files
 * hosted by Wikimedia Commons; each file retains its own licence.
 */
export interface PoiCatalogEntry {
  countryCode: string;
  title: string;
  description: string;
  longitude: number;
  latitude: number;
  imageUrl: string;
}

export const POI_CATALOG: readonly PoiCatalogEntry[] = ${JSON.stringify(pois, null, 2)};
`;

await writeFile(OUTPUT, generated, 'utf8');
console.log(`Generated ${pois.length} POIs in ${OUTPUT.pathname}`);
