$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$raw=Join-Path $PSScriptRoot 'icon-src/items/talent-stone-v1.png'
$output=Join-Path $projectRoot 'images/icons/items/talentStone.png'
if(Test-Path -LiteralPath $output){throw 'Output already exists; refusing overwrite.'}
# Reuse the item crop pipeline with Windows PowerShell System.Drawing.
$cropCode=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'cut-single-item-art.ps1'))
Invoke-Expression $cropCode.Substring(0,$cropCode.IndexOf('$projectRoot='))
$source=New-Object Drawing.Bitmap $raw
if($source.GetPixel(0,0).A -ne 0){$source.Dispose();throw 'Source background is not transparent.'}
$source.Dispose()
[SingleItemCrop]::Run($raw,$output)
$image=New-Object Drawing.Bitmap $output
if($image.Width -ne 128 -or $image.Height -ne 128 -or $image.GetPixel(0,0).A -ne 0){$image.Dispose();throw 'Invalid icon dimensions or transparency.'}
$image.Dispose()
Write-Output 'PASS: talentStone 128x128 transparent PNG; original preserved.'
