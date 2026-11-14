$pref = Get-Content "C:\Users\majji\AppData\Local\Google\Chrome\User Data\Default\Preferences" -Raw | ConvertFrom-Json
$extSettings = $pref.extensions.settings
foreach ($prop in $extSettings.PSObject.Properties) {
    $val = $prop.Value
    if ($val.manifest -or $val.path) {
        $name = $val.manifest.name
        $state = $val.state
        Write-Host "ID: $($prop.Name) | State: $state | Name: $name"
    }
}
