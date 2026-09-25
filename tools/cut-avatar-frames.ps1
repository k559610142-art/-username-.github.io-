param([string]$Src, [string]$OutDir)
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System; using System.Drawing; using System.Drawing.Imaging; using System.Collections.Generic;
public static class Cut {
    // 背景轉透明（color-to-alpha）：以 bg 為基準，算出每個像素需要的最小 alpha，再反推原色
    static void ToAlpha(int r, int g, int b, int[] bg, out int A, out int R, out int G, out int B) {
        double a = 0; int[] c = { r, g, b };
        for (int i = 0; i < 3; i++) {
            double d = c[i] > bg[i] ? (c[i] - bg[i]) / (255.0 - bg[i]) : (bg[i] > 0 ? (bg[i] - c[i]) / (double)bg[i] : 0);
            if (d > a) a = d;
        }
        if (a < 0.07) { A = 0; R = G = B = 0; return; }        // JPEG 雜訊
        a = Math.Min(1, a * 1.08);                             // 稍微加厚，避免邊框太透
        double[] o = new double[3];
        for (int i = 0; i < 3; i++) o[i] = Math.Max(0, Math.Min(255, (c[i] - bg[i]) / a + bg[i]));
        A = (int)(a * 255); R = (int)o[0]; G = (int)o[1]; B = (int)o[2];
    }

    // cell = 裁切範圍；blank = 要塗成背景的矩形（WEBP 標籤、放大鏡圖示），可為 null
    // 回傳 "cx,cy,r,size"：內圈（放頭像的洞）中心與半徑，單位為輸出圖的比例（0~1）
    public static string Process(string src, string outPath, int x0, int y0, int x1, int y1, int[] blank, int[] bgOverride, int pad) {
        var s = new Bitmap(src);
        int w = x1 - x0 + 1, h = y1 - y0 + 1;
        // 背景色：取裁切框四角的中位數
        var samples = new List<Color> { s.GetPixel(x0, y0), s.GetPixel(x1, y0), s.GetPixel(x0, y1), s.GetPixel(x1, y1) };
        samples.Sort((a, b) => (a.R + a.G + a.B).CompareTo(b.R + b.G + b.B));
        var bgC = samples[1]; int[] bg = bgOverride ?? new int[] { bgC.R, bgC.G, bgC.B };

        var A = new int[w, h]; var R = new int[w, h]; var G = new int[w, h]; var B = new int[w, h];
        for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
            int sx = x0 + x, sy = y0 + y;
            if (x < pad || y < pad || x >= w - pad || y >= h - pad) { A[x, y] = 0; continue; }
            if (blank != null && sx >= blank[0] && sx <= blank[2] && sy >= blank[1] && sy <= blank[3]) { A[x, y] = 0; continue; }
            var c = s.GetPixel(sx, sy); int a, r, g, b;
            ToAlpha(c.R, c.G, c.B, bg, out a, out r, out g, out b);
            A[x, y] = a; R[x, y] = r; G[x, y] = g; B[x, y] = b;
        }
        s.Dispose();

