#!/bin/bash
set -e

echo "========================================="
echo "  NickPharma - Iniciando Contenedor Web  "
echo "========================================="

echo "⏳ Esperando a que PostgreSQL esté listo..."
until npx prisma db push --skip-generate; do
  echo "⚠️ PostgreSQL aún no responde. Reintentando en 3 segundos..."
  sleep 3
done

echo "🌱 Base de datos sincronizada. Ejecutando siembra de datos de prueba..."
npx prisma db seed

echo "🚀 Servidor NickPharma listo. Iniciando aplicación..."
exec node server.js
