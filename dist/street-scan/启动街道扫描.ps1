$ErrorActionPreference = 'Stop'
$projectDirectory = $PSScriptRoot
$address = 'http://127.0.0.1:43138'
try { $null = Invoke-WebRequest -Uri $address -UseBasicParsing -TimeoutSec 2 }
catch {
    $nodeExecutable = (Get-Command node -ErrorAction Stop).Source
    Start-Process -FilePath $nodeExecutable -ArgumentList 'server.cjs' -WorkingDirectory $projectDirectory -WindowStyle Hidden
    for ($attempt = 0; $attempt -lt 30; $attempt++) {
        Start-Sleep -Milliseconds 200
        try { $null = Invoke-WebRequest -Uri $address -UseBasicParsing -TimeoutSec 1; break } catch {}
    }
}
Start-Process $address
