param([switch]$Preview)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = (Resolve-Path (Join-Path $PSScriptRoot '../../..')).Path
$outDir = Join-Path $root 'images/classes/advance-v1'
New-Item -ItemType Directory -Force $outDir | Out-Null
$ids = @('rTyrant','rEmperor','rWorld','kShield','kBlade','kDragoon','mPyro','mFrost','mStorm','eTempest','ePact','eForest','dBlade','dVenom','dNight','sFist','sWar','sVajra','wBerserk','wRuin','wTitan','gHunter','gBomb','gSling','fSword','fElem','fArcane','pJudge','pGuard','pRadiant','aJudge','aWar','aWatch','xAbyss','xReaper','xInferno')
$sheet = New-Object System.Drawing.Bitmap 1200,1800
$sg = [System.Drawing.Graphics]::FromImage($sheet)
$sg.Clear([System.Drawing.Color]::FromArgb(24,27,35))
$font = New-Object System.Drawing.Font 'Arial',11
try {
    for ($i=0; $i -lt $ids.Count; $i++) {
        $id = $ids[$i]
        $src = Join-Path $PSScriptRoot ($id + '-draft.png')
        if (!(Test-Path -LiteralPath $src)) { continue }
        $im = [System.Drawing.Bitmap]::FromFile($src)
        try {
            if ($im.GetPixel(0,0).A -gt 4) { throw ('Opaque corner: ' + $id) }
            $h = 900
            $w = [int][Math]::Round($im.Width * $h / $im.Height)
            $bmp = New-Object System.Drawing.Bitmap $w,$h
            $g = [System.Drawing.Graphics]::FromImage($bmp)
            try {
                $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
                $g.DrawImage($im,0,0,$w,$h)
                $dest = Join-Path $outDir ($id + '.png')
                if (!(Test-Path -LiteralPath $dest)) { $bmp.Save($dest,[System.Drawing.Imaging.ImageFormat]::Png) }
                $x = ($i % 6) * 200
                $y = [int][Math]::Floor($i / 6) * 300
                $tw = [int][Math]::Round($w * 270 / $h)
                $sg.DrawImage($bmp,($x + (200-$tw)/2),$y,$tw,270)
                $sg.DrawString($id,$font,[System.Drawing.Brushes]::White,($x+8),($y+275))
            } finally { $g.Dispose(); $bmp.Dispose() }
        } finally { $im.Dispose() }
    }
    if ($Preview) { $sheet.Save((Join-Path $PSScriptRoot 'contact.png'),[System.Drawing.Imaging.ImageFormat]::Png) }
} finally { $font.Dispose(); $sg.Dispose(); $sheet.Dispose() }
