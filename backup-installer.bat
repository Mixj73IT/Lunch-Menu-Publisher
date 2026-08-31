@echo off
setlocal EnableExtensions

rem ============================================================
rem  backup-installer.bat
rem
rem  Backs up the previous Lunch Menu Publisher installer before
rem  a new build overwrites it, so you can always roll back to
rem  the old version.
rem
rem  Default target : D:\Lunch Menu Publisher
rem  Usage          : backup-installer.bat [folder-with-msi]
rem  Result         : copies the current *.msi into a
rem                   <folder>\backups\<name>_<timestamp>.msi
rem ============================================================

set "DEST=%~1"
if "%DEST%"=="" set "DEST=D:\Lunch Menu Publisher"

set "BACKUP=%DEST%\backups"

if not exist "%DEST%\" (
    echo [backup] Destination folder not found: "%DEST%"
    exit /b 1
)

rem Find the installer currently on disk (the "old" one).
set "BASE="
set "EXT="
for %%F in ("%DEST%\*.msi") do (
    set "BASE=%%~nF"
    set "EXT=%%~xF"
)

if "%BASE%"=="" (
    echo [backup] No .msi found in "%DEST%" - nothing to back up.
    exit /b 0
)

if not exist "%BACKUP%\" mkdir "%BACKUP%"

rem Locale-independent timestamp (e.g. _20260831_133800).
for /f "usebackq delims=" %%T in (`powershell -NoProfile -Command "Get-Date -Format _yyyyMMdd_HHmmss"`) do set "STAMP=%%T"

set "DESTFILE=%BACKUP%\%BASE%%STAMP%%EXT%"

copy /Y "%DEST%\*.msi" "%DESTFILE%" >nul
if errorlevel 1 (
    echo [backup] FAILED to copy the old installer from "%DEST%".
    exit /b 1
)

echo [backup] Old installer saved as:
echo          %DESTFILE%
echo          To roll back, copy that file over the new one and run it.
exit /b 0