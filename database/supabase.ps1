param([switch]$GuardarClave)
$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSEdition -eq 'Desktop') {
    $env:PSModulePath = (Join-Path $PSHOME 'Modules') + ';' + $env:PSModulePath
}
$ruta = Join-Path $PSScriptRoot 'supabase.password.dpapi'
if ($GuardarClave) {
    $clave = Read-Host 'Introduce la contrasena de PostgreSQL de Supabase' -AsSecureString
    if ($null -eq $clave -or $clave.Length -eq 0) { throw 'La contrasena esta vacia.' }
    $cifrada = ConvertFrom-SecureString $clave
    [IO.File]::WriteAllText($ruta, $cifrada)
}
if (!(Test-Path -LiteralPath $ruta)) { throw 'Ejecuta primero npm run db:configurar.' }
$clave = ConvertTo-SecureString ([IO.File]::ReadAllText($ruta))
try {
    $OutputEncoding = [Text.UTF8Encoding]::new($false)
    [Net.NetworkCredential]::new('', $clave).Password | node (Join-Path $PSScriptRoot 'conexion.cjs')
    exit $LASTEXITCODE
} finally {
    $clave.Dispose()
}

