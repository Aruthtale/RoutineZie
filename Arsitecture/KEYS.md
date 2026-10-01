# KEYS.md — Kredensial Rilis & Prosedur Pemulihan

> **Dokumen ini tidak berisi password.** Password disimpan di
> `android/keystore.properties` (tidak di git) dan di password manager.

## Keystore yang BENAR (jangan sampai hilang)

| Item | Nilai |
|---|---|
| Path | `android/app/keystore/routinezie-release.jks` |
| Alias | `routinezie` |
| Password store | lihat `android/keystore.properties` / password manager |
| Password key | sama dengan store |
| SHA-256 fingerprint | `E6:81:54:43:1E:15:E6:50:4B:71:D8:65:B9:4D:0A:93:F1:80:F1:27:27:C6:12:1B:4C:BC:33:E9:58:41:77:A1` |
| Masa berlaku | 2026-09-29 → 2126-09-05 |
| Dipakai sejak | APK v1.6.4 (dan semua rilis setelahnya) |

Fingerprint ini harus **persis sama** dengan yang tercetak di APK rilis:

```bash
apksigner verify --print-certs android/app/build/outputs/apk/release/app-release.apk \
  | grep "SHA-256 digest"
# V2 Signer: certificate SHA-256 digest: e68154431e15e6504b71d865b94d0a93f180f12727c6121b4cbc33e9584177a1
```

## Keystore ZOMBIE (jangan dipakai)

`android/keystore/UNUSED-routinezie-release.jks.zombie`

Fingerprint-nya `21:C0:10:...:2E:93` — **berbeda** dari yang benar. File ini
sempat ada di dua lokasi dan bisa membuat bingung; sudah di-rename menjadi
`.zombie` agar tidak pernah terpilih. Tidak direferensikan oleh konfigurasi mana pun.
Boleh dihapus permanen.

## Lokasi build membaca kredensial

`android/app/build.gradle` menyelesaikan kredensial dengan prioritas:

1. Environment: `ROUTINEZIE_KEYSTORE_FILE`, `ROUTINEZIE_KEY_ALIAS`,
   `ROUTINEZIE_KEY_PASSWORD`, `ROUTINEZIE_KEYSTORE_PASSWORD`
2. Gradle property: `-PRoutineZieUploadKeystoreFile`, `-PRoutineZieKeyAlias`,
   `-PRoutineZieKeyPassword`, `-PRoutineZieKeystorePassword`
3. `android/keystore.properties` (`storeFile` relatif terhadap `android/app/`)

**Tidak ada password hardcoded.** Bila kredensial tidak lengkap,
`assembleRelease` / `bundleRelease` **gagal** dengan pesan jelas sebelum
menghasilkan APK. Ini disengaja: APK bertanda kunci salah akan ditolak Android
saat update, dan tidak bisa diperbaiki setelah dipublikasikan.

## ⚠️ Bila keystore hilang

Android mengidentifikasi aplikasi berdasarkan **signature**, bukan nama paket.
APK dengan signature berbeda **tidak bisa** meng-update APK yang sudah terpasang.

Bila keystore benar-benar hilang:

1. **Tidak ada pemulihan** untuk instalasi yang sudah ada. Pengguna harus
   uninstall (kehilangan seluruh data Dexie lokal) lalu pasang versi baru
   dengan keystore baru.
2. Karena itu, backup adalah satu-satunya pertahanan.

## Backup yang sudah dilakukan

| Lokasi | Isi | Catatan |
|---|---|---|
| `~/RoutineZie-backup-keystore/` | `.jks` + `keystore.properties` | Backup lokal, izin `600` |

**Yang harus kamu lakukan (di luar mesin ini):**

- [ ] Salin folder `~/RoutineZie-backup-keystore/` ke cloud pribadi (Google Drive/OneDrive)
- [ ] Salin ke USB / perangkat lain
- [ ] Simpan password di password manager (Bitwarden/KeePass), **bukan** di catatan biasa
- [ ] Verifikasi backup bisa dibuka:
      `keytool -list -keystore ~/RoutineZie-backup-keystore/routinezie-release.jks`

## Verifikasi backup

```bash
# 1. Fingerprint backup harus sama dengan yang benar
keytool -list -v -keystore ~/RoutineZie-backup-keystore/routinezie-release.jks \
  -storepass "$(grep '^storePassword=' ~/RoutineZie-backup-keystore/keystore.properties | cut -d= -f2)" \
  | grep "SHA256:"
# harus: E6:81:54:...:77:A1

# 2. Bandingkan byte-to-byte dengan file aktif
md5sum android/app/keystore/routinezie-release.jks \
       ~/RoutineZie-backup-keystore/routinezie-release.jks
```
