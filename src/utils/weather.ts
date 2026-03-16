const WMO_CODE_MAP: Record<number, { emoji: string; label: string }> = {
  0: { emoji: '☀️', label: '맑음' },
  1: { emoji: '🌤️', label: '대체로 맑음' },
  2: { emoji: '⛅', label: '구름 조금' },
  3: { emoji: '☁️', label: '흐림' },
  45: { emoji: '🌫️', label: '안개' },
  48: { emoji: '🌫️', label: '안개' },
  51: { emoji: '🌧️', label: '이슬비' },
  53: { emoji: '🌧️', label: '이슬비' },
  55: { emoji: '🌧️', label: '이슬비' },
  56: { emoji: '🌧️', label: '진눈깨비' },
  57: { emoji: '🌧️', label: '진눈깨비' },
  61: { emoji: '🌧️', label: '비' },
  63: { emoji: '🌧️', label: '비' },
  65: { emoji: '🌧️', label: '폭우' },
  66: { emoji: '🌧️', label: '빙우' },
  67: { emoji: '🌧️', label: '빙우' },
  71: { emoji: '❄️', label: '눈' },
  73: { emoji: '❄️', label: '눈' },
  75: { emoji: '❄️', label: '폭설' },
  77: { emoji: '❄️', label: '눈' },
  80: { emoji: '🌦️', label: '소나기' },
  81: { emoji: '🌦️', label: '소나기' },
  82: { emoji: '🌦️', label: '폭우' },
  85: { emoji: '❄️', label: '눈' },
  86: { emoji: '❄️', label: '폭설' },
  95: { emoji: '🌩️', label: '뇌우' },
  96: { emoji: '🌩️', label: '뇌우' },
  99: { emoji: '🌩️', label: '뇌우' },
};

export interface WeatherInfo {
  emoji: string;
  label: string;
  temperatureMax?: number;
  temperatureMin?: number;
}

export function weatherCodeToInfo(code: number): { emoji: string; label: string } {
  return WMO_CODE_MAP[code] ?? { emoji: '❓', label: '알 수 없음' };
}

const DEFAULT_LAT = 37.5665;
const DEFAULT_LNG = 126.978;

export async function fetchWeather(
  date: string,
  lat = DEFAULT_LAT,
  lng = DEFAULT_LNG,
): Promise<WeatherInfo | null> {
  try {
    const res = await fetch(
      `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${date}&end_date=${date}&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone=Asia/Seoul`,
    );
    if (!res.ok) return null;
    const data = await res.json();
    const code = data.daily?.weathercode?.[0];
    if (code == null) return null;
    const info = weatherCodeToInfo(code);
    return {
      ...info,
      temperatureMax: data.daily?.temperature_2m_max?.[0],
      temperatureMin: data.daily?.temperature_2m_min?.[0],
    };
  } catch {
    return null;
  }
}
