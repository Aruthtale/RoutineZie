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
echo "    ukuran: ${APK_SIZE} byte"

echo "==> Push commit ke kedua repo (dual-push remote)"
git push origin main

for SLUG in "${REPOS[@]}"; do
  OWNER="${SLUG%%/*}"
  echo "==> Rilis ${TAG} di ${SLUG} (akun: ${OWNER})"
  gh release create "${TAG}" \
    --repo "${SLUG}" \
    -u "${OWNER}" \
    --title "${TITLE}" \
    --notes-file "${NOTES}" \
    "${APK_ABS}#app-release-${TAG}.apk"
done

echo "==> Verifikasi asset di kedua rilis"
OK=1
for SLUG in "${REPOS[@]}"; do
  SIZE=$(gh release view "${TAG}" --repo "${SLUG}" --json assets \
          --jq ".assets[] | select(.name==\"app-release-${TAG}.apk\") | .size" 2>/dev/null || true)
  if [ "${SIZE:-0}" = "${APK_SIZE}" ]; then
    echo "    OK  ${SLUG}: app-release-${TAG}.apk ${SIZE} byte"
  else
    echo "    !!  ${SLUG}: asset tidak cocok (size='${SIZE:-kosong}')" >&2
    OK=0
  fi
done

[ "$OK" = 1 ] && echo "==> SELESAI: ${TAG} live di kedua repo" || { echo "==> ADA YANG GAGAL" >&2; exit 1; }
