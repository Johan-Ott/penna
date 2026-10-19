; Where Skrivro's installer files lie, for the installer template (windows/installer.nsi).
!define PENNA_WINDOWS "${__FILEDIR__}"

; Skrivro is signed out of Google Drive only when "Delete app data" is ticked while uninstalling.
; A new version installed over an old one runs the old uninstaller too, and must keep the
; sign-in. The books are never touched.
!macro NSIS_HOOK_POSTUNINSTALL
  ${If} $DeleteAppDataCheckboxState = 1
  ${AndIf} $UpdateMode <> 1
    nsExec::Exec 'cmdkey /delete:google-drive.se.skrivro.app'
  ${EndIf}
!macroend
