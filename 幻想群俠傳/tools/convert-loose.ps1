param([string]$ManifestPath)
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
$records=Get-Content -LiteralPath $ManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$result=@()
foreach($r in $records){
 $image=$null
 try {
  $image=[Drawing.Image]::FromFile($r.source)
  $image.Save($r.output,[Drawing.Imaging.ImageFormat]::Png)
  $result+= [pscustomobject]@{source=$r.source;output=$r.output;ok=$true;width=$image.Width;height=$image.Height}
 }catch{$result+=[pscustomobject]@{source=$r.source;output=$r.output;ok=$false;error=$_.Exception.Message}}finally{if($image){$image.Dispose()}}
}
ConvertTo-Json -InputObject @($result) -Depth 5 | Set-Content -LiteralPath ($ManifestPath+'.results.json') -Encoding UTF8
