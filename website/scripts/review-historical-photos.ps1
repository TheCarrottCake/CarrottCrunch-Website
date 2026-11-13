# Local review only; never changes, imports or publishes original images.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$website = Split-Path -Parent $PSScriptRoot
$source = Join-Path $website 'public/images/Server Photos'
$output = Join-Path $website '.wrangler/historical-photo-review'
$excluded = @(Get-Content -LiteralPath (Join-Path $website 'docs/historical-server-photo-exclusions.json') -Raw | ConvertFrom-Json)
$files = @(Get-ChildItem -LiteralPath $source -File | Where-Object {
  $file = $_
  $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLower()
  -not ($excluded | Where-Object { $_.filename -eq $file.Name -or $_.sha256 -eq $hash })
} | Sort-Object Name)
if (-not $files.Count) { throw 'No eligible original images to review.' }
New-Item -ItemType Directory -Path $output -Force | Out-Null
$sheet = New-Object System.Drawing.Bitmap 1500,([int]([Math]::Ceiling($files.Count / 3.0) * 350))
$graphics = [System.Drawing.Graphics]::FromImage($sheet)
$font = New-Object System.Drawing.Font 'Arial',11
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.ColorTranslator]::FromHtml('#35251F'))
try {
 $graphics.Clear([System.Drawing.ColorTranslator]::FromHtml('#FFF8ED'))
 for ($index=0; $index -lt $files.Count; $index++) {
  $file=$files[$index]; $picture=[System.Drawing.Image]::FromFile($file.FullName)
  try {
   $ratio=[Math]::Min(480.0/$picture.Width,275.0/$picture.Height)
   $w=[int]($picture.Width*$ratio); $h=[int]($picture.Height*$ratio)
   $column=($index%3)*500; $row=[int]([Math]::Floor($index/3)*350)
   $graphics.DrawImage($picture,($column+[int]((500-$w)/2)),($row+5),$w,$h)
   $graphics.DrawString($file.Name,$font,$brush,($column+8),($row+287))
   $graphics.DrawString("$($picture.Width) x $($picture.Height) | $($file.Length) B",$font,$brush,($column+8),($row+310))
  } finally { $picture.Dispose() }
 }
 $sheet.Save((Join-Path $output 'contact-sheet.png'),[System.Drawing.Imaging.ImageFormat]::Png)
} finally { $graphics.Dispose(); $sheet.Dispose(); $font.Dispose(); $brush.Dispose() }
Write-Output "Contact sheet generated from $($files.Count) eligible images; exclusion manifest enforced."
