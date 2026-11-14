$raw = Get-Content "C:\Users\majji\AppData\Local\Google\Chrome\User Data\Default\Extensions\feldfgfggmlcnoihdjbcemjknoegocnm\1.3.4_0\assets\index.ts-DUSFifLU.js" -Raw
$matches = [regex]::Matches($raw, ".{0,60}Na\([^\)]*\).{0,60}")
foreach ($m in $matches) {
    Write-Host "  -> $($m.Value)"
}
