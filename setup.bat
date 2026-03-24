@echo off
echo.
echo ================================
echo RippleBoards - Windows Setup
echo ================================
echo.

REM Setup Python backend
echo Setting up Python backend...
cd backend
python -m venv venv
call venv\Scripts\activate.bat
pip install -r requirements.txt

REM Train ML model
echo.
echo Training ML model...
cd ..\ml
python model.py
cd ..

echo.
echo [OK] Python backend ready on port 5000
echo [OK] ML model trained and saved

REM Setup Node frontend
echo.
echo Setting up Node.js frontend...
cd frontend
call npm install

echo.
echo [OK] Frontend dependencies installed, ready on port 4200

echo.
echo ================================
echo To start the application:
echo ================================
echo 1. Backend (Python):     cd backend ^& python app.py
echo 2. Frontend (Angular):   cd frontend ^& npm run serve
echo.
echo Then visit: http://localhost:4200
echo.
pause
