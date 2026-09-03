package com.sterna.app;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.Test;

public class CameraPermissionFlowTest {

    @Test
    public void startsCameraWhenPermissionIsGranted() {
        AtomicBoolean cameraStarted = new AtomicBoolean();
        AtomicBoolean permissionRequested = new AtomicBoolean();

        CameraPermissionFlow.requestOrStartCamera(
                () -> true,
                () -> permissionRequested.set(true),
                () -> cameraStarted.set(true));

        assertTrue(cameraStarted.get());
        assertFalse(permissionRequested.get());
    }

    @Test
    public void requestsCameraPermissionWhenItIsNotGranted() {
        AtomicBoolean cameraStarted = new AtomicBoolean();
        AtomicBoolean permissionRequested = new AtomicBoolean();

        CameraPermissionFlow.requestOrStartCamera(
                () -> false,
                () -> permissionRequested.set(true),
                () -> cameraStarted.set(true));

        assertFalse(cameraStarted.get());
        assertTrue(permissionRequested.get());
    }

    @Test
    public void refusalDoesNotStartCamera() {
        AtomicBoolean cameraStarted = new AtomicBoolean();
        AtomicBoolean denialReported = new AtomicBoolean();

        CameraPermissionFlow.handlePermissionResult(
                false,
                () -> cameraStarted.set(true),
                () -> denialReported.set(true));

        assertFalse(cameraStarted.get());
        assertTrue(denialReported.get());
    }

    @Test
    public void permissionGrantStartsCameraFromCallback() {
        AtomicBoolean cameraStarted = new AtomicBoolean();

        CameraPermissionFlow.handlePermissionResult(
                true,
                () -> cameraStarted.set(true),
                () -> {});

        assertTrue(cameraStarted.get());
    }

    @Test
    public void aLaterOpeningCanRequestPermissionAgainAfterAnEarlierRefusal() {
        AtomicInteger permissionRequests = new AtomicInteger();

        CameraPermissionFlow.requestOrStartCamera(
                () -> false,
                permissionRequests::incrementAndGet,
                () -> {});
        CameraPermissionFlow.handlePermissionResult(false, () -> {}, () -> {});
        CameraPermissionFlow.requestOrStartCamera(
                () -> false,
                permissionRequests::incrementAndGet,
                () -> {});

        assertEquals(2, permissionRequests.get());
    }

    @Test
    public void explainsThatCameraPermissionIsRequiredAfterARegularRefusal() {
        assertEquals(
                "Camera permission is required to take a photo. You can still choose a photo from Gallery.",
                CameraPermissionFlow.denialMessage(true));
    }

    @Test
    public void pointsToAndroidSettingsWhenPermissionIsPermanentlyDenied() {
        assertEquals(
                "Camera permission is disabled. Enable Camera in Android settings, or choose a photo from Gallery.",
                CameraPermissionFlow.denialMessage(false));
    }
}
