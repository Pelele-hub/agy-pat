$dir = "C:\Users\majji\AppData\Local\Google\Chrome\User Data\Default\Local Extension Settings\iicjfgdnngmpfocfanpiammedafmomin"
if (Test-Path $dir) {
    Get-ChildItem $dir | ForEach-Object {
        $bytes = [System.IO.File]::ReadAllBytes($_.FullName)
        $text = [System.Text.Encoding]::ASCII.GetString($bytes)
        $matches = [regex]::Matches($text, "[\x20-\x7E]{5,}")
        foreach ($m in $matches) {
            if ($m.Value -match "plan|entitlement|limit|free|pro") {
                Write-Host "Match in $($_.Name): $($m.Value)"
            }
        }
    }
} else {
    Write-Host "Directory not found: $dir"
}
