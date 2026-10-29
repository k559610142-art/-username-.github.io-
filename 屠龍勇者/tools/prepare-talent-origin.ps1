$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$root=Split-Path $PSScriptRoot -Parent
$output=Join-Path $root 'images/ui/talent-origin-v2.png'
if(Test-Path -LiteralPath $output){throw 'Output exists; refusing overwrite.'}
$source=New-Object Drawing.Bitmap (Join-Path $root 'images/ui/talent-atlas-v1.png')
$image=New-Object Drawing.Bitmap 256,256
$g=[Drawing.Graphics]::FromImage($image)
$g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$clip=New-Object Drawing.Drawing2D.GraphicsPath
$clip.AddEllipse(8,8,240,240);$g.SetClip($clip)
$g.DrawImage($source,[Drawing.Rectangle]::new(8,8,240,240),[Drawing.Rectangle]::new(548,411,134,134),[Drawing.GraphicsUnit]::Pixel)
$image.Save($output,[Drawing.Imaging.ImageFormat]::Png)
$clip.Dispose();$g.Dispose();$image.Dispose();$source.Dispose()
Write-Output 'PASS: original fate core extracted as independent transparent 256px icon; atlas preserved.'
