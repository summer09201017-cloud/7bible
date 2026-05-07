@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title 多譯本聖經查詢 - 本機伺服器

echo ============================================================
echo  多譯本聖經查詢 - 本機網站啟動工具
echo ============================================================
echo.

if not exist "node_modules" (
  echo [1/3] 第一次執行，安裝相依套件中...
  call npm install
  if errorlevel 1 (
    echo.
    echo ❌ npm install 失敗，請檢查 Node.js 是否安裝。
    pause
    exit /b 1
  )
) else (
  echo [1/3] 相依套件已存在，略過安裝。
)

echo.
echo [2/3] 編譯產品版 (vite build)...
call npm run build
if errorlevel 1 (
  echo.
  echo ❌ 編譯失敗，請查看上方錯誤訊息。
  pause
  exit /b 1
)

echo.
echo [3/3] 取得區網 IP，啟動 preview 伺服器 (port 4173)...
echo.
echo ------------------------------------------------------------
echo  電腦本機請打開：    http://localhost:4173
echo  手機請使用以下任一網址 (需與電腦在同一 Wi-Fi)：
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  for /f "tokens=* delims= " %%b in ("%%a") do echo                      http://%%b:4173
)
echo ------------------------------------------------------------
echo.
echo 提示：手機若仍看到舊版，請「清除瀏覽器資料」或在開啟頁面後
echo       下拉重新整理兩次 (新版 Service Worker 會自動接管)。
echo.

start "" http://localhost:4173

call npx vite preview --host 0.0.0.0 --port 4173

echo.
echo 伺服器已關閉。
pause
endlocal
