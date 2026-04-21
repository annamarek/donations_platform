@echo off
setlocal

set "FRONTEND_DIR=%~dp0frontend"

if not exist "%FRONTEND_DIR%\index.html" (
  echo frontend\index.html not found.
  pause
  exit /b 1
)

echo Starting local server on http://127.0.0.1:5500 ...
start "Frontend Server" cmd /k "cd /d ""%FRONTEND_DIR%"" && python -m http.server 5500"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:5500/"
exit /b 0
