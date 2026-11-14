# start_chrome_studio.ps1
$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$extPath = "C:\Users\majji\tobyflow_extracted"
$url = "https://flow.google.com/u/1/"

Write-Host "Starting Chrome Studio with TobyFlow Extension and waiting..." -ForegroundColor Cyan
Start-Process -FilePath $chromePath -ArgumentList "--load-extension=`"$extPath`"", "--no-first-run", "--no-default-browser-check", "`"$url`"" -Wait
