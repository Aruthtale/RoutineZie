#!/usr/bin/env bash
# release.sh — rilis RoutineZie ke DUA akun GitHub sekaligus (Aruthtale + Zenixu)
#
# Pemakaian:
#   scripts/release.sh 1.6.5 "Judul rilis" /tmp/relnotes-v1.6.5.md
#
# Yang dilakukan:
#   1. push commit saat ini ke kedua repo (sekali `git push`, remote sudah dual-push)
#   2. buat GitHub release + unggah APK di Aruthtale/RoutineZie
#   3. buat GitHub release + unggah APK di Zenixu/RoutineZie
#   4. verifikasi asset APK di kedua rilis
#
# Prasyarat: `gh auth status` harus menampilkan Aruthtale DAN Zenixu (dua akun login).
set -euo pipefail

VERSION="${1:?Pemakaian: release.sh <versi> <judul> <file-notes> [path-apk]}"
TITLE="${2:?Judul rilis wajib}"
NOTES="${3:?File release notes wajib}"
APK="${4:-android/app/build/outputs/apk/release/app-release.apk}"

REPOS=("Aruthtale/RoutineZie" "Zenixu/RoutineZie")
TAG="v${VERSION}"

cd "$(dirname "$0")/.."

echo "==> Cek kredensial gh (butuh Aruthtale + Zenixu)"
if ! gh auth status 2>&1 | grep -q "account Aruthtale"; then
  echo "GAGAL: akun Aruthtale belum login. Jalankan: gh auth login -h github.com" >&2; exit 1
fi
if ! gh auth status 2>&1 | grep -q "account Zenixu"; then
  echo "GAGAL: akun Zenixu belum login. Jalankan: gh auth login -h github.com (login sebagai Zenixu)" >&2; exit 1
fi

echo "==> Cek APK: $APK"
[ -f "$APK" ] || { echo "GAGAL: APK tidak ditemukan di $APK" >&2; exit 1; }
APK_ABS="$(readlink -f "$APK")"
APK_SIZE=$(stat -c%s "$APK_ABS")
APK_SHA=$(sha256sum "$APK_ABS" | cut -d' ' -f1)
echo "    ukuran: ${APK_SIZE} byte"
echo "    sha256: ${APK_SHA}"

# --- Guard 0: JANGAN rilis APK yang memuat API key di bundle klien ---
# Static export meng-inline NEXT_PUBLIC_* ke JS klien, dan APK berisi JS itu.
# Rilis publik = key bocor ke siapa pun yang mengunduh APK. Gerbang ini
# menghentikan rilis sebelum terunggah.
echo "==> Cek kebocoran API key di dalam APK"
LEAK=$(unzip -p "$APK_ABS" 'assets/public/_next/static/chunks/*.js' 2>/dev/null \
       | grep -oE '(AQ\.Ab8[A-Za-z0-9_-]{20,}|AIza[A-Za-z0-9_-]{30,})' | sort -u || true)
if [ -n "$LEAK" ]; then
  echo "GAGAL: APK memuat API key di bundle klien — akan bocor ke publik bila dirilis." >&2
  echo "       Perbaikan: pakai ProxyChatProvider (NEXT_PUBLIC_CHAT_PROXY_ENDPOINT)," >&2
  echo "       HAPUS NEXT_PUBLIC_GEMINI_API_KEY dari env, lalu build ulang." >&2
  exit 1
fi
echo "    aman: tidak ada API key di bundle APK"

# --- Guard 1: versi di APK harus cocok dengan TAG yang akan dirilis ---
AAPT2="${AAPT2:-$(command -v aapt2 || echo /opt/android-sdk/build-tools/37.0.0/aapt2)}"
APK_BADGE=$("$AAPT2" dump badging "$APK_ABS" 2>/dev/null | grep "^package:" || true)
APK_VCODE=$(echo "$APK_BADGE" | sed -n "s/.*versionCode='\([0-9]*\)'.*/\1/p")
APK_VNAME=$(echo "$APK_BADGE" | sed -n "s/.*versionName='\([^']*\)'.*/\1/p")
echo "    APK badge: versionCode=${APK_VCODE:-?} versionName=${APK_VNAME:-?}"
if [ -z "$APK_VCODE" ]; then
  echo "GAGAL: tidak bisa membaca versionCode dari APK (aapt2 ada? $AAPT2)" >&2; exit 1
fi
if [ "$APK_VNAME" != "$VERSION" ]; then
  echo "GAGAL: versionName APK ('$APK_VNAME') != versi rilis ('$VERSION'). Bump build.gradle." >&2
  exit 1
fi

