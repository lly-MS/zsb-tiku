@echo off
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
  echo 未找到 Python。可以直接双击 index.html 打开，或安装 Python 后再运行本文件。
  pause
  exit /b
)
start "刷题网站服务器" /min python -m http.server 8765 --bind 127.0.0.1
timeout /t 1 /nobreak >nul
start "" http://127.0.0.1:8765/
exit
