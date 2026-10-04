param([string]$BundleRoot, [string]$DataDir, [switch]$PrepareOnly)
$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSEdition -ne 'Desktop') { throw 'Please use Windows PowerShell.' }
if (!$BundleRoot) { $BundleRoot = Join-Path $PSScriptRoot '..' }
$BundleRoot = [IO.Path]::GetFullPath($BundleRoot)
if (!$DataDir) {
    $cuteCodexHome = if ($env:CODEX_HOME) { $env:CODEX_HOME } else { Join-Path $env:USERPROFILE '.codex' }
    $DataDir = if ($env:GPT_WIDGET_HOME) { $env:GPT_WIDGET_HOME } else { Join-Path $cuteCodexHome 'gpt-codex-companion' }
}
$DataDir = [IO.Path]::GetFullPath($DataDir)
$cuteHome = [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA 'CuteGPT'))
function Get-CuteDigest([string]$Path) {
    $stream=[IO.File]::OpenRead($Path); $hash=[Security.Cryptography.SHA256]::Create()
    try { return [BitConverter]::ToString($hash.ComputeHash($stream)).Replace('-','').ToLowerInvariant() }
    finally { $hash.Dispose(); $stream.Dispose() }
}
function Test-CutePlainPath([string]$Path) {
    $cursor = [IO.Path]::GetFullPath($Path)
    while ($cursor) {
        if ((Test-Path -LiteralPath $cursor) -and ((Get-Item -LiteralPath $cursor -Force).Attributes -band [IO.FileAttributes]::ReparsePoint)) { throw 'Installation paths cannot contain links or junctions.' }
        $parent = Split-Path -Parent $cursor
        if ($parent -eq $cursor) { break }; $cursor = $parent
    }
}
foreach ($cuteLocation in @($BundleRoot,$cuteHome,$DataDir)) { Test-CutePlainPath $cuteLocation }
$cutePayload = Join-Path $BundleRoot 'payload.zip'
$cuteNodeZip = Join-Path $BundleRoot 'node-v24.19.0-win-x64.zip'
$cuteManifest = Get-Content -LiteralPath (Join-Path $BundleRoot 'quick-install-manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if ($cuteManifest.payloadSha256 -notmatch '^[a-f0-9]{64}$') { throw 'Invalid package manifest.' }
Write-Output 'CuteGPT: checking the bundled plugin and Node.js...'
if ((Get-CuteDigest $cutePayload) -cne $cuteManifest.payloadSha256) { throw 'Plugin package checksum mismatch. No installer code was executed.' }
if ((Get-CuteDigest $cuteNodeZip) -cne '57f71ab3652e797d84acddc79c81cc9ff1c6ddb2a1974cdb83f00fee9bff4c73') { throw 'Node.js archive checksum mismatch. No installer code was executed.' }
Add-Type -AssemblyName System.IO.Compression.FileSystem
function Expand-CuteArchive([string]$Archive,[string]$Destination) {
    Test-CutePlainPath $Destination
    $root = [IO.Path]::GetFullPath($Destination).TrimEnd('\') + '\'
    $zip = [IO.Compression.ZipFile]::OpenRead($Archive)
    try {
        foreach ($entry in $zip.Entries) {
            $target = [IO.Path]::GetFullPath((Join-Path $root $entry.FullName))
            if (!$target.StartsWith($root,[StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe ZIP entry.' }
        }
    } finally { $zip.Dispose() }
    [IO.Compression.ZipFile]::ExtractToDirectory($Archive,$Destination)
}
$cuteRuntime = Join-Path $cuteHome ('runtime\' + [guid]::NewGuid().ToString('N'))
$cuteStage = Join-Path $cuteHome ('prepared\' + [guid]::NewGuid().ToString('N'))
$null = New-Item -ItemType Directory -Path (Split-Path -Parent $cuteRuntime) -Force
$null = New-Item -ItemType Directory -Path (Split-Path -Parent $cuteStage) -Force
Write-Output 'CuteGPT: preparing its private Node.js runtime...'
Expand-CuteArchive $cuteNodeZip $cuteRuntime
$cuteNode = Join-Path $cuteRuntime 'node-v24.19.0-win-x64\node.exe'
if ((Get-CuteDigest $cuteNode) -cne '3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237') { throw 'Extracted Node.js failed integrity verification.' }
Expand-CuteArchive $cutePayload $cuteStage
$cuteSource = Join-Path $cuteStage 'gpt-codex-companion'
$cuteMcpFile = Join-Path $cuteSource '.mcp.json'
$cuteMcp = Get-Content -LiteralPath $cuteMcpFile -Raw -Encoding UTF8 | ConvertFrom-Json
if (!$cuteMcp.mcpServers.'gpt-companion') { throw 'Unexpected MCP package.' }
$cuteMcp.mcpServers.'gpt-companion'.command = $cuteNode
[IO.File]::WriteAllText($cuteMcpFile,($cuteMcp | ConvertTo-Json -Depth 12),[Text.UTF8Encoding]::new($false))
foreach ($cuteCmd in Get-ChildItem -LiteralPath $cuteSource -Filter '*.cmd' -File) {
    $text = [IO.File]::ReadAllText($cuteCmd.FullName,[Text.Encoding]::UTF8)
    $text = [regex]::Replace($text,'(?m)^node(?= )',('"' + $cuteNode + '"'))
    [IO.File]::WriteAllText($cuteCmd.FullName,$text,[Text.UTF8Encoding]::new($false))
}
$cuteReceipt = @{ source=$cuteSource; node=$cuteNode; data=$DataDir; preparedAt=[DateTime]::UtcNow.ToString('o') }
[IO.File]::WriteAllText((Join-Path $cuteHome 'quick-install-prepared.json'),($cuteReceipt | ConvertTo-Json),[Text.UTF8Encoding]::new($false))
$cuteOldPath = $env:PATH
try {
    $env:PATH = (Split-Path -Parent $cuteNode) + ';' + $cuteOldPath
    & $cuteNode --version
    if ($LASTEXITCODE -ne 0) { throw 'The private Node.js runtime could not start.' }
    if ($PrepareOnly) { Write-Output ('Prepared: ' + $cuteSource); return }
    Write-Output 'CuteGPT: installing. Internet is required to download Electron. Please keep this window open.'
    & (Join-Path $cuteSource 'scripts\install-package.ps1') -Source $cuteSource -DataDir $DataDir
    Write-Output 'CuteGPT installation completed. Open a new Codex chat.'
} finally { $env:PATH = $cuteOldPath }
