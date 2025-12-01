$raw = Get-Content -Raw .\.upstash_token
$lines = $raw -split "\r?\n"
$url = $null
foreach ($ln in $lines) { if ($ln -match '(https?://[^\s`]+)') { $url = $matches[1]; break } }
$token = $null
foreach ($ln in $lines) { if ($ln -match 'Token\s*[:\-]?\s*([A-Za-z0-9_-]+)') { $token = $matches[1]; break } }
if (-not $url -or -not $token) { Write-Output "ERROR: missing url or token"; exit 2 }
Add-Type -AssemblyName System.Net.Http
$handler = New-Object System.Net.Http.HttpClientHandler
$client = New-Object System.Net.Http.HttpClient($handler)

$paths = @(
  '/v1/kv/__diag__',
  '/v1/kv/%5F%5Fdiag__',
  '/redis/v1/kv/__diag__',
  '/v1/keys/__diag__',
  '/__diag__',
  '/v1/kv/__probe__'
)

foreach ($p in $paths) {
  try {
    $uri = $url.TrimEnd('/') + $p
    $req = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Get, $uri)
    $req.Headers.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $token)
    $resp = $client.SendAsync($req).Result
    $status = $resp.StatusCode.value__
    $body = $resp.Content.ReadAsStringAsync().Result
    Write-Output "TRY $uri -> $status"
    Write-Output $body
  } catch {
    Write-Output "TRY $uri -> ERROR: $($_.Exception.Message)"
  }
}
