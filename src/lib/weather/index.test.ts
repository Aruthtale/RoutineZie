import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  OpenMeteoProvider,
  WeatherForecast,
  HourlyWeather,
  mapWMOCodeToCondition,
  isRainCode,
} from './index';

// Mock Capacitor Preferences dan fetch global dengan vi.hoisted
const { mockPreferences, mockFetch } = vi.hoisted(() => ({
  mockPreferences: { get: vi.fn(), set: vi.fn() },
  mockFetch: vi.fn(),
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: mockPreferences,
}));

global.fetch = mockFetch;

describe('OpenMeteoProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('mapWMOCodeToCondition', () => {
    it('memetakan kode WMO 0 ke Cerah', () => {
      expect(mapWMOCodeToCondition(0)).toBe('Cerah');
    });

    it('memetakan kode WMO 3 ke Mendung', () => {
      expect(mapWMOCodeToCondition(3)).toBe('Mendung');
    });

    it('memetakan kode WMO 61 ke Hujan Ringan', () => {
      expect(mapWMOCodeToCondition(61)).toBe('Hujan Ringan');
    });

    it('memetakan kode WMO 95 ke Badai Petir', () => {
      expect(mapWMOCodeToCondition(95)).toBe('Badai Petir');
    });

    it('mengembalikan Berawan untuk kode tidak dikenal', () => {
      expect(mapWMOCodeToCondition(999)).toBe('Berawan');
    });
  });

  describe('isRainCode', () => {
    it('mengembalikan true untuk kode hujan', () => {
      expect(isRainCode(61)).toBe(true);
      expect(isRainCode(95)).toBe(true);
    });

    it('mengembalikan true bila precipProb >= 50', () => {
      expect(isRainCode(1, 60)).toBe(true);
    });

    it('mengembalikan false untuk cuaca cerah', () => {
      expect(isRainCode(0, 0)).toBe(false);
    });
  });

  describe('getForecast', () => {
    const mockHourlyData = {
      time: ['2026-09-28T05:00', '2026-09-28T06:00', '2026-09-28T07:00'],
      temperature_2m: [24, 23, 25],
      precipitation_probability: [0, 70, 10],
      precipitation: [0, 2.5, 0],
      weather_code: [0, 61, 3],
      uv_index: [0, 2, 5],
    };

    const mockDailyData = {
      time: ['2026-09-28', '2026-09-29'],
      temperature_2m_max: [28, 29],
      temperature_2m_min: [22, 23],
      precipitation_probability_max: [80, 10],
    };

    it('mengembalikan forecast terbaru dari Open-Meteo', async () => {
      mockPreferences.get.mockResolvedValue({ value: null });
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          hourly: mockHourlyData,
          daily: mockDailyData,
        }),
      });

      const provider = new OpenMeteoProvider();
      const result = await provider.getForecast(-6.2, 106.81);

      expect(result.source).toBe('open-meteo');
      expect(result.isStale).toBe(false);
      expect(result.hourly).toHaveLength(3);
      expect(result.daily).toHaveLength(2);
    });

    it('mengembalikan data dari cache bila cache masih segar', async () => {
      const cachedForecast: WeatherForecast = {
        fetchedAt: new Date().toISOString(),
        isStale: false,
        source: 'open-meteo',
        hourly: mockHourlyData.time.map((t, idx) => ({
          timeISO: t,
          tempC: mockHourlyData.temperature_2m[idx],
          precipProbPct: mockHourlyData.precipitation_probability[idx],
          precipMm: mockHourlyData.precipitation[idx],
          weatherCode: mockHourlyData.weather_code[idx],
          condition: mapWMOCodeToCondition(mockHourlyData.weather_code[idx]),
        })),
        daily: mockDailyData.time.map((d, idx) => ({
          dateISO: d,
          minC: mockDailyData.temperature_2m_min[idx],
          maxC: mockDailyData.temperature_2m_max[idx],
          precipProbPct: mockDailyData.precipitation_probability_max[idx],
        })),
      };
      mockPreferences.get.mockResolvedValue({ value: JSON.stringify(cachedForecast) });

      const provider = new OpenMeteoProvider();
      const result = await provider.getForecast(-6.2, 106.81);

      expect(result.source).toBe('cache');
      expect(result.isStale).toBe(false);
    });

    it('menandai cache sebagai usang bila cache sudah lebih dari 2 jam', async () => {
      const staleForecast: WeatherForecast = {
        fetchedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 jam lalu
        isStale: false,
        source: 'open-meteo',
        hourly: [],
        daily: [],
      };
      mockPreferences.get.mockResolvedValue({ value: JSON.stringify(staleForecast) });
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          hourly: mockHourlyData,
          daily: mockDailyData,
        }),
      });

      const provider = new OpenMeteoProvider();
      const result = await provider.getForecast(-6.2, 106.81);

      expect(result.source).toBe('open-meteo');
      expect(result.isStale).toBe(false); // Fresh fetch
    });

    it('mengembalikan data usang dari cache bila fetch gagal dan cache tidak segar', async () => {
      const staleForecast: WeatherForecast = {
        fetchedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        isStale: false,
        source: 'open-meteo',
        hourly: mockHourlyData.time.map((t, idx) => ({
          timeISO: t,
          tempC: mockHourlyData.temperature_2m[idx],
          precipProbPct: mockHourlyData.precipitation_probability[idx],
          precipMm: mockHourlyData.precipitation[idx],
          weatherCode: mockHourlyData.weather_code[idx],
          condition: mapWMOCodeToCondition(mockHourlyData.weather_code[idx]),
        })),
        daily: mockDailyData.time.map((d, idx) => ({
          dateISO: d,
          minC: mockDailyData.temperature_2m_min[idx],
          maxC: mockDailyData.temperature_2m_max[idx],
          precipProbPct: mockDailyData.precipitation_probability_max[idx],
        })),
      };
      mockPreferences.get.mockResolvedValue({ value: JSON.stringify(staleForecast) });
      mockFetch.mockRejectedValue(new Error('Network error'));

      const provider = new OpenMeteoProvider();
      const result = await provider.getForecast(-6.2, 106.81);

      expect(result.isStale).toBe(true);
      expect(result.source).toBe('cache');
    });

    it('menyimpan cache setelah fetch sukses', async () => {
      mockPreferences.get.mockResolvedValue({ value: null });
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          hourly: mockHourlyData,
          daily: mockDailyData,
        }),
      });

      const provider = new OpenMeteoProvider();
      await provider.getForecast(-6.2, 106.81);

      expect(mockPreferences.set).toHaveBeenCalled();
      const [arg] = mockPreferences.set.mock.calls[0];
      expect(arg.key).toContain('routinezie_weather_cache');
      const parsed = JSON.parse(arg.value as string);
      expect(parsed.source).toBe('open-meteo');
    });
  });
});