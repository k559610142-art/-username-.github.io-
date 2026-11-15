# 魂環素材切圖（2026-11-15）：使用者給的 3×2 六色魂環總圖（黑底、斜放）→ 6 張透明 PNG 正圓魂環。
#   1. 每格裁出來；2. 黑底轉透明：alpha＝max(R,G,B)，顏色除以 alpha 還原（像「濾色」疊加的效果）；
#   3. 用亮度加權的主成分算出環的傾斜角與長短軸比，轉正並把短軸拉長成正圓（遊戲裡再 scaleY 壓成地面透視、旋轉才自然）；
#   4. 輸出 Size×Size，環半徑約 Size×0.36。
# 用法：powershell -File tools/soul-ring-cut.ps1 -Src 總圖.jpg -Out <完整路徑>/assets/interface/wuhun-rings [-Size 384]
param([string]$Src, [string]$Out, [int]$Size = 384)
Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force $Out | Out-Null
$img = [System.Drawing.Bitmap]::FromFile($Src)
$cw = [int]($img.Width / 3); $ch = [int]($img.Height / 2)
for ($n = 0; $n -lt 6; $n++) {
  $col = $n % 3; $row = [int][math]::Floor($n / 3)
  $cell = New-Object System.Drawing.Bitmap $cw, $ch, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g = [System.Drawing.Graphics]::FromImage($cell)
  $g.DrawImage($img, (New-Object System.Drawing.Rectangle 0, 0, $cw, $ch), (New-Object System.Drawing.Rectangle ($col * $cw), ($row * $ch), $cw, $ch), [System.Drawing.GraphicsUnit]::Pixel)
  $g.Dispose()
  $rect = New-Object System.Drawing.Rectangle 0, 0, $cw, $ch
  $data = $cell.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $bytes = New-Object byte[] ($data.Stride * $ch)
  [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
  $sw = 0.0; $sx = 0.0; $sy = 0.0; $sxx = 0.0; $syy = 0.0; $sxy = 0.0
  for ($y = 0; $y -lt $ch; $y++) {
    $o = $y * $data.Stride
    for ($x = 0; $x -lt $cw; $x++) {
      $i = $o + $x * 4
      $b = $bytes[$i]; $gg = $bytes[$i + 1]; $r = $bytes[$i + 2]
      $a = [math]::Max($r, [math]::Max($gg, $b))
      if ($a -lt 14) { $a = 0 }
      $ao = [int](255 * [math]::Pow($a / 255.0, 1.6))   # 收緊淡光暈：多圈同心疊加時才分得出層次
      if ($a -gt 0) {
        $bytes[$i] = [byte][math]::Min(255, [int]($b * 255 / $a)); $bytes[$i + 1] = [byte][math]::Min(255, [int]($gg * 255 / $a)); $bytes[$i + 2] = [byte][math]::Min(255, [int]($r * 255 / $a))
        if ($a -gt 90) { $w = [double]$a; $sw += $w; $sx += $w * $x; $sy += $w * $y; $sxx += $w * $x * $x; $syy += $w * $y * $y; $sxy += $w * $x * $y }
      }
      $bytes[$i + 3] = [byte]$ao
    }
  }
  [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $data.Scan0, $bytes.Length)
  $cell.UnlockBits($data)
  $mx = $sx / $sw; $my = $sy / $sw
  $vxx = $sxx / $sw - $mx * $mx; $vyy = $syy / $sw - $my * $my; $vxy = $sxy / $sw - $mx * $my
  $theta = 0.5 * [math]::Atan2(2 * $vxy, $vxx - $vyy)
  $tr = ($vxx + $vyy) / 2; $dt = [math]::Sqrt([math]::Max(0, (($vxx - $vyy) / 2) * (($vxx - $vyy) / 2) + $vxy * $vxy))
  $major = [math]::Sqrt($tr + $dt); $minor = [math]::Sqrt([math]::Max(1, $tr - $dt))
  $radius = $major * [math]::Sqrt(2)          # 細環：沿軸標準差 ＝ 半徑 ÷ √2
  $k = ($Size * 0.36) / $radius
  $outBmp = New-Object System.Drawing.Bitmap $Size, $Size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $g2 = [System.Drawing.Graphics]::FromImage($outBmp)
  $g2.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $g2.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $g2.TranslateTransform($Size / 2, $Size / 2)
  $g2.ScaleTransform($k, $k * ($major / $minor))
  $g2.RotateTransform(-$theta * 180 / [math]::PI)
  $g2.TranslateTransform(-$mx, -$my)
  $g2.DrawImage($cell, 0, 0, $cw, $ch)
  $g2.Dispose()
  # Band mask: keep only the ring band (radius 0.36*Size, half width 0.055*Size, soft 0.045*Size edge) so stacked rings stay distinct colors
  $ob = $outBmp.LockBits((New-Object System.Drawing.Rectangle 0, 0, $Size, $Size), [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $px = New-Object byte[] ($ob.Stride * $Size)
  [System.Runtime.InteropServices.Marshal]::Copy($ob.Scan0, $px, 0, $px.Length)
  $c0 = $Size / 2; $rr = $Size * 0.36; $hw = $Size * 0.055; $soft = $Size * 0.045
  for ($y = 0; $y -lt $Size; $y++) { for ($x = 0; $x -lt $Size; $x++) {
    $d = [math]::Abs([math]::Sqrt(($x - $c0) * ($x - $c0) + ($y - $c0) * ($y - $c0)) - $rr) - $hw
    if ($d -gt 0) { $j = $y * $ob.Stride + $x * 4 + 3; $f = [math]::Max(0, 1 - $d / $soft); $px[$j] = [byte]($px[$j] * $f * $f) }
  } }
  [System.Runtime.InteropServices.Marshal]::Copy($px, 0, $ob.Scan0, $px.Length)
  $outBmp.UnlockBits($ob)
  $file = Join-Path $Out ('ring-' + ($n + 1) + '.png')
  $outBmp.Save($file, [System.Drawing.Imaging.ImageFormat]::Png)
  "{0} 傾斜 {1:N1}° 長短軸比 {2:N2} 半徑 {3:N0}px" -f $file, ($theta * 180 / [math]::PI), ($major / $minor), $radius
  $outBmp.Dispose(); $cell.Dispose()
}
$img.Dispose()
