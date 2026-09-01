package com.sterna.app;

final class PhotoCaptureLocation {

    interface FailureHandler {
        void onFailure(Exception exception);
    }

    private static final long MAX_LOCATION_AGE_MILLIS = 120_000L;

    static boolean isRecent(long locationTimeMillis, long nowMillis) {
        long ageMillis = nowMillis - locationTimeMillis;
        return ageMillis >= 0 && ageMillis <= MAX_LOCATION_AGE_MILLIS;
    }

    static boolean runSafely(Runnable operation, FailureHandler failureHandler) {
        try {
            operation.run();
            return true;
        } catch (Exception exception) {
            failureHandler.onFailure(exception);
            return false;
        }
    }

    private PhotoCaptureLocation() {}
}
