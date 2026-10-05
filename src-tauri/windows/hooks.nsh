; Uninstalling signs Penna out of Google Drive on this computer; an update keeps the sign-in.
; The books are never touched.
!macro NSIS_HOOK_POSTUNINSTALL
  ${If} $UpdateMode <> 1
    nsExec::Exec 'cmdkey /delete:google-drive.se.penna.app'
  ${EndIf}
!macroend
