param(
  [Parameter(Position = 0)]
  [ValidateSet("start", "stop", "status")]
  [string]$Action = "start"
)

$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$runtimeDir = Join-Path $root ".tunnel"
$toolsDir = Join-Path $root ".tools"
$statePath = Join-Path $runtimeDir "state.json"
$appOut = Join-Path $runtimeDir "next.out.log"
$appErr = Join-Path $runtimeDir "next.err.log"
$tunnelOut = Join-Path $runtimeDir "cloudflared.out.log"
$tunnelErr = Join-Path $runtimeDir "cloudflared.err.log"

function Test-ProcessId([int]$ProcessId) {
  return $null -ne (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)
}

function Stop-ProcessTree([int]$RootProcessId) {
  $children = @(
    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
      Where-Object { $_.ParentProcessId -eq $RootProcessId } |
      Select-Object -ExpandProperty ProcessId
  )
  foreach ($childProcessId in $children) {
    Stop-ProcessTree -RootProcessId $childProcessId
  }
  Stop-Process -Id $RootProcessId -Force -ErrorAction SilentlyContinue
}

function Read-State {
  if (-not (Test-Path -LiteralPath $statePath)) {
    return $null
  }
  return Get-Content -Raw -LiteralPath $statePath | ConvertFrom-Json
}

function Stop-ManagedServices {
  $state = Read-State
  if ($null -eq $state) {
    Write-Host "No managed tunnel is running."
    return
  }
  if ($state.tunnel_pid -and (Test-ProcessId $state.tunnel_pid)) {
    Stop-ProcessTree -RootProcessId $state.tunnel_pid
  }
  if ($state.app_pid -and (Test-ProcessId $state.app_pid)) {
    Stop-ProcessTree -RootProcessId $state.app_pid
  }
  Remove-Item -LiteralPath $statePath -Force -ErrorAction SilentlyContinue
  Write-Host "Stopped the Cloudflare tunnel and local Next.js app."
}

function Resolve-Cloudflared {
  $installed = Get-Command cloudflared -ErrorAction SilentlyContinue
  if ($installed) {
    return $installed.Source
  }

  New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
  $localCloudflared = Join-Path $toolsDir "cloudflared.exe"
  if (-not (Test-Path -LiteralPath $localCloudflared)) {
    $download = "$localCloudflared.download"
    Write-Host "Downloading cloudflared from the official Cloudflare GitHub release..."
    Invoke-WebRequest `
      -Uri "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe" `
      -OutFile $download
    Move-Item -LiteralPath $download -Destination $localCloudflared -Force
  }
  return $localCloudflared
}

function Wait-ForLocalApp([int]$ProcessId) {
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    if (-not (Test-ProcessId $ProcessId)) {
      throw "The Next.js process exited before becoming ready. Review $appErr"
    }
    try {
      $response = Invoke-WebRequest -Uri "http://localhost:3000" -UseBasicParsing -TimeoutSec 2
      if ($response.StatusCode -eq 200) {
        return
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }
  throw "The Next.js app did not become ready within 60 seconds. Review $appErr"
}

function Wait-ForTunnelUrl([int]$ProcessId) {
  for ($attempt = 0; $attempt -lt 60; $attempt++) {
    if (-not (Test-ProcessId $ProcessId)) {
      throw "cloudflared exited before creating a tunnel. Review $tunnelErr"
    }
    $content = @(
      Get-Content -Raw -LiteralPath $tunnelOut -ErrorAction SilentlyContinue
      Get-Content -Raw -LiteralPath $tunnelErr -ErrorAction SilentlyContinue
    ) -join "`n"
    $match = [regex]::Match($content, "https://[-a-z0-9]+\.trycloudflare\.com")
    if ($match.Success) {
      return $match.Value
    }
    Start-Sleep -Seconds 1
  }
  throw "Cloudflare did not return a public URL within 60 seconds. Review $tunnelErr"
}

if ($Action -eq "stop") {
  Stop-ManagedServices
  exit 0
}

if ($Action -eq "status") {
  $state = Read-State
  if ($null -eq $state) {
    Write-Host "Tunnel status: stopped"
    exit 0
  }
  Write-Host "Next.js running: $(Test-ProcessId $state.app_pid)"
  Write-Host "Tunnel running:  $(Test-ProcessId $state.tunnel_pid)"
  Write-Host "Local URL:       http://localhost:3000"
  Write-Host "Public URL:      $($state.public_url)"
  exit 0
}

$existing = Read-State
if ($null -ne $existing -and (Test-ProcessId $existing.app_pid) -and (Test-ProcessId $existing.tunnel_pid)) {
  Write-Host "Tunnel is already running."
  Write-Host "Local URL:  http://localhost:3000"
  Write-Host "Public URL: $($existing.public_url)"
  exit 0
}
if ($null -ne $existing) {
  Stop-ManagedServices
}

$portOwner = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($portOwner) {
  throw "Port 3000 is already in use by process $($portOwner.OwningProcess). Stop it before starting the managed tunnel."
}

New-Item -ItemType Directory -Force -Path $runtimeDir | Out-Null
$cloudflared = Resolve-Cloudflared

Write-Host "Starting the local Next.js app..."
$appProcess = Start-Process `
  -FilePath "npm.cmd" `
  -ArgumentList @("run", "dev") `
  -WorkingDirectory $root `
  -RedirectStandardOutput $appOut `
  -RedirectStandardError $appErr `
  -WindowStyle Hidden `
  -PassThru

$tunnelProcess = $null
try {
  Wait-ForLocalApp -ProcessId $appProcess.Id
  Write-Host "Starting a Cloudflare Quick Tunnel..."
  $tunnelProcess = Start-Process `
    -FilePath $cloudflared `
    -ArgumentList @("tunnel", "--url", "http://localhost:3000", "--no-autoupdate") `
    -WorkingDirectory $root `
    -RedirectStandardOutput $tunnelOut `
    -RedirectStandardError $tunnelErr `
    -WindowStyle Hidden `
    -PassThru
  $publicUrl = Wait-ForTunnelUrl -ProcessId $tunnelProcess.Id

  @{
    app_pid = $appProcess.Id
    tunnel_pid = $tunnelProcess.Id
    local_url = "http://localhost:3000"
    public_url = $publicUrl
    started_at = (Get-Date).ToString("o")
  } | ConvertTo-Json | Set-Content -LiteralPath $statePath

  Write-Host ""
  Write-Host "Local URL:  http://localhost:3000"
  Write-Host "Public URL: $publicUrl"
  Write-Host "Stop both with: npm run tunnel:stop"
} catch {
  if ($tunnelProcess -and (Test-ProcessId $tunnelProcess.Id)) {
    Stop-ProcessTree -RootProcessId $tunnelProcess.Id
  }
  if (Test-ProcessId $appProcess.Id) {
    Stop-ProcessTree -RootProcessId $appProcess.Id
  }
  throw
}
