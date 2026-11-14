$pref = Get-Content "C:\Users\majji\AppData\Local\Google\Chrome\User Data\Profile 4\Secure Preferences" -Raw | ConvertFrom-Json
$extSettings = $pref.extensions.settings
foreach ($prop in $extSettings.PSObject.Properties) {
    Write-Host "Profile 4 Extension ID: $($prop.Name)"
}
