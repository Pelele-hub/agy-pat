$raw = Get-Content "C:\Users\majji\AppData\Local\Google\Chrome\User Data\Default\Extensions\feldfgfggmlcnoihdjbcemjknoegocnm\1.3.4_0\assets\index.ts-DUSFifLU.js" -Raw
$idx = $raw.IndexOf("function Ga(")
if ($idx -lt 0) {
    $idx = $raw.IndexOf("Ga(")
}
if ($idx -ge 0) {
    $start = [Math]::Max(0, $idx - 50)
    $len = [Math]::Min(500, $raw.Length - $start)
    Write-Host $raw.Substring($start, $len)
}
