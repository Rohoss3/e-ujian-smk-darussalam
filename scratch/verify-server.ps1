$body = @{ username = 'admin'; password = 'admin123' } | ConvertTo-Json
$res = Invoke-RestMethod -Uri 'http://localhost:3000/api/auth/login' -Method Post -Body $body -ContentType 'application/json'
Write-Host "Server Local Berjalan Sempurna:"
Write-Host "Success: $($res.success)"
Write-Host "User: $($res.user.name)"
Write-Host "Role: $($res.user.role)"
