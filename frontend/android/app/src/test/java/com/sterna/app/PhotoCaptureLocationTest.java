package com.sterna.app;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import java.util.concurrent.atomic.AtomicBoolean;

import org.junit.Test;

public class PhotoCaptureLocationTest {

    @Test
    public void acceptsLocationsCapturedRecently() {
        long now = 1_000_000L;

        assertTrue(PhotoCaptureLocation.isRecent(now - 30_000L, now));
    }

    @Test
    public void rejectsLocationsThatAreTooOld() {
        long now = 1_000_000L;

        assertFalse(PhotoCaptureLocation.isRecent(now - 120_001L, now));
    }

    @Test
    public void containsLocationStartupFailure() {
        AtomicBoolean failureReported = new AtomicBoolean();

        boolean started = PhotoCaptureLocation.runSafely(
                () -> { throw new IllegalStateException("location unavailable"); },
                exception -> failureReported.set(true));

        assertFalse(started);
        assertTrue(failureReported.get());
    }
}
