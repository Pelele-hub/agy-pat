Add-Type -AssemblyName System.Windows.Forms
$chrome = Get-Process chrome | Where-Object { $_.MainWindowTitle -match "Google" -or $_.MainWindowTitle -match "Flow" -or $_.MainWindowTitle -ne "" } | Select-Object -First 1

if ($chrome) {
    Write-Host "Found Chrome Window: $($chrome.MainWindowTitle)"
    $wshell = New-Object -ComObject Wscript.Shell
    $wshell.AppActivate($chrome.Id)
    Start-Sleep -Milliseconds 500
    [System.Windows.Forms.SendKeys]::SendWait("%s") # Alt+S
    Write-Host "Sent Alt+S to Chrome!"
} else {
    Write-Host "No Chrome main window found."
}
