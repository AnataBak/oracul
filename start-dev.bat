@echo off
cd /d "%~dp0"

title Art Oracle Dev Server
echo Starting Art Oracle dev server...
echo.

call npm run dev

echo.
echo Dev server stopped.
pause
