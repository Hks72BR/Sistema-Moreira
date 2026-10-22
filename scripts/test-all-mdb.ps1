$mdbDir = Split-Path -Parent $PSScriptRoot
$releaseDir = Join-Path $mdbDir "release\bancoDeDados-do-cliente"

$files = Get-ChildItem -Path $releaseDir -Filter "*.mdb"

foreach ($f in $files) {
    Write-Host "`nTestando arquivo: $($f.Name)"
    try {
        $connStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$($f.FullName);Persist Security Info=False;"
        $conn = New-Object System.Data.OleDb.OleDbConnection($connStr)
        $conn.Open()
        Write-Host ">>> SUCESSO SEM SENHA: $($f.Name)!"
        $tables = $conn.GetSchema("Tables")
        $userTables = $tables | Where-Object { $_.TABLE_TYPE -eq 'TABLE' } | Select-Object -ExpandProperty TABLE_NAME
        Write-Host "Tabelas: $($userTables -join ', ')"
        $conn.Close()
    } catch {
        Write-Host "Erro sem senha: $($_.Exception.Message)"
    }
}

