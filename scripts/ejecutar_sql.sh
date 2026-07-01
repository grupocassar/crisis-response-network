#!/usr/bin/env bash
# =====================================================================
# ejecutar_sql.sh — Ejecuta un archivo .sql contra Supabase
# Usa la API de Management de Supabase (funciona desde Codespaces)
# Uso: ./scripts/ejecutar_sql.sh ruta/al/archivo.sql
# =====================================================================
set -e

ROOT="$(dirname "$0")/.."
if [ -f "$ROOT/.env" ]; then
  export $(grep -v '^#' "$ROOT/.env" | grep -v '^$' | xargs)
fi

if [ -z "$1" ]; then
  echo "❌ Uso: $0 <archivo.sql>"
  exit 1
fi

if [ ! -f "$1" ]; then
  echo "❌ Archivo no encontrado: $1"
  exit 1
fi

if [ -z "$SUPABASE_ACCESS_TOKEN" ] || [ "$SUPABASE_ACCESS_TOKEN" = "tu_access_token_aqui" ]; then
  echo "❌ Falta SUPABASE_ACCESS_TOKEN en .env"
  exit 1
fi

echo "📄 Ejecutando: $1"
echo "─────────────────────────────────────"

node "$ROOT/scripts/ejecutar_sql.js" "$1"

