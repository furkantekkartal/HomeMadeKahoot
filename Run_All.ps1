# Master Script - Run All Environments
# Starts Local, Dev, Prod environments and sets up Cloudflare tunnels automatically

$ErrorActionPreference = "Stop"

# ========================================
# Helper Functions (defined first)
# ========================================

# Function to kill processes by port
function Stop-ProcessByPort {
    param([int]$Port)
    
    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    if ($connections) {
        foreach ($conn in $connections) {
            $processId = $conn.OwningProcess
            if ($processId) {
                try {
                    $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
                    if ($proc) {
                        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
                        Write-Host "  Killed process $processId on port $Port" -ForegroundColor Gray
                    }
                } catch {
                    # Ignore errors
                }
            }
        }
    }
}

# Function to check if port is free
function Test-PortFree {
    param([int]$Port)
    
    $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
    return (-not $connections)
}

# Function to stop all processes
function Stop-AllProcesses {
    param($ProcessesDict)
    
    Write-Host ""
    Write-Host "Stopping all processes..." -ForegroundColor Yellow
    
    # Kill processes by port first
    Write-Host "Killing processes by port..." -ForegroundColor Gray
    Stop-ProcessByPort -Port 5010
    Stop-ProcessByPort -Port 3010
    Stop-ProcessByPort -Port 5020
    Stop-ProcessByPort -Port 3020
    Stop-ProcessByPort -Port 5030
    Stop-ProcessByPort -Port 3030
    
    # Kill tracked processes
    foreach ($key in $ProcessesDict.Keys) {
        if ($ProcessesDict[$key] -and -not $ProcessesDict[$key].HasExited) {
            try {
                # Kill the process and all its children
                Stop-Process -Id $ProcessesDict[$key].Id -Force -ErrorAction SilentlyContinue
                Write-Host "  Stopped: $key" -ForegroundColor Gray
            } catch {
                Write-Host "  Could not stop: $key" -ForegroundColor Red
            }
        }
    }
    
    Write-Host "✅ All processes stopped" -ForegroundColor Green
}

# ========================================
# Main Script
# ========================================

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  HomeMadeKahoot - Master Control" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "This script will:" -ForegroundColor Yellow
Write-Host "  1. Start Local environment (ports 5010, 3010)" -ForegroundColor White
Write-Host "  2. Start Development environment (ports 5020, 3020)" -ForegroundColor White
Write-Host "  3. Start Production environment (ports 5030, 3030)" -ForegroundColor White
Write-Host "  4. Set up Cloudflare tunnels for Dev & Prod" -ForegroundColor White
Write-Host "  5. Restart Dev & Prod with Cloudflare URLs" -ForegroundColor White
Write-Host "  6. Show summary of all URLs" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop all environments and tunnels" -ForegroundColor Gray
Write-Host ""
Write-Host "Press any key to start..." -ForegroundColor Yellow
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$cloudflareFile = Join-Path $scriptDir ".env.cloudflare"

Write-Host ""
Write-Host "Checking for existing processes on ports..." -ForegroundColor Yellow
$portsToCheck = @(5010, 3010, 5020, 3020, 5030, 3030)
$foundProcesses = $false
foreach ($port in $portsToCheck) {
    if (-not (Test-PortFree -Port $port)) {
        Write-Host "  Port $port is in use, killing processes..." -ForegroundColor Gray
        Stop-ProcessByPort -Port $port
        $foundProcesses = $true
    }
}
if ($foundProcesses) {
    Write-Host "Waiting 3 seconds for ports to be released..." -ForegroundColor Gray
    Start-Sleep -Seconds 3
} else {
    Write-Host "✅ All ports are free" -ForegroundColor Green
}
Write-Host ""

# Track all processes
$processes = @{
    LocalBackend = $null
    LocalFrontend = $null
    DevBackend = $null
    DevFrontend = $null
    ProdBackend = $null
    ProdFrontend = $null
    DevBackendTunnel = $null
    DevFrontendTunnel = $null
    ProdBackendTunnel = $null
    ProdFrontendTunnel = $null
}

# Register cleanup on exit
Register-EngineEvent PowerShell.Exiting -Action { Stop-AllProcesses -ProcessesDict $processes } | Out-Null

