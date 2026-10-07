package se.penna.app

import android.os.Bundle
import android.view.View
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

// Copied into src-tauri/gen/android by scripts/build-android.mjs, which Tauri generates and git ignores.
class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
    liftAboveKeyboard()
  }

  // Edge to edge, Android no longer shrinks the page for the keyboard, so the text and the tools
  // over it would lie behind it. The page ends where the keyboard begins.
  private fun liftAboveKeyboard() {
    ViewCompat.setOnApplyWindowInsetsListener(findViewById<View>(android.R.id.content)) { view, insets ->
      view.setPadding(0, 0, 0, insets.getInsets(WindowInsetsCompat.Type.ime()).bottom)
      insets
    }
  }

  // Tauri cannot recreate a destroyed activity in the same process (it hangs on the splash), so
  // back on the shelf moves the app to the background instead of finishing it.
  @Deprecated("Tauri's back handling calls this when the page has nowhere to go back to.")
  override fun onBackPressed() {
    moveTaskToBack(true)
  }
}
