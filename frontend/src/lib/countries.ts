type Position = [number, number]

interface CountryFeatureCollection {
  features: CountryFeature[]
}

interface CountryFeature {
  geometry: {
    type: 'Polygon' | 'MultiPolygon'
    coordinates: Position[][] | Position[][][]
  }
  properties: {
    A3?: string
  }
}

const countryNamesByCode: Record<string, string> = {
  AFG: 'Afghanistan',
  AGO: 'Angola',
  ALA: 'Åland Islands',
  ALB: 'Albania',
  AND: 'Andorra',
  ARE: 'United Arab Emirates',
  ARG: 'Argentina',
  ARM: 'Armenia',
  ASM: 'American Samoa',
  ATA: 'Antarctica',
  ATF: 'French Southern Territories',
  ATG: 'Antigua and Barbuda',
  AUS: 'Australia',
  AUT: 'Austria',
  AZE: 'Azerbaijan',
  BDI: 'Burundi',
  BEL: 'Belgium',
  BEN: 'Benin',
  BES: 'Caribbean Netherlands',
  BFA: 'Burkina Faso',
  BGD: 'Bangladesh',
  BGR: 'Bulgaria',
  BHR: 'Bahrain',
  BHS: 'Bahamas',
  BIH: 'Bosnia and Herzegovina',
  BLR: 'Belarus',
  BLZ: 'Belize',
  BOL: 'Bolivia',
  BRA: 'Brazil',
  BRB: 'Barbados',
  BRN: 'Brunei',
  BTN: 'Bhutan',
  BWA: 'Botswana',
  CAF: 'Central African Republic',
  CAN: 'Canada',
  CHE: 'Switzerland',
  CHL: 'Chile',
  CHN: 'China',
  CIV: "Côte d'Ivoire",
  CMR: 'Cameroon',
  COD: 'Democratic Republic of the Congo',
  COG: 'Republic of the Congo',
  COL: 'Colombia',
  COM: 'Comoros',
  CPV: 'Cabo Verde',
  CRI: 'Costa Rica',
  CUB: 'Cuba',
  CUW: 'Curaçao',
  CXR: 'Christmas Island',
  CYP: 'Cyprus',
  CZE: 'Czechia',
  DEU: 'Germany',
  DJI: 'Djibouti',
  DMA: 'Dominica',
  DNK: 'Denmark',
  DOM: 'Dominican Republic',
  DZA: 'Algeria',
  ECU: 'Ecuador',
  EGY: 'Egypt',
  ERI: 'Eritrea',
  ESH: 'Western Sahara',
  ESP: 'Spain',
  EST: 'Estonia',
  ETH: 'Ethiopia',
  FIN: 'Finland',
  FJI: 'Fiji',
  FLK: 'Falkland Islands',
  FRA: 'France',
  FRO: 'Faroe Islands',
  FSM: 'Micronesia',
  GAB: 'Gabon',
  GBR: 'United Kingdom',
  GEO: 'Georgia',
  GHA: 'Ghana',
  GIN: 'Guinea',
  GLP: 'Guadeloupe',
  GMB: 'Gambia',
  GNB: 'Guinea-Bissau',
  GNQ: 'Equatorial Guinea',
  GRC: 'Greece',
  GRD: 'Grenada',
  GRL: 'Greenland',
  GTM: 'Guatemala',
  GUM: 'Guam',
  GUY: 'Guyana',
  HKG: 'Hong Kong',
  HMD: 'Heard Island and McDonald Islands',
  HND: 'Honduras',
  HRV: 'Croatia',
  HTI: 'Haiti',
  HUN: 'Hungary',
  IDN: 'Indonesia',
  IMN: 'Isle of Man',
  IND: 'India',
  IRL: 'Ireland',
  IRN: 'Iran',
  IRQ: 'Iraq',
  ISL: 'Iceland',
  ISR: 'Israel',
  ITA: 'Italy',
  JAM: 'Jamaica',
  JOR: 'Jordan',
  JPN: 'Japan',
  KAZ: 'Kazakhstan',
  KEN: 'Kenya',
  KGZ: 'Kyrgyzstan',
  KHM: 'Cambodia',
  KIR: 'Kiribati',
  KOR: 'South Korea',
  KWT: 'Kuwait',
  LAO: 'Laos',
  LBN: 'Lebanon',
  LBR: 'Liberia',
  LBY: 'Libya',
  LCA: 'Saint Lucia',
  LIE: 'Liechtenstein',
  LKA: 'Sri Lanka',
  LSO: 'Lesotho',
  LTU: 'Lithuania',
  LUX: 'Luxembourg',
  LVA: 'Latvia',
  MAF: 'Saint Martin',
  MAR: 'Morocco',
  MDA: 'Moldova',
  MDG: 'Madagascar',
  MEX: 'Mexico',
  MHL: 'Marshall Islands',
  MKD: 'North Macedonia',
  MLI: 'Mali',
  MLT: 'Malta',
  MMR: 'Myanmar',
  MNE: 'Montenegro',
  MNG: 'Mongolia',
  MNP: 'Northern Mariana Islands',
  MOZ: 'Mozambique',
  MRT: 'Mauritania',
  MTQ: 'Martinique',
  MUS: 'Mauritius',
  MWI: 'Malawi',
  MYS: 'Malaysia',
  MYT: 'Mayotte',
  NAM: 'Namibia',
  NCL: 'New Caledonia',
  NER: 'Niger',
  NGA: 'Nigeria',
  NIC: 'Nicaragua',
  NIU: 'Niue',
  NLD: 'Netherlands',
  NOR: 'Norway',
  NPL: 'Nepal',
  NZL: 'New Zealand',
  OMN: 'Oman',
  PAK: 'Pakistan',
  PAN: 'Panama',
  PER: 'Peru',
  PHL: 'Philippines',
  PLW: 'Palau',
  PNG: 'Papua New Guinea',
  POL: 'Poland',
  PRI: 'Puerto Rico',
  PRK: 'North Korea',
  PRT: 'Portugal',
  PRY: 'Paraguay',
  PSE: 'Palestine',
  PYF: 'French Polynesia',
  QAT: 'Qatar',
  REU: 'Réunion',
  ROU: 'Romania',
  RUS: 'Russia',
  RWA: 'Rwanda',
  SAU: 'Saudi Arabia',
  SDN: 'Sudan',
  SEN: 'Senegal',
  SGP: 'Singapore',
  SGS: 'South Georgia and South Sandwich Islands',
  SJM: 'Svalbard and Jan Mayen',
  SLB: 'Solomon Islands',
  SLE: 'Sierra Leone',
  SLV: 'El Salvador',
  SOM: 'Somalia',
  SRB: 'Serbia',
  SSD: 'South Sudan',
  STP: 'São Tomé and Príncipe',
  SUR: 'Suriname',
  SVK: 'Slovakia',
  SVN: 'Slovenia',
  SWE: 'Sweden',
  SWZ: 'Eswatini',
  SXM: 'Sint Maarten',
  SYC: 'Seychelles',
  SYR: 'Syria',
  TCA: 'Turks and Caicos Islands',
  TCD: 'Chad',
  TGO: 'Togo',
  THA: 'Thailand',
  TJK: 'Tajikistan',
  TKM: 'Turkmenistan',
  TLS: 'Timor-Leste',
  TON: 'Tonga',
  TTO: 'Trinidad and Tobago',
  TUN: 'Tunisia',
  TUR: 'Türkiye',
  TWN: 'Taiwan',
  TZA: 'Tanzania',
  UGA: 'Uganda',
  UKR: 'Ukraine',
  URY: 'Uruguay',
  USA: 'United States',
  UZB: 'Uzbekistan',
  VCT: 'Saint Vincent and the Grenadines',
  VEN: 'Venezuela',
  VNM: 'Vietnam',
  VUT: 'Vanuatu',
  WSM: 'Samoa',
  XCR: 'Crimea',
  XKX: 'Kosovo',
  XWS: 'Western Sahara',
  YEM: 'Yemen',
  ZAF: 'South Africa',
  ZMB: 'Zambia',
  ZWE: 'Zimbabwe',
}

