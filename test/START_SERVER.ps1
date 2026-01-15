# Start IRREF Test Server
# Run this in Terminal 2

Write-Host "=== Starting IRREF Test Server ===" -ForegroundColor Cyan
Write-Host ""

# Kill any existing processes on port 3000
Write-Host "Clearing port 3000..." -ForegroundColor Yellow
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | ForEach-Object { 
    Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue 
}
Write-Host "  ✓ Port cleared" -ForegroundColor Green
Write-Host ""

# Start server
Write-Host "Starting server on http://localhost:3000..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

node server.js

