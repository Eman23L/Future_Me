// Distance from her home to each job's town, using the free postcodes.io service
// (Ordnance Survey place names and postcodes). Results are cached on this laptop.

export type Point = { lat: number; lng: number };

const CACHE_KEY = "future-me:geo:v1";
type Cache = Record<string, Point | null>;

function readCache(): Cache {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}") as Cache;
  } catch {
    return {};
  }
}

// Merges into what's saved now, so lookups running at the same time don't overwrite each other.
function writeCache(patch: Cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...readCache(), ...patch }));
  } catch {
    // ignore storage limits
  }
}

const API = "https://api.postcodes.io";

// A full postcode ("L11 1EF"), an outcode ("L11", "M1") or a town ("Liverpool").
export async function findHome(query: string): Promise<Point | null> {
  const text = query.trim();
  if (!text) return null;
  const compact = text.replace(/\s+/g, "").toUpperCase();
  try {
    if (/^[A-Z]{1,2}\d[A-Z\d]?\d[A-Z]{2}$/.test(compact)) {
      const body = await (await fetch(`${API}/postcodes/${encodeURIComponent(compact)}`)).json();
      if (body?.result) return { lat: body.result.latitude, lng: body.result.longitude };
    }
    if (/^[A-Z]{1,2}\d[A-Z\d]?$/.test(compact)) {
      const body = await (await fetch(`${API}/outcodes/${encodeURIComponent(compact)}`)).json();
      if (body?.result) return { lat: body.result.latitude, lng: body.result.longitude };
    }
  } catch {
    // fall through to a place search
  }
  return findPlace(text);
}

const PLACE_TYPES = /City|Town|Village|Suburban Area|Hamlet|Other Settlement/i;

export async function findPlace(name: string): Promise<Point | null> {
  const key = name.trim().toLowerCase();
  if (!key) return null;
  const cache = readCache();
  if (key in cache) return cache[key];
  try {
    const body = await (await fetch(`${API}/places?q=${encodeURIComponent(name.trim())}&limit=5`)).json();
    const results: Array<{ name_1: string; local_type: string; latitude: number; longitude: number }> = body?.result ?? [];
    // Exact name first, then cities and towns before villages ("Hull" → Kingston upon Hull, not Hull Bridge).
    const rank = (type: string) => (/City/i.test(type) ? 0 : /Town/i.test(type) ? 1 : PLACE_TYPES.test(type) ? 2 : 3);
    const exact = results.find((place) => place.name_1.toLowerCase() === key && PLACE_TYPES.test(place.local_type));
    const best = exact ?? [...results].sort((a, b) => rank(a.local_type) - rank(b.local_type))[0];
    const point = best ? { lat: best.latitude, lng: best.longitude } : null;
    writeCache({ [key]: point });
    return point;
  } catch {
    return null; // not cached, so it's retried next time
  }
}

export function cachedPlace(name: string): Point | null | undefined {
  const cache = readCache();
  const key = name.trim().toLowerCase();
  return key in cache ? cache[key] : undefined;
}

export function milesBetween(a: Point, b: Point) {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.sqrt(h));
}

// The town to look up for a job: its location, else the last part of the employer line.
export function jobTown(job: { location: string; employer: string }) {
  const location = (job.location || "").replace(/^,\s*/, "").split(/,|\/| - /)[0].trim();
  return location;
}
