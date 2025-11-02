@echo off
echo ====================================
echo AI Dental Analysis - Kurulum
echo ====================================
echo.

echo [1/3] Python sanal ortami olusturuluyor...
python -m venv venv

echo.
echo [2/3] Python bagimliliklari yukleniyor...
call venv\Scripts\activate.bat
pip install -r requirements.txt

echo.
echo [3/3] Frontend bagimliliklari yukleniyor...
cd dental-ai-web
call npm install
cd ..

echo.
echo ====================================
echo Kurulum tamamlandi!
echo ====================================
echo.
echo Backend'i baslatmak icin: start-backend.bat
echo Frontend'i baslatmak icin: start-frontend.bat
echo.
pause
