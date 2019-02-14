if not "%minimized%"=="" goto :minimized
set minimized=true
@echo off

rem Enter the path where the code is located
rem cd "C:\"

start /min cmd /C "node lep.js"
goto :EOF
:minimized