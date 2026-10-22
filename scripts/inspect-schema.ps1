$mdbDir = Split-Path -Parent $PSScriptRoot
$dbPath = Join-Path $mdbDir "release\bancoDeDados-do-cliente\BDOficina.mdb"

$connStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$dbPath;Persist Security Info=False;"
$conn = New-Object System.Data.OleDb.OleDbConnection($connStr)
$conn.Open()

$tables = @("Proprietario", "Veiculo", "Orcamento", "Servicos", "Pecas", "Marcas", "Funcionario", "Formas_Pgto", "Pagamentos", "Ocorrencias")

foreach ($t in $tables) {
    try {
        $cmdCount = $conn.CreateCommand()
        $cmdCount.CommandText = "SELECT COUNT(*) FROM [$t]"
        $count = $cmdCount.ExecuteScalar()

        Write-Host "=========================================="
        Write-Host "TABELA: $t (Total registros: $count)"
        Write-Host "=========================================="

        $cmdCols = $conn.CreateCommand()
        $cmdCols.CommandText = "SELECT TOP 1 * FROM [$t]"
        $reader = $cmdCols.ExecuteReader()
        $schema = $reader.GetSchemaTable()
        $cols = $schema | Select-Object -ExpandProperty ColumnName
        Write-Host "Colunas: $($cols -join ', ')"
        $reader.Close()
        
        if ($count -gt 0) {
            $cmdSample = $conn.CreateCommand()
            $cmdSample.CommandText = "SELECT TOP 2 * FROM [$t]"
            $adapter = New-Object System.Data.OleDb.OleDbDataAdapter($cmdSample)
            $dt = New-Object System.Data.DataTable
            $adapter.Fill($dt) | Out-Null
            $dt | Format-List | Out-String | Write-Host
        }
    } catch {
        Write-Host "Erro na tabela $t : $($_.Exception.Message)"
    }
}

$conn.Close()

