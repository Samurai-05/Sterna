#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
frontend_dir="$repo_root/frontend"
android_dir="$frontend_dir/android"
apk_path="$android_dir/app/build/outputs/apk/debug/app-debug.apk"
package_name="com.sterna.app"

die() {
  printf 'Error: %s\n' "$1" >&2
  exit 1
}

find_adb() {
  if [[ -n "${ADB_PATH:-}" && -x "${ADB_PATH}" ]]; then
    printf '%s\n' "$ADB_PATH"
    return
  fi

  if command -v adb >/dev/null 2>&1; then
    command -v adb
    return
  fi

  local sdk_root
  for sdk_root in "${ANDROID_SDK_ROOT:-}" "${ANDROID_HOME:-}" "/home/${USER:-}/Android/Sdk" /opt/android-sdk; do
    if [[ -n "$sdk_root" && -x "$sdk_root/platform-tools/adb" ]]; then
      printf '%s\n' "$sdk_root/platform-tools/adb"
      return
    fi
  done

  die 'adb introuvable. Définis ADB_PATH, ANDROID_SDK_ROOT ou ajoute adb au PATH.'
}

select_device() {
  local -a devices
  mapfile -t devices < <("$adb_path" devices | awk 'NR > 1 && $2 == "device" { print $1 }')

  if [[ -n "${ADB_SERIAL:-}" ]]; then
    if printf '%s\n' "${devices[@]}" | grep -Fxq "$ADB_SERIAL"; then
      printf '%s\n' "$ADB_SERIAL"
      return
    fi
    die "l'appareil ADB '$ADB_SERIAL' n'est pas connecté ou autorisé."
  fi

  case "${#devices[@]}" in
    0)
      "$adb_path" devices -l >&2
      die 'aucun appareil ADB autorisé. Active le débogage USB et accepte la clé RSA sur le téléphone.'
      ;;
    1)
      printf '%s\n' "${devices[0]}"
      ;;
    *)
      printf 'Plusieurs appareils ADB détectés :\n%s\n' "${devices[*]}" >&2
      die 'définis ADB_SERIAL avec le serial du Samsung S22.'
      ;;
  esac
}

adb_path="$(find_adb)"

[[ -x "$frontend_dir/node_modules/.bin/cap" ]] || die 'Capacitor CLI absent. Lance npm ci dans frontend.'
[[ -x "$android_dir/gradlew" ]] || die 'Gradle wrapper Android absent.'

printf '%s\n' 'Nettoyage des artefacts web et Android...'
rm -rf \
  "$frontend_dir/dist" \
  "$android_dir/.gradle" \
  "$android_dir/app/build" \
  "$android_dir/build" \
  "$android_dir/capacitor-cordova-android-plugins/build"

printf '%s\n' 'Build web...'
(cd "$frontend_dir" && npm run build)

printf '%s\n' 'Synchronisation Capacitor...'
(cd "$frontend_dir" && ./node_modules/.bin/cap sync android)

printf '%s\n' 'Compilation APK sans cache Gradle...'
(cd "$android_dir" && ./gradlew --no-daemon --no-build-cache --rerun-tasks clean assembleDebug)

device_serial="$(select_device)"

printf 'Installation sur %s...\n' "$device_serial"
"$adb_path" -s "$device_serial" install -r -d "$apk_path"

printf 'APK installé : %s\n' "$apk_path"
printf 'Appareil : %s\n' "$device_serial"
