# Generates workspacehub.ico from the "Inverted" design (4 white rounded
# squares with diagonal opacity on a dark-purple rounded-square background).

Add-Type -AssemblyName System.Drawing

function New-InvertedIconBitmap {
    param([int]$size)
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.Clear([System.Drawing.Color]::Transparent)

    # Colors
    $bg = [System.Drawing.Color]::FromArgb(255, 76, 29, 149)      # #4C1D95
    $fgFull = [System.Drawing.Color]::FromArgb(255, 255, 255, 255)
    $fgDim  = [System.Drawing.Color]::FromArgb(140, 255, 255, 255)

    function DrawRR($g, $x, $y, $w, $h, $r, $color) {
        if ($r * 2 -gt $w) { $r = [int]($w / 2) }
        if ($r * 2 -gt $h) { $r = [int]($h / 2) }
        if ($r -lt 1)      { $r = 1 }
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $path.AddArc($x, $y, $r*2, $r*2, 180, 90)
        $path.AddArc($x+$w-$r*2, $y, $r*2, $r*2, 270, 90)
        $path.AddArc($x+$w-$r*2, $y+$h-$r*2, $r*2, $r*2, 0, 90)
        $path.AddArc($x, $y+$h-$r*2, $r*2, $r*2, 90, 90)
        $path.CloseFigure()
        $brush = New-Object System.Drawing.SolidBrush($color)
        $g.FillPath($brush, $path)
        $brush.Dispose()
        $path.Dispose()
    }

    # Scale everything from the 512 viewBox design:
    #   bg rx=96  (96/512 = 0.1875)
    #   square 72..240 (14%..47%, size 168/512=0.328); rx=40 (7.8%)
    $bgR   = [int]($size * 0.1875)
    DrawRR $g 0 0 $size $size $bgR $bg

    $sqW   = [math]::Max(1, [int]($size * 0.328))
    $sqRx  = [math]::Max(1, [int]($size * 0.078))
    $sqP   = [int](($size - $sqW * 2 - ($size * 0.062)) / 2)
    if ($sqP -lt 0) { $sqP = 0 }
    $gap   = [math]::Max(1, [int]($size * 0.062))
    $pos1  = $sqP
    $pos2  = $sqP + $sqW + $gap

    DrawRR $g $pos1 $pos1 $sqW $sqW $sqRx $fgFull    # top-left
    DrawRR $g $pos2 $pos1 $sqW $sqW $sqRx $fgDim     # top-right
    DrawRR $g $pos1 $pos2 $sqW $sqW $sqRx $fgDim     # bottom-left
    DrawRR $g $pos2 $pos2 $sqW $sqW $sqRx $fgFull    # bottom-right

    $g.Dispose()
    return $bmp
}

function Get-PngBytes {
    param([System.Drawing.Bitmap]$bmp)
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bytes = $ms.ToArray()
    $ms.Dispose()
    return ,$bytes
}

$sizes = @(16, 24, 32, 48, 64, 128, 256)
$pngs  = @()
foreach ($s in $sizes) {
    $bmp = New-InvertedIconBitmap -size $s
    $pngs += ,(Get-PngBytes -bmp $bmp)
    $bmp.Dispose()
}

# Build ICO binary: header + directory entries + image data
$icoPath = Join-Path (Split-Path $PSScriptRoot -Parent) 'icons\workspacehub.ico'
if (Test-Path $icoPath) { Remove-Item $icoPath -Force }

$fs = [System.IO.File]::Create($icoPath)
$bw = New-Object System.IO.BinaryWriter($fs)

# Header (6 bytes)
$bw.Write([UInt16]0)                  # reserved
$bw.Write([UInt16]1)                  # type = icon
$bw.Write([UInt16]$sizes.Count)       # count

# First data offset = 6 + 16 * N
$offset = 6 + 16 * $sizes.Count

# Directory entries (16 bytes each)
for ($i = 0; $i -lt $sizes.Count; $i++) {
    $s = $sizes[$i]
    $len = $pngs[$i].Length
    $b = if ($s -ge 256) { [Byte]0 } else { [Byte]$s }
    $bw.Write($b)           # width
    $bw.Write($b)           # height
    $bw.Write([Byte]0)      # colors (0 = truecolor)
    $bw.Write([Byte]0)      # reserved
    $bw.Write([UInt16]1)    # planes
    $bw.Write([UInt16]32)   # bits per pixel
    $bw.Write([UInt32]$len) # size in bytes
    $bw.Write([UInt32]$offset) # offset to image data
    $offset += $len
}

# Image data (PNG-embedded)
foreach ($png in $pngs) {
    $bw.Write($png)
}

$bw.Dispose()
$fs.Dispose()

$finalSize = (Get-Item $icoPath).Length
Write-Host ("ICO written: " + $icoPath + "  (" + [math]::Round($finalSize/1KB,1) + " KB, " + $sizes.Count + " sizes)") -ForegroundColor Green
