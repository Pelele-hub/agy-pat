$profiles = @("Profile 2", "Profile 3")
foreach ($p in $profiles) {
    $path = "C:\Users\majji\AppData\Local\Google\Chrome\User Data\$p\Secure Preferences"
    if (Test-Path $path) {
        $pref = Get-Content $path -Raw | ConvertFrom-Json
        $extSettings = $pref.extensions.settings
        foreach ($prop in $extSettings.PSObject.Properties) {
            Write-Host "$p Extension ID: $($prop.Name)"
        }
    }
}
