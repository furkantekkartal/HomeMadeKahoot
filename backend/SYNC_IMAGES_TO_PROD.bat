@echo off
echo ========================================
echo   Syncing Images from DEV to PRODUCTION
echo ========================================
echo.

cd /d "%~dp0"
echo Current directory: %CD%
echo.

echo Running image sync...
echo.
npm run sync-images-to-prod

echo.
echo ========================================
echo   Sync completed!
echo ========================================
echo.
pause

