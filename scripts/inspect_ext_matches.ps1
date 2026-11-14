Get-ChildItem "C:\Users\majji\AppData\Local\Google\Chrome\User Data\Default\Extensions\feldfgfggmlcnoihdjbcemjknoegocnm\1.3.4_0\assets\*.js" | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $file = $_.Name
    $regex = [regex]"[^\n;]{0,100}(?:limits|dailyLimit|plan|pausedReason)[^\n;]{0,100}"
    $matches = $regex.Matches($content)
    if ($matches.Count -gt 0) {
        Write-Host "=== $file ($($matches.Count) matches) ==="
        $matches | Select-Object -First 5 | ForEach-Object {
            Write-Host "  -> $($_.Value.Trim())"
        }
    }
}
