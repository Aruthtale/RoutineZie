# INTEGRATIONS.md — Lokasi, Cuaca, Notifikasi, dan Layanan Lain

> Harga dan kuota layanan cloud bisa berubah. **Verifikasi di halaman resmi** sebelum mengandalkan angka di bawah.

## 1. Lokasi
- Plugin: `@capacitor/geolocation`.
- Minta izin **lokasi perkiraan (coarse)** saja; akurasi meter tidak dibutuhkan untuk cuaca.
- Simpan koordinat terakhir (dibulatkan ~2 desimal) di Preferences; aplikasi tetap berfungsi bila izin ditolak atau offline (fallback: pengguna mengisi kota/koordinat manual atau melewati fitur cuaca).
- Nama kota (opsional): cukup sekali lalu cache. Jangan memanggil geocoding setiap pembukaan aplikasi.
- Peta tidak diperlukan; jangan menambah Maps SDK.

## 2. Cuaca
### Antarmuka
```ts
interface WeatherProvider {
  getForecast(lat: number, lon: number): Promise<{
    fetchedAt: string;
    hourly: { timeISO: string; tempC: number; precipProbPct?: number; precipMm?: number; uvIndex?: number; condition: string }[];
    daily?: { dateISO: string; minC: number; maxC: number; precipProbPct?: number }[];
  }>;
}
```
### Implementasi
1. **OpenMeteoProvider** (default MVP; tanpa key; cek syarat penggunaan non-komersial).
2. **GoogleWeatherProvider** (Google Maps Platform Weather API): kondisi saat ini, prakiraan hingga 10 hari, riwayat 24 jam via REST. Berbagi akun billing dengan API Maps lain. Menurut daftar harga resmi, SKU Weather Usage punya jatah gratis bulanan (±10.000 panggilan) lalu tarif per 1.000 panggilan; **verifikasi di halaman harga resmi**. Kredit universal $200 sudah tidak ada sejak Maret 2025; jatah gratis kini per-SKU.
3. **Uji kualitas** untuk koordinat pengguna sebelum memilih provider utama (bandingkan hujan/temperatur per jam).

### Cache dan penggunaan
- Ambil sekali tiap 1–3 jam saat aplikasi aktif; simpan `fetchedAt`; tampilkan data usang dengan label "diperbarui HH.MM" bila offline.
- Notifikasi pagi opsional (04.50–05.00) berisi ringkasan cuaca 05.30–06.15.
- Saran otomatis: bila peluang hujan tinggi pada slot lari (Selasa/Sabtu), tawarkan alternatif indoor (mis. jalan di tempat + calisthenics) **tanpa memaksa**.
- Tampilkan kualitas udara (Air Quality API) hanya sebagai informasi tambahan, opsional.

### Keamanan key
- Panggilan REST dari webview **tidak bisa** dibatasi dengan pembatasan aplikasi Android (itu berlaku untuk SDK native). Anggap key terekspos.
- Untuk Google Weather: gunakan **proxy tipis** (Cloud Run/Functions) yang menyimpan key, atau pertahankan Open-Meteo pada MVP.
- Bila tetap memakai key di klien: batasi ke satu API, pasang **quota cap** dan **budget alert**, dan gunakan key khusus proyek ini.

## 3. Notifikasi lokal
- Plugin: `@capacitor/local-notifications`.
- Izin: notifikasi (Android 13+), alarm tepat (Android 12+; verifikasi kebijakan Play Store).
- Pengingat bawaan: bangun 05.00, mulai workout 05.20, snack 10.00, makan siang 12.00, snack 15.30, makan malam 18.30, wind-down 20.30, last call tidur 21.45. Akhir pekan disesuaikan.
- Terjadwal berulang mingguan; ID deterministik; dijadwalkan ulang saat pengaturan berubah dan saat aplikasi dibuka.
- Uji setelah restart perangkat, mode hemat baterai, dan Doze.
- Halaman panduan optimasi baterai (Xiaomi, Oppo, Vivo, Samsung).

## 4. Jam Subuh dinamis (opsional)
- Hitung offline dengan library perhitungan jadwal sholat (mis. `adhan`) berdasarkan koordinat. Tampilkan metode perhitungan yang dipakai dan biarkan pengguna memilihnya. Blok "Subuh + persiapan" mengikuti waktu Subuh hanya jika pengguna mengaktifkan opsi ini; default tetap 05.00.

## 5. Haptics dan Share
- `@capacitor/haptics`: set selesai (pendek), istirahat selesai (dua kali).
- `@capacitor/share`: ekspor JSON dan ringkasan mingguan.

## 6. Layanan tahap lanjut
- **Health Connect** (Android): langkah dan tidur otomatis; butuh plugin native/komunitas; jadikan opsional dan minta izin per jenis data.
- **Google Calendar**: ekspor jadwal sebagai event berulang; minta izin minimal.
- **Firebase Auth + Firestore**: backup/sinkron; opsional; jangan wajib login.

## 7. Kontrol biaya (semua layanan cloud)
- Key terpisah per layanan dan dibatasi ke API yang dipakai.
- Budget alert + quota cap di Cloud Console sebelum rilis.
- Cache agresif; jangan memanggil dari loop/efek yang berulang.
- Akun billing memerlukan persetujuan/pengelolaan orang tua/wali (pengguna 17 tahun).
