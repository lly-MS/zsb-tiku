@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ============================================
echo   Publishing to Vercel (production)
echo   Target: https://zsb-tiku.vercel.app
echo ============================================
echo.
call vercel --prod --yes
echo.
echo --------------------------------------------
echo Done. Press any key to close.
pause >nul
