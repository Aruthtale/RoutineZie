# Zenn Routine — Paket Dokumen untuk Agent

Nama proyek sementara. Aplikasi Android offline-first (Next.js static export + Capacitor) untuk rutinitas harian: jadwal PKL, workout, makan, dan tidur.

## Isi paket
| File | Fungsi |
|---|---|
| `agent.md` | Aturan kerja dan batasan keras untuk agent (wellbeing, teknis, desain, alur kerja) |
| `skill.md` | Playbook/resep implementasi (format skill dengan frontmatter) |
| `design.md` | Sistem desain manga-neubrutalism hitam-putih |
| `PRD.md` | Tujuan, non-tujuan, fitur, risiko |
| `ARCHITECTURE.md` | Stack, struktur folder, konfigurasi, rilis |
| `DATA_SCHEMA.md` | Struktur JSON, Zod, kasus tepi, entitas log |
| `INTEGRATIONS.md` | Lokasi, cuaca, notifikasi, layanan lanjutan, kontrol biaya |
| `AI_CHAT.md` | Spesifikasi chat AI, system prompt, alur substitusi jadwal, guardrail cedera akut, uji red-team |
| `THREE_JS.md` | Playbook elemen 3D bergaya tinta/toon (three.js), sangat terbatas dan opsional |
| `TASKS.md` | Roadmap fase 0–10 dengan kriteria selesai |
| `TESTING.md` | Unit test, uji perangkat, audit copy, red-team |
| `PROMPTS.md` | Prompt per fase, review, bug, audit desain |
| `data/jadwal_mingguan.json` | Data jadwal Senin–Minggu |

## Alur singkat
1. Taruh semua file di root repo (atau `docs/`).
2. Kirim **Prompt 0** dari `PROMPTS.md` ke agent.
3. Uji hasil (`TESTING.md`), jalankan **Prompt Review**, lalu lanjut ke prompt fase berikutnya.

## Peta Fase → Prompt
| Fase (`TASKS.md`) | Isi | Prompt (`PROMPTS.md`) |
|---|---|---|
| 0–1 | Scaffold + Inti Jadwal | Prompt 0 |
| 2 | Mode Workout | Prompt 1 |
| 3 | Log dan Progres | Prompt 2 |
| 4 | Lokasi dan Cuaca | Prompt 3 |
| 5 | Chat AI (dasar) | Prompt 4 |
| 6 | Poles dan Rilis awal | Prompt 5 |
| 7 | Substitusi Jadwal (rule-based) | Prompt 6 |
| 8 | Ekspansi Fitur Tab | Prompt 7 |
| 9 | Substitusi Jadwal via Chat AI | Prompt 8 |
| 10 | Audit Anti-Slop + Elemen 3D (opsional) | Prompt 9, Prompt 10 |

Fase 9 butuh Fase 5 dan Fase 7 selesai lebih dulu. Fase 6 (rilis) boleh diulang lagi setelah fase-fase lanjut selesai sebelum rilis final.

## Hal yang perlu kamu putuskan/ganti
- Nama aplikasi dan `appId` (`capacitor.config.ts`)
- Font final (default: Anton, Space Mono, IBM Plex Sans)
- Provider cuaca utama dan cara mengamankan chat AI (proxy vs Firebase AI Logic)
- Akun billing cloud (perlu persetujuan/pengelolaan orang tua/wali)

## Catatan
Angka kalori dan protein di data adalah perkiraan kasar, bukan saran medis. Aplikasi ini bukan pengganti dokter atau ahli gizi.
