$ErrorActionPreference = 'Stop'
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$bakRoot = 'C:\Users\hallo\Desktop\WorkspaceHub-Backups'
$stage = Join-Path $bakRoot ('stage-' + $ts)
$zip = Join-Path $bakRoot ('workspacehub-backup-' + $ts + '.zip')
$srcRoot = 'C:\Users\hallo\Desktop\WorkspaceHub'
$dataRoot = 'C:\Users\hallo\AppData\Roaming\workspacehub'

if (-not (Test-Path $bakRoot)) { New-Item -ItemType Directory -Path $bakRoot | Out-Null }
if (Test-Path $stage) { Remove-Item $stage -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $stage 'source') | Out-Null
New-Item -ItemType Directory -Path (Join-Path $stage 'data') | Out-Null

# Copy source (exclude node_modules and the tmp/backups themselves)
Get-ChildItem -Path $srcRoot -Force | Where-Object {
    $_.Name -notin @('node_modules')
} | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination (Join-Path $stage 'source') -Recurse -Force
}

# Copy user data
foreach ($item in @('workspace-data.json','projects','attachments')) {
    $p = Join-Path $dataRoot $item
    if (Test-Path $p) {
        Copy-Item -Path $p -Destination (Join-Path $stage 'data') -Recurse -Force
    }
}

# README with restore instructions
$readme = @"
WorkspaceHub Backup
===================
Timestamp: $ts

Contents:
  source/  Full project source (excluding node_modules). Restore by copying
           back to C:\Users\hallo\Desktop\WorkspaceHub then running start.bat
           once to reinstall node dependencies.
  data/    Electron userData:
             - workspace-data.json  (all project data)
             - projects/            (per-project attachments + voice memos)
             - attachments/         (legacy flat attachments folder)
           Restore by copying back into %APPDATA%\workspacehub\ (create the
           folder if missing). Fully quit the app first.

How to fully reset the app:
  1. Fully quit WorkspaceHub.
  2. Delete C:\Users\hallo\Desktop\WorkspaceHub and %APPDATA%\workspacehub.
  3. Re-extract this zip: source/ -> Desktop\WorkspaceHub,
     data/ -> %APPDATA%\workspacehub.
  4. Double-click start.bat to reinstall dependencies, then launch.
"@
$readme | Out-File -FilePath (Join-Path $stage 'README.txt') -Encoding UTF8

# Zip it
Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $zip -Force
Remove-Item $stage -Recurse -Force

$size = (Get-Item $zip).Length
Write-Host ('Backup created: ' + $zip + '  (' + [math]::Round($size/1KB, 0) + ' KB)')
