package com.sterna.app;

final class CameraPermissionFlow {

    interface PermissionChecker {
        boolean isGranted();
    }

    interface PermissionRequester {
        void request();
    }

    interface CameraStarter {
        void start();
    }

    interface PermissionDeniedHandler {
        void onDenied();
    }

    static void requestOrStartCamera(
            PermissionChecker permissionChecker,
            PermissionRequester permissionRequester,
            CameraStarter cameraStarter) {
        if (permissionChecker.isGranted()) {
            cameraStarter.start();
        } else {
            permissionRequester.request();
        }
    }

    static void handlePermissionResult(
            boolean granted,
            CameraStarter cameraStarter,
            PermissionDeniedHandler permissionDeniedHandler) {
        if (granted) {
            cameraStarter.start();
        } else {
            permissionDeniedHandler.onDenied();
        }
    }

    static String denialMessage(boolean shouldShowRationale) {
        return shouldShowRationale
                ? "Camera permission is required to take a photo. You can still choose a photo from Gallery."
                : "Camera permission is disabled. Enable Camera in Android settings, or choose a photo from Gallery.";
    }

    private CameraPermissionFlow() {}
}
