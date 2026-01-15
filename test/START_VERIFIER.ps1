# Start IRREF Verification Server
# This hosts a web interface to verify messages

Write-Host "=== Starting IRREF Verification Server ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Server will start at: http://localhost:8080" -ForegroundColor Yellow
Write-Host "Open this URL in your browser to verify messages" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop" -ForegroundColor Yellow
Write-Host ""

node verify-server.js

