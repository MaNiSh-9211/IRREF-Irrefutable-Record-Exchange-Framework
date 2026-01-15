# Build and test script for IRREF (PowerShell)

Write-Host "=== Building IRREF ===" -ForegroundColor Cyan
Write-Host ""

# Refresh PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# Build Rust core
Write-Host "1. Building Rust core library..." -ForegroundColor Yellow
Set-Location "..\irref-core"
cargo build --release
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Rust build failed" -ForegroundColor Red
    exit 1
}
cargo test
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ Rust tests failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Rust core built and tested" -ForegroundColor Green
Write-Host ""

# Check for wasm-pack
Write-Host "2. Checking for wasm-pack..." -ForegroundColor Yellow
$wasmPackExists = Get-Command wasm-pack -ErrorAction SilentlyContinue
if (-not $wasmPackExists) {
    Write-Host "Installing wasm-pack..." -ForegroundColor Yellow
    cargo install wasm-pack
}

# Build WASM
Write-Host "3. Building WASM module..." -ForegroundColor Yellow
wasm-pack build --target nodejs --out-dir ..\irref-sdk\pkg
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ WASM build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ WASM module built" -ForegroundColor Green
Write-Host ""

# Build Node.js SDK
Write-Host "4. Building Node.js SDK..." -ForegroundColor Yellow
Set-Location "..\irref-sdk"
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ npm install failed" -ForegroundColor Red
    exit 1
}
npm run build:ts
if ($LASTEXITCODE -ne 0) {
    Write-Host "✗ TypeScript build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✓ Node.js SDK built" -ForegroundColor Green
Write-Host ""

Write-Host "=== Build Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "To test:" -ForegroundColor Yellow
Write-Host "  1. In one terminal: node test\server.js"
Write-Host "  2. In another terminal: node test\client.js"

