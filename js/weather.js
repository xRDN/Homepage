// Real conditions from Open-Meteo (free, no key). Coordinates stay in this browser,
// rounded to ~1 km, and are only sent to Open-Meteo.
const KEY = 'island.loc';
export async function liveWeather() {
  let loc = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (!loc) {
    loc = await new Promise((ok, no) => navigator.geolocation.getCurrentPosition(
      p => ok({ lat: +p.coords.latitude.toFixed(2), lon: +p.coords.longitude.toFixed(2) }), no, { timeout: 10000 }));
    localStorage.setItem(KEY, JSON.stringify(loc));
  }
  const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&current=temperature_2m,weather_code,is_day&timezone=auto`);
  const c = (await r.json()).current, w = c.weather_code;
  const wx = [71, 73, 75, 77, 85, 86].includes(w) ? 'snow'
    : (w >= 51 && w <= 67) || (w >= 80 && w <= 82) || w >= 95 ? 'rain'
    : [45, 48].includes(w) ? 'fog' : 'clear';
  return { night: !c.is_day, cold: c.temperature_2m < 12, wx, temp: Math.round(c.temperature_2m) };
}
