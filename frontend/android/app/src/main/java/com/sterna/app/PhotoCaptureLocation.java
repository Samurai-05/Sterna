package com.sterna.app;

final class PhotoCaptureLocation {

    private static final long MAX_LOCATION_AGE_MILLIS = 120_000L;

    static boolean isRecent(long locationTimeMillis, long nowMillis) {
        long ageMillis = nowMillis - locationTimeMillis;
        return ageMillis >= 0 && ageMillis <= MAX_LOCATION_AGE_MILLIS;
    }

    private PhotoCaptureLocation() {}
}
