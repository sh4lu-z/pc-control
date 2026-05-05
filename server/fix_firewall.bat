@echo off
color 0A
echo Checking Administrator privileges...
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Administrator privileges required. Requesting now...
    powershell -Command "Start-Process '%0' -Verb RunAs"
    exit /b
)

echo.
echo =========================================
echo   Sh4lu Z Controller Firewall Fix
echo =========================================
echo.
echo Allowing Port 8080 for incoming connections...
netsh advfirewall firewall add rule name="Sh4lu Z Controller 8080" dir=in action=allow protocol=TCP localport=8080

echo.
echo =========================================
echo [SUCCESS] Firewall rule added! 
echo Your phone should now be able to connect via IP.
echo You can close this window now.
echo =========================================
pause
