@echo off
title Quran Video Studio - n8n Microservice Engine
cd /d "C:\Users\majji\quran_video_studio"
echo ============================================================
echo   Starting Quran Video Studio Microservice on Port 5056...
echo   Connected to Docker n8n at http://host.docker.internal:5056
echo ============================================================
node scripts/server.mjs
pause
