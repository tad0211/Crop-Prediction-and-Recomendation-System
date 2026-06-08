@echo off
title Crop Yield Prediction & Recommendation System Runner
echo ==============================================================
echo  Crop Yield Prediction & Recommendation System Runner
echo ==============================================================
echo.

:: Step 1: Check if virtual environment exists
if not exist ".venv" (
    echo [ERROR] Virtual environment (.venv) was not found.
    echo Please open VS Code and follow the setup instructions.
    pause
    exit /b
)

:: Step 2: Start Flask backend server in a separate terminal window
echo [INFO] Starting Flask backend server...
start "Crop System Backend Server" cmd /k "call .venv\Scripts\activate.bat && python backend\app.py"

:: Step 3: Wait a moment for server to initialize
echo [INFO] Waiting for server to start...
timeout /t 3 >nul

:: Step 4: Open the Frontend homepage in your default web browser
echo [INFO] Opening the frontend website...
start "" "frontend\index.html"

echo.
echo ==============================================================
echo  System is now running! 
echo  - The backend server is running in the other open window.
echo  - The website has opened in your default browser.
echo ==============================================================
echo.
timeout /t 5
