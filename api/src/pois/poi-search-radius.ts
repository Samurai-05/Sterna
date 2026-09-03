/**
 * How far away someone can realistically take a recognizable photo of a POI,
 * inferred from its category. A single flat radius meant a photo anywhere in
 * central Paris matched every French POI, including Versailles ~17km away —
 * a museum facade or a cathedral is only recognizable from a few hundred
 * metres, while a mountain or a tall tower stays recognizable from several
 * kilometres, so one radius for every POI is either too tight for the
 * latter or too loose for the former.
 *
 * poi.catalog.ts has no structured category column (see PoiCatalogEntry),
 * but scripts/generate-poi-catalog.mjs writes one fixed "appeal" sentence
 * per category into every description it generates (its own
 * `appealByCategory` map). That sentence is the only surviving trace of the
 * category, so it doubles as a classifier key here. If that map's wording
 * ever changes, keep this one in sync — a mismatch only widens back toward
 * the old flat radius for newly generated POIs, it doesn't break anything.
 */
const APPEAL_SENTENCE_BY_CATEGORY: Record<string, string> = {
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

// Mountains, volcanoes and other big, exposed terrain stay recognizable from
// far away (the Matterhorn from Zermatt village is ~8.5km). Tall, deliberately
// visible built structures and open natural features (a waterfall heard and
// seen from a viewpoint, a beach along a coastline) get a mid-sized radius.
// Everything else — a monument, a cathedral facade, a museum, a cave — only
// reads as itself in a photo taken close to it.
const CLOSE_RADIUS_METERS = 1_000;
const MID_RADIUS_METERS = 5_000;
const FAR_RADIUS_METERS = 20_000;

const RADIUS_METERS_BY_CATEGORY: Record<string, number> = {
  natural: FAR_RADIUS_METERS,
  volcanic: FAR_RADIUS_METERS,
  tower: MID_RADIUS_METERS,
  structure: MID_RADIUS_METERS,
  waterfall: MID_RADIUS_METERS,
  beach: MID_RADIUS_METERS,
  castle: MID_RADIUS_METERS,
  military: MID_RADIUS_METERS,
  monument: CLOSE_RADIUS_METERS,
  sacred: CLOSE_RADIUS_METERS,
  ancient: CLOSE_RADIUS_METERS,
  museum: CLOSE_RADIUS_METERS,
  garden: CLOSE_RADIUS_METERS,
  leisure: CLOSE_RADIUS_METERS,
  abandoned: CLOSE_RADIUS_METERS,
  macabre: CLOSE_RADIUS_METERS,
  cave: CLOSE_RADIUS_METERS,
};

// generate-poi-catalog.mjs itself falls back to appealByCategory.natural for
// an unrecognized source category, so an unmatched description here is most
// likely still a natural feature — matching that fallback keeps the two in
// sync rather than silently under-radiusing an edge case.
const DEFAULT_RADIUS_METERS = FAR_RADIUS_METERS;

export function poiConfirmSearchRadiusMeters(
  description: string | null,
): number {
  if (!description) return DEFAULT_RADIUS_METERS;

  for (const [category, sentence] of Object.entries(
    APPEAL_SENTENCE_BY_CATEGORY,
  )) {
    if (description.includes(sentence)) {
      return RADIUS_METERS_BY_CATEGORY[category];
    }
  }
  return DEFAULT_RADIUS_METERS;
}
