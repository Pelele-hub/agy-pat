$w = New-Object -ComObject WScript.Shell

# Desktop shortcut
$desktop = [Environment]::GetFolderPath('Desktop')
$desktopLnk = Join-Path $desktop "Google Chrome.lnk"
$sc = $w.CreateShortcut($desktopLnk)
$sc.TargetPath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$sc.Arguments = ""
$sc.IconLocation = "C:\Program Files\Google\Chrome\Application\chrome.exe,0"
$sc.Description = "Google Chrome"
$sc.Save()
Write-Host "Restored: $desktopLnk"

# Taskbar pinned shortcut
$tb = "C:\Users\majji\AppData\Roaming\Microsoft\Internet Explorer\Quick Launch\User Pinned\TaskBar\Google Chrome.lnk"
if (Test-Path $tb) {
  $sc2 = $w.CreateShortcut($tb)
  $sc2.Arguments = ""
  $sc2.Save()
  Write-Host "Restored: $tb"
}
