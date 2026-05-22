$files = Get-ChildItem -Path "e:\KASIR MIE JEBEW\warungos\src\components\warung" -Filter *.tsx
foreach ($f in $files) {
    $c = Get-Content $f.FullName -Raw
    $c = $c.Replace('indigo-500', 'red-500').Replace('indigo-600', 'red-600').Replace('indigo-400', 'red-400').Replace('indigo-300', 'red-300').Replace('indigo-100', 'red-100')
    $c = $c.Replace('rose-500', 'yellow-500').Replace('rose-600', 'yellow-600').Replace('rose-400', 'yellow-400').Replace('rose-300', 'yellow-300')
    $c = $c.Replace('KopiKaca', 'Mie Jebew GDC')
    Set-Content -Path $f.FullName -Value $c
}
