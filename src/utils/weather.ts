const WMO_CODE_MAP: Record<number, { emoji: string; label: string; teaComment: string }> = {
  0: { emoji: '☀️', label: '맑음', teaComment: '햇살이 좋아 차 맛도 더 선명했다.' },
  1: { emoji: '🌤️', label: '대체로 맑음', teaComment: '따스한 오후, 차와 함께 여유로웠다.' },
  2: { emoji: '⛅', label: '구름 조금', teaComment: '구름 사이 햇살, 은은한 차 한 잔.' },
  3: { emoji: '☁️', label: '흐림', teaComment: '흐린 날, 따뜻한 차가 위안이 됐다.' },
  45: { emoji: '🌫️', label: '안개', teaComment: '안개 낀 아침, 차향이 더 깊었다.' },
  48: { emoji: '🌫️', label: '안개', teaComment: '고요한 안개 속, 천천히 차를 우렸다.' },
  51: { emoji: '🌧️', label: '이슬비', teaComment: '이슬비 내리는 창가에서 마신 차.' },
  53: { emoji: '🌧️', label: '이슬비', teaComment: '부슬비와 따뜻한 차, 잘 어울렸다.' },
  55: { emoji: '🌧️', label: '이슬비', teaComment: '빗소리 들으며 마시니 맛이 달랐다.' },
  56: { emoji: '🌧️', label: '진눈깨비', teaComment: '쌀쌀한 날, 차 한 잔이 몸을 녹였다.' },
  57: { emoji: '🌧️', label: '진눈깨비', teaComment: '추운 날의 뜨거운 차, 그게 전부였다.' },
  61: { emoji: '🌧️', label: '비', teaComment: '비 오는 날의 차는 작은 위로였다.' },
  63: { emoji: '🌧️', label: '비', teaComment: '빗소리를 배경 삼아 차를 마셨다.' },
  65: { emoji: '🌧️', label: '폭우', teaComment: '밖은 폭우, 안은 따뜻한 차 한 잔.' },
  66: { emoji: '🌧️', label: '빙우', teaComment: '차가운 비, 뜨거운 차로 버텼다.' },
  67: { emoji: '🌧️', label: '빙우', teaComment: '추울수록 차의 온기가 소중했다.' },
  71: { emoji: '❄️', label: '눈', teaComment: '눈 내리는 창밖을 보며 차를 마셨다.' },
  73: { emoji: '❄️', label: '눈', teaComment: '하얀 풍경, 따뜻한 찻잔.' },
  75: { emoji: '❄️', label: '폭설', teaComment: '폭설에 갇혀 차만 마신 하루.' },
  77: { emoji: '❄️', label: '눈', teaComment: '눈 오는 날의 차, 그 포근함.' },
  80: { emoji: '🌦️', label: '소나기', teaComment: '소나기 그친 뒤, 상쾌한 한 잔.' },
  81: { emoji: '🌦️', label: '소나기', teaComment: '잠깐의 소나기, 잠깐의 차 한 잔.' },
  82: { emoji: '🌦️', label: '폭우', teaComment: '거센 비 속 묵직한 차 한 잔.' },
  85: { emoji: '❄️', label: '눈', teaComment: '소복이 쌓이는 눈, 조용히 차를 우렸다.' },
  86: { emoji: '❄️', label: '폭설', teaComment: '하얗게 덮인 세상, 차의 온기.' },
  95: { emoji: '🌩️', label: '뇌우', teaComment: '천둥 속에서도 차 한 잔의 고요.' },
  96: { emoji: '🌩️', label: '뇌우', teaComment: '폭풍우 속 차 한 잔, 마음이 잔잔해졌다.' },
  99: { emoji: '🌩️', label: '뇌우', teaComment: '비바람이 지나면 맑아지겠지. 차 한 잔.' },
};

export interface WeatherInfo {
  emoji: string;
  label: string;
  teaComment: string;
  temperatureMax?: number;
  temperatureMin?: number;
  humidity?: number;
}

export function weatherCodeToInfo(code: number): { emoji: string; label: string; teaComment: string } {
  return WMO_CODE_MAP[code] ?? { emoji: '❓', label: '알 수 없음', teaComment: '어떤 날이든, 차 한 잔.' };
}

const DEFAULT_LAT = 37.5665;
const DEFAULT_LNG = 126.978;

export async function fetchWeather(
  date: string,
  lat = DEFAULT_LAT,
  lng = DEFAULT_LNG,
): Promise<WeatherInfo | null> {
  try {
    const url = new URL('https://archive-api.open-meteo.com/v1/archive');
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lng));
    url.searchParams.set('start_date', date);
    url.searchParams.set('end_date', date);
    url.searchParams.set('daily', 'weathercode,temperature_2m_max,temperature_2m_min');
    url.searchParams.set('hourly', 'relativehumidity_2m');
    url.searchParams.set('timezone', 'Asia/Seoul');

    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const data = await res.json();
    const code = data.daily?.weathercode?.[0];
    if (code == null) return null;
    const info = weatherCodeToInfo(code);

    const humidityArr: number[] = data.hourly?.relativehumidity_2m ?? [];
    const avgHumidity = humidityArr.length > 0
      ? Math.round(humidityArr.reduce((a, b) => a + b, 0) / humidityArr.length)
      : undefined;

    return {
      ...info,
      temperatureMax: data.daily?.temperature_2m_max?.[0],
      temperatureMin: data.daily?.temperature_2m_min?.[0],
      humidity: avgHumidity,
    };
  } catch {
    return null;
  }
}
