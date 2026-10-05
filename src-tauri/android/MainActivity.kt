package se.penna.app

import android.os.Bundle
import androidx.activity.enableEdgeToEdge

// Copied into src-tauri/gen/android by scripts/build-android.mjs, which Tauri generates and git ignores.
class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  // Tauri cannot recreate a destroyed activity in the same process (it hangs on the splash), so
  // back on the shelf moves the app to the background instead of finishing it.
  @Deprecated("Tauri's back handling calls this when the page has nowhere to go back to.")
  override fun onBackPressed() {
    moveTaskToBack(true)
  }
}
