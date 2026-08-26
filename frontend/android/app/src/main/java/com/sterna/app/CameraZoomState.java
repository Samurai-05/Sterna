package com.sterna.app;

final class CameraZoomState {

    private static final float[] ZOOM_RATIOS = {1f, 2f, 5f, 0.5f};
    private static final String[] ZOOM_LABELS = {"1x", "2x", "5x", "0.5x"};

    private final float minZoomRatio;
    private final float maxZoomRatio;
    private int currentIndex;

    CameraZoomState() {
        this(0f, Float.MAX_VALUE);
    }

    CameraZoomState(float minZoomRatio, float maxZoomRatio) {
        this.minZoomRatio = minZoomRatio;
        this.maxZoomRatio = maxZoomRatio;
        currentIndex = findFirstAvailableIndex();
    }

    float getRatio() {
        return ZOOM_RATIOS[currentIndex];
    }

    float getNextRatio() {
        return ZOOM_RATIOS[getNextIndex()];
    }

    String getLabel() {
        return ZOOM_LABELS[currentIndex];
    }

    void advance() {
        currentIndex = getNextIndex();
    }

    boolean hasNextAvailable() {
        return getNextIndex() != currentIndex;
    }

    private int getNextIndex() {
        for (int offset = 1; offset <= ZOOM_RATIOS.length; offset++) {
            int candidateIndex = (currentIndex + offset) % ZOOM_RATIOS.length;
            if (isAvailable(candidateIndex)) {
                return candidateIndex;
            }
        }
        return currentIndex;
    }

    private int findFirstAvailableIndex() {
        for (int index = 0; index < ZOOM_RATIOS.length; index++) {
            if (isAvailable(index)) {
                return index;
            }
        }
        return 0;
    }

    private boolean isAvailable(int index) {
        return ZOOM_RATIOS[index] >= minZoomRatio && ZOOM_RATIOS[index] <= maxZoomRatio;
    }
}
