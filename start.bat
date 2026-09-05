@echo off
rem Start a local web server and open KidPad in the browser.
rem ES modules cannot run from file:// -- a tiny server is required.
cd /d "%~dp0"
start "" http://127.0.0.1:8765/
python -m http.server 8765 --bind 127.0.0.1
pause
