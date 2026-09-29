import { Preferences } from '@capacitor/preferences';

export interface HourlyWeather {
  timeISO: string;
  tempC: number;
  precipProbPct?: number;
  precipMm?: number;
  uvIndex?: number;
  condition: string;
  weatherCode: number;
}

export interface DailyWeather {
  dateISO: string;
  minC: number;
  maxC: number;
  precipProbPct?: number;
}

export interface WeatherForecast {
  fetchedAt: string;
  isStale: boolean;
  source: 'open-meteo' | 'cache';
  hourly: HourlyWeather[];
  daily?: DailyWeather[];
}

export interface WeatherProvider {
  getForecast(lat: number, lon: number): Promise<WeatherForecast>;
}

const WEATHER_CACHE_KEY = 'routinezie_weather_cache';
const CACHE_TTL_MS = 2 * 60 * 60 * 1000; // 2 jam cache

/**
 * Pemetaan WMO Weather Interpretation Codes (WW) ke bahasa Indonesia
 */
export function mapWMOCodeToCondition(code: number): string {
  switch (code) {
    case 0:
      return 'Cerah';
    case 1:
      return 'Cerah Berawan';
    case 2:
      return 'Sebagian Berawan';
    case 3:
      return 'Mendung';
    case 45:
    case 48:
      return 'Berkabut';
    case 51:
    case 53:
    case 55:
      return 'Gerimis';
    case 61:
      return 'Hujan Ringan';
    case 63:
      return 'Hujan Sedang';
    case 65:
      return 'Hujan Lebat';
    case 80:
    case 81:
    case 82:
      return 'Hujan Deras / Showers';
    case 95:
    case 96:
    case 99:
      return 'Badai Petir';
    default:
      return 'Berawan';
  }
}

/**
 * Cek apakah kode WMO mengindikasikan hujan
 */
export function isRainCode(code: number, precipProb = 0): boolean {
  return (code >= 51 && code <= 99) || precipProb >= 50;
}

export class OpenMeteoProvider implements WeatherProvider {
  /**
   * Mengambil prakiraan cuaca dari Open-Meteo dengan sistem caching 2 jam
   */
  async getForecast(lat: number, lon: number): Promise<WeatherForecast> {
    const cached = await this.getCachedForecast(lat, lon);
    const now = Date.now();

    // Jika cache masih segar (< 2 jam), pakai cache
    if (cached) {
      const fetchedTime = new Date(cached.fetchedAt).getTime();
      if (now - fetchedTime < CACHE_TTL_MS) {
        return {
          ...cached,
          isStale: false,
          source: 'cache',
        };
      }
    }

    // Coba fetch baru dari Open-Meteo
    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation_probability,precipitation,weather_code,uv_index&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=2`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Open-Meteo responded with status: ${response.status}`);
      }

      const data = await response.json();

      const hourly: HourlyWeather[] = data.hourly.time.map((t: string, idx: number) => {
        const code = data.hourly.weather_code[idx] || 0;
        return {
          timeISO: t,
          tempC: Math.round(data.hourly.temperature_2m[idx]),
          precipProbPct: data.hourly.precipitation_probability ? data.hourly.precipitation_probability[idx] : 0,
          precipMm: data.hourly.precipitation ? data.hourly.precipitation[idx] : 0,
          uvIndex: data.hourly.uv_index ? data.hourly.uv_index[idx] : 0,
          weatherCode: code,
          condition: mapWMOCodeToCondition(code),
        };
      });

      const daily: DailyWeather[] = data.daily?.time?.map((d: string, idx: number) => ({
        dateISO: d,
        minC: Math.round(data.daily.temperature_2m_min[idx]),
        maxC: Math.round(data.daily.temperature_2m_max[idx]),
        precipProbPct: data.daily.precipitation_probability_max ? data.daily.precipitation_probability_max[idx] : 0,
      })) || [];

      const forecast: WeatherForecast = {
        fetchedAt: new Date().toISOString(),
        isStale: false,
        source: 'open-meteo',
        hourly,
        daily,
      };

      // Simpan ke cache
      await this.saveCache(lat, lon, forecast);
      return forecast;
    } catch (err) {
      console.warn('Gagal mengambil data dari Open-Meteo, memakai cache lama bila ada:', err);
      if (cached) {
        return {
          ...cached,
          isStale: true,
          source: 'cache',
        };
      }

      // Fallback data darurat bila benar-benar offline tanpa cache
      return {
        fetchedAt: new Date().toISOString(),
        isStale: true,
        source: 'cache',
        hourly: [],
        daily: [],
      };
    }
  }

  private async getCachedForecast(lat: number, lon: number): Promise<WeatherForecast | null> {
    try {
      const { value } = await Preferences.get({ key: `${WEATHER_CACHE_KEY}_${lat}_${lon}` });
      if (!value) return null;
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private async saveCache(lat: number, lon: number, forecast: WeatherForecast): Promise<void> {
    try {
      await Preferences.set({
        key: `${WEATHER_CACHE_KEY}_${lat}_${lon}`,
        value: JSON.stringify(forecast),
      });
    } catch (e) {
      console.warn('Gagal menyimpan cache cuaca:', e);
    }
  }
}

export const weatherService = new OpenMeteoProvider();
