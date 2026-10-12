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
import java.util.ArrayList;
import java.util.List;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebChromeClient;
import com.getcapacitor.BridgeWebViewClient;

// The web app uses navigator.mediaDevices.getUserMedia directly inside the WebView —
// the mic for voice quick-add, the live camera for 連續掃描發票. Capacitor's default
// WebChromeClient doesn't forward that to Android's own runtime-permission system on
// its own, so without this override the request silently does nothing. Single receipt
// photos need no such override — a plain <input type="file" accept="image/*"> goes
// through Android's own camera/gallery picker intents.
public class MainActivity extends BridgeActivity {
    private static final int MEDIA_REQUEST_CODE = 1001;
    private PermissionRequest pendingMediaRequest;

    // Android runtime permissions a WebView media request needs.
    private static List<String> permissionsFor(String[] resources) {
        List<String> perms = new ArrayList<>();
        for (String r : resources) {
            if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) perms.add(Manifest.permission.RECORD_AUDIO);
            if (PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(r)) perms.add(Manifest.permission.CAMERA);
        }
        return perms;
    }

    private List<String> missing(List<String> perms) {
        List<String> out = new ArrayList<>();
        for (String p : perms) {
            if (ContextCompat.checkSelfPermission(this, p) != PackageManager.PERMISSION_GRANTED) out.add(p);
        }
        return out;
    }

    // Google refuses to render its own sign-in/consent screen inside anything it
    // detects as an embedded WebView (the "disallowed_useragent" policy), so
    // Google sign-in has to run in a real browser — Chrome Custom Tabs, which
    // still feels part of the app. But only handing the Google step itself off
    // doesn't work: Clerk ties the OAuth callback to the client that created
    // the sign-in, and that client's cookies live in this WebView, so the
    // callback landing in Chrome failed with "authorization_invalid". Instead,
    // any attempt to navigate to Google opens /native-google-sign-in in the
    // Custom Tab, which runs the whole Google sign-in there from scratch; the
    // session then comes back via a ticket (src/app/native-auth-callback →
    // App Link / bearledger:// → src/components/native-auth-listener.tsx).
    //
    // Everything else — including Clerk's session handshake on
    // clerk.bearledger.app, which must refresh this WebView's own cookies —
    // stays in the WebView (see allowNavigation in capacitor.config.ts).
    private static final Uri NATIVE_GOOGLE_SIGN_IN_URL =
            Uri.parse("https://jizhang.bearledger.app/native-google-sign-in");

    private static boolean isGoogleOAuth(Uri url) {
        return "accounts.google.com".equals(url.getHost());
    }

    @Override
    public void onStart() {
        super.onStart();
        bridge.getWebView().setWebChromeClient(new BridgeWebChromeClient(bridge) {
            @Override
            public void onPermissionRequest(final PermissionRequest request) {
                List<String> needed = missing(permissionsFor(request.getResources()));
                if (needed.isEmpty()) {
                    request.grant(request.getResources());
                    return;
                }
                // Granting the WebView-level request before the OS-level
                // permission is actually held would let the page think it
                // has a mic/camera without Android ever allowing real
                // capture — defer the grant until the async runtime prompt
                // below actually resolves.
                pendingMediaRequest = request;
                ActivityCompat.requestPermissions(
                        MainActivity.this,
                        needed.toArray(new String[0]),
                        MEDIA_REQUEST_CODE
                );
            }
        });
        bridge.getWebView().setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri url = request.getUrl();
                if (request.isForMainFrame() && isGoogleOAuth(url)) {
                    // Devices without Chrome (or any other Custom-Tabs-capable
                    // browser) — stripped-down ROMs, bare emulators — throw here
                    // instead of launching. Falling back to the WebView would just
                    // hit Google's "disallowed_useragent" wall, so there's no real
                    // recovery beyond telling the user what to install.
                    try {
                        new CustomTabsIntent.Builder().build().launchUrl(MainActivity.this, NATIVE_GOOGLE_SIGN_IN_URL);
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
        if (requestCode == MEDIA_REQUEST_CODE && pendingMediaRequest != null) {
            boolean granted = grantResults.length > 0;
            for (int r : grantResults) granted &= r == PackageManager.PERMISSION_GRANTED;
            if (granted) {
                pendingMediaRequest.grant(pendingMediaRequest.getResources());
            } else {
                pendingMediaRequest.deny();
            }
            pendingMediaRequest = null;
        }
    }
}
