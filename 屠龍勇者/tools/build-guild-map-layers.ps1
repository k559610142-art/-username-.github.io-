param([string]$Manifest = 'tools/guild-map-src/maps-v1.json')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public sealed class GuildMapPixelAudit {
    byte[] pixels, seen; int width, height;
    public GuildMapPixelAudit(Bitmap source) { width=source.Width;height=source.Height;pixels=Bytes(source);seen=new byte[width*height]; }
    static byte[] Bytes(Bitmap image) {
        var data=image.LockBits(new Rectangle(0,0,image.Width,image.Height),ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb);
        try { var bytes=new byte[image.Width*image.Height*4];for(int y=0;y<image.Height;y++)Marshal.Copy(IntPtr.Add(data.Scan0,y*data.Stride),bytes,y*image.Width*4,image.Width*4);return bytes; }
        finally { image.UnlockBits(data); }
    }
    public int[] Add(Bitmap layer) {
        var b=Bytes(layer);int x0=width,y0=height,x1=-1,y1=-1,n=0;
        for(int y=0;y<height;y++)for(int x=0;x<width;x++) {int i=(y*width+x)*4;if(b[i+3]==0)continue;
            if(b[i+3]!=255)throw new Exception("fractional_alpha");if(seen[y*width+x]++!=0)throw new Exception("overlapping_layers");
            for(int k=0;k<4;k++)if(b[i+k]!=pixels[i+k])throw new Exception("changed_source_pixel");
            n++;x0=Math.Min(x0,x);y0=Math.Min(y0,y);x1=Math.Max(x1,x);y1=Math.Max(y1,y);
        } return new int[]{x0,y0,x1,y1,n};
    }
    public void Finish() {for(int i=0;i<seen.Length;i++)if(seen[i]!=(pixels[i*4+3]>0?1:0))throw new Exception("missing_source_pixel");}
    public static bool Any(Bitmap image) {var b=Bytes(image);for(int i=3;i<b.Length;i+=4)if(b[i]>0)return true;return false;}
}
'@

$mapBuildRoot = Split-Path -Parent $PSScriptRoot
$mapManifestPath = Join-Path $mapBuildRoot $Manifest
$mapPack = Get-Content -LiteralPath $mapManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json

function New-MapRegion($Layer) {
    if ($Layer.id -eq 'terrain') { return [System.Drawing.Region]::new([System.Drawing.Rectangle]::new(0,0,1536,1024)) }
    $mapRegion = [System.Drawing.Region]::new()
    $mapRegion.MakeEmpty()
    foreach ($mapPolygon in $Layer.polygons) {
        $mapPoints = [System.Drawing.PointF[]]@($mapPolygon | ForEach-Object { [System.Drawing.PointF]::new([single]$_[0],[single]$_[1]) })
        $mapPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
        try { $mapPath.AddPolygon($mapPoints);$mapRegion.Union($mapPath) } finally { $mapPath.Dispose() }
    }
    foreach ($mapHole in $Layer.holes) {
        $mapPoints = [System.Drawing.PointF[]]@($mapHole | ForEach-Object { [System.Drawing.PointF]::new([single]$_[0],[single]$_[1]) })
        $mapPath = [System.Drawing.Drawing2D.GraphicsPath]::new()
        try { $mapPath.AddPolygon($mapPoints);$mapRegion.Exclude($mapPath) } finally { $mapPath.Dispose() }
    }
    return $mapRegion
}

