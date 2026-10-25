# setup-d1.ps1 - one-shot: create the fgg D1 database, wire its id into
# wrangler.toml, then deploy. Run from C:\Code\works\fgg
$out = npx wrangler d1 create fgg-db 2>&1 | Out-String
if ($out -match 'database_id\s*=\s*"([0-9a-fA-F-]{36})"') {
    $id = $Matches[1]
    (Get-Content wrangler.toml -Raw) -replace 'PASTE-ID-FROM-wrangler-d1-create-here', $id | Set-Content wrangler.toml
    Write-Host "database_id $id wired into wrangler.toml"
    npx wrangler deploy
} elseif ($out -match 'already exists') {
    Write-Host "fgg-db already exists - find its id with: npx wrangler d1 list"
    Write-Host "then paste it into wrangler.toml and run: npx wrangler deploy"
} else {
    Write-Host "Could not find a database id in the output:"; Write-Host $out
}
