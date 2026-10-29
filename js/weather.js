// Weather model: 8 weather types, each a set of numbers the world blends towards (see main.js),
// a small Markov chain for "auto weather", and real conditions from Open-Meteo (free, no key).
// Coordinates stay in this browser, rounded to ~1 km, and are only sent to Open-Meteo.
export const WX_LIST = ['clear', 'cloudy', 'windy', 'rain', 'storm', 'snow', 'fog', 'heat'];
export const WX_ICON = { clear: '🌤️', cloudy: '☁️', windy: '🌬️', rain: '🌧️', storm: '⛈️', snow: '🌨️', fog: '🌫️', heat: '🌡️' };
export const WX_NAME = { clear: 'Clear', cloudy: 'Cloudy', windy: 'Windy', rain: 'Rain', storm: 'Storm', snow: 'Snow', fog: 'Fog', heat: 'Heatwave' };

// cloud: cover 0-1 · gloom: sky/light darkening · rain/snow: precipitation · wind: 0-1 · fogN/fogF: fog distances
// lit: sunlight multiplier · heat: dryness/shimmer · spd: walking speed · fish: bite rate · storm: lightning
export const WX = {
  clear:  { cloud: .18, gloom: 0,   rain: 0,   snow: 0,   wind: .15, fogN: 35, fogF: 90, lit: 1,    heat: 0, spd: 1,   fish: 1,   storm: 0 },
  cloudy: { cloud: .85, gloom: .38, rain: 0,   snow: 0,   wind: .32, fogN: 30, fogF: 85, lit: .78,  heat: 0, spd: 1,   fish: 1.25, storm: 0 },
  windy:  { cloud: .5,  gloom: .1,  rain: 0,   snow: 0,   wind: 1,   fogN: 35, fogF: 90, lit: .95,  heat: 0, spd: .95, fish: .8,  storm: 0 },
  rain:   { cloud: 1,   gloom: .62, rain: .55, snow: 0,   wind: .45, fogN: 22, fogF: 70, lit: .62,  heat: 0, spd: .92, fish: 1.7, storm: 0 },
  storm:  { cloud: 1,   gloom: .92, rain: 1,   snow: 0,   wind: .95, fogN: 14, fogF: 56, lit: .36,  heat: 0, spd: .8,  fish: 0,   storm: 1 },
  snow:   { cloud: .9,  gloom: .36, rain: 0,   snow: .85, wind: .25, fogN: 18, fogF: 62, lit: .85,  heat: 0, spd: .86, fish: .5,  storm: 0 },
  fog:    { cloud: .6,  gloom: .3,  rain: 0,   snow: 0,   wind: .05, fogN: 3,  fogF: 24, lit: .75,  heat: 0, spd: .95, fish: 1.2, storm: 0 },
  heat:   { cloud: 0,   gloom: 0,   rain: 0,   snow: 0,   wind: .05, fogN: 40, fogF: 100, lit: 1.18, heat: 1, spd: .92, fish: .6,  storm: 0 },
};

// A weather type that can't exist at this temperature turns into its nearest neighbour.
export function fit(wx, cold) {
  if (cold) return wx === 'heat' ? 'clear' : wx === 'rain' || wx === 'storm' ? 'snow' : wx;
  return wx === 'snow' ? 'rain' : wx;
}

const NEXT = {
  clear:  { clear: 2, cloudy: 4.5, windy: 1.5, heat: 1.2, fog: .8 },
  cloudy: { clear: 3, windy: 1.5, rain: 3, fog: 1, snow: 2, cloudy: .8 },
  windy:  { clear: 3, cloudy: 3.5, rain: 2, storm: 1 },
  rain:   { cloudy: 4, storm: 2.2, clear: 1.5, fog: 1, rain: 1 },
  storm:  { rain: 5.5, cloudy: 3, clear: 1.5 },
  snow:   { cloudy: 3.5, clear: 3, fog: 2.5, snow: 1 },
  fog:    { clear: 4, cloudy: 4, rain: 1, snow: 1 },
  heat:   { clear: 6, cloudy: 2, windy: 1, storm: 1 },
};
export function nextWx(cur, cold, rnd = Math.random) {
  const w = {};
  for (const [k, v] of Object.entries(NEXT[cur] || NEXT.clear)) { const f = fit(k, cold); w[f] = (w[f] || 0) + v; }
  let x = rnd() * Object.values(w).reduce((a, b) => a + b, 0);
  for (const [k, v] of Object.entries(w)) if ((x -= v) < 0) return k;
  return 'clear';
}

// a plausible temperature when the weather is made up (live mode shows the real one)
export const fakeTemp = (wx, night, cold) =>
  Math.round((cold ? (night ? -6 : 1) : (night ? 15 : 24)) + ({ rain: -4, storm: -5, heat: 9, cloudy: -2, snow: -3, fog: -1, windy: -2, clear: 0 }[wx] || 0));

const KEY = 'island.loc', CACHE = 'island.wxlive', TTL = 15 * 60 * 1000;
export async function liveWeather() {
  try { const c = JSON.parse(localStorage.getItem(CACHE) || 'null'); if (c && Date.now() - c.t < TTL) return c.r; } catch {}
  let loc = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (!loc) {
    loc = await new Promise((ok, no) => navigator.geolocation.getCurrentPosition(
      p => ok({ lat: +p.coords.latitude.toFixed(2), lon: +p.coords.longitude.toFixed(2) }), no, { timeout: 10000 }));
    localStorage.setItem(KEY, JSON.stringify(loc));
  }
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,weather_code,is_day,wind_speed_10m,cloud_cover&timezone=auto`);
  const c = (await r.json()).current, w = c.weather_code, cold = c.temperature_2m < 12;
  const wx = w >= 95 ? 'storm'
    : [71, 73, 75, 77, 85, 86].includes(w) ? 'snow'
    : (w >= 51 && w <= 67) || (w >= 80 && w <= 82) ? 'rain'
    : [45, 48].includes(w) ? 'fog'
    : c.wind_speed_10m >= 32 ? 'windy'
    : c.temperature_2m >= 31 ? 'heat'
    : c.cloud_cover >= 65 || w === 3 ? 'cloudy' : 'clear';
  const res = { night: !c.is_day, cold: cold || wx === 'snow', wx: fit(wx, cold || wx === 'snow'), temp: Math.round(c.temperature_2m) };
  try { localStorage.setItem(CACHE, JSON.stringify({ t: Date.now(), r: res })); } catch {}
  return res;
}
