$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$dir = $PSScriptRoot
$root = [IO.Path]::GetFullPath((Join-Path $dir '../../..'))
$src = [Drawing.Image]::FromFile((Join-Path $dir 'source.png'))
try {
    $encoder = [Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
    $params = New-Object Drawing.Imaging.EncoderParameters(1)
    $params.Param[0] = New-Object Drawing.Imaging.EncoderParameter([Drawing.Imaging.Encoder]::Quality, 92L)
    $src.Save((Join-Path $root 'images/maps/rework/venom-nest-v1.jpg'), $encoder, $params)
    $params.Dispose()
    Write-Output "Map packed: $($src.Width)x$($src.Height)"
} finally { $src.Dispose() }
