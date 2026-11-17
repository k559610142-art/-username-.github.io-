# 從 mp4 只抽出音軌轉成 AAC m4a（這台電腦沒有 ffmpeg，用 Windows 內建 Media Foundation 的 WinRT MediaTranscoder）。
# 用法：powershell -ExecutionPolicy Bypass -File tools\extract-audio.ps1 assets\entry\login-video.mp4 assets\entry\login-music.m4a
# 2026-11-17：登入配樂原本用 <audio> 直接載入 12MB 的影片檔，第一次點擊時跟影片搶頻寬讓畫面卡住 → 改用抽出來的小音檔。
param([string]$In, [string]$Out, [int]$Kbps = 128)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
$asTaskAction = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncActionWithProgress`1' })[0]
function Await($op, [Type]$t) { $task = $asTask.MakeGenericMethod($t).Invoke($null, @($op)); $task.Wait(-1) | Out-Null; $task.Result }
[Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.Transcoding.MediaTranscoder, Windows.Media.Transcoding, ContentType = WindowsRuntime] | Out-Null
[Windows.Media.MediaProperties.MediaEncodingProfile, Windows.Media.MediaProperties, ContentType = WindowsRuntime] | Out-Null
$inPath = (Resolve-Path $In).Path
$outDir = Split-Path -Parent ([IO.Path]::GetFullPath($Out)); $outName = Split-Path -Leaf $Out
$src = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync($inPath)) ([Windows.Storage.StorageFile])
$folder = Await ([Windows.Storage.StorageFolder]::GetFolderFromPathAsync($outDir)) ([Windows.Storage.StorageFolder])
$dst = Await ($folder.CreateFileAsync($outName, [Windows.Storage.CreationCollisionOption]::ReplaceExisting)) ([Windows.Storage.StorageFile])
$profile = [Windows.Media.MediaProperties.MediaEncodingProfile]::CreateM4a([Windows.Media.MediaProperties.AudioEncodingQuality]::High)
$profile.Audio.Bitrate = [uint32]($Kbps * 1000)
$tc = New-Object Windows.Media.Transcoding.MediaTranscoder
$prep = Await ($tc.PrepareFileTranscodeAsync($src, $dst, $profile)) ([Windows.Media.Transcoding.PrepareTranscodeResult])
if (-not $prep.CanTranscode) { throw "無法轉檔：$($prep.FailureReason)" }
$task = $asTaskAction.MakeGenericMethod([double]).Invoke($null, @($prep.TranscodeAsync())); $task.Wait(-1) | Out-Null
"完成：$Out $((Get-Item $Out).Length) bytes"
