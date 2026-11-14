@echo off
echo Starting Google Chrome with Remote Debugging on port 9222...
start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="C:\Users\majji\AppData\Local\Google\Chrome\CDP_Profile" "https://flow.google.com"
echo Chrome started on port 9222.
