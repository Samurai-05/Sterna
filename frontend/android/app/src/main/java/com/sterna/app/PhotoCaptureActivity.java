package com.sterna.app;

import android.Manifest;
import android.app.Activity;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.ext.SdkExtensions;
import android.provider.OpenableColumns;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.PickVisualMediaRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageCapture;
import androidx.camera.core.ImageCaptureException;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.content.ContextCompat;
import androidx.photopicker.EmbeddedPhotoPickerView;
import com.google.common.util.concurrent.ListenableFuture;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class PhotoCaptureActivity extends AppCompatActivity {

    static final int RESULT_SELECTED = 42;
    static final String EXTRA_PATH = "path";
    static final String EXTRA_MIME_TYPE = "mimeType";
    static final String EXTRA_FILE_NAME = "fileName";
    static final String EXTRA_SOURCE = "source";

    private PreviewView previewView;
    private ImageCapture imageCapture;
    private TextView statusView;
    private Button galleryButton;
    private EmbeddedPhotoPickerView embeddedPickerView;
    private ActivityResultLauncher<String> cameraPermissionLauncher;
    private ActivityResultLauncher<PickVisualMediaRequest> galleryLauncher;
    private ExecutorService cameraExecutor;
    private Uri embeddedSelectedUri;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        cameraExecutor = Executors.newSingleThreadExecutor();
        registerLaunchers();
        setContentView(createContentView());
        configureGallery();
        requestOrStartCamera();
    }

    private void registerLaunchers() {
        cameraPermissionLauncher = registerForActivityResult(
                new ActivityResultContracts.RequestPermission(),
                granted -> {
                    if (granted) {
                        startCamera();
                    } else {
                        getPreferences(MODE_PRIVATE).edit().putBoolean("camera_denied", true).apply();
                        showStatus("Camera unavailable. You can still choose a photo from Gallery.");
                    }
                });
        galleryLauncher = registerForActivityResult(
                new ActivityResultContracts.PickVisualMedia(),
                uri -> {
                    if (uri != null) {
                        copySelectedUri(uri, "gallery");
                    }
                });
    }

    private View createContentView() {
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(0xff101312);

        Button closeButton = new Button(this);
        closeButton.setText("Close");
        closeButton.setContentDescription("Close photo capture");
        closeButton.setOnClickListener(view -> finish());
        root.addView(closeButton, new LinearLayout.LayoutParams(-1, 56));

        FrameLayout cameraArea = new FrameLayout(this);
        previewView = new PreviewView(this);
        previewView.setImplementationMode(PreviewView.ImplementationMode.COMPATIBLE);
        cameraArea.addView(previewView, new FrameLayout.LayoutParams(-1, -1));

        Button shutterButton = new Button(this);
        shutterButton.setText("●");
        shutterButton.setTextSize(28);
        shutterButton.setContentDescription("Take photo");
        shutterButton.setOnClickListener(view -> capturePhoto());
        FrameLayout.LayoutParams shutterParams = new FrameLayout.LayoutParams(96, 72, Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL);
        shutterParams.bottomMargin = 20;
        cameraArea.addView(shutterButton, shutterParams);
        root.addView(cameraArea, new LinearLayout.LayoutParams(-1, 0, 1));

        statusView = new TextView(this);
        statusView.setTextColor(0xffffffff);
        statusView.setPadding(24, 8, 24, 8);
        root.addView(statusView, new LinearLayout.LayoutParams(-1, -2));
        galleryButton = new Button(this);
        galleryButton.setText("Gallery");
        galleryButton.setContentDescription("Choose photo from Gallery");
        galleryButton.setOnClickListener(view -> launchGallery());
        root.addView(galleryButton, new LinearLayout.LayoutParams(-1, 64));
        return root;
    }

    private void configureGallery() {
        if (!supportsEmbeddedPicker()) {
            return;
        }

        try {
            EmbeddedPhotoPickerView pickerView = new EmbeddedPhotoPickerView(this);
            embeddedPickerView = pickerView;
            android.widget.photopicker.EmbeddedPhotoPickerFeatureInfo.Builder featureBuilder =
                    new android.widget.photopicker.EmbeddedPhotoPickerFeatureInfo.Builder()
                            .setMimeTypes(Arrays.asList("image/*"))
                            .setMaxSelectionLimit(1);
            enableCollapsedPickerScrolling(featureBuilder);
            pickerView.setEmbeddedPhotoPickerFeatureInfo(featureBuilder.build());
            pickerView.addEmbeddedPhotoPickerStateChangeListener(
                    new EmbeddedPhotoPickerView.EmbeddedPhotoPickerStateChangeListener() {
                        @Override
                        public void onSelectionComplete() {
                            if (embeddedSelectedUri != null) {
                                copySelectedUri(embeddedSelectedUri, "gallery");
                            }
                        }

                        @Override
                        public void onSessionError(Throwable throwable) {
                            showClassicGallery();
                        }

                        @Override
                        public void onSessionOpened(android.widget.photopicker.EmbeddedPhotoPickerSession session) {}

                        @Override
                        public void onUriPermissionGranted(List<? extends Uri> uris) {
                            if (!uris.isEmpty()) {
                                embeddedSelectedUri = uris.get(0);
                            }
                        }

                        @Override
                        public void onUriPermissionRevoked(List<? extends Uri> uris) {
                            if (embeddedSelectedUri != null && uris.contains(embeddedSelectedUri)) {
                                embeddedSelectedUri = null;
                            }
                        }
                    });
            LinearLayout galleryParent = (LinearLayout) galleryButton.getParent();
            galleryParent.removeView(galleryButton);
            galleryParent.addView(pickerView, new LinearLayout.LayoutParams(-1, 180));
        } catch (RuntimeException exception) {
            showClassicGallery();
        }
    }

    private boolean supportsEmbeddedPicker() {
        if (Build.VERSION.SDK_INT < 34) {
            return false;
        }
        return PhotoPickerCapabilities.supportsEmbedded(
                Build.VERSION.SDK_INT,
                SdkExtensions.getExtensionVersion(Build.VERSION_CODES.UPSIDE_DOWN_CAKE));
    }

    private void enableCollapsedPickerScrolling(
            android.widget.photopicker.EmbeddedPhotoPickerFeatureInfo.Builder builder) {
        try {
            builder.getClass()
                    .getMethod("setCollapsedModeScrollingEnabled", boolean.class)
                    .invoke(builder, true);
        } catch (ReflectiveOperationException ignored) {
            // This option is newer than the minimum embedded-picker extension.
        }
    }

    private void showClassicGallery() {
        if (embeddedPickerView != null && embeddedPickerView.getParent() instanceof LinearLayout) {
            LinearLayout parent = (LinearLayout) embeddedPickerView.getParent();
            parent.removeView(embeddedPickerView);
            parent.addView(galleryButton, new LinearLayout.LayoutParams(-1, 64));
            embeddedPickerView = null;
        }
        galleryButton.setVisibility(View.VISIBLE);
    }

    private void launchGallery() {
        galleryLauncher.launch(new PickVisualMediaRequest.Builder()
                .setMediaType(ActivityResultContracts.PickVisualMedia.ImageOnly.INSTANCE)
                .build());
    }

    private void requestOrStartCamera() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            startCamera();
        } else if (!getPreferences(MODE_PRIVATE).getBoolean("camera_denied", false)) {
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA);
        } else {
            showStatus("Camera unavailable. You can still choose a photo from Gallery.");
        }
    }

    private void startCamera() {
        ListenableFuture<ProcessCameraProvider> providerFuture = ProcessCameraProvider.getInstance(this);
        providerFuture.addListener(() -> {
            try {
                ProcessCameraProvider provider = providerFuture.get();
                Preview preview = new Preview.Builder().build();
                imageCapture = new ImageCapture.Builder().build();
                preview.setSurfaceProvider(previewView.getSurfaceProvider());
                provider.unbindAll();
                provider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, preview, imageCapture);
                showStatus("");
            } catch (Exception exception) {
                showStatus("Camera unavailable. You can still choose a photo from Gallery.");
            }
        }, ContextCompat.getMainExecutor(this));
    }

    private void capturePhoto() {
        if (imageCapture == null) {
            showStatus("Camera unavailable. You can still choose a photo from Gallery.");
            return;
        }
        File output = new File(getCacheDir(), "sterna-camera-" + UUID.randomUUID() + ".jpg");
        ImageCapture.OutputFileOptions options = new ImageCapture.OutputFileOptions.Builder(output).build();
        imageCapture.takePicture(options, cameraExecutor, new ImageCapture.OnImageSavedCallback() {
            @Override
            public void onImageSaved(ImageCapture.OutputFileResults outputFileResults) {
                returnSelectedFile(output, "image/jpeg", "camera");
            }

            @Override
            public void onError(ImageCaptureException exception) {
                runOnUiThread(() -> showStatus("Could not take photo. Please try again or use Gallery."));
            }
        });
    }

    private void copySelectedUri(Uri uri, String source) {
        String fileName = queryFileName(uri);
        if (fileName == null) {
            fileName = "sterna-gallery-" + UUID.randomUUID() + ".jpg";
        }
        String mimeType = getContentResolver().getType(uri);
        if (mimeType == null || !mimeType.startsWith("image/")) {
            mimeType = "image/jpeg";
        }
        File output = new File(getCacheDir(), "sterna-gallery-" + UUID.randomUUID() + ".jpg");
        try (InputStream input = getContentResolver().openInputStream(uri);
             FileOutputStream outputStream = new FileOutputStream(output)) {
            if (input == null) {
                throw new IOException("Selected URI is not readable");
            }
            byte[] buffer = new byte[8192];
            int count;
            while ((count = input.read(buffer)) != -1) {
                outputStream.write(buffer, 0, count);
            }
            returnSelectedFile(output, mimeType, source, fileName);
        } catch (IOException exception) {
            output.delete();
            showStatus("Could not read that photo. Please choose another one.");
        }
    }

    private String queryFileName(Uri uri) {
        if (!"content".equals(uri.getScheme())) {
            return uri.getLastPathSegment();
        }
        try (android.database.Cursor cursor = getContentResolver().query(uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
            if (cursor != null && cursor.moveToFirst()) {
                return cursor.getString(0);
            }
        }
        return null;
    }

    private void returnSelectedFile(File file, String mimeType, String source) {
        returnSelectedFile(file, mimeType, source, file.getName());
    }

    private void returnSelectedFile(File file, String mimeType, String source, String fileName) {
        Intent result = new Intent();
        result.putExtra(EXTRA_PATH, file.getAbsolutePath());
        result.putExtra(EXTRA_MIME_TYPE, mimeType);
        result.putExtra(EXTRA_FILE_NAME, fileName);
        result.putExtra(EXTRA_SOURCE, source);
        runOnUiThread(() -> {
            setResult(RESULT_SELECTED, result);
            finish();
        });
    }

    private void showStatus(String message) {
        if (statusView != null) {
            statusView.setText(message);
        }
    }

    @Override
    public void onBackPressed() {
        setResult(Activity.RESULT_CANCELED);
        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        if (cameraExecutor != null) {
            cameraExecutor.shutdown();
        }
    }
}
