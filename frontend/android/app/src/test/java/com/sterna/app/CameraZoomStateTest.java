package com.sterna.app;

import static org.junit.Assert.assertEquals;

import org.junit.Test;

public class CameraZoomStateTest {

    @Test
    public void cyclesThroughRequestedZoomLevels() {
        CameraZoomState zoomState = new CameraZoomState();

        assertEquals("1x", zoomState.getLabel());
        zoomState.advance();
        assertEquals("2x", zoomState.getLabel());
        zoomState.advance();
        assertEquals("5x", zoomState.getLabel());
        zoomState.advance();
        assertEquals("0.5x", zoomState.getLabel());
        zoomState.advance();
        assertEquals("1x", zoomState.getLabel());
    }

    @Test
    public void skipsZoomLevelsOutsideCameraRange() {
        CameraZoomState zoomState = new CameraZoomState(1f, 5f);

        assertEquals("1x", zoomState.getLabel());
        zoomState.advance();
        assertEquals("2x", zoomState.getLabel());
        zoomState.advance();
        assertEquals("5x", zoomState.getLabel());
        zoomState.advance();
        assertEquals("1x", zoomState.getLabel());
    }
}
