$ErrorActionPreference = "Stop"
$dir = $PSScriptRoot
if (-not $dir) { $dir = (Get-Location).Path }

$cfgPath = Join-Path $dir ".git\config"
$cfg = Get-Content $cfgPath -Raw
$m = [regex]::Match($cfg, "https://([^:]+):([^@]+)@github\.com/([^/]+)/([^\.\s]+)")
if (-not $m.Success) {
    Write-Host "[ERROR] No se encontraron credenciales de GitHub en .git/config" -ForegroundColor Red
    exit 1
}

$token = $m.Groups[2].Value
$owner = $m.Groups[3].Value
$repo  = $m.Groups[4].Value -replace "\.git$",""
$branch = "main"

$headers = @{
    Authorization  = "Bearer $token"
    Accept         = "application/vnd.github+json"
    "User-Agent"   = "REGPOL-Huanuco-Sync"
    "Content-Type" = "application/json; charset=utf-8"
}

Write-Host "1. Obteniendo estado actual de GitHub ($owner/$repo)..." -ForegroundColor Cyan
$ref = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/ref/heads/$branch" -Headers $headers
$latestCommitSha = $ref.object.sha
$latestCommit = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/commits/$latestCommitSha" -Headers $headers
$baseTreeSha = $latestCommit.tree.sha

$filesToSync = @(
    "index.html",
    "documentos.html",
    "registro.html",
    "google_apps_script_reincorporacion.js",
    "unificar_base_de_datos_supabase.sql",
    "HISTORIAL_CONVERSACION_Y_CONFIGURACION.md",
    "server.ps1"
)

$treeItems = @()
foreach ($relPath in $filesToSync) {
    $fullPath = Join-Path $dir $relPath
    if (Test-Path $fullPath) {
        Write-Host "   Preparando archivo: $relPath ..." -ForegroundColor Yellow
        $bytes = [System.IO.File]::ReadAllBytes($fullPath)
        $b64 = [Convert]::ToBase64String($bytes)
        $blobBody = @{ content = $b64; encoding = "base64" } | ConvertTo-Json -Compress
        $blob = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/blobs" -Method Post -Headers $headers -Body $blobBody
        $treeItems += @{
            path = $relPath
            mode = "100644"
            type = "blob"
            sha  = $blob.sha
        }
    }
}

Write-Host "2. Creando arbol de actualizacion en GitHub..." -ForegroundColor Cyan
$treeBody = @{
    base_tree = $baseTreeSha
    tree      = $treeItems
} | ConvertTo-Json -Depth 5 -Compress
$newTree = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/trees" -Method Post -Headers $headers -Body $treeBody

$commitMsg = "Actualizacion y sincronizacion multi-PC REGPOL Huanuco 2.0 (" + (Get-Date -Format "yyyy-MM-dd HH:mm") + ")"
$commitBody = @{
    message = $commitMsg
    tree    = $newTree.sha
    parents = @($latestCommitSha)
} | ConvertTo-Json -Depth 4 -Compress
$newCommit = Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/commits" -Method Post -Headers $headers -Body $commitBody

$updateRefBody = @{
    sha   = $newCommit.sha
    force = $true
} | ConvertTo-Json -Compress
Invoke-RestMethod -Uri "https://api.github.com/repos/$owner/$repo/git/refs/heads/$branch" -Method Patch -Headers $headers -Body $updateRefBody | Out-Null

Write-Host "=======================================================" -ForegroundColor Green
Write-Host " [OK] Todos los cambios fueron subidos a GitHub!" -ForegroundColor Green
Write-Host " Commit: $($newCommit.sha.Substring(0, 7)) - $commitMsg" -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Green
