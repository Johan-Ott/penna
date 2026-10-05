package se.penna.app

import android.os.Bundle
import androidx.activity.enableEdgeToEdge

// Copied into src-tauri/gen/android by scripts/build-android.mjs, which Tauri generates and git ignores.
class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  // Back on the shelf puts Penna in the background instead of closing it: Tauri cannot start a
  // closed window again in the same process, so the app would hang on its splash when reopened.
  @Deprecated("Tauri's back handling calls this when the page has nowhere to go back to.")
  override fun onBackPressed() {
    moveTaskToBack(true)
  }
}
