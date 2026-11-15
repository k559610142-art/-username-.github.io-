# Rebuild the approved six transparent ring bands from the user's reference image.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Private.Windows.Core,System.Private.Windows.GdiPlus,System.Drawing.Common,System.Drawing.Primitives,System.Runtime.InteropServices -TypeDefinition @"
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;
public static class SoulRingAssets {
  static double Smooth(double lo,double hi,double v) {
    double t=Math.Min(1,Math.Max(0,(v-lo)/(hi-lo)));return t*t*(3-2*t);
  }
  public static void Build(string root) {
    int[,] crops={{60,90,600,360},{720,85,570,380},{1780,60,700,420},{40,500,680,470},{790,500,730,470},{1600,470,880,530}};
    const int size=384;
    using(var source=new Bitmap(System.IO.Path.Combine(root,"reference-new.jpg"))) {
      for(int n=0;n<6;n++) using(var b=new Bitmap(size,size,PixelFormat.Format32bppArgb)) {
        using(var g=Graphics.FromImage(b)) {
          g.InterpolationMode=InterpolationMode.HighQualityBicubic;
          g.DrawImage(source,new Rectangle(0,0,size,size),new Rectangle(crops[n,0],crops[n,1],crops[n,2],crops[n,3]),GraphicsUnit.Pixel);
        }
        var d=b.LockBits(new Rectangle(0,0,size,size),ImageLockMode.ReadWrite,PixelFormat.Format32bppArgb);
        var bytes=new byte[d.Stride*size];Marshal.Copy(d.Scan0,bytes,0,bytes.Length);
        for(int y=0;y<size;y++) for(int x=0;x<size;x++) {
          int i=y*d.Stride+x*4;
          double blue=bytes[i],green=bytes[i+1],red=bytes[i+2];
          double a=Math.Max(red,Math.Max(green,blue));if(a<12)a=0;
          if(n==3||n==4) {
            double dx=(x+.5)/size-.5,dy=(y+.5)/size-.5,r=Math.Sqrt(dx*dx+dy*dy);
            double band=Smooth(.235,.29,r)*(1-Smooth(.38,.445,r));
            a=Math.Max(a,Math.Round((n==3?236:242)*band));
            if(n==3) {red*=1-.16*band;green*=1-.3*band;blue*=1-.08*band;}
            else {
              // The reference's detached dark specks read as a dashed line when flattened.
              // Keep the smoky core but replace the detached particles with a smooth halo.
              double halo=65*Math.Exp(-Math.Pow((r-.34)/.10,2));
              halo*=Smooth(.17,.23,r)*(1-Smooth(.445,.495,r));
              a=Math.Max(242*band,halo);
              red=red*.68*band+90*(1-band);
              green=green*.68*band+90*(1-band);
              blue=blue*.68*band+90*(1-band);
            }
          }
          bytes[i]=(byte)(a==0?0:blue);bytes[i+1]=(byte)(a==0?0:green);bytes[i+2]=(byte)(a==0?0:red);bytes[i+3]=(byte)a;
        }
        Marshal.Copy(bytes,0,d.Scan0,bytes.Length);b.UnlockBits(d);
        b.Save(System.IO.Path.Combine(root,"ring-live-"+(n+1)+".png"),ImageFormat.Png);
      }
    }
  }
}
"@
[SoulRingAssets]::Build((Join-Path $PSScriptRoot '../assets/interface/wuhun-rings'))
