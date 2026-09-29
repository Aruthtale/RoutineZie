import { Geolocation } from '@capacitor/geolocation';
import { Preferences } from '@capacitor/preferences';

export interface UserLocation {
  latitude: number;
  longitude: number;
  cityName?: string;
  isManual?: boolean;
  updatedAt: string;
}

const LOCATION_STORAGE_KEY = 'routinezie_user_location';

// Default fallback (Jakarta, Indonesia)
export const DEFAULT_LOCATION: UserLocation = {
  latitude: -6.20,
  longitude: 106.81,
  cityName: 'Jakarta (Default)',
  isManual: true,
  updatedAt: new Date().toISOString(),
};

export class LocationService {
  /**
   * Mengambil lokasi tersimpan di Preferences
   */
  static async getCachedLocation(): Promise<UserLocation | null> {
    try {
      const { value } = await Preferences.get({ key: LOCATION_STORAGE_KEY });
      if (!value) return null;
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  /**
   * Menyimpan lokasi ke Preferences
   */
  static async saveLocation(loc: UserLocation): Promise<void> {
    try {
      await Preferences.set({
        key: LOCATION_STORAGE_KEY,
        value: JSON.stringify(loc),
      });
    } catch (e) {
      console.warn('Gagal menyimpan lokasi ke Preferences:', e);
    }
  }

  /**
   * Minta izin lokasi kasar (coarse) via Capacitor Geolocation,
   * lalu bulatkan 2 desimal (~1.1 km, cukup untuk cuaca tanpa boros privasi).
   */
  static async requestDeviceLocation(): Promise<UserLocation> {
    try {
      // Coba dapatkan posisi saat ini
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: false, // Coarse only
        timeout: 8000,
        maximumAge: 1000 * 60 * 30, // 30 menit cache
      });

      // Bulatkan ~2 desimal sesuai spesifikasi INTEGRATIONS.md
      const lat = Math.round(pos.coords.latitude * 100) / 100;
      const lon = Math.round(pos.coords.longitude * 100) / 100;

      const newLoc: UserLocation = {
        latitude: lat,
        longitude: lon,
        cityName: 'Lokasi Perangkat',
        isManual: false,
        updatedAt: new Date().toISOString(),
      };

      await this.saveLocation(newLoc);
      return newLoc;
    } catch (err) {
      console.warn('Geolocation tidak tersedia atau izin ditolak, menggunakan fallback:', err);
      const cached = await this.getCachedLocation();
      return cached || DEFAULT_LOCATION;
    }
  }

  /**
   * Simpan input manual kota / koordinat oleh pengguna
   */
  static async setManualLocation(cityName: string, lat: number, lon: number): Promise<UserLocation> {
    const loc: UserLocation = {
      latitude: Math.round(lat * 100) / 100,
      longitude: Math.round(lon * 100) / 100,
      cityName,
      isManual: true,
      updatedAt: new Date().toISOString(),
    };
    await this.saveLocation(loc);
    return loc;
  }
}
