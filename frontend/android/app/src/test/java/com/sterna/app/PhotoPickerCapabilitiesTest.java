package com.sterna.app;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class PhotoPickerCapabilitiesTest {

    @Test
    public void usesClassicPickerBelowAndroid14() {
        assertFalse(PhotoPickerCapabilities.supportsEmbedded(33, 99));
    }

    @Test
    public void usesClassicPickerWhenSdkExtensionIsTooOld() {
        assertFalse(PhotoPickerCapabilities.supportsEmbedded(34, 14));
    }

    @Test
    public void usesEmbeddedPickerOnAndroid14WithExtension15() {
        assertTrue(PhotoPickerCapabilities.supportsEmbedded(34, 15));
        assertTrue(PhotoPickerCapabilities.supportsEmbedded(36, 15));
    }
}
