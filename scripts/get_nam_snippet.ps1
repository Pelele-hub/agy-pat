$raw = Get-Content "C:\Users\majji\AppData\Local\Google\Chrome\User Data\Default\Extensions\feldfgfggmlcnoihdjbcemjknoegocnm\1.3.4_0\assets\index.ts-DUSFifLU.js" -Raw
$idx = $raw.IndexOf("function Na(")
$start = [Math]::Max(0, $idx - 50)
$len = [Math]::Min(300, $raw.Length - $start)
Write-Host "Snippet of Na and M:"
Write-Host $raw.Substring($start, $len)
