@echo off
setlocal
cd /d "%~dp0"

rem Ultra Mimic - portable release build (no installer).
rem Keep this file ASCII-only: cmd parses .bat in the OEM codepage, and UTF-8
rem Cyrillic inside commands breaks parsing.

echo === Build: Ultra Mimic ===

rem 1. The app must be closed, otherwise the fresh exe cannot be written.
tasklist /fi "imagename eq Ultra Mimic.exe" 2>nul | find /i "Ultra Mimic.exe" >nul
if not errorlevel 1 (
  echo [ERROR] Ultra Mimic is running. Close it and retry.
  goto :err
)

rem 2. Rust toolchain: project-local folder first, then the shared MCLuancher one.
if exist "%~dp0rust-cargo\bin\cargo.exe" (
  set "CARGO_HOME=%~dp0rust-cargo"
  set "RUSTUP_HOME=%~dp0rustup"
  set "PATH=%~dp0rust-cargo\bin;%PATH%"
) else if exist "F:\MCLuancher\rust-cargo\bin\cargo.exe" (
  set "CARGO_HOME=F:\MCLuancher\rust-cargo"
  set "RUSTUP_HOME=F:\MCLuancher\rustup"
  set "PATH=F:\MCLuancher\rust-cargo\bin;%PATH%"
)

where cargo >nul 2>&1
if errorlevel 1 (
  echo [ERROR] cargo not found. Rust MSVC toolchain is required.
  goto :err
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm not found. Install Node.js 20+.
  goto :err
)

rem 3. MSVC environment: Rust links through link.exe, it is not on PATH by default.
where link >nul 2>&1
if errorlevel 1 call :vcvars
if errorlevel 1 goto :err

rem 4. Frontend dependencies.
if not exist "node_modules" (
  echo Installing npm dependencies...
  call npm ci
  if errorlevel 1 goto :err
)

rem 5. Frontend + Rust + exe, without an installer.
rem    The icon comes from src-tauri\icons. If the icon was changed, delete
rem    src-tauri\target\release\build\ultra-mimic-* first, otherwise Windows
rem    keeps the old icon in the exe from the resource cache.
call npx tauri build --no-bundle
if errorlevel 1 goto :err

rem 6. Portable exe with a readable name, cargo artifact removed.
set "REL=src-tauri\target\release"
if not exist "%REL%\ultra-mimic.exe" (
  echo [ERROR] Artifact missing: %REL%\ultra-mimic.exe
  goto :err
)
copy /y "%REL%\ultra-mimic.exe" "%REL%\Ultra Mimic.exe" >nul
if errorlevel 1 (
  echo [ERROR] Cannot write "%REL%\Ultra Mimic.exe".
  goto :err
)
del /q "%REL%\ultra-mimic.exe" >nul 2>&1

echo.
for %%F in ("%REL%\Ultra Mimic.exe") do echo Size: %%~zF bytes
echo SHA256:
certutil -hashfile "%REL%\Ultra Mimic.exe" SHA256 | findstr /v ":"

echo.
echo === DONE ===
echo Exe: %REL%\Ultra Mimic.exe
exit /b 0

:err
echo.
echo === BUILD FAILED ===
exit /b 1

rem Applies the Visual Studio environment when link.exe is not on PATH.
:vcvars
set "VCVARS="
for /f "delims=" %%I in ('dir /b /s "F:\mimic\toolchain\vs\vcvars64.bat" 2^>nul') do if not defined VCVARS set "VCVARS=%%I"
if not defined VCVARS (
  echo [ERROR] vcvars64.bat not found. Visual Studio Build Tools ^(C++^) required.
  exit /b 1
)
echo MSVC: %VCVARS%
call "%VCVARS%" >nul
if errorlevel 1 (
  echo [ERROR] Failed to apply the MSVC environment.
  exit /b 1
)
exit /b 0