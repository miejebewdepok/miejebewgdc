New-Item -ItemType Directory -Path 'e:\KASIR MIE JEBEW\warungos\src\components\warung\gdc' -Force
Get-ChildItem -Path 'e:\KASIR MIE JEBEW\KASIR MIE JEBEW GDC NEW\KASIR\src\components\*.tsx' | Copy-Item -Destination 'e:\KASIR MIE JEBEW\warungos\src\components\warung\gdc\' -Force
$files = Get-ChildItem -Path 'e:\KASIR MIE JEBEW\warungos\src\components\warung\gdc' -Filter *.tsx
foreach ($f in $files) {
    $c = Get-Content $f.FullName -Raw
    $c = $c.Replace('../types', '@/lib/types')
    Set-Content -Path $f.FullName -Value $c
}