# Trap Ctrl+C
$null = Register-ObjectEvent -InputObject ([System.Console]) -EventName CancelKeyPress -Action {
    Stop-AllProcesses -ProcessesDict $processes
    exit
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 1: Starting Local Environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start Local Backend
Write-Host "Starting Local Backend (port 5010)..." -ForegroundColor Green
$processes.LocalBackend = Start-Process powershell -ArgumentList "-NoProfile", "-NoExit", "-Command", "cd '$scriptDir\backend'; Write-Host 'Local Backend - Port 5010' -ForegroundColor Cyan; npm run start:local" -PassThru
Start-Sleep -Seconds 3

# Start Local Frontend
Write-Host "Starting Local Frontend (port 3010)..." -ForegroundColor Green
$processes.LocalFrontend = Start-Process powershell -ArgumentList "-NoProfile", "-NoExit", "-Command", "cd '$scriptDir\frontend'; Write-Host 'Local Frontend - Port 3010' -ForegroundColor Cyan; npm run start:local" -PassThru
Start-Sleep -Seconds 3

Write-Host "✅ Local environment started" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 2: Starting Development Environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start Dev Backend
Write-Host "Starting Development Backend (port 5020)..." -ForegroundColor Green
$processes.DevBackend = Start-Process powershell -ArgumentList "-NoProfile", "-NoExit", "-Command", "cd '$scriptDir\backend'; Write-Host 'Development Backend - Port 5020' -ForegroundColor Cyan; npm run start:dev" -PassThru
Start-Sleep -Seconds 3

# Start Dev Frontend
Write-Host "Starting Development Frontend (port 3020)..." -ForegroundColor Green
$processes.DevFrontend = Start-Process powershell -ArgumentList "-NoProfile", "-NoExit", "-Command", "cd '$scriptDir\frontend'; Write-Host 'Development Frontend - Port 3020' -ForegroundColor Cyan; npm run start:dev" -PassThru
Start-Sleep -Seconds 3

Write-Host "✅ Development environment started" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 3: Starting Production Environment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Start Prod Backend
Write-Host "Starting Production Backend (port 5030)..." -ForegroundColor Green
$processes.ProdBackend = Start-Process powershell -ArgumentList "-NoProfile", "-NoExit", "-Command", "cd '$scriptDir\backend'; Write-Host 'Production Backend - Port 5030' -ForegroundColor Cyan; npm run start:prod" -PassThru
Start-Sleep -Seconds 3

# Start Prod Frontend
Write-Host "Starting Production Frontend (port 3030)..." -ForegroundColor Green
$processes.ProdFrontend = Start-Process powershell -ArgumentList "-NoProfile", "-NoExit", "-Command", "cd '$scriptDir\frontend'; Write-Host 'Production Frontend - Port 3030' -ForegroundColor Cyan; npm run start:prod" -PassThru
Start-Sleep -Seconds 3

Write-Host "✅ Production environment started" -ForegroundColor Green
Write-Host ""

Write-Host "Waiting for servers to be ready (15 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 4: Setting up Cloudflare Tunnels" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to start tunnel and extract URL
function Start-TunnelAndGetURL {
    param(
        [string]$Name,
        [int]$Port,
        [string]$Type
    )
    
    Write-Host "Starting $Name tunnel (port $Port)..." -ForegroundColor Cyan
    
    # Create temp files for output
    $outputFile = Join-Path $env:TEMP "cloudflare_${Type}_out.log"
    $errorFile = Join-Path $env:TEMP "cloudflare_${Type}_err.log"
    
    # Start cloudflared process
    $process = Start-Process -FilePath "cloudflared" `
        -ArgumentList "tunnel", "--url", "http://localhost:$Port" `
        -NoNewWindow `
        -PassThru `
        -RedirectStandardOutput $outputFile `
        -RedirectStandardError $errorFile
    
    # Wait for tunnel to start and output URL
    $url = $null
    $maxWait = 20
    $elapsed = 0
    
    Write-Host "  Waiting for URL (up to $maxWait seconds)..." -ForegroundColor Gray
    
    while ($elapsed -lt $maxWait -and -not $url) {
        Start-Sleep -Seconds 1
        $elapsed++
        
        # Check error file first (cloudflared outputs URLs to stderr)
        if (Test-Path $errorFile) {
            $content = Get-Content $errorFile -Raw -ErrorAction SilentlyContinue
            if ($content) {
                if ($content -match 'https://[a-zA-Z0-9\-]+\.trycloudflare\.com') {
                    $url = $matches[0].Trim()
                    break
                }
            }
        }
        
        # Also check output file
        if (Test-Path $outputFile) {
            $content = Get-Content $outputFile -Raw -ErrorAction SilentlyContinue
            if ($content) {
                if ($content -match 'https://[a-zA-Z0-9\-]+\.trycloudflare\.com') {
                    $url = $matches[0].Trim()
                    break
                }
            }
        }
        
        # Check if process exited
        if ($process.HasExited) {
            Write-Host "  ⚠️  Process exited unexpectedly" -ForegroundColor Yellow
            break
        }
    }
    
    if ($url) {
        Write-Host "  ✅ Got URL: $url" -ForegroundColor Green
        return @{
            Process = $process
            URL = $url
            OutputFile = $outputFile
            ErrorFile = $errorFile
        }
    } else {
        Write-Host "  ⚠️  Could not extract URL automatically" -ForegroundColor Yellow
        return @{
            Process = $process
            URL = $null
            OutputFile = $outputFile
            ErrorFile = $errorFile
        }
    }
}

# Start all 4 tunnels
$devBackend = Start-TunnelAndGetURL -Name "Development Backend" -Port 5020 -Type "dev_backend"
$processes.DevBackendTunnel = $devBackend.Process
Start-Sleep -Seconds 2

$devFrontend = Start-TunnelAndGetURL -Name "Development Frontend" -Port 3020 -Type "dev_frontend"
$processes.DevFrontendTunnel = $devFrontend.Process
Start-Sleep -Seconds 2

$prodBackend = Start-TunnelAndGetURL -Name "Production Backend" -Port 5030 -Type "prod_backend"
$processes.ProdBackendTunnel = $prodBackend.Process
Start-Sleep -Seconds 2

$prodFrontend = Start-TunnelAndGetURL -Name "Production Frontend" -Port 3030 -Type "prod_frontend"
$processes.ProdFrontendTunnel = $prodFrontend.Process

Write-Host ""
Write-Host "Waiting a bit more for any remaining URLs..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Try extracting URLs one more time
function TryExtractURLFromFiles {
    param($OutputFile, $ErrorFile)
    if (Test-Path $ErrorFile) {
        $content = Get-Content $ErrorFile -Raw -ErrorAction SilentlyContinue
        if ($content -match 'https://[a-zA-Z0-9\-]+\.trycloudflare\.com') {
            return $matches[0].Trim()
        }
    }
    if (Test-Path $OutputFile) {
        $content = Get-Content $OutputFile -Raw -ErrorAction SilentlyContinue
        if ($content -match 'https://[a-zA-Z0-9\-]+\.trycloudflare\.com') {
            return $matches[0].Trim()
        }
    }
    return $null
}

# Retry URL extraction
if (-not $devBackend.URL) {
    $devBackend.URL = TryExtractURLFromFiles -OutputFile $devBackend.OutputFile -ErrorFile $devBackend.ErrorFile
}
if (-not $devFrontend.URL) {
    $devFrontend.URL = TryExtractURLFromFiles -OutputFile $devFrontend.OutputFile -ErrorFile $devFrontend.ErrorFile
}
if (-not $prodBackend.URL) {
    $prodBackend.URL = TryExtractURLFromFiles -OutputFile $prodBackend.OutputFile -ErrorFile $prodBackend.ErrorFile
}
if (-not $prodFrontend.URL) {
    $prodFrontend.URL = TryExtractURLFromFiles -OutputFile $prodFrontend.OutputFile -ErrorFile $prodFrontend.ErrorFile
}

# Prompt for missing URLs
if (-not $devBackend.URL) {
    Write-Host "Development Backend URL not found automatically" -ForegroundColor Yellow
    $devBackend.URL = Read-Host "Please enter Development Backend URL"
}
if (-not $devFrontend.URL) {
    Write-Host "Development Frontend URL not found automatically" -ForegroundColor Yellow
    $devFrontend.URL = Read-Host "Please enter Development Frontend URL"
}
if (-not $prodBackend.URL) {
    Write-Host "Production Backend URL not found automatically" -ForegroundColor Yellow
    $prodBackend.URL = Read-Host "Please enter Production Backend URL"
}
if (-not $prodFrontend.URL) {
    Write-Host "Production Frontend URL not found automatically" -ForegroundColor Yellow
    $prodFrontend.URL = Read-Host "Please enter Production Frontend URL"
}

# Remove trailing slashes
$devBackend.URL = $devBackend.URL.TrimEnd('/')
$devFrontend.URL = $devFrontend.URL.TrimEnd('/')
$prodBackend.URL = $prodBackend.URL.TrimEnd('/')
$prodFrontend.URL = $prodFrontend.URL.TrimEnd('/')

Write-Host ""
Write-Host "Updating .env.cloudflare file..." -ForegroundColor Yellow

# Update .env.cloudflare file
@"
# Cloudflare Tunnel URLs
# Updated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# Tunnels are running in background

# Development Environment
development_Backend=$($devBackend.URL)
development_frontend=$($devFrontend.URL)

# Production Environment
production_Backend=$($prodBackend.URL)
production_frontend=$($prodFrontend.URL)
"@ | Out-File -FilePath $cloudflareFile -Encoding UTF8

Write-Host "✅ Updated .env.cloudflare file!" -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Step 5: Restarting Dev & Prod with Cloudflare URLs" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Stopping Dev & Prod environments..." -ForegroundColor Yellow

# Kill processes by port (this catches Node.js processes running inside PowerShell windows)
Write-Host "Killing processes on ports 5020, 3020, 5030, 3030..." -ForegroundColor Gray
Stop-ProcessByPort -Port 5020
Stop-ProcessByPort -Port 3020
Stop-ProcessByPort -Port 5030
Stop-ProcessByPort -Port 3030

# Also kill the PowerShell processes
if ($processes.DevBackend -and -not $processes.DevBackend.HasExited) {
    try {
        Stop-Process -Id $processes.DevBackend.Id -Force -ErrorAction SilentlyContinue
    } catch {}
}
if ($processes.DevFrontend -and -not $processes.DevFrontend.HasExited) {
    try {
        Stop-Process -Id $processes.DevFrontend.Id -Force -ErrorAction SilentlyContinue
    } catch {}
}
if ($processes.ProdBackend -and -not $processes.ProdBackend.HasExited) {
    try {
        Stop-Process -Id $processes.ProdBackend.Id -Force -ErrorAction SilentlyContinue
    } catch {}
}
if ($processes.ProdFrontend -and -not $processes.ProdFrontend.HasExited) {
    try {
        Stop-Process -Id $processes.ProdFrontend.Id -Force -ErrorAction SilentlyContinue
    } catch {}
}

Write-Host "Waiting for ports to be free..." -ForegroundColor Gray
$maxWait = 10
$waited = 0
while ($waited -lt $maxWait) {
    $allFree = (Test-PortFree -Port 5020) -and (Test-PortFree -Port 3020) -and (Test-PortFree -Port 5030) -and (Test-PortFree -Port 3030)
    if ($allFree) {
        break
    }
    Start-Sleep -Seconds 1
    $waited++
}

if (-not $allFree) {
    Write-Host "⚠️  Some ports may still be in use, but continuing anyway..." -ForegroundColor Yellow
} else {
    Write-Host "✅ All ports are free" -ForegroundColor Green
}

Write-Host "Restarting Development environment with Cloudflare URLs..." -ForegroundColor Green
$processes.DevBackend = Start-Process powershell -ArgumentList "-NoProfile", "-NoExit", "-Command", "cd '$scriptDir\backend'; Write-Host 'Development Backend - Port 5020' -ForegroundColor Cyan; npm run start:dev" -PassThru
Start-Sleep -Seconds 2
$processes.DevFrontend = Start-Process powershell -ArgumentList "-NoProfile", "-NoExit", "-Command", "cd '$scriptDir\frontend'; Write-Host 'Development Frontend - Port 3020' -ForegroundColor Cyan; npm run start:dev" -PassThru
Start-Sleep -Seconds 2

Write-Host "Restarting Production environment with Cloudflare URLs..." -ForegroundColor Green
$processes.ProdBackend = Start-Process powershell -ArgumentList "-NoProfile", "-NoExit", "-Command", "cd '$scriptDir\backend'; Write-Host 'Production Backend - Port 5030' -ForegroundColor Cyan; npm run start:prod" -PassThru
Start-Sleep -Seconds 2
$processes.ProdFrontend = Start-Process powershell -ArgumentList "-NoProfile", "-NoExit", "-Command", "cd '$scriptDir\frontend'; Write-Host 'Production Frontend - Port 3030' -ForegroundColor Cyan; npm run start:prod" -PassThru
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  SUMMARY - All Environments Running" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "LOCAL ENVIRONMENT:" -ForegroundColor Yellow
Write-Host "  Backend:  http://localhost:5010" -ForegroundColor White
Write-Host "  Frontend: http://localhost:3010" -ForegroundColor White
Write-Host ""
Write-Host "DEVELOPMENT ENVIRONMENT:" -ForegroundColor Yellow
Write-Host "  Backend:  $($devBackend.URL)" -ForegroundColor White
Write-Host "  Frontend: $($devFrontend.URL)" -ForegroundColor White
Write-Host ""
Write-Host "PRODUCTION ENVIRONMENT:" -ForegroundColor Yellow
Write-Host "  Backend:  $($prodBackend.URL)" -ForegroundColor White
Write-Host "  Frontend: $($prodFrontend.URL)" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ All environments are running!" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop all environments and tunnels" -ForegroundColor Gray
Write-Host ""

# Keep script running to maintain tunnels
try {
    while ($true) {
        Start-Sleep -Seconds 1
    }
} finally {
    Stop-AllProcesses -ProcessesDict $processes
}

