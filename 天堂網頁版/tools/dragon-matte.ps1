Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Private.Windows.Core,System.Private.Windows.GdiPlus,System.Drawing.Common,System.Drawing.Primitives,System.Runtime.InteropServices -TypeDefinition @"
using System; using System.Drawing; using System.Drawing.Imaging; using System.Runtime.InteropServices;
public class DragonMatte { public static void Run(string p) { using(var b=new Bitmap(p)){var d=b.LockBits(new Rectangle(0,0,b.Width,b.Height),ImageLockMode.ReadWrite,PixelFormat.Format32bppArgb);var a=new byte[d.Stride*b.Height];Marshal.Copy(d.Scan0,a,0,a.Length);for(int i=0;i<a.Length;i+=4){int blue=a[i],g=a[i+1],r=a[i+2];a[i+3]=(byte)(r>blue*1.3 && g>r*.55 ? Math.Max(r,Math.Max(g,blue)):0);if(a[i+3]==0){a[i]=a[i+1]=a[i+2]=0;}}Marshal.Copy(a,0,d.Scan0,a.Length);b.UnlockBits(d);b.Save(p+".png",ImageFormat.Png);}} }
"@
[DragonMatte]::Run((Join-Path $PWD 'assets/interface/wuhun-rings/dragon-atlas.png'))




