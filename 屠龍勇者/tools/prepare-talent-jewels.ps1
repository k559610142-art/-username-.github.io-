$ErrorActionPreference='Stop'
$projectRoot=Split-Path $PSScriptRoot -Parent
$manifest=Get-Content -LiteralPath (Join-Path $PSScriptRoot 'icon-src/items/talent-jewels-v1/manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
if($manifest.images.Count -ne 38){throw 'Expected 38 generated jewel images.'}
$cropCode=[IO.File]::ReadAllText((Join-Path $PSScriptRoot 'cut-single-item-art.ps1'))
Invoke-Expression $cropCode.Substring(0,$cropCode.IndexOf('$projectRoot='))
foreach($entry in $manifest.images){
 $raw=Join-Path $projectRoot $entry.original
 $output=Join-Path $projectRoot ('images/icons/items/talentJewel_'+$entry.id+'.png')
 $source=New-Object Drawing.Bitmap $raw
 if($source.GetPixel(0,0).A -gt 5){$source.Dispose();throw ('Non-transparent source: '+$entry.id)}
 $source.Dispose()
 if(!(Test-Path -LiteralPath $output)){[SingleItemCrop]::Run($raw,$output)}
 $image=New-Object Drawing.Bitmap $output
 if($image.Width -ne 128 -or $image.Height -ne 128 -or $image.GetPixel(0,0).A -ne 0){$image.Dispose();throw ('Invalid icon: '+$entry.id)}
 $image.Dispose()
}
# Contact sheet is an inspection artifact, not used by the game.
$sheetPath=Join-Path $PSScriptRoot 'talent-jewels-contact-v1.png'
if(!(Test-Path -LiteralPath $sheetPath)){
 $sheet=New-Object Drawing.Bitmap 960,1008
 $g=[Drawing.Graphics]::FromImage($sheet);$g.Clear([Drawing.Color]::FromArgb(17,20,28))
 $font=New-Object Drawing.Font 'Microsoft JhengHei',10
 $brush=New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(228,213,179))
 $format=New-Object Drawing.StringFormat;$format.Alignment=[Drawing.StringAlignment]::Center
 $g.InterpolationMode=[Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
 for($i=0;$i -lt $manifest.images.Count;$i++){
  $entry=$manifest.images[$i];$x=($i%6)*160;$y=[Math]::Floor($i/6)*144
  $icon=New-Object Drawing.Bitmap (Join-Path $projectRoot ('images/icons/items/talentJewel_'+$entry.id+'.png'))
  $g.DrawImage($icon,[Drawing.Rectangle]::new($x+32,$y+4,96,96));$icon.Dispose()
  $g.DrawString($entry.name,$font,$brush,[Drawing.RectangleF]::new($x+4,$y+104,152,36),$format)
 }
 $sheet.Save($sheetPath,[Drawing.Imaging.ImageFormat]::Png)
 $format.Dispose();$brush.Dispose();$font.Dispose();$g.Dispose();$sheet.Dispose()
}
Write-Output 'PASS: 38 transparent 128px icons; source images preserved; existing files never overwritten.'
