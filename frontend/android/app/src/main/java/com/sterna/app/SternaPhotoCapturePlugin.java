package com.sterna.app;

import android.content.Intent;
import java.io.File;
import java.io.IOException;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.PluginMethod;
import androidx.activity.result.ActivityResult;

@CapacitorPlugin(name = "SternaPhotoCapture")
public class SternaPhotoCapturePlugin extends Plugin {

    @PluginMethod
    public void open(PluginCall call) {
        Intent intent = new Intent(getActivity(), PhotoCaptureActivity.class);
        startActivityForResult(call, intent, "captureResult");
    }

    @PluginMethod
    public void release(PluginCall call) {
        String path = call.getString("path");
        if (path == null) {
            call.resolve();
            return;
        }

        try {
            File cacheDirectory = getActivity().getCacheDir().getCanonicalFile();
            File candidate = new File(path).getCanonicalFile();
            String name = candidate.getName();
            boolean isSternaPhoto = name.startsWith("sterna-camera-")
                    || name.startsWith("sterna-gallery-");
            boolean isInPrivateCache = candidate.getParentFile() != null
                    && candidate.getParentFile().equals(cacheDirectory);
            if (isSternaPhoto && isInPrivateCache && candidate.isFile()) {
                candidate.delete();
            }
        } catch (IOException exception) {
            // An invalid path is treated as an already-cleaned cache entry.
        }
        call.resolve();
    }

    @ActivityCallback
    private void captureResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() != PhotoCaptureActivity.RESULT_SELECTED) {
            call.resolve();
            return;
        }

        Intent data = result.getData();
        if (data == null || data.getStringExtra(PhotoCaptureActivity.EXTRA_PATH) == null) {
            call.reject("The selected photo is unavailable");
            return;
        }

        JSObject photo = new JSObject();
        photo.put("path", data.getStringExtra(PhotoCaptureActivity.EXTRA_PATH));
        photo.put("mimeType", data.getStringExtra(PhotoCaptureActivity.EXTRA_MIME_TYPE));
        photo.put("fileName", data.getStringExtra(PhotoCaptureActivity.EXTRA_FILE_NAME));
        photo.put("source", data.getStringExtra(PhotoCaptureActivity.EXTRA_SOURCE));
        call.resolve(photo);
    }
}
