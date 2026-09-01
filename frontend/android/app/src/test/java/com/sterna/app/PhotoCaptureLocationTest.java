package com.sterna.app;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

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
}
