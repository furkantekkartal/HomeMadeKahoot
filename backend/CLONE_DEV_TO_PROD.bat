@echo off
echo ========================================
echo   Clone DEV Database to PRODUCTION
echo ========================================
echo.
echo WARNING: This will DROP ALL collections in PRODUCTION
echo          and replace them with DEV database data!
echo.
echo Press Ctrl+C to cancel, or wait 5 seconds...
echo.

cd /d "%~dp0"
echo Current directory: %CD%
echo.

echo Starting database clone...
echo.
npm run clone-dev-to-prod

echo.
echo ========================================
echo   Clone completed!
echo ========================================
echo.
pause

