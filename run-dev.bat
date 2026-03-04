@echo off
cd /d "%~dp0"

for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5179 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>&1

npm run dev -- --webpack
