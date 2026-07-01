#!/usr/bin/env bash
# =====================================================================
# ejecutar_sql.sh — Ejecuta un archivo .sql contra Supabase
# Uso: ./scripts/ejecutar_sql.sh ruta/al/archivo.sql
# =====================================================================
set -e

# Cargar variables de entorno
if [ -f "$(dirname "$0")/../.env" ]; then
  export $(grep -v '^#' "$(dirname "$0")/../.env" | grep -v '^$' | xargs)
fi

if [ -z "$1" ]; then
  echo "❌ Uso: $0 <archivo.sql>"
  exit 1
fi

if [ ! -f "$1" ]; then
  echo "❌ Archivo no encontrado: $1"
  exit 1
fi

if [ -z "$DB_PASSWORD" ] || [ "$DB_PASSWORD" = "tu_db_password_aqui" ]; then
  echo "❌ Falta DB_PASSWORD en .env"
  echo "   Abre Supabase Dashboard > Project Settings > Database > Connection string"
  exit 1
fi

echo "🔌 Conectando a $SUPABASE_URL..."
echo "📄 Ejecutando: $1"
echo "─────────────────────────────────────"

PGPASSWORD="$DB_PASSWORD" psql \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -f "$1"

echo "─────────────────────────────────────"
echo "✅ SQL ejecutado correctamente."
