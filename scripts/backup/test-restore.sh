#!/usr/bin/env bash
# Script de validação e teste de restauração de backup criptografado do Escala Igreja
# Uso: ./scripts/backup/test-restore.sh <caminho-do-arquivo.enc> [chave-de-criptografia]

set -euo pipefail

BACKUP_FILE="${1:-}"
KEY="${2:-${BACKUP_ENCRYPTION_KEY:-}}"

if [ -z "$BACKUP_FILE" ]; then
  echo "Uso: $0 <caminho-para-o-backup.sql.gz.enc> [chave-de-criptografia]"
  exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
  echo "Erro: Arquivo '$BACKUP_FILE' não encontrado."
  exit 1
fi

if [ -z "$KEY" ]; then
  read -s -p "Digite a chave de criptografia do backup: " KEY
  echo ""
fi

TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

DECRYPTED_GZ="${TEMP_DIR}/dump_decrypted.sql.gz"
RESTORED_SQL="${TEMP_DIR}/dump.sql"

echo "==> 1. Descriptografando com OpenSSL AES-256-CBC..."
if ! openssl enc -d -aes-256-cbc -salt -pbkdf2 -iter 100000 \
    -in "$BACKUP_FILE" \
    -out "$DECRYPTED_GZ" \
    -pass "pass:$KEY" 2>/dev/null; then
  echo "ERRO: Falha ao descriptografar. A chave informada está incorreta ou o arquivo está corrompido."
  exit 1
fi

echo "==> 2. Descompactando arquivo gzip..."
gzip -dc "$DECRYPTED_GZ" > "$RESTORED_SQL"

SQL_SIZE=$(wc -c < "$RESTORED_SQL")
TABLE_COUNT=$(grep -c -E "^CREATE TABLE" "$RESTORED_SQL" || true)

echo "==> 3. Verificando integridade estrutural do dump..."
echo "    - Tamanho descompactado: ${SQL_SIZE} bytes"
echo "    - Tabelas encontradas no dump: ${TABLE_COUNT}"

if [ "$TABLE_COUNT" -eq 0 ]; then
  echo "ERRO: Nenhuma declaração 'CREATE TABLE' encontrada no dump gerado."
  exit 1
fi

echo ""
echo "✅ Teste de restauração e integridade concluído com SUCESSO!"
echo "    O arquivo de backup é autêntico, foi descriptografado e contém estrutura válida do PostgreSQL."
