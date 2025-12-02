# Safe Upstash check script
param(
  [string]$ProdUrl
)

# Read .upstash_token and extract URL + token robustly
if (-not (Test-Path -Path .\.upstash_token)) { Write-Output "ERROR: .upstash_token not found"; exit 2 }
$raw = Get-Content -Raw .\.upstash_token
$lines = $raw -split "\r?\n"

$url = $null
foreach ($ln in $lines) {
  if ($ln -match '(https?://[^\s`]+)') { $url = $matches[1]; break }
}

$token = $null
foreach ($ln in $lines) {
  if ($ln -match 'Token\s*[:\-]?\s*([A-Za-z0-9_-]+)') { $token = $matches[1]; break }
}
if (-not $token -and $lines.Length -ge 1) {
  $cand = ($lines | Where-Object { $_ -match '\S' } | Select-Object -Last 1)
  if ($cand -match '([A-Za-z0-9_-]{10,})') { $token = $matches[1] }
}

if (-not $url -or -not $token) { Write-Output "ERROR: missing url or token in .upstash_token"; exit 2 }
Write-Output "LOCAL UPSTASH URL: $url"
Write-Output "LOCAL TOKEN: (masked) length=$($token.Length)"
# Local probe
try {
  # use HttpClient via Add-Type to read response bodies even on non-2xx
  Add-Type -AssemblyName System.Net.Http
  $handler = New-Object System.Net.Http.HttpClientHandler
  $handler.AllowAutoRedirect = $false
  $client = New-Object System.Net.Http.HttpClient($handler)
  $req = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Get, ($url + '/v1/kv/__probe__'))
  $req.Headers.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $token)
  $resp = $client.SendAsync($req).Result
  $status = $resp.StatusCode.value__
  $body = $resp.Content.ReadAsStringAsync().Result
  Write-Output "LOCAL PROBE STATUS: $status"
  Write-Output "LOCAL PROBE BODY: $body"
} catch {
  Write-Output "LOCAL PROBE ERROR: $($_.Exception.Message)"
}
# Local put
try {
  $req = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Put, ($url + '/v1/kv/__diag__'))
  $req.Headers.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $token)
  $req.Content = [System.Net.Http.StringContent]::new('ok')
  $resp = $client.SendAsync($req).Result
  $status = $resp.StatusCode.value__
  $body = $resp.Content.ReadAsStringAsync().Result
  Write-Output "LOCAL PUT STATUS: $status"
  Write-Output "LOCAL PUT BODY: $body"
} catch {
  Write-Output "LOCAL PUT ERROR: $($_.Exception.Message)"
}
# Local get
try {
  $req = New-Object System.Net.Http.HttpRequestMessage([System.Net.Http.HttpMethod]::Get, ($url + '/v1/kv/__diag__'))
  $req.Headers.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new('Bearer', $token)
  $resp = $client.SendAsync($req).Result
  $status = $resp.StatusCode.value__
  $body = $resp.Content.ReadAsStringAsync().Result
  Write-Output "LOCAL GET STATUS: $status"
  Write-Output "LOCAL GET BODY: $body"
} catch {
  Write-Output "LOCAL GET ERROR: $($_.Exception.Message)"
}
# Prod checks (do not expose token). Accept optional prod URL as script arg.
if (-not $ProdUrl -or $ProdUrl.Trim() -eq '') {
  Write-Output "NOTE: no prod URL provided as argument; skipping PROD checks. To run prod probes, call script with prod URL as first argument."
  exit 0
}
$prod = $ProdUrl.TrimEnd('/')
Write-Output "\nPROD PROBE:" 
try { Invoke-RestMethod -Uri "$prod/api/debug?action=probe" -Method Get | ConvertTo-Json -Depth 4 | Write-Output } catch { Write-Output "PROD PROBE ERROR: $($_.Exception.Message)" }
Write-Output "\nPROD KV-TEST:" 
try { Invoke-RestMethod -Uri "$prod/api/debug?action=kv-test" -Method Get | ConvertTo-Json -Depth 4 | Write-Output } catch { Write-Output "PROD KV-TEST ERROR: $($_.Exception.Message)" }
Write-Output "\nPROD ADMIN USERS:" 
try { Invoke-RestMethod -Uri "$prod/api/admin/users" -Method Get | ConvertTo-Json -Depth 4 | Write-Output } catch { Write-Output "PROD ADMIN USERS ERROR: $($_.Exception.Message)" }
