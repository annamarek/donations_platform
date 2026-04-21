@echo off
setlocal

cd /d "%~dp0"

if not exist ".env" (
  echo .env file not found. Create it from .env.example first.
  pause
  exit /b 1
)

echo Starting backend API on http://127.0.0.1:3001 ...
npm run start:api