# --- Guard 2: versionCode harus MONOTON NAIK dibanding rilis terakhir ---
PREV_TAG=$(gh release list --repo "${REPOS[0]}" --limit 1 --json tagName \
             --jq '.[0].tagName' 2>/dev/null || true)
if [ -n "$PREV_TAG" ] && [ "$PREV_TAG" != "$TAG" ]; then
  echo "    rilis terakhir: ${PREV_TAG}"
  # Pastikan objek tag tersedia lokal (fetch bila perlu).
  if ! git rev-parse -q --verify "refs/tags/${PREV_TAG}" >/dev/null 2>&1; then
    git fetch --tags --quiet origin 2>/dev/null || true
  fi
  PREV_VCODE_NUM=$(git show "${PREV_TAG}:android/app/build.gradle" 2>/dev/null \
                   | sed -n 's/.*versionCode \([0-9]*\).*/\1/p' | head -1 || true)
  if [ -z "$PREV_VCODE_NUM" ]; then
    echo "    PERINGATAN: tidak bisa membaca versionCode dari ${PREV_TAG}; guard monotonic dilewati." >&2
    echo "    Verifikasi manual: versionCode APK harus > versi terpasang." >&2
  elif [ "$APK_VCODE" -le "$PREV_VCODE_NUM" ]; then
    echo "GAGAL: versionCode APK ($APK_VCODE) <= rilis terakhir $PREV_TAG ($PREV_VCODE_NUM)." >&2
    echo "       Naikkan versionCode di android/app/build.gradle sebelum rilis." >&2
    exit 1
  else
    echo "    versionCode: ${PREV_VCODE_NUM} -> ${APK_VCODE} (naik)"
  fi
fi

echo "==> Push commit ke kedua repo (dual-push remote)"
git push origin main

for SLUG in "${REPOS[@]}"; do
  OWNER="${SLUG%%/*}"
  echo "==> Rilis ${TAG} di ${SLUG} (akun: ${OWNER})"
  # Pilih akun per-perintah via env token. `gh release create` TIDAK punya flag -u;
  # `-u` hanya berlaku untuk `gh auth switch`. Ambil token akun yang tepat di sini.
  GHT="$(gh auth token -u "$OWNER" -h github.com 2>/dev/null || true)"
  if [ -z "$GHT" ]; then
    echo "GAGAL: tidak bisa mengambil token untuk akun ${OWNER}." >&2
    echo "       Login dulu: gh auth login -h github.com (sebagai ${OWNER})" >&2
    exit 1
  fi
  # Salin ke nama file bertag agar asset GitHub ikut bertag (label #…# hanya
  # mengubah judul tampilan, bukan nama file — file tetap memakai nama asli).
  STAGED="/tmp/app-release-${TAG}.apk"
  cp "$APK_ABS" "$STAGED"
  GH_TOKEN="$GHT" gh release create "${TAG}" \
    --repo "${SLUG}" \
    --title "${TITLE}" \
    --notes-file "${NOTES}" \
    "$STAGED"
  rm -f "$STAGED"
  unset GHT
done

echo "==> Verifikasi asset di kedua rilis"
OK=1
ASSET_NAME="app-release-${TAG}.apk"
for SLUG in "${REPOS[@]}"; do
  # Nama asset = nama file yang diunggah (bukan label). Ambil berdasarkan ukuran.
  SIZE=$(gh release view "${TAG}" --repo "${SLUG}" --json assets \
          --jq ".assets[] | select(.name==\"${ASSET_NAME}\") | .size" 2>/dev/null || true)
  if [ "${SIZE:-0}" != "${APK_SIZE}" ]; then
    # Fallback: asset tunggal apa pun yang ukurannya cocok (gh versi lama bisa
    # menyimpan dengan nama asli file).
    SIZE=$(gh release view "${TAG}" --repo "${SLUG}" --json assets \
            --jq ".assets[] | select(.size==${APK_SIZE}) | .size" 2>/dev/null | head -1 || true)
  fi
  if [ "${SIZE:-0}" = "${APK_SIZE}" ]; then
    echo "    OK  ${SLUG}: ${ASSET_NAME} ${SIZE} byte"
  else
    echo "    !!  ${SLUG}: asset tidak cocok (size='${SIZE:-kosong}', harusnya ${APK_SIZE})" >&2
    OK=0
  fi
done

echo ""
echo "==> SHA-256 APK (tempel ke catatan rilis untuk verifikasi unduhan):"
echo "    ${APK_SHA}  app-release-${TAG}.apk"

[ "$OK" = 1 ] && echo "==> SELESAI: ${TAG} live di kedua repo" || { echo "==> ADA YANG GAGAL" >&2; exit 1; }
