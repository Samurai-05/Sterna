#!/usr/bin/env bash

set -euo pipefail

# ─────────────────────────────────────────────
# Sterna - Build Android APK
# ─────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
ANDROID_DIR="$FRONTEND_DIR/android"
APK_PATH="$ANDROID_DIR/app/build/outputs/apk/debug/app-debug.apk"

echo "========================================"
echo " Sterna - Android APK build"
echo "========================================"
echo

cd "$ROOT_DIR"

# ─────────────────────────────────────────────
# 1. Git
# ─────────────────────────────────────────────

echo "==> Git status"

BRANCH="$(git branch --show-current)"
COMMIT="$(git rev-parse --short HEAD)"

echo "Branch : $BRANCH"
echo "Commit : $COMMIT"
echo

git status --short

echo
echo "==> Fetch remote"
git fetch origin

# Pull uniquement si aucun changement local
if git diff --quiet && git diff --cached --quiet; then
    echo "==> Working tree clean - pulling latest changes"
    git pull --ff-only
else
    echo "==> Local changes detected - skipping git pull"
fi

echo
echo "Current commit:"
git log -1 --oneline

# ─────────────────────────────────────────────
# 2. Frontend dependencies
# ─────────────────────────────────────────────

cd "$FRONTEND_DIR"

echo
echo "==> Installing dependencies"
npm ci

# ─────────────────────────────────────────────
# 3. Quality checks
# ─────────────────────────────────────────────

echo
echo "==> Lint"
npm run lint

echo
echo "==> Tests"
npm test -- --run

# ─────────────────────────────────────────────
# 4. Build Android web assets
# ─────────────────────────────────────────────

echo
echo "==> Building Android frontend"
npm run build:android

# ─────────────────────────────────────────────
# 5. Capacitor sync
# ─────────────────────────────────────────────

echo
echo "==> Synchronizing Capacitor"
npx cap sync android

# ─────────────────────────────────────────────
# 6. Clean Android build
# ─────────────────────────────────────────────

cd "$ANDROID_DIR"

echo
echo "==> Cleaning previous Android build"
./gradlew clean

echo
echo "==> Building debug APK"
./gradlew assembleDebug

# ─────────────────────────────────────────────
# 7. Verify APK
# ─────────────────────────────────────────────

if [[ ! -f "$APK_PATH" ]]; then
    echo "ERROR: APK was not generated."
    exit 1
fi

echo
echo "========================================"
echo " APK BUILD SUCCESSFUL"
echo "========================================"
echo
echo "APK:"
echo "$APK_PATH"
echo

ls -lh "$APK_PATH"

echo
echo "SHA256:"
sha256sum "$APK_PATH"

# ─────────────────────────────────────────────
# 8. Find ADB
# ─────────────────────────────────────────────

ADB=""

if command -v adb >/dev/null 2>&1; then
    ADB="adb"

elif command -v powershell.exe >/dev/null 2>&1; then
    WIN_ADB="$(powershell.exe -NoProfile -Command \
        '$p="$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"; if (Test-Path $p) { Write-Output $p }' \
        | tr -d '\r')"

    if [[ -n "$WIN_ADB" ]]; then
        ADB="$(wslpath "$WIN_ADB")"
    fi
fi

# ─────────────────────────────────────────────
# 9. Install APK if device is connected
# ─────────────────────────────────────────────

if [[ -n "$ADB" && -x "$ADB" ]]; then

    echo
    echo "==> Checking Android devices"

    "$ADB" devices

    DEVICE_COUNT="$("$ADB" devices | awk 'NR > 1 && $2 == "device" { count++ } END { print count+0 }')"

    if [[ "$DEVICE_COUNT" -gt 0 ]]; then
        echo
        echo "==> Installing APK on connected device"
        "$ADB" install -r "$APK_PATH"

        echo
        echo "========================================"
        echo " APK INSTALLED SUCCESSFULLY"
        echo "========================================"
    else
        echo
        echo "No Android device connected."
        echo "APK was built successfully but not installed."
    fi

else
    echo
    echo "ADB not found."
    echo "APK was built successfully but not installed."
fi

echo
echo "Done."
