$port = 8080
$dir = $PSScriptRoot
if (-not $dir) { $dir = (Get-Location).Path }
$solicitudesFile = [System.IO.Path]::Combine($dir, "solicitudes.json")
if (-not [System.IO.File]::Exists($solicitudesFile)) {
    [System.IO.File]::WriteAllText($solicitudesFile, "[]", [System.Text.Encoding]::UTF8)
}

$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Any, $port)
try {
    $listener.Start()
    Write-Host "=======================================================" -ForegroundColor Green
    Write-Host " [OK] Servidor Web y API Activos" -ForegroundColor Cyan
    Write-Host " PC:      http://localhost:$port/index.html" -ForegroundColor Yellow
    Write-Host " Celular: http://192.168.101.12:$port/registro.html" -ForegroundColor Yellow
    Write-Host "=======================================================" -ForegroundColor Green

    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $stream = $client.GetStream()
            $stream.ReadTimeout = 2000
            $stream.WriteTimeout = 2000

            $mem = [System.IO.MemoryStream]::new()
            $buffer = New-Object byte[] 8192
            
            # 1. Leer encabezados
            $read = $stream.Read($buffer, 0, $buffer.Length)
            if ($read -le 0) { $client.Close(); continue }
            $mem.Write($buffer, 0, $read)

            $raw = [System.Text.Encoding]::UTF8.GetString($mem.ToArray())
            $sep = "`r`n`r`n"
            $idx = $raw.IndexOf($sep)
            $sepLen = 4
            if ($idx -lt 0) {
                $sep = "`n`n"
                $idx = $raw.IndexOf($sep)
                $sepLen = 2
            }

            # 2. Si hay Content-Length, leer el cuerpo completo
            if ($idx -ge 0) {
                $headerStr = $raw.Substring(0, $idx)
                $clMatch = [regex]::Match($headerStr, "(?i)Content-Length:\s*(\d+)")
                $contentLen = if ($clMatch.Success) { [int]$clMatch.Groups[1].Value } else { 0 }
                
                $headerBytesCount = [System.Text.Encoding]::UTF8.GetByteCount($headerStr) + $sepLen
                $currentBodyLen = $mem.Length - $headerBytesCount

                while ($currentBodyLen -lt $contentLen) {
                    $needed = [Math]::Min($buffer.Length, $contentLen - $currentBodyLen)
                    $r = $stream.Read($buffer, 0, $needed)
                    if ($r -le 0) { break }
                    $mem.Write($buffer, 0, $r)
                    $currentBodyLen += $r
                }
            }

            $allBytes = $mem.ToArray()
            $rawText = [System.Text.Encoding]::UTF8.GetString($allBytes)
            
            $firstLine = $rawText.Split([char]10)[0].Trim()
            $parts = $firstLine.Split(' ')
            $method = if ($parts.Length -gt 0) { $parts[0].ToUpper() } else { "GET" }
            $url = if ($parts.Length -gt 1) { $parts[1] } else { "/" }

            $bodyText = ""
            $sepIdx = $rawText.IndexOf("`r`n`r`n")
            if ($sepIdx -ge 0) {
                $bodyText = $rawText.Substring($sepIdx + 4)
            } else {
                $sepIdx = $rawText.IndexOf("`n`n")
                if ($sepIdx -ge 0) { $bodyText = $rawText.Substring($sepIdx + 2) }
            }

            # ROUTER API: /api/solicitudes
            if ($url.StartsWith("/api/solicitudes")) {
                if ($method -eq "OPTIONS") {
                    $resp = "HTTP/1.1 200 OK`r`nAccess-Control-Allow-Origin: *`r`nAccess-Control-Allow-Methods: GET, POST, DELETE, OPTIONS`r`nAccess-Control-Allow-Headers: *`r`nContent-Length: 0`r`nConnection: close`r`n`r`n"
                    $rb = [System.Text.Encoding]::UTF8.GetBytes($resp)
                    $stream.Write($rb, 0, $rb.Length)
                }
                elseif ($method -eq "GET") {
                    $content = [System.IO.File]::ReadAllText($solicitudesFile, [System.Text.Encoding]::UTF8)
                    $cb = [System.Text.Encoding]::UTF8.GetBytes($content)
                    $resp = "HTTP/1.1 200 OK`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: $($cb.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                    $rb = [System.Text.Encoding]::UTF8.GetBytes($resp)
                    $stream.Write($rb, 0, $rb.Length)
                    $stream.Write($cb, 0, $cb.Length)
                }
                elseif ($method -eq "POST") {
                    try {
                        $existing = @()
                        if ([System.IO.File]::Exists($solicitudesFile)) {
                            $rawJson = [System.IO.File]::ReadAllText($solicitudesFile, [System.Text.Encoding]::UTF8)
                            if (-not [string]::IsNullOrWhiteSpace($rawJson) -and $rawJson.Trim() -ne "[]") {
                                $parsed = ConvertFrom-Json -InputObject $rawJson
                                if ($parsed -is [System.Array]) { $existing = @($parsed) }
                                elseif ($parsed) { $existing = @($parsed) }
                            }
                        }
                        
                        $newItem = ConvertFrom-Json -InputObject $bodyText
                        $filtered = @()
                        foreach ($it in $existing) {
                            if ($it -and $it.cip -ne $newItem.cip) {
                                $filtered += $it
                            }
                        }
                        $combined = @($newItem) + $filtered
                        $newJson = ConvertTo-Json -InputObject $combined -Depth 5
                        [System.IO.File]::WriteAllText($solicitudesFile, $newJson, [System.Text.Encoding]::UTF8)
                        
                        Write-Host "[API] Nueva solicitud guardada: CIP $($newItem.cip) - $($newItem.apellidos_y_nombres)" -ForegroundColor Green
                        
                        $ack = '{"success":true}'
                        $ab = [System.Text.Encoding]::UTF8.GetBytes($ack)
                        $resp = "HTTP/1.1 200 OK`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: $($ab.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                        $rb = [System.Text.Encoding]::UTF8.GetBytes($resp)
                        $stream.Write($rb, 0, $rb.Length)
                        $stream.Write($ab, 0, $ab.Length)
                    } catch {
                        $err = '{"error":"' + $_.Exception.Message.Replace('"', '\"') + '"}'
                        $eb = [System.Text.Encoding]::UTF8.GetBytes($err)
                        $resp = "HTTP/1.1 400 Bad Request`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: $($eb.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                        $rb = [System.Text.Encoding]::UTF8.GetBytes($resp)
                        $stream.Write($rb, 0, $rb.Length)
                        $stream.Write($eb, 0, $eb.Length)
                    }
                }
                elseif ($method -eq "DELETE") {
                    try {
                        if ($url.Contains("all")) {
                            [System.IO.File]::WriteAllText($solicitudesFile, "[]", [System.Text.Encoding]::UTF8)
                        } else {
                            $idMatch = [regex]::Match($url, "id=([^&]+)")
                            if ($idMatch.Success) {
                                $targetId = $idMatch.Groups[1].Value
                                $rawJson = [System.IO.File]::ReadAllText($solicitudesFile, [System.Text.Encoding]::UTF8)
                                $existing = @(ConvertFrom-Json -InputObject $rawJson)
                                $filtered = @()
                                foreach ($it in $existing) {
                                    if ($it -and $it.id -ne $targetId) {
                                        $filtered += $it
                                    }
                                }
                                $newJson = ConvertTo-Json -InputObject $filtered -Depth 5
                                [System.IO.File]::WriteAllText($solicitudesFile, $newJson, [System.Text.Encoding]::UTF8)
                            }
                        }
                        $ack = '{"success":true}'
                        $ab = [System.Text.Encoding]::UTF8.GetBytes($ack)
                        $resp = "HTTP/1.1 200 OK`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: $($ab.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                        $rb = [System.Text.Encoding]::UTF8.GetBytes($resp)
                        $stream.Write($rb, 0, $rb.Length)
                        $stream.Write($ab, 0, $ab.Length)
                    } catch {
                        $ack = '{"success":false}'
                        $ab = [System.Text.Encoding]::UTF8.GetBytes($ack)
                        $resp = "HTTP/1.1 200 OK`r`nContent-Type: application/json; charset=utf-8`r`nContent-Length: $($ab.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                        $rb = [System.Text.Encoding]::UTF8.GetBytes($resp)
                        $stream.Write($rb, 0, $rb.Length)
                        $stream.Write($ab, 0, $ab.Length)
                    }
                }
            }
            else {
                # ARCHIVOS ESTÁTICOS
                $urlClean = $url.Split('?')[0].TrimStart('/').Replace('/', '\')
                if ([string]::IsNullOrWhiteSpace($urlClean) -or $urlClean -eq '\') { $urlClean = 'index.html' }
                $fullPath = [System.IO.Path]::Combine($dir, $urlClean)

                if ([System.IO.File]::Exists($fullPath)) {
                    $bytes = [System.IO.File]::ReadAllBytes($fullPath)
                    $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
                    $mime = switch ($ext) {
                        '.html' { 'text/html; charset=utf-8' }
                        '.css'  { 'text/css; charset=utf-8' }
                        '.js'   { 'application/javascript; charset=utf-8' }
                        '.json' { 'application/json; charset=utf-8' }
                        '.png'  { 'image/png' }
                        '.jpg'  { 'image/jpeg' }
                        '.jpeg' { 'image/jpeg' }
                        '.svg'  { 'image/svg+xml' }
                        default { 'application/octet-stream' }
                    }
                    $header = "HTTP/1.1 200 OK`r`nContent-Type: $mime`r`nContent-Length: $($bytes.Length)`r`nAccess-Control-Allow-Origin: *`r`nConnection: close`r`n`r`n"
                    $hBytes = [System.Text.Encoding]::UTF8.GetBytes($header)
                    $stream.Write($hBytes, 0, $hBytes.Length)
                    $stream.Write($bytes, 0, $bytes.Length)
                    $stream.Flush()
                } else {
                    $notFound = "HTTP/1.1 404 Not Found`r`nContent-Length: 9`r`nConnection: close`r`n`r`nNot Found"
                    $nBytes = [System.Text.Encoding]::UTF8.GetBytes($notFound)
                    $stream.Write($nBytes, 0, $nBytes.Length)
                    $stream.Flush()
                }
            }
        } catch {
        } finally {
            $client.Close()
        }
    }
} finally {
    $listener.Stop()
}
