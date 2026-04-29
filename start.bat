@echo off
cd /d "%~dp0"
where npm >nul 2>&1 || (echo Node.js not found. Please install it from nodejs.org & pause & exit)
if not exist "node_modules" (
    echo Installing dependencies, please wait...
    npm install
)
npm start