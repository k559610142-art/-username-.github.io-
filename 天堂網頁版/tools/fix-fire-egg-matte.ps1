# Correct the previously exported fire-egg body (gfx 1820, native 104.attr(8)).
$ErrorActionPreference='Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Private.Windows.Core,System.Private.Windows.GdiPlus,System.Drawing.Common,System.Drawing.Primitives,System.Runtime.InteropServices -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
public static class FireEggMatte {
 public static void Fix(string path) {
  using(var b=new Bitmap(path)) {
   var d=b.LockBits(new Rectangle(0,0,b.Width,b.Height),ImageLockMode.ReadWrite,PixelFormat.Format32bppArgb);
   var bytes=new byte[d.Stride*b.Height];Marshal.Copy(d.Scan0,bytes,0,bytes.Length);
   for(int i=0;i<bytes.Length;i+=4) {
    int v=Math.Max(bytes[i],Math.Max(bytes[i+1],bytes[i+2]));
    if(v==255)continue;
    int alpha=bytes[i+3]*v/255;
    for(int j=0;j<3;j++)bytes[i+j]=(byte)(v==0?0:bytes[i+j]*255/v);
    bytes[i+3]=(byte)alpha;
   }
   Marshal.Copy(bytes,0,d.Scan0,bytes.Length);b.UnlockBits(d);b.Save(path+".fixed.png",ImageFormat.Png);
  }
 }
}
"@
$assetRoot=Join-Path $PSScriptRoot '../assets/native-monsters'
foreach($name in @('monster-layer-1820-0.png','monster-death-1820-0.png')) {
 $asset=Join-Path $assetRoot $name
 [FireEggMatte]::Fix($asset)
 Move-Item -LiteralPath ($asset+'.fixed.png') -Destination $asset -Force
}