foreach ($mapProperty in $mapPack.maps.psobject.Properties) {
    $mapScene = $mapProperty.Value
    $mapOriginal = [System.Drawing.Bitmap]::new((Join-Path $mapBuildRoot $mapScene.source))
    $mapCanonical = [System.Drawing.Bitmap]::new(1536,1024,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $mapCopy = [System.Drawing.Graphics]::FromImage($mapCanonical)
    try { $mapCopy.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy;$mapCopy.DrawImageUnscaled($mapOriginal,0,0) } finally { $mapCopy.Dispose();$mapOriginal.Dispose() }
    try {
        $mapAudit = [GuildMapPixelAudit]::new($mapCanonical)
        for ($mapLayerIndex=0;$mapLayerIndex -lt $mapScene.layers.Count;$mapLayerIndex++) {
            $mapLayer = $mapScene.layers[$mapLayerIndex]
            $mapRegion = New-MapRegion $mapLayer
            try {
                for ($mapLater=$mapLayerIndex+1;$mapLater -lt $mapScene.layers.Count;$mapLater++) {
                    $mapLaterRegion = New-MapRegion $mapScene.layers[$mapLater]
                    try { $mapRegion.Exclude($mapLaterRegion) } finally { $mapLaterRegion.Dispose() }
                }
                $mapLayerImage = [System.Drawing.Bitmap]::new(1536,1024,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
                try {
                    $mapDraw = [System.Drawing.Graphics]::FromImage($mapLayerImage)
                    try { $mapDraw.CompositingMode=[System.Drawing.Drawing2D.CompositingMode]::SourceCopy;$mapDraw.SetClip($mapRegion,[System.Drawing.Drawing2D.CombineMode]::Replace);$mapDraw.DrawImageUnscaled($mapCanonical,0,0) } finally { $mapDraw.Dispose() }
                    $mapBounds = $mapAudit.Add($mapLayerImage)
                    $mapTiles = @()
                    if ($mapBounds[4] -gt 0) {
                        for ($mapTileY=0;$mapTileY -lt 1024;$mapTileY+=512) { for ($mapTileX=0;$mapTileX -lt 1536;$mapTileX+=512) {
                            $mapX=[Math]::Max($mapTileX,$mapBounds[0]);$mapY=[Math]::Max($mapTileY,$mapBounds[1]);$mapRight=[Math]::Min($mapTileX+512,$mapBounds[2]+1);$mapBottom=[Math]::Min($mapTileY+512,$mapBounds[3]+1)
                            if ($mapRight -le $mapX -or $mapBottom -le $mapY) { continue }
                            $mapTextureX=[Math]::Max(0,$mapX-1);$mapTextureY=[Math]::Max(0,$mapY-1);$mapTextureRight=[Math]::Min(1536,$mapRight+1);$mapTextureBottom=[Math]::Min(1024,$mapBottom+1)
                            $mapTile = $mapLayerImage.Clone([System.Drawing.Rectangle]::new($mapTextureX,$mapTextureY,$mapTextureRight-$mapTextureX,$mapTextureBottom-$mapTextureY),[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
                            try {
                                if (-not [GuildMapPixelAudit]::Any($mapTile)) { continue }
                                $mapRelative = 'images/guild-world/v1/'+$mapScene.id+'/'+$mapLayer.id+'/'+($mapTileX/512)+'-'+($mapTileY/512)+'.png'
                                $mapOutput = Join-Path $mapBuildRoot $mapRelative
                                New-Item -ItemType Directory -Path (Split-Path -Parent $mapOutput) -Force | Out-Null
                                $mapTile.Save($mapOutput,[System.Drawing.Imaging.ImageFormat]::Png)
                                $mapTiles += [pscustomobject]@{x=$mapX;y=$mapY;w=($mapRight-$mapX);h=($mapBottom-$mapY);sx=($mapX-$mapTextureX);sy=($mapY-$mapTextureY);texW=$mapTile.Width;texH=$mapTile.Height;src=$mapRelative}
                            } finally { $mapTile.Dispose() }
                        } }
                    }
                    $mapLayer | Add-Member -NotePropertyName tiles -NotePropertyValue @($mapTiles) -Force
                    $mapLayer | Add-Member -NotePropertyName pixelCount -NotePropertyValue $mapBounds[4] -Force
                } finally { $mapLayerImage.Dispose() }
            } finally { $mapRegion.Dispose() }
        }
        $mapAudit.Finish()
        $mapScene | Add-Member -NotePropertyName pixelAudit -NotePropertyValue 'exact-source-partition' -Force
        Write-Output ($mapScene.id+': '+$mapScene.layers.Count+' layers, exact pixel reconstruction PASS')
    } finally { $mapCanonical.Dispose() }
}
[IO.File]::WriteAllText($mapManifestPath,($mapPack | ConvertTo-Json -Depth 100),[Text.UTF8Encoding]::new($false))
