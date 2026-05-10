# START.ps1 -- 學員一鍵啟動環境（由 START.bat 呼叫）

# 強制 console 用 UTF-8，避免中文亂碼
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
$OutputEncoding = [System.Text.UTF8Encoding]::new()
chcp 65001 > $null

$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

Write-Host ""
Write-Host "==============================================================" -ForegroundColor Yellow
Write-Host "  F1 Workshop - Vibe Coding 實作環境" -ForegroundColor Yellow
Write-Host "  Day 2 - 2026/05/10 - 國立臺北科技大學" -ForegroundColor Gray
Write-Host "==============================================================" -ForegroundColor Yellow
Write-Host ""

# 環境檢查
Write-Host "[檢查環境]"
$nodeOk = (& node --version 2>&1)
if ($LASTEXITCODE -eq 0) {
    Write-Host "  [OK] Node.js $nodeOk" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] Node.js 未安裝 - 請通知助教" -ForegroundColor Red
    Read-Host "按 Enter 結束"
    exit 1
}

if (Test-Path "node_modules") {
    Write-Host "  [OK] node_modules 已就緒" -ForegroundColor Green
} else {
    Write-Host "  [FAIL] node_modules 不存在 - 請通知助教（不要自己跑 npm install）" -ForegroundColor Red
    Read-Host "按 Enter 結束"
    exit 1
}

Write-Host ""
Write-Host "[啟動 Vite dev server]" -ForegroundColor Cyan
Write-Host "  瀏覽器將自動開啟 http://localhost:5173"
Write-Host "  看到 F1 紅標頭 + 圈速圖 = 環境 OK"
Write-Host ""
Write-Host "  下一步："
Write-Host "  1. 開另一個 PowerShell 視窗"
Write-Host "  2. 設定 API Key:" -ForegroundColor Yellow
Write-Host "       `$env:ANTHROPIC_API_KEY = `"sk-ant-...`""
Write-Host "  3. 啟動 Claude Code:"
Write-Host "       claude"
Write-Host "  4. 把您組別的起手式 Prompt 貼進去"
Write-Host ""
Write-Host "  按 Ctrl+C 可停止 dev server"
Write-Host "--------------------------------------------------------------"
Write-Host ""

npm run dev
