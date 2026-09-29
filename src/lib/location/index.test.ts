import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LocationService, UserLocation, DEFAULT_LOCATION } from './index';

const { mockPreferences, mockGeolocation } = vi.hoisted(() => ({
  mockPreferences: { get: vi.fn(), set: vi.fn() },
  mockGeolocation: { getCurrentPosition: vi.fn() },
}));

vi.mock('@capacitor/preferences', () => ({
  Preferences: mockPreferences,
}));

vi.mock('@capacitor/geolocation', () => ({
  Geolocation: mockGeolocation,
}));

describe('LocationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  describe('getCachedLocation', () => {
    it('mengembalikan null bila tidak ada cache', async () => {
      mockPreferences.get.mockResolvedValue({ value: null });

      const result = await LocationService.getCachedLocation();

      expect(result).toBeNull();
    });

    it('mengembalikan lokasi yang disimpan bila ada cache', async () => {
      const cachedLoc: UserLocation = {
        latitude: -6.2,
        longitude: 106.81,
        cityName: 'Jakarta',
        isManual: true,
        updatedAt: new Date().toISOString(),
      };
      mockPreferences.get.mockResolvedValue({ value: JSON.stringify(cachedLoc) });

      const result = await LocationService.getCachedLocation();

      expect(result).toEqual(cachedLoc);
    });
  });

  describe('saveLocation', () => {
    it('menyimpan lokasi ke Preferences dengan format JSON yang benar', async () => {
      const newLoc: UserLocation = {
        latitude: -6.5,
        longitude: 107.0,
        cityName: 'Bandung',
        isManual: false,
        updatedAt: new Date().toISOString(),
      };

      await LocationService.saveLocation(newLoc);

      expect(mockPreferences.set).toHaveBeenCalledOnce();
      const [arg] = mockPreferences.set.mock.calls[0];
      expect(arg.key).toBe('routinezie_user_location');
      const parsed = JSON.parse(arg.value as string);
      expect(parsed.latitude).toBe(-6.5);
      expect(parsed.longitude).toBe(107.0);
      expect(parsed.cityName).toBe('Bandung');
    });
  });

  describe('requestDeviceLocation', () => {
    it('mengembalikan lokasi perangkat bila izin diberikan', async () => {
      const mockPos = {
        coords: {
          latitude: -6.25,
          longitude: 106.89,
          accuracy: 1000,
          altitude: 10,
          altitudeAccuracy: 5,
          heading: 180,
          speed: 0,
        },
        timestamp: Date.now(),
      };
      mockGeolocation.getCurrentPosition.mockResolvedValue(mockPos);

      const result = await LocationService.requestDeviceLocation();

      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
        expect.objectContaining({
          enableHighAccuracy: false,
          timeout: 8000,
        })
      );
      expect(result.latitude).toBe(-6.25);
      expect(result.longitude).toBe(106.89);
      expect(result.isManual).toBe(false);
    });

    it('menggunakan fallback bila Geolocation gagal', async () => {
      mockGeolocation.getCurrentPosition.mockRejectedValue(new Error('Permission denied'));

      const result = await LocationService.requestDeviceLocation();

      expect(result.latitude).toBe(DEFAULT_LOCATION.latitude);
      expect(result.longitude).toBe(DEFAULT_LOCATION.longitude);
      expect(result.isManual).toBe(true);
      expect(result.cityName).toContain('Jakarta');
    });

    it('meng menggunakan cache sebelum fallback default', async () => {
      mockGeolocation.getCurrentPosition.mockRejectedValue(new Error('Timeout'));

      const cachedLoc: UserLocation = {
        latitude: -6.2,
        longitude: 106.81,
        cityName: 'Jakarta Cached',
        isManual: true,
        updatedAt: new Date().toISOString(),
      };
      mockPreferences.get.mockResolvedValue({ value: JSON.stringify(cachedLoc) });

      const result = await LocationService.requestDeviceLocation();

      expect(result).toEqual(cachedLoc);
    });
  });

  describe('setManualLocation', () => {
    it('menyimpan lokasi manual dengan benar', async () => {
      mockPreferences.set.mockResolvedValue({ value: undefined });

      const result = await LocationService.setManualLocation('Surabaya', -7.25, 112.75);

      expect(result.latitude).toBe(-7.25);
      expect(result.longitude).toBe(112.75);
      expect(result.cityName).toBe('Surabaya');
      expect(result.isManual).toBe(true);
    });

    it('membulatkan koordinat 2 desimal', async () => {
      mockPreferences.set.mockResolvedValue({ value: undefined });

      const result = await LocationService.setManualLocation('Test', -7.234567, 112.891234);

      expect(result.latitude).toBe(-7.23);
      expect(result.longitude).toBe(112.89);
    });
  });
});