        // 內容外框（alpha > 40）
        int minX = w, minY = h, maxX = -1, maxY = -1;
        for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) if (A[x, y] > 40) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; }
        int bw = maxX - minX + 1, bh = maxY - minY + 1;
        int size = Math.Max(bw, bh) + 4;
        int ox = (size - bw) / 2 - minX, oy = (size - bh) / 2 - minY;

        var o = new Bitmap(size, size, PixelFormat.Format32bppArgb);
        var solid = new bool[size, size];
        for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
            int tx = x + ox, ty = y + oy;
            if (tx < 0 || ty < 0 || tx >= size || ty >= size) continue;
            o.SetPixel(tx, ty, Color.FromArgb(A[x, y], R[x, y], G[x, y], B[x, y]));
            solid[tx, ty] = A[x, y] > 170;
        }
        o.Save(outPath, ImageFormat.Png);
        o.Dispose();

        // 內圈：從中心向外打 72 道射線，找第一段連續 2 px 的實心像素（內緣），半徑取中位數；
        //       中心以「距離接近中位數的內緣點」平均後重算，迭代 8 次。零星光點只會影響少數射線，不影響中位數
        double cxd = size / 2.0, cyd = size / 2.0, rad = size * 0.25;
        for (int it = 0; it < 8; it++) {
            var hits = new List<double[]>(); var dists = new List<double>();
            for (int k = 0; k < 72; k++) {
                double ang = k * Math.PI * 2 / 72, dx = Math.Cos(ang), dy = Math.Sin(ang);
                int run = 0;
                for (double d = 3; d < size; d += 0.5) {
                    int px = (int)(cxd + dx * d), py = (int)(cyd + dy * d);
                    if (px < 0 || py < 0 || px >= size || py >= size) break;
                    if (solid[px, py]) { run++; if (run >= 4) { double hd = d - 1.5; hits.Add(new[] { cxd + dx * hd, cyd + dy * hd, hd }); dists.Add(hd); break; } }
                    else run = 0;
                }
            }
            if (dists.Count < 20) break;
            dists.Sort(); rad = dists[dists.Count / 2];
            double sx = 0, sy = 0; int cnt = 0;
            foreach (var hp in hits) if (Math.Abs(hp[2] - rad) < rad * 0.2) { sx += hp[0]; sy += hp[1]; cnt++; }
            if (cnt > 10) { cyd = sy / cnt; }   // 頭像框都左右對稱：水平中心固定在正中，只調整垂直中心
        }
        double best = rad, bx = cxd - 0.5, by = cyd - 0.5;
        return string.Format(System.Globalization.CultureInfo.InvariantCulture, "{0:F3},{1:F3},{2:F3},{3}",
            (bx + 0.5) / size, (by + 0.5) / size, best / size, size);
    }
}
"@

# 5 列 × 5 欄的縮圖範圍（由 profile.ps1 量得）；列 y 範圍、各欄 x 範圍
$bands = @(
    @{ y = @(157, 290); x = @(@(13,141), @(155,292), @(312,428), @(450,579), @(595,721)) },
    @{ y = @(351, 482); x = @(@(10,143), @(158,286), @(306,425), @(447,578), @(592,724)) },
    @{ y = @(544, 676); x = @(@(14,137), @(163,276), @(295,438), @(451,576), @(593,721)) },
    @{ y = @(732, 868); x = @(@(12,139), @(151,288), @(312,415), @(452,565), @(585,726)) },
    @{ y = @(924, 1063); x = @(@(9,156), @(164,301), @(313,454), @(461,579), @(602,712)) }
)
# 要抹掉的雜物：WEBP 標籤（第 2 列第 3 欄、第 3 列第 4 欄）、放大鏡（第 1 列第 5 欄右下）
$blanks = @{
    "1-5" = @(704, 274, 730, 296);
    "2-3" = @(298, 347, 336, 366);
    "3-4" = @(445, 540, 483, 559)
}
New-Item -ItemType Directory -Force $OutDir | Out-Null
$n = 0; $meta = @()
for ($r = 0; $r -lt 5; $r++) {
    for ($c = 0; $c -lt 5; $c++) {
        $n++
        $bx = $bands[$r].x[$c]; $by = $bands[$r].y
        $pad = 5
        $key = "$($r+1)-$($c+1)"
        $blank = if ($blanks.ContainsKey($key)) { [int[]]$blanks[$key] } else { $null }
        $out = Join-Path $OutDir ("frame-{0:D2}.png" -f $n)
        $bgo = if ($key -eq "2-3" -or $key -eq "3-4") { [int[]]@(0,0,0) } else { $null }
        $info = [Cut]::Process($Src, $out, $bx[0] - $pad, $by[0] - $pad, $bx[1] + $pad, $by[1] + $pad, $blank, $bgo, 3)
        $meta += ("{0:D2} {1}" -f $n, $info)
    }
}
$meta
