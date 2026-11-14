$pref = Get-Content "C:\Users\majji\AppData\Local\Google\Chrome\User Data\Default\Secure Preferences" -Raw | ConvertFrom-Json
$extSettings = $pref.extensions.settings
foreach ($prop in $extSettings.PSObject.Properties) {
    Write-Host "Extension ID: $($prop.Name)"
}
