$fso = New-Object -ComObject Scripting.FileSystemObject
$file = $fso.GetFile("C:\Users\higor\Desktop\Moreira direções APP\release\bancoDeDados-do-cliente\BDOficina.mdb")
$shortPath = $file.ShortPath
Write-Host "Short Path: $shortPath"

# Tentar ODBC com short path
try {
    $connStr = "Driver={Microsoft Access Driver (*.mdb, *.accdb)};Dbq=$shortPath;"
    $conn = New-Object System.Data.Odbc.OdbcConnection($connStr)
    $conn.Open()
    Write-Host "ODBC Conectado com sucesso!"
    $tables = $conn.GetSchema("Tables")
    $userTables = $tables | Where-Object { $_.TABLE_TYPE -eq 'TABLE' } | Select-Object TABLE_NAME
    Write-Host "Tabelas encontradas ($($userTables.Count)):"
    $userTables | Format-Table -AutoSize | Out-String | Write-Host
    $conn.Close()
    exit 0
} catch {
    Write-Host "ODBC Erro: $($_.Exception.Message)"
}

# Tentar OleDb
try {
    $oleConnStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$shortPath;Persist Security Info=False;"
    $oleConn = New-Object System.Data.OleDb.OleDbConnection($oleConnStr)
    $oleConn.Open()
    Write-Host "OleDb Conectado com sucesso!"
    $tables = $oleConn.GetSchema("Tables")
    $userTables = $tables | Where-Object { $_.TABLE_TYPE -eq 'TABLE' } | Select-Object TABLE_NAME
    Write-Host "Tabelas encontradas ($($userTables.Count)):"
    $userTables | Format-Table -AutoSize | Out-String | Write-Host
    $oleConn.Close()
} catch {
    Write-Host "OleDb Erro: $($_.Exception.Message)"
}

