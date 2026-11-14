$raw = Get-Content "C:\Users\majji\AppData\Local\Google\Chrome\User Data\Default\Extensions\feldfgfggmlcnoihdjbcemjknoegocnm\1.3.4_0\assets\index.ts-DUSFifLU.js" -Raw
$idx = $raw.IndexOf("chrome.storage.local.get(R)")
if ($idx -ge 0) {
    $start = [Math]::Max(0, $idx - 200)
    $len = [Math]::Min(400, $raw.Length - $start)
    Write-Host "Context of chrome.storage.local.get(R):"
    Write-Host $raw.Substring($start, $len)
}
