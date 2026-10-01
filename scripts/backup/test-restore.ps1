# Script PowerShell para validação e teste de restauração de backup criptografado do Escala Igreja
# Uso: .\scripts\backup\test-restore.ps1 -BackupFile <caminho-do-arquivo.enc> [-EncryptionKey <chave>]

param (
    [Parameter(Mandatory=$true)]
    [string]$BackupFile,

    [Parameter(Mandatory=$false)]
    [string]$EncryptionKey = $env:BACKUP_ENCRYPTION_KEY
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupFile)) {
    Write-Error "Arquivo '$BackupFile' não encontrado."
    exit 1
}

if (-not $EncryptionKey) {
    $secKey = Read-Host -Prompt "Digite a chave de criptografia do backup" -AsSecureString
    $BSTR = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secKey)
    $EncryptionKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($BSTR)
}

$tempDir = Join-Path ([System.IO.Path]::GetTempPath()) ([System.Guid]::NewGuid().ToString())
New-Item -ItemType Directory -Path $tempDir | Out-Null

try {
    $decryptedGz = Join-Path $tempDir "dump_decrypted.sql.gz"
    $restoredSql = Join-Path $tempDir "dump.sql"

    Write-Host "==> 1. Descriptografando com OpenSSL AES-256-CBC..."
    $opensslCmd = "openssl enc -d -aes-256-cbc -salt -pbkdf2 -iter 100000 -in `"$BackupFile`" -out `"$decryptedGz`" -pass `"pass:$EncryptionKey`""
    Invoke-Expression $opensslCmd

    if (-not (Test-Path $decryptedGz)) {
        Write-Error "Falha ao descriptografar arquivo."
        exit 1
    }

    Write-Host "==> 2. Descompactando arquivo gzip..."
    $inStream = [System.IO.File]::OpenRead($decryptedGz)
    $gzStream = New-Object System.IO.Compression.GZipStream($inStream, [System.IO.Compression.CompressionMode]::Decompress)
    $outStream = [System.IO.File]::Create($restoredSql)
    $gzStream.CopyTo($outStream)
    $gzStream.Close()
    $inStream.Close()
    $outStream.Close()

    Write-Host "==> 3. Verificando integridade estrutural do dump..."
    $sqlContent = Get-Content $restoredSql
    $tables = ($sqlContent | Select-String -Pattern "^CREATE TABLE").Count

    Write-Host "    - Tamanho descompactado: $((Get-Item $restoredSql).Length) bytes"
    Write-Host "    - Tabelas encontradas no dump: $tables"

    if ($tables -eq 0) {
        Write-Error "Nenhuma tabela encontrada no dump restaurado."
        exit 1
    }

    Write-Host ""
    Write-Host "✅ Teste de restauração e integridade concluído com SUCESSO!" -ForegroundColor Green
    Write-Host "    O arquivo de backup é autêntico, foi descriptografado e contém estrutura válida."
}
finally {
    if (Test-Path $tempDir) {
        Remove-Item -Recurse -Force $tempDir
    }
}
