# start_studio_api.ps1 - Launch Quran Studio API Microservice
Set-Location "C:\Users\majji\quran_video_studio"
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Starting Quran Video Studio Microservice on Port 5056..." -ForegroundColor Green
Write-Host "  Connected to Docker n8n at http://host.docker.internal:5056" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Cyan
node scripts/server.mjs