let countriesPromise: Promise<CountryFeature[]> | null = null

export function getCountryName(countryCode?: string | null): string | null {
  const normalizedCode = countryCode?.trim().toUpperCase()

  if (!normalizedCode || normalizedCode === 'UNK') {
    return null
  }

  return countryNamesByCode[normalizedCode] ?? null
}

export async function findCountryCodeForPoint(
  point: Position,
): Promise<string | null> {
  const countries = await loadCountries()
  const country = countries.find((feature) => containsPoint(feature, point))

  return country?.properties.A3 ?? null
}

async function loadCountries(): Promise<CountryFeature[]> {
  countriesPromise ??= fetch('/countries.geo.json')
    .then((response) => {
      if (!response.ok) {
        throw new Error('Unable to load country boundaries.')
      }

      return response.json() as Promise<CountryFeatureCollection>
    })
    .then((collection) => collection.features)

  return countriesPromise
}

function containsPoint(feature: CountryFeature, point: Position): boolean {
  if (feature.geometry.type === 'Polygon') {
    return isInsidePolygon(point, feature.geometry.coordinates as Position[][])
  }

  return (feature.geometry.coordinates as Position[][][]).some((polygon) =>
    isInsidePolygon(point, polygon),
  )
}

function isInsidePolygon(point: Position, polygon: Position[][]): boolean {
  const [outerRing, ...holes] = polygon

  if (!outerRing || !isInsideRing(point, outerRing)) {
    return false
  }

  return !holes.some((hole) => isInsideRing(point, hole))
}

function isInsideRing([longitude, latitude]: Position, ring: Position[]) {
  let inside = false

  for (
    let index = 0, previous = ring.length - 1;
    index < ring.length;
    previous = index++
  ) {
    const [longitudeA, latitudeA] = ring[index]
    const [longitudeB, latitudeB] = ring[previous]
    const intersects =
      latitudeA > latitude !== latitudeB > latitude &&
      longitude <
        ((longitudeB - longitudeA) * (latitude - latitudeA)) /
          (latitudeB - latitudeA) +
          longitudeA

    if (intersects) {
      inside = !inside
    }
  }

  return inside
}
