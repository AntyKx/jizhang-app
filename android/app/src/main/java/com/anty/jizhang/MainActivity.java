package com.anty.jizhang;

import android.Manifest;
import android.content.pm.PackageManager;
import android.webkit.PermissionRequest;
import androidx.annotation.NonNull;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;

// The web app's voice quick-add records audio with navigator.mediaDevices.getUserMedia
// directly inside the WebView. Capacitor's default WebChromeClient doesn't forward that
// to Android's own runtime-permission system on its own, so without this override the
// mic request silently does nothing. Receipt scan needs no such override — it's a plain
// <input type="file" accept="image/*">, which Android resolves through its own
// camera/gallery picker intents regardless.
public class MainActivity extends BridgeActivity {
    private static final int RECORD_AUDIO_REQUEST_CODE = 1001;
    private PermissionRequest pendingMediaRequest;

    @Override
    public void onStart() {
        super.onStart();
        bridge.getWebView().setWebChromeClient(new BridgeWebChromeClient(bridge) {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.RECORD_AUDIO)
                        == PackageManager.PERMISSION_GRANTED) {
                    request.grant(request.getResources());
                    return;
                }
                // Granting the WebView-level request before the OS-level
                // RECORD_AUDIO permission is actually held would let the
                // page think it has a mic without Android ever allowing
                // real capture — defer the grant until the async runtime
                // prompt below actually resolves.
                pendingMediaRequest = request;
                ActivityCompat.requestPermissions(
                        MainActivity.this,
                        new String[] { Manifest.permission.RECORD_AUDIO },
                        RECORD_AUDIO_REQUEST_CODE
                );
            }
        });
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == RECORD_AUDIO_REQUEST_CODE && pendingMediaRequest != null) {
            boolean granted = grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED;
            if (granted) {
                pendingMediaRequest.grant(pendingMediaRequest.getResources());
            } else {
                pendingMediaRequest.deny();
            }
            pendingMediaRequest = null;
        }
    }
}
