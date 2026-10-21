$ErrorActionPreference = 'Stop'

$repositoryRoot = Split-Path -Parent $PSScriptRoot
$certificatesDirectory = Join-Path $repositoryRoot 'certs'
$publicCertificatePath = Join-Path $repositoryRoot 'public\dev-root-ca.cer'

$mkcertCommand = Get-Command mkcert -ErrorAction SilentlyContinue
if ($mkcertCommand) {
  $mkcertPath = $mkcertCommand.Source
} else {
  $wingetLink = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Links\mkcert.exe'
  if (Test-Path $wingetLink) {
    $mkcertPath = $wingetLink
  } else {
    throw 'mkcert is required. Install it with: winget install --exact --id FiloSottile.mkcert'
  }
}

$defaultRoute = Get-NetRoute -AddressFamily IPv4 -DestinationPrefix '0.0.0.0/0' |
  Sort-Object RouteMetric |
  Select-Object -First 1
if (-not $defaultRoute) {
  throw 'Could not find the active IPv4 default route for LAN certificate setup.'
}

$lanAddress = Get-NetIPAddress -AddressFamily IPv4 -InterfaceIndex $defaultRoute.InterfaceIndex |
  Where-Object {
    $_.AddressState -eq 'Preferred' -and
    $_.IPAddress -ne '127.0.0.1' -and
    $_.IPAddress -notlike '169.254.*'
  } |
  Select-Object -First 1
if (-not $lanAddress) {
  throw 'Could not find an active LAN IPv4 address for certificate setup.'
}

New-Item -ItemType Directory -Path $certificatesDirectory -Force | Out-Null
$previousTrustStores = $env:TRUST_STORES
$env:TRUST_STORES = 'system'
& $mkcertPath -install
$installExitCode = $LASTEXITCODE
if ($null -eq $previousTrustStores) {
  Remove-Item Env:\TRUST_STORES -ErrorAction SilentlyContinue
} else {
  $env:TRUST_STORES = $previousTrustStores
}
if ($installExitCode -ne 0) {
  throw 'mkcert could not install its local development certificate authority.'
}

& $mkcertPath `
  -cert-file (Join-Path $certificatesDirectory 'lan.pem') `
  -key-file (Join-Path $certificatesDirectory 'lan-key.pem') `
  $lanAddress.IPAddress localhost 127.0.0.1
if ($LASTEXITCODE -ne 0) {
  throw 'mkcert could not generate the HTTPS certificates for the LAN address.'
}

$certificateAuthorityDirectory = (& $mkcertPath -CAROOT).Trim()
$certificateAuthorityPem = Join-Path $certificateAuthorityDirectory 'rootCA.pem'
if (-not (Test-Path $certificateAuthorityPem)) {
  throw "mkcert did not create the expected public CA certificate: $certificateAuthorityPem"
}

$pem = [IO.File]::ReadAllText($certificateAuthorityPem)
$base64 = $pem -replace '-----BEGIN CERTIFICATE-----|-----END CERTIFICATE-----|\s', ''
[IO.File]::WriteAllBytes($publicCertificatePath, [Convert]::FromBase64String($base64))

$fingerprint = (Get-FileHash -Path $publicCertificatePath -Algorithm SHA256).Hash
Write-Host "HTTPS LAN URL: https://$($lanAddress.IPAddress):5173"
Write-Host "Install this public CA certificate on mobile devices: http://$($lanAddress.IPAddress):5174/dev-root-ca.cer"
Write-Host "CA SHA-256 fingerprint: $fingerprint"
Write-Host 'The private CA key remains in the local Windows user profile and is never copied into the project.'
