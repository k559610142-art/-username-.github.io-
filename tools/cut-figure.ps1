param([string]$Src, [string]$OutPng, [string]$Preview, [string]$PointsFile)
Add-Type -AssemblyName System.Drawing
# 外框點（原圖像素，順時針）；由 cut-figure-points.txt 讀入，每行 "x,y"
$polys = @(); $cur = @()
foreach ($line in (Get-Content $PointsFile)) {
    if ($line -match '^\s*\d') { $p = $line -split ','; $cur += New-Object System.Drawing.PointF ([float]$p[0]), ([float]$p[1]) }
    elseif ($cur.Count) { $polys += ,$cur; $cur = @() }
}
if ($cur.Count) { $polys += ,$cur }
$pts = $polys[0]
$img = [System.Drawing.Image]::FromFile($Src)
$W = $img.Width; $H = $img.Height

# 遮罩：多邊形填白，以 2 倍解析度畫再縮小，邊緣自然羽化
$scale = 2
$mask = New-Object System.Drawing.Bitmap ($W * $scale), ($H * $scale)
$gm = [System.Drawing.Graphics]::FromImage($mask)
$gm.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$gm.Clear([System.Drawing.Color]::Black)
$path = New-Object System.Drawing.Drawing2D.GraphicsPath ([System.Drawing.Drawing2D.FillMode]::Alternate)
foreach ($poly in $polys) {
    $big = $poly | ForEach-Object { New-Object System.Drawing.PointF ($_.X * $scale), ($_.Y * $scale) }
    $path.AddClosedCurve([System.Drawing.PointF[]]$big, 0.25)
}
$gm.FillPath([System.Drawing.Brushes]::White, $path)
$gm.Dispose()
$maskS = New-Object System.Drawing.Bitmap $W, $H
$g2 = [System.Drawing.Graphics]::FromImage($maskS); $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g2.DrawImage($mask, 0, 0, $W, $H); $g2.Dispose(); $mask.Dispose()

# 依遮罩輸出透明圖，裁到外框範圍
$minX = [int][Math]::Floor(($pts | Measure-Object X -Minimum).Minimum) - 2
$maxX = [int][Math]::Ceiling(($pts | Measure-Object X -Maximum).Maximum) + 2
$minY = [int][Math]::Floor(($pts | Measure-Object Y -Minimum).Minimum) - 2
$maxY = [int][Math]::Ceiling(($pts | Measure-Object Y -Maximum).Maximum) + 2
$minX = [Math]::Max(0, $minX); $minY = [Math]::Max(0, $minY); $maxX = [Math]::Min($W - 1, $maxX); $maxY = [Math]::Min($H - 1, $maxY)
$srcBmp = New-Object System.Drawing.Bitmap $img
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System.Drawing;
public static class MaskApply {
    // 逐像素套用遮罩（PowerShell 迴圈太慢，改在 C# 執行）
    public static Bitmap Apply(Bitmap src, Bitmap mask, int x0, int y0, int x1, int y1) {
        var o = new Bitmap(x1 - x0 + 1, y1 - y0 + 1, System.Drawing.Imaging.PixelFormat.Format32bppArgb);
        for (int y = y0; y <= y1; y++) for (int x = x0; x <= x1; x++) {
            int a = mask.GetPixel(x, y).R;
            if (a > 0) { var c = src.GetPixel(x, y); o.SetPixel(x - x0, y - y0, Color.FromArgb(a, c.R, c.G, c.B)); }
        }
        return o;
    }
}
"@
$out = [MaskApply]::Apply($srcBmp, $maskS, $minX, $minY, $maxX, $maxY)
$out.Save($OutPng, [System.Drawing.Imaging.ImageFormat]::Png)
"cut box: $minX,$minY ~ $maxX,$maxY  size $($out.Width)x$($out.Height)"

# 預覽：左 = 原圖加紅色外框，右 = 去背結果放在藍灰底
$pv = New-Object System.Drawing.Bitmap ($W * 2), $H
$gp = [System.Drawing.Graphics]::FromImage($pv)
$gp.DrawImage($srcBmp, 0, 0, $W, $H)
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::Red), 2
$path2 = New-Object System.Drawing.Drawing2D.GraphicsPath
foreach ($poly in $polys) { $path2.AddClosedCurve([System.Drawing.PointF[]]$poly, 0.25) }
$gp.DrawPath($pen, $path2)
$gp.FillRectangle((New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(90, 110, 140))), $W, 0, $W, $H)
$gp.DrawImage($out, $W + $minX, $minY)
$pv.Save($Preview, [System.Drawing.Imaging.ImageFormat]::Png)
$gp.Dispose(); $pv.Dispose(); $out.Dispose(); $srcBmp.Dispose(); $maskS.Dispose(); $img.Dispose()
