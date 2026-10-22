$mdbDir = Split-Path -Parent $PSScriptRoot
$dbPath = Join-Path $mdbDir "release\bancoDeDados-do-cliente\BDOficina.mdb"

$connStr = "Provider=Microsoft.ACE.OLEDB.12.0;Data Source=$dbPath;Persist Security Info=False;"
$conn = New-Object System.Data.OleDb.OleDbConnection($connStr)
$conn.Open()

function Query-Scalar($sql) {
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $sql
    return $cmd.ExecuteScalar()
}

function Query-Table($sql) {
    $cmd = $conn.CreateCommand()
    $cmd.CommandText = $sql
    $adapter = New-Object System.Data.OleDb.OleDbDataAdapter($cmd)
    $dt = New-Object System.Data.DataTable
    $adapter.Fill($dt) | Out-Null
    return $dt
}

Write-Host "=== ANÁLISE PROFUNDA DO BANCO DE DADOS ANTIGO ==="

# 1. Proprietários
$propCount = Query-Scalar "SELECT COUNT(*) FROM Proprietario"
$propWithCel = Query-Scalar "SELECT COUNT(*) FROM Proprietario WHERE Celular IS NOT NULL"
$propWithCpf = Query-Scalar "SELECT COUNT(*) FROM Proprietario WHERE CPF IS NOT NULL"
Write-Host "Proprietários: $propCount total"

# 2. Veículos e Vínculo com Proprietário
$veicCount = Query-Scalar "SELECT COUNT(*) FROM Veiculo"
$veicOrphans = Query-Scalar "SELECT COUNT(*) FROM Veiculo WHERE CodProprietario NOT IN (SELECT CodProprietario FROM Proprietario)"
$veicPlacasDistinct = Query-Scalar "SELECT COUNT(*) FROM (SELECT DISTINCT Placa FROM Veiculo WHERE Placa IS NOT NULL)"
Write-Host "Veículos: $veicCount total | Placas distintas: $veicPlacasDistinct | Órfãos de proprietário: $veicOrphans"

# 3. Orçamentos e OS
$orcRowCount = Query-Scalar "SELECT COUNT(*) FROM Orcamento"
$distinctOS = Query-Scalar "SELECT COUNT(*) FROM (SELECT DISTINCT OS FROM Orcamento WHERE OS IS NOT NULL)"
$distinctCodOrc = Query-Scalar "SELECT COUNT(*) FROM (SELECT DISTINCT CodOrcamento FROM Orcamento WHERE CodOrcamento IS NOT NULL)"
Write-Host "Orcamento linhas: $orcRowCount total | OS distintas: $distinctOS | CodOrcamento distintos: $distinctCodOrc"

# Situações
Write-Host "`nDistribuição de Situação em Orcamento:"
$sitOrc = Query-Table "SELECT Situacao, COUNT(*) as Qtd FROM Orcamento GROUP BY Situacao"
$sitOrc | Format-Table -AutoSize | Out-String | Write-Host

# Datas
Write-Host "Amostra de datas em Orcamento:"
$sampleDates = Query-Table "SELECT TOP 5 Data FROM Orcamento ORDER BY Indice DESC"
$sampleDates | Format-Table -AutoSize | Out-String | Write-Host

# Veículos x Orçamentos
$orcOrphansPlaca = Query-Scalar "SELECT COUNT(*) FROM Orcamento WHERE Placa NOT IN (SELECT Placa FROM Veiculo)"
Write-Host "Linhas de Orçamento com Placa que NÃO existe em Veículo: $orcOrphansPlaca"

# 4. Pagamentos
$pagCount = Query-Scalar "SELECT COUNT(*) FROM Pagamentos"
Write-Host "`nPagamentos: $pagCount total"
$sitPag = Query-Table "SELECT Situacao, Forma, COUNT(*) as Qtd, SUM(Valor) as TotalValor FROM Pagamentos GROUP BY Situacao, Forma"
$sitPag | Format-Table -AutoSize | Out-String | Write-Host

$conn.Close()

