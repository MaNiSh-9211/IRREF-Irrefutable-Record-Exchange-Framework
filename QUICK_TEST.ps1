# IRREF Quick Test Script
# Run this script to test everything automatically

Write-Host "=== IRREF Quick Test ===" -ForegroundColor Cyan
Write-Host ""

# Get workspace path
$workspace = $PSScriptRoot
if (-not $workspace) {
    $workspace = Get-Location
}

Write-Host "Workspace: $workspace" -ForegroundColor Yellow
Write-Host ""

# Step 1: Kill any processes on port 3000
Write-Host "Step 1: Clearing port 3000..." -ForegroundColor Yellow
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { 
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue 
}
Write-Host "  ✓ Port cleared" -ForegroundColor Green
Write-Host ""

# Step 2: Build Rust core (if needed)
Write-Host "Step 2: Checking Rust build..." -ForegroundColor Yellow
Set-Location "$workspace\irref-core"
if (-not (Test-Path "target\release\irref_core.dll")) {
    Write-Host "  Building Rust core..." -ForegroundColor Yellow
    cargo build --release 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ Rust build failed" -ForegroundColor Red
        exit 1
    }
}
Write-Host "  ✓ Rust core ready" -ForegroundColor Green
Write-Host ""

# Step 3: Build WASM (if needed)
Write-Host "Step 3: Checking WASM build..." -ForegroundColor Yellow
if (-not (Test-Path "..\irref-sdk\pkg\irref_core_bg.wasm")) {
    Write-Host "  Building WASM module..." -ForegroundColor Yellow
    wasm-pack build --target nodejs --out-dir ..\irref-sdk\pkg 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ WASM build failed" -ForegroundColor Red
        exit 1
    }
}
Write-Host "  ✓ WASM module ready" -ForegroundColor Green
Write-Host ""

# Step 4: Build TypeScript (if needed)
Write-Host "Step 4: Checking TypeScript build..." -ForegroundColor Yellow
Set-Location "$workspace\irref-sdk"
if (-not (Test-Path "dist\index.js")) {
    Write-Host "  Building TypeScript..." -ForegroundColor Yellow
    npm run build:ts 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ✗ TypeScript build failed" -ForegroundColor Red
        exit 1
    }
}
Write-Host "  ✓ TypeScript ready" -ForegroundColor Green
Write-Host ""

# Step 5: Start server in new window
Write-Host "Step 5: Starting server..." -ForegroundColor Yellow
Set-Location "$workspace\test"
$serverProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$workspace\test'; Write-Host '=== IRREF Test Server ===' -ForegroundColor Cyan; node server.js" -PassThru
Start-Sleep -Seconds 4
Write-Host "  ✓ Server started (PID: $($serverProcess.Id))" -ForegroundColor Green
Write-Host ""

# Step 6: Run client test
Write-Host "Step 6: Running client test..." -ForegroundColor Yellow
Write-Host ""
node client.js

# Step 7: Cleanup
Write-Host ""
Write-Host "Step 7: Cleaning up..." -ForegroundColor Yellow
Stop-Process -Id $serverProcess.Id -ErrorAction SilentlyContinue
Write-Host "  ✓ Server stopped" -ForegroundColor Green
Write-Host ""

if ($LASTEXITCODE -eq 0) {
    Write-Host "=== All Tests Passed! ===" -ForegroundColor Green
} else {
    Write-Host "=== Tests Failed ===" -ForegroundColor Red
    exit 1
}

