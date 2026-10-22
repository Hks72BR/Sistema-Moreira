$rootDir = Split-Path -Parent $PSScriptRoot
$dbPath = Join-Path $rootDir "release\bancoDeDados-do-cliente\BDOficina.mdb"
$outDir = Join-Path $rootDir "migration\legacy-json"

if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

$connStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$dbPath;Persist Security Info=False;"
$conn = New-Object System.Data.OleDb.OleDbConnection($connStr)
$conn.Open()

Write-Host "Conexao aberta com BDOficina.mdb"

$tables = @(
    "Proprietario",
    "Veiculo",
    "Orcamento",
    "Servicos",
    "Pecas",
    "Marcas",
    "Formas_Pgto",
    "Pagamentos",
    "Ocorrencias"
)

foreach ($t in $tables) {
    try {
        $cmd = $conn.CreateCommand()
        $cmd.CommandText = "SELECT * FROM [$t]"
        $adapter = New-Object System.Data.OleDb.OleDbDataAdapter($cmd)
        $dt = New-Object System.Data.DataTable
        $adapter.Fill($dt) | Out-Null

        $rows = @()
        foreach ($row in $dt.Rows) {
            $ht = [ordered]@{}
            foreach ($col in $dt.Columns) {
                $val = $row[$col.ColumnName]
                if ($val -eq [DBNull]::Value) {
                    $ht[$col.ColumnName] = $null
                } elseif ($val -is [DateTime]) {
                    $ht[$col.ColumnName] = $val.ToString("yyyy-MM-ddTHH:mm:ss")
                } else {
                    $ht[$col.ColumnName] = $val
                }
            }
            $rows += $ht
        }

        $outFile = Join-Path $outDir "$t.json"
        $json = $rows | ConvertTo-Json -Depth 5
        [System.IO.File]::WriteAllText($outFile, $json, [System.Text.Encoding]::UTF8)

        Write-Host "Exportada tabela $t : $($rows.Count) registros -> $outFile"
    } catch {
        Write-Host "Erro ao exportar $t : $($_.Exception.Message)"
    }
}

$conn.Close()
Write-Host "Exportacao concluida com sucesso!"

