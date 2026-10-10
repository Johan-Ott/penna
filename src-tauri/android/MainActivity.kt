package se.penna.app

import android.os.Bundle
import android.view.View
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.ScriptHandler
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature

// Copied into src-tauri/gen/android by scripts/build-android.mjs, which Tauri generates and git ignores.
class MainActivity : TauriActivity() {
  private var webView: WebView? = null
  private var safeAreaScript: ScriptHandler? = null

  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    followInsets()
  }

  override fun onWebViewCreate(webView: WebView) {
    this.webView = webView
    ViewCompat.requestApplyInsets(findViewById(android.R.id.content))
  }

  // Edge to edge, Android no longer shrinks the page for the keyboard, so the text and the tools
  // over it would lie behind it. The page ends where the keyboard begins.
  private fun followInsets() {
    ViewCompat.setOnApplyWindowInsetsListener(findViewById<View>(android.R.id.content)) { view, insets ->
      view.setPadding(0, 0, 0, insets.getInsets(WindowInsetsCompat.Type.ime()).bottom)
      val bars = insets.getInsets(WindowInsetsCompat.Type.systemBars())
      shareSafeArea(bars.top / resources.displayMetrics.density, bars.bottom / resources.displayMetrics.density)
      insets
    }
  }

  // The WebView reports env(safe-area-inset-*) as 0, so the page gets the status and navigation
  // bars' heights as --safe-top and --safe-bottom instead, now and on every load.
  private fun shareSafeArea(top: Float, bottom: Float) {
    val view = webView ?: return
    val script = "document.documentElement.style.setProperty('--safe-top','${top}px');" +
      "document.documentElement.style.setProperty('--safe-bottom','${bottom}px');"
    view.evaluateJavascript(script, null)
    if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) return
    safeAreaScript?.remove()
    safeAreaScript = WebViewCompat.addDocumentStartJavaScript(view, script, setOf("*"))
  }

  // Tauri cannot recreate a destroyed activity in the same process (it hangs on the splash), so
  // back on the shelf moves the app to the background instead of finishing it.
  @Deprecated("Tauri's back handling calls this when the page has nowhere to go back to.")
  override fun onBackPressed() {
    moveTaskToBack(true)
  }
}
