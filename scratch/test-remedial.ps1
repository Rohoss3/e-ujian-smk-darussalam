$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession

Write-Host "=== 1. Login sebagai Siswa (Ahmad Rizky Pratama) ==="
$loginBody = @{ username = 'siswa_rpl'; password = 'siswa123' } | ConvertTo-Json
$res = Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/login' -Method Post -Body $loginBody -ContentType 'application/json' -WebSession $session
Write-Host "Login status: $($res.success), User: $($res.user.name)"

Write-Host "`n=== 2. Check Dashboard Stats Siswa ==="
$dashRes = Invoke-RestMethod -Uri 'http://localhost:3000/api/dashboard/stats' -Method Get -WebSession $session
Write-Host "Remedial Obligations Count: $($dashRes.stats.userStats.remedialObligations.Count)"
$obligation = $dashRes.stats.userStats.remedialObligations[0]
Write-Host "Pesan Wajib: $($obligation.pesanWajib)"

Write-Host "`n=== 3. Check Hasil Ujian Siswa (MTK) ==="
$hasilRes = Invoke-RestMethod -Uri 'http://localhost:3000/api/hasil?ujianId=ujian-mtk-01' -Method Get -WebSession $session
Write-Host "Ujian: $($hasilRes.ujianJudul)"
Write-Host "Status Kelulusan: $($hasilRes.siswaResult.statusKelulusan)"
Write-Host "Nilai: $($hasilRes.siswaResult.totalNilai) / KKM: $($hasilRes.kkm)"
Write-Host "Pesan Wajib: $($hasilRes.pesanWajib)"

Write-Host "`n=== 4. Check Hasil Ujian Siswa (PWPB - LULUS) ==="
$hasilPwpb = Invoke-RestMethod -Uri 'http://localhost:3000/api/hasil?ujianId=ujian-pwpb-01' -Method Get -WebSession $session
Write-Host "Ujian: $($hasilPwpb.ujianJudul)"
Write-Host "Status Kelulusan: $($hasilPwpb.siswaResult.statusKelulusan)"
Write-Host "Nilai: $($hasilPwpb.siswaResult.totalNilai) / KKM: $($hasilPwpb.kkm)"

Write-Host "`n=== 5. Login sebagai Guru & Buat Ujian Remedial ==="
$guruSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$guruLoginBody = @{ username = 'guru_rpl'; password = 'guru123' } | ConvertTo-Json
$guruRes = Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/login' -Method Post -Body $guruLoginBody -ContentType 'application/json' -WebSession $guruSession
Write-Host "Login Guru: $($guruRes.success), Nama: $($guruRes.user.name)"

$createBody = @{
    judul = "[REMEDIAL] Penilaian Harian: Matematika Terapan Kejuruan"
    bankSoalId = "bank-pwpb-11"
    tokenUjian = "REM2026"
    durasiMenit = 45
    maxPelanggaran = 3
    kkm = 75
    isRemedial = $true
    ujianAsliId = "ujian-mtk-01"
    deskripsi = "Sesi remedial khusus siswa yang belum tuntas MTK"
} | ConvertTo-Json

$createRes = Invoke-RestMethod -Uri 'http://localhost:3000/api/ujian/create' -Method Post -Body $createBody -ContentType 'application/json' -WebSession $guruSession
Write-Host "Create Remedial: $($createRes.success), Pesan: $($createRes.message), UjianId: $($createRes.ujian.id)"
$remedialId = $createRes.ujian.id

Write-Host "`n=== 6. Validasi Proteksi: Siswa Non-Remedial Tidak Bisa Masuk ==="
$dewiSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$dewiLoginBody = @{ username = '0068192842'; password = 'siswa123' } | ConvertTo-Json
$dewiRes = Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/login' -Method Post -Body $dewiLoginBody -ContentType 'application/json' -WebSession $dewiSession
Write-Host "Login Dewi (Siswa Non-Remedial): $($dewiRes.success), Nama: $($dewiRes.user.name)"

try {
    $dewiMulaiBody = @{ ujianId = $remedialId; tokenUjian = "REM2026" } | ConvertTo-Json
    $dewiMulai = Invoke-RestMethod -Uri 'http://localhost:3000/api/ujian/mulai' -Method Post -Body $dewiMulaiBody -ContentType 'application/json' -WebSession $dewiSession
    Write-Host "HARUSNYA DITOLAK TAPI LOLOS: $($dewiMulai | ConvertTo-Json)"
} catch {
    Write-Host "SUKSES DITOLAK (403):" $_.Exception.Message
}

Write-Host "`n=== 7. Siswa Remedial (Ahmad Rizky Pratama) Masuk ke Ujian Remedial ==="
$mulaiBody = @{ ujianId = $remedialId; tokenUjian = "REM2026" } | ConvertTo-Json
$mulaiRes = Invoke-RestMethod -Uri 'http://localhost:3000/api/ujian/mulai' -Method Post -Body $mulaiBody -ContentType 'application/json' -WebSession $session
Write-Host "Mulai Remedial status: $($mulaiRes.success), PesertaId: $($mulaiRes.pesertaId)"

Write-Host "`n=== 8. Siswa Selesaikan Ujian Remedial & Cek Nilai Remedial ==="
$selesaiBody = @{ pesertaId = $mulaiRes.pesertaId } | ConvertTo-Json
$selesaiRes = Invoke-RestMethod -Uri 'http://localhost:3000/api/ujian/selesai' -Method Post -Body $selesaiBody -ContentType 'application/json' -WebSession $session
Write-Host "Selesai status: $($selesaiRes.success), TotalNilai: $($selesaiRes.peserta.totalNilai), NilaiRemedial: $($selesaiRes.peserta.nilaiRemedial)"
