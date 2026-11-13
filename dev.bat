@echo off
setlocal
cd /d "%~dp0"

rem Ultra Mimic - development mode (Vite + Tauri).
rem Same toolchain as build.bat: project-local folder first, then MCLuancher.
rem Keep this file ASCII-only (cmd parses .bat in the OEM codepage).

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
  exit /b 1
)

where link >nul 2>&1
if errorlevel 1 call :vcvars
if errorlevel 1 exit /b 1

if not exist "node_modules" (
  echo Installing npm dependencies...
  call npm ci
  if errorlevel 1 exit /b 1
)

call npx tauri dev
exit /b 0

rem Applies the Visual Studio environment when link.exe is not on PATH.
:vcvars
set "VCVARS="
for /f "delims=" %%I in ('dir /b /s "F:\mimic\toolchain\vs\vcvars64.bat" 2^>nul') do if not defined VCVARS set "VCVARS=%%I"
if not defined VCVARS (
  echo [ERROR] vcvars64.bat not found. Visual Studio Build Tools ^(C++^) required.
  exit /b 1
)
call "%VCVARS%" >nul
if errorlevel 1 (
  echo [ERROR] Failed to apply the MSVC environment.
  exit /b 1
)
exit /b 0