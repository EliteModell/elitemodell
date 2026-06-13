export type BrazilianLocation = {
  city: string;
  state: string;
};

type SupportedLocation = BrazilianLocation & {
  latitude: number;
  longitude: number;
};

export const SUPPORTED_PUBLIC_LOCATIONS: SupportedLocation[] = [
  { city: "São Paulo", state: "SP", latitude: -23.5505, longitude: -46.6333 },
  { city: "Rio de Janeiro", state: "RJ", latitude: -22.9068, longitude: -43.1729 },
  { city: "Brasília", state: "DF", latitude: -15.7939, longitude: -47.8828 },
  { city: "Belo Horizonte", state: "MG", latitude: -19.9167, longitude: -43.9345 },
  { city: "Itaúna", state: "MG", latitude: -20.0755, longitude: -44.5764 },
  { city: "Divinópolis", state: "MG", latitude: -20.1389, longitude: -44.8839 },
  { city: "Pará de Minas", state: "MG", latitude: -19.8606, longitude: -44.6083 },
  { city: "Brumadinho", state: "MG", latitude: -20.1436, longitude: -44.2 },
  { city: "Igarapé", state: "MG", latitude: -20.0703, longitude: -44.299 },
  { city: "Mateus Leme", state: "MG", latitude: -19.9865, longitude: -44.427 },
  { city: "Juatuba", state: "MG", latitude: -19.9517, longitude: -44.342 },
  { city: "Formiga", state: "MG", latitude: -20.4644, longitude: -45.426 },
  { city: "Oliveira", state: "MG", latitude: -20.6961, longitude: -44.827 },
];

const STATE_BY_NAME: Record<string, string> = {
  acre: "AC",
  alagoas: "AL",
  amapa: "AP",
  amazonas: "AM",
  bahia: "BA",
  ceara: "CE",
  "distrito federal": "DF",
  "espirito santo": "ES",
  goias: "GO",
  maranhao: "MA",
  "mato grosso": "MT",
  "mato grosso do sul": "MS",
  "minas gerais": "MG",
  para: "PA",
  paraiba: "PB",
  parana: "PR",
  pernambuco: "PE",
  piaui: "PI",
  "rio de janeiro": "RJ",
  "rio grande do norte": "RN",
  "rio grande do sul": "RS",
  rondonia: "RO",
  roraima: "RR",
  "santa catarina": "SC",
  "sao paulo": "SP",
  sergipe: "SE",
  tocantins: "TO",
};

export function normalizeLocationText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeBrazilianState(value: string | null | undefined) {
  const raw = (value ?? "").trim();
  if (!raw) return "";
  const code = raw.replace(/^BR-/i, "").toUpperCase();
  if (/^[A-Z]{2}$/.test(code)) return code;
  return STATE_BY_NAME[normalizeLocationText(raw)] ?? "";
}

export function canonicalizeBrazilianLocation(
  cityValue: string | null | undefined,
  stateValue: string | null | undefined,
): BrazilianLocation | null {
  let city = (cityValue ?? "").trim();
  let state = normalizeBrazilianState(stateValue);
  if (!city) return null;

  const cityParts = city.split(",").map((part) => part.trim()).filter(Boolean);
  if (cityParts.length > 1) {
    const possibleState = normalizeBrazilianState(cityParts.at(-1));
    if (!state && possibleState) state = possibleState;
    if (possibleState) city = cityParts.slice(0, -1).join(", ");
  }

  city = city
    .replace(/^munic[ií]pio\s+de\s+/i, "")
    .replace(/\s+/g, " ")
    .trim();

  const normalizedCity = normalizeLocationText(city);
  const supported = SUPPORTED_PUBLIC_LOCATIONS.find((location) =>
    normalizeLocationText(location.city) === normalizedCity &&
    (!state || location.state === state)
  );

  if (supported) {
    return { city: supported.city, state: supported.state };
  }

  return city && state ? { city, state } : null;
}

export function citySearchVariants(cityValue: string) {
  const normalized = normalizeLocationText(cityValue);
  const canonical = SUPPORTED_PUBLIC_LOCATIONS.find(
    (location) => normalizeLocationText(location.city) === normalized,
  )?.city ?? cityValue.trim();

  return Array.from(new Set([
    canonical,
    normalizeLocationText(canonical),
    cityValue.trim(),
  ].filter(Boolean)));
}

function distanceInKm(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const earthRadiusKm = 6371;
  const toRadians = (value: number) => value * Math.PI / 180;
  const latitudeDelta = toRadians(latitudeB - latitudeA);
  const longitudeDelta = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function nearestSupportedLocation(
  latitude: number,
  longitude: number,
  maxDistanceKm = 35,
): BrazilianLocation | null {
  const nearest = SUPPORTED_PUBLIC_LOCATIONS
    .map((location) => ({
      location,
      distance: distanceInKm(latitude, longitude, location.latitude, location.longitude),
    }))
    .sort((left, right) => left.distance - right.distance)[0];

  if (!nearest || nearest.distance > maxDistanceKm) return null;
  return { city: nearest.location.city, state: nearest.location.state };
}
