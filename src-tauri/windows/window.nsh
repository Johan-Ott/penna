; The installer's one window: Penna's picture (splash.bmp, made from splash.html) with a thin
; progress bar under the name. Borderless, centred, round-cornered; everything else is hidden.

!define PENNA_WIDTH 440
!define PENNA_HEIGHT 300
; Where the bar sits in the picture, at 1x.
!define PENNA_BAR_TOP 238
!define PENNA_BAR_WIDTH 180

; Measures at 96 dpi, turned into this screen's pixels.
!macro PennaScaled RESULT VALUE
  IntOp ${RESULT} ${VALUE} * $9
  IntOp ${RESULT} ${RESULT} / 96
!macroend

!macro PennaHide PARENT ID
  GetDlgItem $0 ${PARENT} ${ID}
  ShowWindow $0 ${SW_HIDE}
!macroend

; The window itself: no frame, this size, in the middle of the screen.
Function PennaFrame
  System::Call "user32::SetWindowLong(p$HWNDPARENT,i-16,i0x90000000)"
  System::Call "user32::GetSystemMetrics(i0)i.r5"
  System::Call "user32::GetSystemMetrics(i1)i.r6"
  IntOp $5 $5 - $7
  IntOp $5 $5 / 2
  IntOp $6 $6 - $8
  IntOp $6 $6 / 2
  System::Call "user32::SetWindowPos(p$HWNDPARENT,p0,ir5,ir6,ir7,ir8,i0x0060)"
  ; Round corners on Windows 11; older Windows ignores it.
  System::Call "dwmapi::DwmSetWindowAttribute(p$HWNDPARENT,i33,*i2,i4)"
  !insertmacro PennaHide $HWNDPARENT 1
  !insertmacro PennaHide $HWNDPARENT 2
  !insertmacro PennaHide $HWNDPARENT 3
  !insertmacro PennaHide $HWNDPARENT 1028
  !insertmacro PennaHide $HWNDPARENT 1256
  !insertmacro PennaHide $HWNDPARENT 1034
  !insertmacro PennaHide $HWNDPARENT 1035
  !insertmacro PennaHide $HWNDPARENT 1036
  !insertmacro PennaHide $HWNDPARENT 1037
  !insertmacro PennaHide $HWNDPARENT 1038
  !insertmacro PennaHide $HWNDPARENT 1039
FunctionEnd

; The picture fills the page; the 2x one on screens scaled to 150 % or more.
Function PennaPicture
  InitPluginsDir
  File "/oname=$PLUGINSDIR\splash.bmp" "${PENNA_WINDOWS}\splash.bmp"
  File "/oname=$PLUGINSDIR\splash2x.bmp" "${PENNA_WINDOWS}\splash@2x.bmp"
  StrCpy $3 "$PLUGINSDIR\splash.bmp"
  ${If} $9 >= 144
    StrCpy $3 "$PLUGINSDIR\splash2x.bmp"
  ${EndIf}
  System::Call "user32::LoadImage(p0,t'$3',i0,ir7,ir8,i0x10)p.r3"
  System::Call "user32::CreateWindowEx(i0,t'STATIC',t'',i0x5000000E,i0,i0,ir7,ir8,p$4,p0,p0,p0)p.r2"
  SendMessage $2 0x172 0 $3
  ; Behind the progress bar.
  System::Call "user32::SetWindowPos(p$2,p1,i0,i0,i0,i0,i0x0013)"
FunctionEnd

; A thin flat bar, light on dark, centred under the name.
Function PennaBar
  GetDlgItem $1 $4 1004
  System::Call "uxtheme::SetWindowTheme(p$1,w' ',w' ')"
  System::Call "user32::SetWindowLong(p$1,i-20,i0)"
  SendMessage $1 0x409 0 0x00E7EEF2
  SendMessage $1 0x2001 0 0x002E2A2A
  !insertmacro PennaScaled $5 ${PENNA_BAR_WIDTH}
  !insertmacro PennaScaled $6 ${PENNA_BAR_TOP}
  !insertmacro PennaScaled $0 4
  IntOp $3 $7 - $5
  IntOp $3 $3 / 2
  System::Call "user32::SetWindowPos(p$1,p0,ir3,ir6,ir5,ir0,i0x0020)"
FunctionEnd

; This screen's dpi in $9, and the window's size in pixels in $7 and $8.
Function PennaMeasure
  System::Call "user32::GetDpiForWindow(p$HWNDPARENT)i.r9"
  ${IfThen} $9 = 0 ${|} StrCpy $9 96 ${|}
  !insertmacro PennaScaled $7 ${PENNA_WIDTH}
  !insertmacro PennaScaled $8 ${PENNA_HEIGHT}
FunctionEnd

; Before the window first shows, so the usual installer never flashes by.
Function PennaGuiInit
  Call PennaMeasure
  Call PennaFrame
FunctionEnd

Function PennaWindow
  Call PennaMeasure
  ; Again, since the installer shows its buttons again when a page changes.
  Call PennaFrame
  ; The page inside the window, with only the bar left on it.
  FindWindow $4 "#32770" "" $HWNDPARENT
  System::Call "user32::SetWindowPos(p$4,p0,i0,i0,ir7,ir8,i0x0004)"
  !insertmacro PennaHide $4 1006
  !insertmacro PennaHide $4 1016
  !insertmacro PennaHide $4 1027
  Call PennaPicture
  Call PennaBar
FunctionEnd
