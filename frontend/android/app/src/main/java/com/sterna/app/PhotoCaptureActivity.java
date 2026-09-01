package com.sterna.app;

import android.Manifest;
import android.app.Activity;
import android.animation.AnimatorInflater;
import android.animation.StateListAnimator;
import android.content.ContentResolver;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Looper;
import android.os.ext.SdkExtensions;
import android.provider.OpenableColumns;
import android.view.Gravity;
import android.view.Surface;
import android.view.View;
import android.widget.FrameLayout;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.TextView;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.PickVisualMediaRequest;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.camera.core.Camera;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.ImageCapture;
import androidx.camera.core.ImageCaptureException;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.view.PreviewView;
import androidx.core.content.ContextCompat;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
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

    private static final int CAMERA_CONTROLS_HEIGHT_DP = 100;
    private static final int EMBEDDED_PICKER_HEIGHT_DP = 180;
    private static final String[] LOCATION_PERMISSIONS = {
        Manifest.permission.ACCESS_COARSE_LOCATION,
        Manifest.permission.ACCESS_FINE_LOCATION
    };

    private FrameLayout rootView;
    private PreviewView previewView;
    private ImageCapture imageCapture;
    private TextView statusView;
    private ImageButton galleryButton;
    private ImageButton closeButton;
    private ImageButton flashButton;
    private ImageButton switchCameraButton;
    private ImageButton shutterButton;
    private TextView zoomButton;
    private FrameLayout topControls;
    private FrameLayout bottomControls;
    private EmbeddedPhotoPickerView embeddedPickerView;
    private ActivityResultLauncher<String> cameraPermissionLauncher;
    private ActivityResultLauncher<String[]> locationPermissionLauncher;
    private ActivityResultLauncher<PickVisualMediaRequest> galleryLauncher;
    private ExecutorService cameraExecutor;
    private ProcessCameraProvider cameraProvider;
    private Camera activeCamera;
    private CameraZoomState zoomState;
    private Uri embeddedSelectedUri;
    private boolean usingFrontCamera;
    private boolean flashEnabled;
    private boolean captureInProgress;
    private LocationManager locationManager;
    private LocationListener locationListener;
    private Location latestLocation;
    private boolean locationUpdatesStarted;
    private int topSystemInset;
    private int bottomSystemInset;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        configureWindow();
        cameraExecutor = Executors.newSingleThreadExecutor();
        registerLaunchers();
        rootView = createContentView();
        setContentView(rootView);
        ViewCompat.setOnApplyWindowInsetsListener(rootView, (view, insets) -> {
            Insets systemBars = insets.getInsets(WindowInsetsCompat.Type.systemBars());
            topSystemInset = systemBars.top;
            bottomSystemInset = systemBars.bottom;
            applySystemInsets();
            return insets;
        });
        ViewCompat.requestApplyInsets(rootView);
        configureGallery();
        requestOrStartCamera();
    }

    private void configureWindow() {
        WindowCompat.enableEdgeToEdge(getWindow());
        getWindow().setStatusBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarColor(Color.TRANSPARENT);
        getWindow().setNavigationBarDividerColor(Color.TRANSPARENT);
        getWindow().setNavigationBarContrastEnforced(false);
        WindowInsetsControllerCompat controller =
                WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        controller.setAppearanceLightStatusBars(false);
        controller.setAppearanceLightNavigationBars(false);
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
        locationPermissionLauncher = registerForActivityResult(
                new ActivityResultContracts.RequestMultiplePermissions(),
                permissions -> {
                    if (hasLocationPermission()) {
                        startLocationUpdates();
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

    private FrameLayout createContentView() {
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);

        previewView = new PreviewView(this);
        previewView.setImplementationMode(PreviewView.ImplementationMode.COMPATIBLE);
        previewView.setScaleType(PreviewView.ScaleType.FILL_CENTER);
        root.addView(previewView, new FrameLayout.LayoutParams(-1, -1));

        View topScrim = new View(this);
        topScrim.setBackgroundResource(R.drawable.camera_top_scrim);
        root.addView(topScrim, new FrameLayout.LayoutParams(-1, dp(180), Gravity.TOP));

        topControls = new FrameLayout(this);
        closeButton = createControlButton(R.drawable.ic_camera_close, "Close photo capture");
        closeButton.setOnClickListener(view -> cancelAndClose());
        topControls.addView(closeButton, controlLayoutParams(Gravity.START));

        FrameLayout topRightControls = new FrameLayout(this);
        flashButton = createControlButton(R.drawable.ic_camera_flash_off, "Turn flash on");
        flashButton.setVisibility(View.GONE);
        flashButton.setOnClickListener(view -> toggleFlash());
        topRightControls.addView(flashButton, controlLayoutParams(Gravity.END));
        topControls.addView(topRightControls, new FrameLayout.LayoutParams(-2, dp(56), Gravity.END));
        root.addView(topControls, new FrameLayout.LayoutParams(-1, -2, Gravity.TOP));

        statusView = new TextView(this);
        statusView.setTextColor(Color.WHITE);
        statusView.setTextSize(14);
        statusView.setGravity(Gravity.CENTER);
        statusView.setPadding(dp(16), dp(8), dp(16), dp(8));
        statusView.setBackgroundResource(R.drawable.camera_status_background);
        statusView.setVisibility(View.GONE);
        FrameLayout.LayoutParams statusParams =
                new FrameLayout.LayoutParams(-2, -2, Gravity.BOTTOM | Gravity.CENTER_HORIZONTAL);
        statusParams.bottomMargin = dp(CAMERA_CONTROLS_HEIGHT_DP + 16);
        root.addView(statusView, statusParams);

        bottomControls = new FrameLayout(this);
        bottomControls.setClipChildren(false);
        bottomControls.setPadding(dp(18), 0, dp(18), 0);

        galleryButton = createControlButton(R.drawable.ic_camera_gallery, "Choose a photo from Gallery");
        galleryButton.setOnClickListener(view -> launchGallery());
        bottomControls.addView(
                galleryButton,
                controlLayoutParams(Gravity.START | Gravity.CENTER_VERTICAL));

        shutterButton = new ImageButton(this);
        shutterButton.setContentDescription("Take photo");
        shutterButton.setBackgroundResource(R.drawable.camera_shutter_background);
        StateListAnimator shutterAnimator = AnimatorInflater.loadStateListAnimator(
                this, R.animator.camera_shutter_state_list);
        shutterButton.setStateListAnimator(shutterAnimator);
        shutterButton.setPadding(0, 0, 0, 0);
        shutterButton.setScaleType(ImageView.ScaleType.CENTER);
        shutterButton.setOnClickListener(view -> capturePhoto());
        FrameLayout.LayoutParams shutterParams =
                new FrameLayout.LayoutParams(dp(84), dp(84), Gravity.CENTER);
        bottomControls.addView(shutterButton, shutterParams);

        zoomButton = new TextView(this);
        zoomButton.setTextColor(Color.WHITE);
        zoomButton.setTextSize(14);
        zoomButton.setGravity(Gravity.CENTER);
        zoomButton.setBackgroundResource(R.drawable.camera_control_background);
        zoomButton.setElevation(dp(2));
        zoomButton.setOnClickListener(view -> cycleZoom());
        updateZoomButton();
        FrameLayout.LayoutParams zoomParams =
                new FrameLayout.LayoutParams(dp(48), dp(48), Gravity.END | Gravity.CENTER_VERTICAL);
        zoomParams.rightMargin = dp(64);
        bottomControls.addView(
                zoomButton,
                zoomParams);

        switchCameraButton = createControlButton(R.drawable.ic_camera_switch, "Switch camera");
        switchCameraButton.setVisibility(View.GONE);
        switchCameraButton.setOnClickListener(view -> switchCamera());
        FrameLayout.LayoutParams switchParams =
                controlLayoutParams(Gravity.END | Gravity.CENTER_VERTICAL);
        bottomControls.addView(
                switchCameraButton,
                switchParams);

        FrameLayout.LayoutParams bottomParams =
                new FrameLayout.LayoutParams(-1, dp(CAMERA_CONTROLS_HEIGHT_DP), Gravity.BOTTOM);
        root.addView(bottomControls, bottomParams);
        return root;
    }

    private ImageButton createControlButton(int iconResId, String contentDescription) {
        ImageButton button = new ImageButton(this);
        button.setImageResource(iconResId);
        button.setContentDescription(contentDescription);
        button.setBackgroundResource(R.drawable.camera_control_background);
        button.setColorFilter(Color.WHITE, android.graphics.PorterDuff.Mode.SRC_IN);
        button.setPadding(dp(16), dp(16), dp(16), dp(16));
        button.setMinimumWidth(dp(56));
        button.setMinimumHeight(dp(56));
        button.setScaleType(ImageView.ScaleType.CENTER_INSIDE);
        button.setElevation(dp(2));
        return button;
    }

    private FrameLayout.LayoutParams controlLayoutParams(int gravity) {
        return new FrameLayout.LayoutParams(dp(56), dp(56), gravity);
    }

    private void applySystemInsets() {
        if (topControls == null || bottomControls == null) {
            return;
        }
        topControls.setPadding(dp(8), topSystemInset + dp(8), dp(8), dp(8));
        bottomControls.setPadding(dp(18), 0, dp(18), bottomSystemInset);

        FrameLayout.LayoutParams bottomParams =
                (FrameLayout.LayoutParams) bottomControls.getLayoutParams();
        bottomParams.height = dp(CAMERA_CONTROLS_HEIGHT_DP) + bottomSystemInset;
        bottomParams.bottomMargin = embeddedPickerView == null
                ? 0 : dp(EMBEDDED_PICKER_HEIGHT_DP) + bottomSystemInset;
        bottomControls.setLayoutParams(bottomParams);

        if (embeddedPickerView != null) {
            FrameLayout.LayoutParams pickerParams =
                    (FrameLayout.LayoutParams) embeddedPickerView.getLayoutParams();
            pickerParams.bottomMargin = bottomSystemInset;
            embeddedPickerView.setLayoutParams(pickerParams);
        }

        FrameLayout.LayoutParams statusParams =
                (FrameLayout.LayoutParams) statusView.getLayoutParams();
        statusParams.bottomMargin = dp(CAMERA_CONTROLS_HEIGHT_DP + 16) + bottomSystemInset
                + (embeddedPickerView == null ? 0 : dp(EMBEDDED_PICKER_HEIGHT_DP));
        statusView.setLayoutParams(statusParams);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }

    private void toggleFlash() {
        if (imageCapture == null || flashButton.getVisibility() != View.VISIBLE) {
            return;
        }
        flashEnabled = !flashEnabled;
        imageCapture.setFlashMode(
                flashEnabled ? ImageCapture.FLASH_MODE_ON : ImageCapture.FLASH_MODE_OFF);
        flashButton.setImageResource(
                flashEnabled ? R.drawable.ic_camera_flash_on : R.drawable.ic_camera_flash_off);
        flashButton.setContentDescription(flashEnabled ? "Turn flash off" : "Turn flash on");
    }

    private void switchCamera() {
        if (cameraProvider == null || captureInProgress) {
            return;
        }
        usingFrontCamera = !usingFrontCamera;
        bindCamera();
    }

    private void cycleZoom() {
        if (activeCamera == null || zoomState == null) {
            return;
        }
        if (!zoomState.hasNextAvailable()) {
            return;
        }
        float nextRatio = zoomState.getNextRatio();
        ListenableFuture<Void> zoomRequest =
                activeCamera.getCameraControl().setZoomRatio(nextRatio);
        zoomRequest.addListener(() -> {
            try {
                zoomRequest.get();
                runOnUiThread(() -> {
                    zoomState.advance();
                    updateZoomButton();
                    showStatus("");
                });
            } catch (Exception exception) {
                runOnUiThread(() -> showStatus("That zoom level is not available on this camera."));
            }
        }, ContextCompat.getMainExecutor(this));
    }

    private void updateZoomButton() {
        if (zoomButton == null) {
            return;
        }
        String label = zoomState == null ? "1x" : zoomState.getLabel();
        zoomButton.setText(label);
        zoomButton.setContentDescription("Zoom " + label);
    }

    private void cancelAndClose() {
        setResult(Activity.RESULT_CANCELED);
        if (cameraProvider != null) {
            cameraProvider.unbindAll();
        }
        finish();
    }

    private int getTargetRotation() {
        return previewView.getDisplay() == null
                ? Surface.ROTATION_0 : previewView.getDisplay().getRotation();
    }

    private void configureGallery() {
        if (!supportsEmbeddedPicker()) {
            return;
        }

        try {
            EmbeddedPhotoPickerView pickerView = new EmbeddedPhotoPickerView(this);
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
                        public void onSessionOpened(
                                android.widget.photopicker.EmbeddedPhotoPickerSession session) {}

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
            galleryButton.setVisibility(View.GONE);
            embeddedPickerView = pickerView;
            FrameLayout.LayoutParams pickerParams =
                    new FrameLayout.LayoutParams(-1, dp(EMBEDDED_PICKER_HEIGHT_DP), Gravity.BOTTOM);
            rootView.addView(pickerView, pickerParams);
            applySystemInsets();
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
        if (embeddedPickerView != null && embeddedPickerView.getParent() instanceof FrameLayout) {
            FrameLayout parent = (FrameLayout) embeddedPickerView.getParent();
            parent.removeView(embeddedPickerView);
            embeddedPickerView = null;
        }
        galleryButton.setVisibility(View.VISIBLE);
        applySystemInsets();
    }

    private void launchGallery() {
        galleryLauncher.launch(new PickVisualMediaRequest.Builder()
                .setMediaType(ActivityResultContracts.PickVisualMedia.ImageOnly.INSTANCE)
                .build());
    }

    private void requestOrStartCamera() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA)
                == PackageManager.PERMISSION_GRANTED) {
            startCamera();
        } else if (!getPreferences(MODE_PRIVATE).getBoolean("camera_denied", false)) {
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA);
        } else {
            showStatus("Camera unavailable. You can still choose a photo from Gallery.");
        }
    }

    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION)
                == PackageManager.PERMISSION_GRANTED
                || ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION)
                == PackageManager.PERMISSION_GRANTED;
    }

    private void requestOrStartLocation() {
        if (hasLocationPermission()) {
            startLocationUpdates();
        } else {
            locationPermissionLauncher.launch(LOCATION_PERMISSIONS);
        }
    }

    private void startLocationUpdates() {
        if (locationUpdatesStarted || !hasLocationPermission()) {
            return;
        }

        locationManager = (LocationManager) getSystemService(LOCATION_SERVICE);
        if (locationManager == null) {
            return;
        }

        latestLocation = findRecentLastKnownLocation();
        locationListener = location -> {
            if (!PhotoCaptureLocation.isRecent(location.getTime(), System.currentTimeMillis())) {
                return;
            }
            if (latestLocation == null || location.getTime() >= latestLocation.getTime()) {
                latestLocation = location;
            }
        };

        boolean requestedUpdates = false;
        for (String provider : new String[]{
                LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER
        }) {
            try {
                if (locationManager.isProviderEnabled(provider)) {
                    locationManager.requestLocationUpdates(
                            provider, 1_000L, 0f, locationListener, Looper.getMainLooper());
                    requestedUpdates = true;
                }
            } catch (SecurityException | IllegalArgumentException ignored) {
                // Location can be unavailable even after the permission request, so camera use
                // must continue without metadata in that case.
            }
        }
        locationUpdatesStarted = requestedUpdates;
    }

    private Location findRecentLastKnownLocation() {
        if (locationManager == null || !hasLocationPermission()) {
            return null;
        }

        Location best = null;
        long now = System.currentTimeMillis();
        for (String provider : new String[]{
                LocationManager.GPS_PROVIDER, LocationManager.NETWORK_PROVIDER
        }) {
            try {
                Location candidate = locationManager.getLastKnownLocation(provider);
                if (candidate != null
                        && PhotoCaptureLocation.isRecent(candidate.getTime(), now)
                        && (best == null || candidate.getTime() > best.getTime())) {
                    best = candidate;
                }
            } catch (SecurityException | IllegalArgumentException ignored) {
                // A permission/provider state change should not prevent taking a photo.
            }
        }
        return best;
    }

    private Location getLocationForCapture() {
        Location best = latestLocation;
        Location lastKnown = findRecentLastKnownLocation();
        if (lastKnown != null && (best == null || lastKnown.getTime() > best.getTime())) {
            best = lastKnown;
        }
        return best != null
                && PhotoCaptureLocation.isRecent(best.getTime(), System.currentTimeMillis())
                ? best : null;
    }

    private void stopLocationUpdates() {
        if (locationManager != null && locationListener != null) {
            try {
                locationManager.removeUpdates(locationListener);
            } catch (SecurityException ignored) {
                // Permission may have been revoked while the activity was closing.
            }
        }
        locationUpdatesStarted = false;
        locationListener = null;
    }

    private void startCamera() {
        ListenableFuture<ProcessCameraProvider> providerFuture =
                ProcessCameraProvider.getInstance(this);
        providerFuture.addListener(() -> {
            try {
                cameraProvider = providerFuture.get();
                bindCamera();
            } catch (Exception exception) {
                showStatus("Camera unavailable. You can still choose a photo from Gallery.");
            }
        }, ContextCompat.getMainExecutor(this));
    }

    private void bindCamera() {
        if (cameraProvider == null) {
            return;
        }
        try {
            boolean hasBackCamera = cameraProvider.hasCamera(CameraSelector.DEFAULT_BACK_CAMERA);
            boolean hasFrontCamera = cameraProvider.hasCamera(CameraSelector.DEFAULT_FRONT_CAMERA);
            usingFrontCamera = usingFrontCamera && hasFrontCamera;
            CameraSelector selector = usingFrontCamera
                    ? CameraSelector.DEFAULT_FRONT_CAMERA : CameraSelector.DEFAULT_BACK_CAMERA;

            Preview preview = new Preview.Builder().setTargetRotation(getTargetRotation()).build();
            imageCapture = new ImageCapture.Builder()
                    .setTargetRotation(getTargetRotation())
                    .setJpegQuality(85)
                    .setFlashMode(ImageCapture.FLASH_MODE_OFF)
                    .build();
            preview.setSurfaceProvider(previewView.getSurfaceProvider());
            cameraProvider.unbindAll();
            Camera camera = cameraProvider.bindToLifecycle(this, selector, preview, imageCapture);
            activeCamera = camera;
            androidx.camera.core.ZoomState cameraZoomState =
                    camera.getCameraInfo().getZoomState().getValue();
            zoomState = cameraZoomState == null
                    ? new CameraZoomState()
                    : new CameraZoomState(
                            cameraZoomState.getMinZoomRatio(),
                            cameraZoomState.getMaxZoomRatio());
            updateZoomButton();
            flashEnabled = false;
            updateFlashControl(camera);
            switchCameraButton.setVisibility(hasBackCamera && hasFrontCamera ? View.VISIBLE : View.GONE);
            requestOrStartLocation();
            showStatus("");
        } catch (Exception exception) {
            showStatus("Camera unavailable. You can still choose a photo from Gallery.");
        }
    }

    private void updateFlashControl(Camera camera) {
        boolean hasFlash = camera.getCameraInfo().hasFlashUnit();
        flashButton.setVisibility(hasFlash ? View.VISIBLE : View.GONE);
        if (!hasFlash) {
            flashEnabled = false;
        }
        flashButton.setImageResource(
                flashEnabled ? R.drawable.ic_camera_flash_on : R.drawable.ic_camera_flash_off);
        flashButton.setContentDescription(flashEnabled ? "Turn flash off" : "Turn flash on");
    }

    private void capturePhoto() {
        if (imageCapture == null || captureInProgress) {
            if (imageCapture == null) {
                showStatus("Camera unavailable. You can still choose a photo from Gallery.");
            }
            return;
        }
        captureInProgress = true;
        shutterButton.setEnabled(false);
        shutterButton.setAlpha(0.55f);
        File output = new File(getCacheDir(), "sterna-camera-" + UUID.randomUUID() + ".jpg");
        ImageCapture.Metadata metadata = new ImageCapture.Metadata();
        Location location = getLocationForCapture();
        if (location != null) {
            metadata.setLocation(location);
        }
        ImageCapture.OutputFileOptions options = new ImageCapture.OutputFileOptions.Builder(output)
                .setMetadata(metadata)
                .build();
        imageCapture.takePicture(options, cameraExecutor, new ImageCapture.OnImageSavedCallback() {
            @Override
            public void onImageSaved(ImageCapture.OutputFileResults outputFileResults) {
                returnSelectedFile(output, "image/jpeg", "camera");
            }

            @Override
            public void onError(ImageCaptureException exception) {
                runOnUiThread(() -> {
                    captureInProgress = false;
                    shutterButton.setEnabled(true);
                    shutterButton.setAlpha(1f);
                    showStatus("Could not take photo. Please try again or use Gallery.");
                });
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
        try (android.database.Cursor cursor = getContentResolver().query(
                uri, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
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
            statusView.setVisibility(message.isEmpty() ? View.GONE : View.VISIBLE);
        }
    }

    @Override
    public void onBackPressed() {
        cancelAndClose();
    }

    @Override
    protected void onDestroy() {
        stopLocationUpdates();
        super.onDestroy();
        if (cameraExecutor != null) {
            cameraExecutor.shutdown();
        }
    }
}
