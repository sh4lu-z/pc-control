@echo off
color 0a
title Sh4lu Z - Background Installer
echo =======================================
echo Sh4lu Z PC Controller - Daemon Installer
echo =======================================
echo.
echo Installing node.js background service...

set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set VBS_FILE="%STARTUP_DIR%\Sh4lu_Z_Daemon.vbs"

echo Set objShell = WScript.CreateObject("WScript.Shell") > %VBS_FILE%
echo objShell.Run "node ""%~dp0server\index.js""", 0, False >> %VBS_FILE%

echo Start-up script successfully installed! 
echo The PC Controller will now start silently every time you turn on the PC.
echo.
echo Starting it now in the background...
cscript //nologo %VBS_FILE%
echo Done!
pause
