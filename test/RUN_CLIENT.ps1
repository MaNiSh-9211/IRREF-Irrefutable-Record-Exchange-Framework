# Run IRREF Test Client
# Run this in Terminal 3 (after server is running)

Write-Host "=== Running IRREF Test Client ===" -ForegroundColor Cyan
Write-Host ""

# Wait a moment for server to be ready
Write-Host "Waiting for server..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

# Run client
node client.js

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== All Tests Passed! ===" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "=== Tests Failed ===" -ForegroundColor Red
}

