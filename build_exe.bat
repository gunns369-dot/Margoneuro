@echo off
setlocal
cd /d %~dp0

python -m pip install --upgrade pip
python -m pip install pyinstaller flask flask-cors pyautogui opencv-python numpy pillow pytesseract mss imagehash keyboard

if exist build rmdir /s /q build
if exist dist rmdir /s /q dist

pyinstaller --clean --noconfirm margoclicker.spec

echo Build complete. EXE: dist\MargoClicker\MargoClicker.exe
endlocal
