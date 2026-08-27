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

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'Sterna-MVP/1.0 (POI catalogue generator)' },
  });
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
  // of "sovereign state". Taiwan and Kosovo are deliberately excluded from
  // Sterna's agreed MVP scope: 193 UN members + Palestine + Vatican City.
  codes.add('DK');
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

const selectedRows = codes.map((code) => firstByCountry.get(code));
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

const pois = codes.map((countryCode) => {
  const row = firstByCountry.get(countryCode);
  const name = row[columns.name];
  const entity = entities[row[columns.id]];
  return {
    countryCode,
    title: name,
    description: descriptionFor(row, entity, labels),
    longitude: row[columns.lon],
    latitude: row[columns.lat],
    imageUrl: `https://commons.wikimedia.org/wiki/Special:Redirect/file/${row[columns.img]}?width=960`,
  };
});

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
