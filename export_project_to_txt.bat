@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion

echo.
echo ==========================================
echo   MetaPlatform project export
echo ==========================================
echo.

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

set "OUTFILE=%ROOT%\metaplatform_project_dump.txt"
set "TEMPFILE=%ROOT%\metaplatform_project_dump.tmp"

if exist "%OUTFILE%" del "%OUTFILE%"
if exist "%TEMPFILE%" del "%TEMPFILE%"

echo ==================================================>> "%TEMPFILE%"
echo METAPLATFORM PROJECT EXPORT>> "%TEMPFILE%"
echo ROOT: %ROOT%>> "%TEMPFILE%"
echo ==================================================>> "%TEMPFILE%"
echo(>> "%TEMPFILE%"

for %%E in (js cjs mjs json html css md txt yml yaml xml bat cmd ps1) do (
    for /r "%ROOT%" %%F in (*.%%E) do (
        call :AppendFile "%%~fF"
    )
)

move /Y "%TEMPFILE%" "%OUTFILE%" >nul

echo.
echo ==========================================
echo Export finished
echo File:
echo %OUTFILE%
echo ==========================================
echo.

pause
exit /b

:AppendFile
set "FILE=%~1"

if not exist "%FILE%" exit /b
if /I "%FILE%"=="%OUTFILE%" exit /b
if /I "%FILE%"=="%TEMPFILE%" exit /b

echo %FILE% | findstr /I "\node_modules\" >nul
if not errorlevel 1 exit /b

echo %FILE% | findstr /I "\.git\" >nul
if not errorlevel 1 exit /b

echo %FILE% | findstr /I "\dist\" >nul
if not errorlevel 1 exit /b

echo %FILE% | findstr /I "\coverage\" >nul
if not errorlevel 1 exit /b

echo %FILE% | findstr /I "\out\" >nul
if not errorlevel 1 exit /b

set "REL=%FILE%"
set "REL=!REL:%ROOT%\=!"

echo ==================================================>> "%TEMPFILE%"
echo FILE: !REL!>> "%TEMPFILE%"
echo ==================================================>> "%TEMPFILE%"
echo(>> "%TEMPFILE%"
type "%FILE%" >> "%TEMPFILE%" 2>nul
echo(>> "%TEMPFILE%"
echo(>> "%TEMPFILE%"

exit /b
