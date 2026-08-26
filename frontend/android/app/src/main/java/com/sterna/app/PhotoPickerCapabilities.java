package com.sterna.app;

final class PhotoPickerCapabilities {

    private PhotoPickerCapabilities() {}

    static boolean supportsEmbedded(int sdkInt, int extensionVersion) {
        return sdkInt >= 34 && extensionVersion >= 15;
    }
}
