package com.anty.jizhang;

import android.Manifest;
import android.content.ActivityNotFoundException;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.webkit.PermissionRequest;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.annotation.NonNull;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.BridgeWebViewClient;

// The web app's voice quick-add records audio with navigator.mediaDevices.getUserMedia
// directly inside the WebView. Capacitor's default WebChromeClient doesn't forward that
// to Android's own runtime-permission system on its own, so without this override the
// mic request silently does nothing. Receipt scan needs no such override — it's a plain
// <input type="file" accept="image/*">, which Android resolves through its own
// camera/gallery picker intents regardless.
public class MainActivity extends BridgeActivity {
    private static final int RECORD_AUDIO_REQUEST_CODE = 1001;
    private PermissionRequest pendingMediaRequest;

    // Google refuses to render its own sign-in/consent screen inside anything it
    // detects as an embedded WebView (the "disallowed_useragent" policy), and
    // Clerk's OAuth redirect hops through its own Frontend API host (a different
    // origin than the app's) on the way there — both need to happen in a real
    // browser context, not this WebView. Chrome Custom Tabs gives that real
    // browser context while still feeling part of the app; the trip back in is
    // handled by the bearledger:// deep link registered in AndroidManifest.xml
    // (see src/app/native-auth-callback and MainActivity's @capacitor/app
    // appUrlOpen listener on the JS side).
    private static boolean isOAuthHandoffHost(String host) {
        return "accounts.google.com".equals(host) || "clerk.bearledger.app".equals(host);
    }

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
        bridge.getWebView().setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (request.isForMainFrame() && isOAuthHandoffHost(url.getHost())) {
                    // Devices without Chrome (or any other Custom-Tabs-capable
                    // browser) — stripped-down ROMs, bare emulators — throw here
                    // instead of launching. Falling back to the WebView would just
                    // hit Google's "disallowed_useragent" wall, so there's no real
                    // recovery beyond telling the user what to install.
                    try {
                        new CustomTabsIntent.Builder().build().launchUrl(MainActivity.this, url);
                    } catch (ActivityNotFoundException e) {
                        Toast.makeText(MainActivity.this, "請先安裝或啟用 Chrome 瀏覽器才能完成登入", Toast.LENGTH_LONG).show();
                    }
                    return true;
                }
                return super.shouldOverrideUrlLoading(view, request);
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
