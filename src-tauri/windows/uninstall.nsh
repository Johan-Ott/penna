; The uninstaller's question in Skrivro's own window: everything is drawn in the picture from
; uninstall.html, and a click is read by where it lands. $DeleteAppDataCheckboxState is 1 when the
; app's data goes too, as the template's hooks expect.

Var SkrivroAskPicture

; Where each thing lies in the picture, in 96 dpi pixels: left top right bottom.
!define PENNA_AT_CHECK "32 150 408 206"
!define PENNA_AT_CANCEL "216 246 308 278"
!define PENNA_AT_REMOVE "316 246 408 278"
!define PENNA_AT_MINIMISE "372 4 404 36"
!define PENNA_AT_CLOSE "404 4 436 36"

; Jumps to LABEL when the click at $5 $6 lies inside the area.
!macro SkrivroIfAt LEFT TOP RIGHT BOTTOM LABEL
  ${If} $5 >= ${LEFT}
  ${AndIf} $5 < ${RIGHT}
  ${AndIf} $6 >= ${TOP}
  ${AndIf} $6 < ${BOTTOM}
    Goto ${LABEL}
  ${EndIf}
!macroend

!macro SkrivroAskFunctions UN

; The picture for the language, the box and this screen, shown.
Function ${UN}SkrivroAskShow
  StrCpy $0 "en"
  ${IfThen} $LANGUAGE = 1053 ${|} StrCpy $0 "sv" ${|}
  StrCpy $1 "off"
  ${IfThen} $DeleteAppDataCheckboxState = 1 ${|} StrCpy $1 "on" ${|}
  StrCpy $3 "$PLUGINSDIR\ask-$0-$1.bmp"
  ${IfThen} $9 >= 144 ${|} StrCpy $3 "$PLUGINSDIR\ask-$0-$1-2x.bmp" ${|}
  System::Call "user32::LoadImage(p0,t'$3',i0,ir7,ir8,i0x10)p.r1"
  SendMessage $SkrivroAskPicture 0x172 0 $1
FunctionEnd

Function ${UN}SkrivroAsk
  ; Never while an update replaces the old version, nor when asked to run without questions.
  ${IfThen} $PassiveMode = 1 ${|} Abort ${|}
  ${IfThen} $UpdateMode = 1 ${|} Abort ${|}
  Call ${UN}SkrivroMeasure
  Call ${UN}SkrivroFrame
  nsDialogs::Create 1018
  Pop $4
  ${IfThen} $4 == error ${|} Abort ${|}
  System::Call "user32::SetWindowPos(p$4,p0,i0,i0,ir7,ir8,i0x0004)"
  InitPluginsDir
  File "/oname=$PLUGINSDIR\ask-sv-off.bmp" "${PENNA_WINDOWS}\uninstall-sv-off.bmp"
  File "/oname=$PLUGINSDIR\ask-sv-on.bmp" "${PENNA_WINDOWS}\uninstall-sv-on.bmp"
  File "/oname=$PLUGINSDIR\ask-en-off.bmp" "${PENNA_WINDOWS}\uninstall-en-off.bmp"
  File "/oname=$PLUGINSDIR\ask-en-on.bmp" "${PENNA_WINDOWS}\uninstall-en-on.bmp"
  File "/oname=$PLUGINSDIR\ask-sv-off-2x.bmp" "${PENNA_WINDOWS}\uninstall-sv-off@2x.bmp"
  File "/oname=$PLUGINSDIR\ask-sv-on-2x.bmp" "${PENNA_WINDOWS}\uninstall-sv-on@2x.bmp"
  File "/oname=$PLUGINSDIR\ask-en-off-2x.bmp" "${PENNA_WINDOWS}\uninstall-en-off@2x.bmp"
  File "/oname=$PLUGINSDIR\ask-en-on-2x.bmp" "${PENNA_WINDOWS}\uninstall-en-on@2x.bmp"
  StrCpy $DeleteAppDataCheckboxState 0
  ${NSD_CreateBitmap} 0 0 100% 100% ""
  Pop $SkrivroAskPicture
  Call ${UN}SkrivroAskShow
  GetFunctionAddress $0 ${UN}SkrivroAskClick
  nsDialogs::OnClick $SkrivroAskPicture $0
  nsDialogs::Show
FunctionEnd

; Where the click landed, in 96 dpi pixels in $5 and $6, and what it means.
Function ${UN}SkrivroAskClick
  Pop $0
  Call ${UN}SkrivroMeasure
  System::Call "*(i,i)p.r1"
  System::Call "user32::GetCursorPos(pr1)"
  System::Call "user32::ScreenToClient(p$SkrivroAskPicture,pr1)"
  System::Call "*$1(i.r5,i.r6)"
  System::Free $1
  IntOp $5 $5 * 96
  IntOp $5 $5 / $9
  IntOp $6 $6 * 96
  IntOp $6 $6 / $9
  !insertmacro SkrivroIfAt ${PENNA_AT_CHECK} toggle
  !insertmacro SkrivroIfAt ${PENNA_AT_REMOVE} remove
  !insertmacro SkrivroIfAt ${PENNA_AT_CANCEL} cancel
  !insertmacro SkrivroIfAt ${PENNA_AT_CLOSE} cancel
  !insertmacro SkrivroIfAt ${PENNA_AT_MINIMISE} minimise
  Return
  toggle:
    IntOp $DeleteAppDataCheckboxState 1 - $DeleteAppDataCheckboxState
    Call ${UN}SkrivroAskShow
    Return
  remove:
    SendMessage $HWNDPARENT 0x408 1 0
    Return
  cancel:
    SendMessage $HWNDPARENT ${WM_COMMAND} 2 0
    Return
  minimise:
    ShowWindow $HWNDPARENT ${SW_MINIMIZE}
FunctionEnd

!macroend
