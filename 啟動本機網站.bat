@echo off
chcp 65001 >nul
setlocal EnableDelayedExpansion
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
echo [3/3] 列出可連線網址，啟動 preview 伺服器 (port 4173)...
echo.
echo ------------------------------------------------------------
echo  電腦本機請打開：    http://localhost:4173
echo  手機請使用以下任一網址 (需與電腦在同一 Wi-Fi)：
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
  for /f "tokens=* delims= " %%b in ("%%a") do echo                      http://%%b:4173
)
echo ------------------------------------------------------------
echo.
echo 提示：
echo   - 手機請打開上方「http://192.x.x.x:4173」這類網址，
echo     不要點 PWA 圖示或 Netlify 線上版本，否則仍是舊版。
echo   - 頁面最底會顯示 build 時間，可比對手機 / 電腦是否一致。
echo.

rem 背景啟動：等待 port 4173 開啟後自動打開瀏覽器
start "" /B powershell -NoProfile -WindowStyle Hidden -Command ^
  "$tries = 0; while ($tries -lt 60) { try { $c = New-Object System.Net.Sockets.TcpClient; $r = $c.BeginConnect('127.0.0.1', 4173, $null, $null); $ok = $r.AsyncWaitHandle.WaitOne(500); if ($ok -and $c.Connected) { $c.Close(); Start-Process 'http://localhost:4173'; break }; $c.Close() } catch {}; Start-Sleep -Milliseconds 500; $tries++ }"

echo 啟動 vite preview... (伺服器就緒後會自動開啟瀏覽器)
echo 關閉本視窗或按 Ctrl+C 即可停止伺服器。
echo.

call npx vite preview --host 0.0.0.0 --port 4173 --strictPort

echo.
echo 伺服器已關閉。
pause
endlocal
