$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public sealed class GuildTileProof {
    byte[] expected, owners;int width,height;
    static byte[] Read(Bitmap b) {var d=b.LockBits(new Rectangle(0,0,b.Width,b.Height),ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb);try{var a=new byte[b.Width*b.Height*4];for(int y=0;y<b.Height;y++)Marshal.Copy(IntPtr.Add(d.Scan0,y*d.Stride),a,y*b.Width*4,b.Width*4);return a;}finally{b.UnlockBits(d);}}
    public GuildTileProof(Bitmap b){width=b.Width;height=b.Height;expected=Read(b);owners=new byte[width*height];}
    public void Add(Bitmap b,int sx,int sy,int x,int y,int w,int h,int owner){var a=Read(b);for(int yy=0;yy<h;yy++)for(int xx=0;xx<w;xx++){int i=((yy+sy)*b.Width+xx+sx)*4,p=(y+yy)*width+x+xx;if(a[i+3]==0)continue;if(a[i+3]!=255||owners[p]!=0)throw new Exception("tile_alpha_or_overlap");owners[p]=(byte)owner;for(int k=0;k<4;k++)if(a[i+k]!=expected[p*4+k])throw new Exception("tile_pixel_changed");}}
    public void Finish(){for(int i=0;i<owners.Length;i++)if(owners[i]==0)throw new Exception("missing_tile_pixel");}
    public void Gutter(Bitmap b,int sx,int sy,int x,int y,int w,int h,int owner){var a=Read(b);for(int yy=0;yy<b.Height;yy++)for(int xx=0;xx<b.Width;xx++){if(xx>=sx&&xx<sx+w&&yy>=sy&&yy<sy+h)continue;int p=(y+yy-sy)*width+x+xx-sx,i=(yy*b.Width+xx)*4;if((a[i+3]>0)!=(owners[p]==owner))throw new Exception("gutter_seam");if(a[i+3]>0)for(int k=0;k<4;k++)if(a[i+k]!=expected[p*4+k])throw new Exception("gutter_pixel_changed");}}
}
'@
$proofRoot=Split-Path -Parent $PSScriptRoot
$proofData=Get-Content (Join-Path $proofRoot 'tools/guild-map-src/maps-v1.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$proofTileCount=0
foreach($proofProperty in $proofData.maps.psobject.Properties){
 $proofMap=$proofProperty.Value
 $proofOriginal=[Drawing.Bitmap]::new((Join-Path $proofRoot $proofMap.source))
 $proofSource=[Drawing.Bitmap]::new(1536,1024,[Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $proofG=[Drawing.Graphics]::FromImage($proofSource)
 try{$proofG.CompositingMode=[Drawing.Drawing2D.CompositingMode]::SourceCopy;$proofG.DrawImageUnscaled($proofOriginal,0,0)}finally{$proofG.Dispose();$proofOriginal.Dispose()}
 try{
  $proofAudit=[GuildTileProof]::new($proofSource)
  for($proofLayerIndex=0;$proofLayerIndex -lt $proofMap.layers.Count;$proofLayerIndex++){
   foreach($proofTile in $proofMap.layers[$proofLayerIndex].tiles){
    $proofBitmap=[Drawing.Bitmap]::new((Join-Path $proofRoot $proofTile.src))
    try{if($proofBitmap.Width -ne $proofTile.texW -or $proofBitmap.Height -ne $proofTile.texH){throw 'tile_size'};$proofAudit.Add($proofBitmap,$proofTile.sx,$proofTile.sy,$proofTile.x,$proofTile.y,$proofTile.w,$proofTile.h,$proofLayerIndex+1);$proofTileCount++}finally{$proofBitmap.Dispose()}
   }
  }
  $proofAudit.Finish()
  for($proofLayerIndex=0;$proofLayerIndex -lt $proofMap.layers.Count;$proofLayerIndex++){
   foreach($proofTile in $proofMap.layers[$proofLayerIndex].tiles){$proofBitmap=[Drawing.Bitmap]::new((Join-Path $proofRoot $proofTile.src));try{$proofAudit.Gutter($proofBitmap,$proofTile.sx,$proofTile.sy,$proofTile.x,$proofTile.y,$proofTile.w,$proofTile.h,$proofLayerIndex+1)}finally{$proofBitmap.Dispose()}}
  }
  Write-Output ($proofMap.id+': actual PNG pixels / coverage / transparent layers / 1px gutters PASS')
 }finally{$proofSource.Dispose()}
}
Write-Output ($proofTileCount.ToString()+' actual tiles, 17 maps reconstructed without source changes or seams')
