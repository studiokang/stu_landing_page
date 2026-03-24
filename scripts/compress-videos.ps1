#Requires -Version 5.1
<#
  assets 폴더의 MP4를 웹용으로 재인코딩합니다 (용량 감소, GitHub/Vercel 부담 완화).
  사전 요건: ffmpeg가 PATH에 있어야 합니다. https://ffmpeg.org/download.html

  사용: 프로젝트 루트에서
    powershell -ExecutionPolicy Bypass -File .\scripts\compress-videos.ps1

  옵션 환경변수:
    $env:WEB_VIDEO_MAX_WIDTH = "1920"   # 기본 1280
    $env:WEB_VIDEO_CRF = "26"           # 18(고화질)~28(저용량), 기본 26
#>
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$assets = Join-Path $root 'assets'
if (-not (Test-Path $assets)) { throw "assets 폴더 없음: $assets" }

$ffmpeg = Get-Command ffmpeg -ErrorAction SilentlyContinue
if (-not $ffmpeg) {
  throw "ffmpeg를 찾을 수 없습니다. 설치 후 PATH에 추가하세요."
}

$maxW = if ($env:WEB_VIDEO_MAX_WIDTH) { [int]$env:WEB_VIDEO_MAX_WIDTH } else { 1280 }
$crf = if ($env:WEB_VIDEO_CRF) { [int]$env:WEB_VIDEO_CRF } else { 26 }

$files = Get-ChildItem -Path $assets -Filter '*.mp4' -File
if ($files.Count -eq 0) { Write-Host 'MP4 파일이 없습니다.'; exit 0 }

Write-Host "대상: $($files.Count)개 | max width=${maxW}px | CRF=${crf}" -ForegroundColor Cyan

foreach ($f in $files) {
  $in = $f.FullName
  $tmp = $in + '.web-tmp.mp4'
  $before = $f.Length

  $vf = "scale='min($maxW,iw)':-2"
  & ffmpeg -hide_banner -y -i $in `
    -vf $vf `
    -c:v libx264 -crf $crf -preset medium `
    -movflags +faststart `
    -c:a aac -b:a 128k -ac 2 `
    $tmp
  if ($LASTEXITCODE -ne 0) { throw "ffmpeg 실패: $in" }

  $after = (Get-Item $tmp).Length
  # Windows에서 Move-Item 교체 시 잠금 오류 방지: 복사 후 삭제
  Start-Sleep -Milliseconds 300
  Copy-Item -LiteralPath $tmp -Destination $in -Force
  Remove-Item -LiteralPath $tmp -Force
  $pct = if ($before -gt 0) { [math]::Round(100 * (1 - $after / $before), 1) } else { 0 }
  Write-Host ("OK {0,-22} {1,10:N0} -> {2,10:N0} bytes  (-{3}%)" -f $f.Name, $before, $after, $pct)
}

Write-Host "`n완료. git add assets && git commit && git push 로 반영하세요." -ForegroundColor Green
