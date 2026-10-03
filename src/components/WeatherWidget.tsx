'use client';

import React, { useState, useEffect } from 'react';
import { LocationService, UserLocation, DEFAULT_LOCATION } from '@/lib/location';
import { weatherService, WeatherForecast, HourlyWeather, isRainCode } from '@/lib/weather';
import {
  Cloud,
  CloudRain,
  Sun,
  CloudSun,
  CloudLightning,
  RefreshCw,
  MapPin,
  Umbrella,
  AlertCircle,
} from 'lucide-react';
import { localDateISO } from '@/lib/date';

interface WeatherWidgetProps {
  selectedDay: string;
}

export default function WeatherWidget({ selectedDay }: WeatherWidgetProps) {
  const [location, setLocation] = useState<UserLocation>(DEFAULT_LOCATION);
  const [forecast, setForecast] = useState<WeatherForecast | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isIndoorSelected, setIsIndoorSelected] = useState<boolean>(false);

  const isOutdoorDay = selectedDay === 'Selasa' || selectedDay === 'Sabtu';

  const fetchWeather = async () => {
    setLoading(true);
    try {
      const loc = (await LocationService.getCachedLocation()) || (await LocationService.requestDeviceLocation());
      setLocation(loc);
      const data = await weatherService.getForecast(loc.latitude, loc.longitude);
      setForecast(data);
    } catch (e) {
      console.error('Failed to load weather:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  // Format time of update
  const updatedTime = forecast?.fetchedAt
    ? new Date(forecast.fetchedAt).toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  // Get weather around morning workout (05:00 - 07:00)
  const currentHour = new Date().getHours();
  const todayISO = localDateISO();

  const morningWeather = forecast?.hourly.find((h) => {
    return h.timeISO.startsWith(todayISO) && h.timeISO.includes('T06:00');
  });

  const currentWeather =
    forecast?.hourly.find((h) => {
      const hHour = new Date(h.timeISO).getHours();
      return h.timeISO.startsWith(todayISO) && hHour === currentHour;
    }) || forecast?.hourly[0];

  const displayWeather = isOutdoorDay && currentHour < 7 && morningWeather ? morningWeather : currentWeather;

  const isRainLikely = displayWeather ? isRainCode(displayWeather.weatherCode, displayWeather.precipProbPct) : false;

  // Weather Icon picker
  const getWeatherIcon = (code?: number) => {
    if (code === undefined) return <Sun className="w-5 h-5 text-ink" />;
    if (code >= 95) return <CloudLightning className="w-5 h-5 text-ink" />;
    if (code >= 51) return <CloudRain className="w-5 h-5 text-ink" />;
    if (code === 1 || code === 2) return <CloudSun className="w-5 h-5 text-ink" />;
    if (code === 3) return <Cloud className="w-5 h-5 text-ink" />;
    return <Sun className="w-5 h-5 text-ink" />;
  };

  return (
    <div className="space-y-2">
      {/* Weather Header Card */}
      <div className="neo-box p-3 bg-paper space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-ink" />
            <span className="text-[11px] font-mono font-black uppercase text-ink">
              {location.cityName || 'Lokasi Terdeteksi'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-ink/60">
              {updatedTime ? `Diperbarui ${updatedTime}${forecast?.isStale ? ' (Offline)' : ''}` : 'Memuat...'}
            </span>
            <button
              onClick={fetchWeather}
              disabled={loading}
              className="neo-btn bg-paper p-1 text-ink hover:bg-ink/5"
              title="Perbarui Cuaca"
              aria-label="Perbarui Cuaca"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {displayWeather ? (
          <div className="flex items-center justify-between pt-1 border-t border-ink/10">
            <div className="flex items-center gap-2.5">
              <div className="neo-box-sm p-1.5 bg-ink/5">
                {getWeatherIcon(displayWeather.weatherCode)}
              </div>
              <div>
                <span className="text-sm font-black uppercase block text-ink leading-tight">
                  {displayWeather.condition}
                </span>
                <span className="text-[11px] text-ink/70 font-medium">
                  {isOutdoorDay ? 'Perkiraan Jam Latihan Pagi (06.00)' : 'Saat ini'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-mono font-black text-ink">
                {displayWeather.tempC}°C
              </span>
              {displayWeather.precipProbPct !== undefined && displayWeather.precipProbPct > 0 && (
                <span className="block text-[11px] font-mono font-bold text-ink/80">
                  Hujan {displayWeather.precipProbPct}%
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs font-mono text-ink/60 py-1">
            Data cuaca belum tersedia. Klik refresh untuk memuat.
          </div>
        )}
      </div>

      {/* T4.3 Adaptive Rain Advice for Outdoor Workout Days (Selasa / Sabtu) */}
      {isOutdoorDay && isRainLikely && (
        <div className="neo-box p-3 bg-paper border-dashed space-y-2">
          <div className="flex items-start gap-2">
            <Umbrella className="w-4 h-4 text-ink shrink-0 mt-0.5" />
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider block text-ink">
                SARAN LATIHAN CUACA HUJAN
              </span>
              <p className="text-xs text-ink/85 leading-relaxed font-medium mt-0.5">
                Peluang hujan tinggi ({displayWeather?.precipProbPct}%). Anda dapat beralih ke alternatif latihan indoor
                (jalan di tempat berirama + kalistenik) tanpa perlu memaksakan lari di luar.
              </p>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setIsIndoorSelected(!isIndoorSelected)}
              className={`neo-btn-sm py-1.5 px-3 text-[11px] font-black uppercase flex-1 ${
                isIndoorSelected
                  ? 'bg-ink text-paper'
                  : 'bg-paper text-ink hover:bg-ink/5'
              }`}
            >
              {isIndoorSelected ? '✓ OPSI INDOOR AKTIF' : 'PILIH OPSI INDOOR'}
            </button>
          </div>

          {isIndoorSelected && (
            <div className="neo-box-sm p-2 bg-ink/5 text-xs text-ink space-y-1 font-mono">
              <span className="font-bold block text-[11px] uppercase">Rangkaian Indoor Pengganti:</span>
              <p className="text-[11px] leading-snug">
                1. 10 Menit High Knees / Jalan Cepat di Tempat
                <br />
                2. 3 Set Push-up & Bodyweight Squats
                <br />
                3. 3 Set Plank 30-45 detik
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
