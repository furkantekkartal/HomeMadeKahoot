@echo off
echo Starting HomeMadeKahoot Development Servers...
echo.

REM Start backend server in a new window
echo Starting Backend Server...
start "HomeMadeKahoot Backend" cmd /k "cd backend && npm run dev"

REM Wait a moment for backend to start
timeout /t 2 /nobreak >nul

REM Start frontend server in a new window
echo Starting Frontend Server...
start "HomeMadeKahoot Frontend" cmd /k "cd frontend && npm start"

echo.
echo Both servers are starting in separate windows.
echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Press any key to exit this window (servers will continue running)...
pause >nul

