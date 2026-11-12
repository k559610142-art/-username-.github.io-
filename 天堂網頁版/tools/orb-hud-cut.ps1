# 水晶球介面素材切圖：把使用者給的素材總圖（JPG，背景是畫上去的灰白格紋）切成透明 PNG。
# 用法：powershell -File tools/orb-hud-cut.ps1 -Src 素材圖.jpg -Out <完整路徑>/assets/interface/orb-hud（-Out 要給完整路徑）
#  1. 依格紋週期算出每個像素底下是淺格還是深格，用「顏色轉透明」把光暈還原成半透明
#  2. 從裁切框邊緣往內 flood fill，只有連到外面的像素才去背（物件內部保持不透明，不會被挖洞）
#  3. 擦掉圖上寫死的文字（HP／MP 數值、快捷列 F 鍵標籤、藥水格），改由程式即時顯示
param([Parameter(Mandatory)][string]$Src,[Parameter(Mandatory)][string]$Out)
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;using System.Drawing;using System.Drawing.Imaging;using System.Collections.Generic;
public class OrbCut{
 public int W,H;public byte[] P; // BGRA
 public double Cell=33.333,CellX=33.333,CellY=33.333,Ox=0,Oy=0;public int Light=223,Dark=179;
 public OrbCut(string path){var b=new Bitmap(path);W=b.Width;H=b.Height;var r=new Rectangle(0,0,W,H);var bm=b.LockBits(r,ImageLockMode.ReadOnly,PixelFormat.Format32bppArgb);P=new byte[W*H*4];System.Runtime.InteropServices.Marshal.Copy(bm.Scan0,P,0,P.Length);b.UnlockBits(bm);b.Dispose();}
 int Gray(int x,int y){int i=(y*W+x)*4;return (P[i]+P[i+1]+P[i+2])/3;}
 // 用一段乾淨的橫列／直行找格紋邊界，算出相位
 public static double[] Fit(List<double> e,double c0){double e0=e[0];int n=e.Count;double sk=0,se=0,skk=0,ske=0;foreach(var v in e){double k=Math.Round((v-e0)/c0);sk+=k;se+=v;skk+=k*k;ske+=k*v;}double b=(n*ske-sk*se)/(n*skk-sk*sk),a=(se-b*sk)/n;double ph=a%b;if(ph<0)ph+=b;return new[]{ph,b};}
 public static double Phase(List<double> edges,double cell){double sx=0,cx=0;foreach(var e in edges){double a=2*Math.PI*e/cell;sx+=Math.Sin(a);cx+=Math.Cos(a);}double ph=Math.Atan2(sx,cx)/(2*Math.PI)*cell;return ph<0?ph+cell:ph;}
 public string Calibrate(int rowY,int x0,int x1,int colX,int y0,int y1){
  var ex=new List<double>();for(int x=x0;x<x1;x++){int a=Gray(x,rowY),b=Gray(x+1,rowY);if((a-201)*(b-201)<0)ex.Add(x+0.5);}
  var ey=new List<double>();for(int y=y0;y<y1;y++){int a=Gray(colX,y),b=Gray(colX,y+1);if((a-201)*(b-201)<0)ey.Add(y+0.5);}
  var fx=Fit(ex,Cell);var fy=Fit(ey,Cell);Ox=fx[0];CellX=fx[1];Oy=fy[0];CellY=fy[1];
  // 判斷 (Ox,Oy) 起的第一格是淺還是深
  int sx=(int)(Ox+CellX*Math.Floor(colX/CellX)+CellX/2),sy=(int)(Oy+CellY/2);long ix=(long)Math.Floor((sx+0.5-Ox)/CellX),iy=(long)Math.Floor((sy+0.5-Oy)/CellY);int par=(int)((ix+iy)&1);LightParity=(Gray(sx,sy)>201)?par:1-par;
  return "edges "+ex.Count+"/"+ey.Count+" cell="+CellX.ToString("F3")+"/"+CellY.ToString("F3")+" Ox="+Ox.ToString("F2")+" Oy="+Oy.ToString("F2")+" parity="+LightParity;}
 public int LightParity=0;
 // 回傳 (x,y) 底下格紋顏色；靠近格線時回傳 -1（兩種都可能）
 int Bg(int x,int y){double fx=(x+0.5-Ox)/CellX,fy=(y+0.5-Oy)/CellY;double ix=Math.Floor(fx),iy=Math.Floor(fy);
  double dx=Math.Min(fx-ix,ix+1-fx)*CellX,dy=Math.Min(fy-iy,iy+1-fy)*CellY;if(dx<1.6||dy<1.6)return -1;
  int par=(int)(((long)ix+(long)iy)&1);return par==LightParity?Light:Dark;}
 static double C2A(int p,int b){if(p==b)return 0;return p<b?(b-p)/(double)b:(p-b)/(double)(255-b);}
 double Alpha(int i,int bg){return Math.Max(C2A(P[i+2],bg),Math.Max(C2A(P[i+1],bg),C2A(P[i],bg)));}
 // 裁切＋去背，回傳 BGRA
 public byte[] Cut(int X,int Y,int w,int h,double fillTh){
  var o=new byte[w*h*4];var al=new double[w*h];var bgs=new int[w*h];
  for(int y=0;y<h;y++)for(int x=0;x<w;x++){int i=((Y+y)*W+X+x)*4,bg=Bg(X+x,Y+y);double a;
   if(bg<0){double a1=Alpha(i,Light),a2=Alpha(i,Dark);if(a1<a2){a=a1;bg=Light;}else{a=a2;bg=Dark;}}else a=Alpha(i,bg);
   al[y*w+x]=a;bgs[y*w+x]=bg;}
  // 外部：從邊框 flood fill，經過 alpha < fillTh 的像素
  var outside=new bool[w*h];var q=new Queue<int>();
  for(int x=0;x<w;x++){q.Enqueue(x);q.Enqueue((h-1)*w+x);}for(int y=0;y<h;y++){q.Enqueue(y*w);q.Enqueue(y*w+w-1);}
  while(q.Count>0){int k=q.Dequeue();if(outside[k]||al[k]>=fillTh)continue;outside[k]=true;int x=k%w,y=k/w;
   if(x>0)q.Enqueue(k-1);if(x<w-1)q.Enqueue(k+1);if(y>0)q.Enqueue(k-w);if(y<h-1)q.Enqueue(k+w);}
  for(int y=0;y<h;y++)for(int x=0;x<w;x++){int k=y*w+x,i=((Y+y)*W+X+x)*4,j=k*4;
   if(!outside[k]){o[j]=P[i];o[j+1]=P[i+1];o[j+2]=P[i+2];o[j+3]=255;continue;}
   double a=al[k];int mx=Math.Max(P[i],Math.Max(P[i+1],P[i+2])),mn=Math.Min(P[i],Math.Min(P[i+1],P[i+2]));double aMin=Math.Min(Alpha(i,Light),Alpha(i,Dark));if(a<0.12||(mx-mn<16&&a<0.35)||(mx-mn<26&&aMin<0.22)){continue;}int bg=bgs[k];
   for(int c=0;c<3;c++){double f=(P[i+c]-(1-a)*bg)/a;o[j+c]=(byte)Math.Max(0,Math.Min(255,f));}
   o[j+3]=(byte)Math.Round(Math.Min(1,a)*255);}
  return o;}
 // 擦字：遮罩內像素用周圍像素擴散補上
 public static void Inpaint(byte[] o,int w,int h,bool[] mask,int iters){
  var m=(bool[])mask.Clone();for(int it=0;it<iters;it++){bool any=false;var nm=(bool[])m.Clone();
   for(int y=1;y<h-1;y++)for(int x=1;x<w-1;x++){int k=y*w+x;if(!m[k])continue;double[] s=new double[4];int n=0;
    foreach(int d in new[]{-1,1,-w,w,-w-1,-w+1,w-1,w+1}){int kk=k+d;if(m[kk])continue;for(int c=0;c<4;c++)s[c]+=o[kk*4+c];n++;}
    if(n>=2){for(int c=0;c<4;c++)o[k*4+c]=(byte)(s[c]/n);nm[k]=false;}else any=true;}
   m=nm;if(!any)break;}}
 public static bool[] Dilate(bool[] m,int w,int h,int r){var o=new bool[w*h];for(int y=0;y<h;y++)for(int x=0;x<w;x++){if(!m[y*w+x])continue;for(int dy=-r;dy<=r;dy++)for(int dx=-r;dx<=r;dx++){int xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<w&&yy<h)o[yy*w+xx]=true;}}return o;}
 // 文字遮罩：box 內符合條件（淺米色字）
 public static bool[] TextMask(byte[] o,int w,int h,int bx,int by,int bw,int bh,string kind){var m=new bool[w*h];
  for(int y=by;y<by+bh;y++)for(int x=bx;x<bx+bw;x++){int j=(y*w+x)*4;int B=o[j],G=o[j+1],R=o[j+2];bool t;
   if(kind=="hp")t=G>150&&B>120;else if(kind=="mp")t=(R+G+B)/3>150&&B-R<60;else t=(R+G+B)/3>70&&Math.Abs(R-B)<40;m[y*w+x]=t;}return m;}
 public static void Save(byte[] o,int w,int h,string path,out int tx,out int ty,out int tw,out int th){
  int x0=w,y0=h,x1=-1,y1=-1;for(int y=0;y<h;y++)for(int x=0;x<w;x++)if(o[(y*w+x)*4+3]>8){if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
  tx=x0;ty=y0;tw=x1-x0+1;th=y1-y0+1;var b=new Bitmap(tw,th,PixelFormat.Format32bppArgb);var bm=b.LockBits(new Rectangle(0,0,tw,th),ImageLockMode.WriteOnly,PixelFormat.Format32bppArgb);
  var row=new byte[tw*4];for(int y=0;y<th;y++){Array.Copy(o,((y+y0)*w+x0)*4,row,0,tw*4);System.Runtime.InteropServices.Marshal.Copy(row,0,bm.Scan0+y*bm.Stride,tw*4);}
  b.UnlockBits(bm);b.Save(path,ImageFormat.Png);b.Dispose();}
 public static void CopyRect(byte[] o,int w,int sx,int sy,int dx,int dy,int cw,int ch){var t=new byte[cw*ch*4];for(int y=0;y<ch;y++)Array.Copy(o,((sy+y)*w+sx)*4,t,y*cw*4,cw*4);for(int y=0;y<ch;y++)Array.Copy(t,y*cw*4,o,((dy+y)*w+dx)*4,cw*4);}
}
'@
New-Item -ItemType Directory -Force $Out | Out-Null
$c=[OrbCut]::new((Resolve-Path $Src).Path)
"size $($c.W)x$($c.H)"; $c.Calibrate(12,150,1990,950,0,690)
$report=@{}
function Emit($name,$x,$y,$w,$h,$th,[scriptblock]$fix){$o=$c.Cut($x,$y,$w,$h,$th);if($fix){& $fix $o $w $h};$tx=0;$ty=0;$tw=0;$tt=0;[OrbCut]::Save($o,$w,$h,"$Out\$name.png",[ref]$tx,[ref]$ty,[ref]$tw,[ref]$tt);"$name ${tw}x${tt} (trim $tx,$ty)"}
Emit hp 250 20 630 695 0.6 {param($o,$w,$h);$m=[OrbCut]::Dilate([OrbCut]::TextMask($o,$w,$h,200,245,215,150,'hp'),$w,$h,6);[OrbCut]::Inpaint($o,$w,$h,$m,80)}
Emit mp 1110 45 620 665 0.6 {param($o,$w,$h);$m=[OrbCut]::Dilate([OrbCut]::TextMask($o,$w,$h,220,205,190,145,'mp'),$w,$h,7);[OrbCut]::Inpaint($o,$w,$h,$m,80)}
Emit menu 676 706 250 248 0.6 $null
Emit lock 960 722 222 225 0.6 $null
Emit pick 1210 732 202 196 0.6 $null
Emit self 1430 730 202 202 0.6 $null
Emit self-s 1725 700 132 134 0.6 $null
Emit claw 1855 645 134 134 0.6 $null
Emit auto 1637 815 133 134 0.6 $null
Emit auto2 1637 962 133 145 0.6 $null
Emit attack 1757 826 243 246 0.6 $null
Emit potion1 3 0 138 138 0.6 $null
Emit potion2 3 143 138 145 0.6 $null
# 快捷列：去掉上緣經驗線（程式畫）、藥水格換成空格、擦掉 F 鍵標籤
Emit bar 553 979 897 138 0.6 {param($o,$w,$h);[OrbCut]::CopyRect($o,$w,125,4,45,4,78,128);$m=[OrbCut]::Dilate([OrbCut]::TextMask($o,$w,$h,40,14,820,30,'label'),$w,$h,2);[OrbCut]::Inpaint($o,$w,$h,$m,40)}
