$matches = Select-String -Path "C:\Users\majji\AppData\Local\Google\Chrome\User Data\Default\Extensions\feldfgfggmlcnoihdjbcemjknoegocnm\1.3.4_0\assets\*.js" -Pattern "daily limit reached|Resets at midnight"
foreach ($m in $matches) {
    Write-Host "File: $($m.Filename)"
    Write-Host "Line: $($m.Line.Trim())"
}
