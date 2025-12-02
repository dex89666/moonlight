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

Write-Output "\n--- Trying alternative auth schemes (query param & Upstash header) ---"
foreach ($p in $paths) {
  $uriBase = $url.TrimEnd('/') + $p
  # try token as query param
  try {
    $uri = $uriBase + '?token=' + $token
    $req = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Get, $uri)
    $resp = $client.SendAsync($req).Result
    $status = $resp.StatusCode.value__
    $body = $resp.Content.ReadAsStringAsync().Result
    Write-Output "TRY $uri (query token) -> $status"
    Write-Output $body
  } catch {
    Write-Output "TRY $uri (query token) -> ERROR: $($_.Exception.Message)"
  }

  # try Upstash-specific header X-Upstash-Token (if supported)
  try {
    $uri = $uriBase
    $req = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Get, $uri)
    $req.Headers.Add('X-Upstash-Token', $token)
    $resp = $client.SendAsync($req).Result
    $status = $resp.StatusCode.value__
    $body = $resp.Content.ReadAsStringAsync().Result
    Write-Output "TRY $uri (X-Upstash-Token) -> $status"
    Write-Output $body
  } catch {
    Write-Output "TRY $uri (X-Upstash-Token) -> ERROR: $($_.Exception.Message)"
  }

  # try Authorization: Upstash <token>
  try {
    $uri = $uriBase
    $req = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Get, $uri)
    $req.Headers.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Upstash', $token)
    $resp = $client.SendAsync($req).Result
    $status = $resp.StatusCode.value__
    $body = $resp.Content.ReadAsStringAsync().Result
    Write-Output "TRY $uri (Authorization: Upstash) -> $status"
    Write-Output $body
  } catch {
    Write-Output "TRY $uri (Authorization: Upstash) -> ERROR: $($_.Exception.Message)"
  }

}
