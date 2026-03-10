@echo off
cd /d "%~dp0"

echo Starting Tech Feed Backend...
start "Tech Feed Backend" cmd /k "cd backend && venv\Scripts\activate && uvicorn main:app --port 8000"

timeout /t 3 /nobreak > nul

echo Starting Tech Feed Frontend...
start "Tech Feed Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo Tech Feed is starting...
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:5173
echo.
