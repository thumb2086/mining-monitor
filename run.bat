@echo off
REM mining-monitor launcher
REM (ASCII-only on purpose: avoids codepage issues on zh-TW Windows)

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install Node 18+ from https://nodejs.org
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

REM run.bat            -> live dashboard
REM run.bat demo       -> simulated data
REM run.bat dump       -> print one frame as text (layout check)
REM run.bat check      -> layout/chart regression test
REM run.bat init       -> save unMineable API keys
REM anything else      -> forwarded to the CLI as-is

if /i "%1"=="dump" (
    chcp 65001 >nul
    node bin\mining-monitor.js --demo --dump %2 %3 %4 %5
    pause
    exit /b 0
)

if /i "%1"=="check" (
    chcp 65001 >nul
    node tools\check-layout.js
    pause
    exit /b 0
)

if /i "%1"=="demo" (
    node bin\mining-monitor.js --demo
) else (
    node bin\mining-monitor.js %*
)

REM Keep the window open only when the process ended with an error, so a
REM crash message is readable but a normal quit (q) closes cleanly.
if errorlevel 1 pause
