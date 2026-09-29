# Safety backup of the app's actual data location (AppData\Local).
$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'
$dst = "C:\ProgramData\buffy-ssh\data-backup\micaelawhitis_$stamp"
$src = 'C:\Users\micaelawhitis\AppData\Local\com.school.lunchmenu'
if (Test-Path $src) {
    robocopy $src $dst /E /NFL /NDL /NJH /NJS /NP | Out-Null
    if ($LASTEXITCODE -lt 8) {
        $size = (Get-ChildItem $dst -Recurse -File | Measure-Object Length -Sum).Sum
        Write-Host ("BACKUP OK: {0} ({1:N0} MB)" -f $dst, ($size / 1MB))
    } else {
        Write-Host "BACKUP FAILED (robocopy exit $LASTEXITCODE)"
    }
} else {
    Write-Host "SOURCE MISSING: $src"
}
