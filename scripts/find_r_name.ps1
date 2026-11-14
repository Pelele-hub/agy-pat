$raw = Get-Content "C:\Users\majji\AppData\Local\Google\Chrome\User Data\Default\Extensions\feldfgfggmlcnoihdjbcemjknoegocnm\1.3.4_0\assets\index.ts-DUSFifLU.js" -Raw
$idx = $raw.IndexOf("chrome.storage.local.set({[R]")
if ($idx -ge 0) {
    $start = [Math]::Max(0, $idx - 500)
    $len = [Math]::Min(1000, $raw.Length - $start)
    Write-Host $raw.Substring($start, $len)
}
