#!/bin/bash
set -e

export PATH="./node_modules/.bin:$PATH"

echo "========================================="
echo "  NickPharma - Iniciando Contenedor Web  "
echo "========================================="

echo "⏳ Esperando a que PostgreSQL esté listo..."
until npx prisma db push --skip-generate; do
  echo "⚠️ PostgreSQL aún no responde. Reintentando en 3 segundos..."
  sleep 3
done

echo "🌱 Base de datos sincronizada. Ejecutando siembra de datos de prueba..."
npx tsx prisma/seed-all.ts || node_modules/.bin/tsx prisma/seed-all.ts

echo "🚀 Servidor NickPharma listo. Iniciando aplicación..."
exec node server.js
