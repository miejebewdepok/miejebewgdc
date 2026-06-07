@echo off
chcp 65001 >nul 2>&1
echo Running Mie Jebew automatic database backup...
cd /d "%~dp0.."
node "%~dp0backup-db.js"
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Backup failed with exit code: %ERRORLEVEL%
    pause
    exit /b %ERRORLEVEL%
)
echo [OK] Backup completed successfully.
pause
