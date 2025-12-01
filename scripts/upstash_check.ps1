# Safe Upstash check script
$raw = Get-Content -Raw .\.upstash_token
$lines = $raw -split "\r?\n"
$url = ($lines | Where-Object { $_ -match 'https?://' } | ForEach-Object { $_.Trim() })[0]
$tokenLine = ($lines | Where-Object { $_ -match 'Token' })[0]
if (-not $url -or -not $tokenLine) { Write-Output "ERROR: missing url or token in .upstash_token"; exit 2 }
$token = $tokenLine -replace 'Token','' -replace '\\s',''
Write-Output "LOCAL UPSTASH URL: $url"
# Read file and robustly extract URL and token
$raw = Get-Content -Raw .\.upstash_token
$lines = $raw -split "\\r?\\n"

# attempt to find first URL-looking substring anywhere in file
$url = $null
foreach ($ln in $lines) {
  if ($ln -match '(https?://[^\s`]+)') { $url = $matches[1]; break }
}

# attempt to find token after the word Token or last word on second line
$token = $null
foreach ($ln in $lines) {
  if ($ln -match 'Token\s*[:\-]?\s*([A-Za-z0-9_-]+)') { $token = $matches[1]; break }
}
if (-not $token -and $lines.Length -ge 1) {
  # fallback: use last whitespace-separated token on last non-empty line
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
# Prod checks (do not expose token)
$PROD = 'https://moonlight-j96wivjuo-vlads-projects-f49359be.vercel.app'
Write-Output "\nPROD PROBE:" 
try { Invoke-RestMethod -Uri "$PROD/api/debug?action=probe" -Method Get | ConvertTo-Json -Depth 4 | Write-Output } catch { Write-Output "PROD PROBE ERROR: $($_.Exception.Message)" }
Write-Output "\nPROD KV-TEST:" 
try { Invoke-RestMethod -Uri "$PROD/api/debug?action=kv-test" -Method Get | ConvertTo-Json -Depth 4 | Write-Output } catch { Write-Output "PROD KV-TEST ERROR: $($_.Exception.Message)" }
Write-Output "\nPROD ADMIN USERS:" 
try { Invoke-RestMethod -Uri "$PROD/api/admin/users" -Method Get | ConvertTo-Json -Depth 4 | Write-Output } catch { Write-Output "PROD ADMIN USERS ERROR: $($_.Exception.Message)" }
