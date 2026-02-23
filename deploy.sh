#!/bin/bash
set -e

# Colores para la salida
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Iniciando despliegue del Finance Agent AI...${NC}"

# Carpeta raíz
ROOT_DIR=$(pwd)

# 1. Compilar Backend
echo -e "${BLUE}📦 Paso 1: Compilando Backend...${NC}"
cd "$ROOT_DIR/backend"
npm install
npm run build

# 2. Preparar el ZIP para Lambda
echo -e "${BLUE}🤐 Paso 2: Preparando paquete ZIP...${NC}"
PAYLOAD_DIR="$ROOT_DIR/terraform/.lambda_payload"
rm -rf "$PAYLOAD_DIR"
mkdir -p "$PAYLOAD_DIR/dist"
mkdir -p "$PAYLOAD_DIR/node_modules"

# Sincronizar archivos
rsync -av dist/ "$PAYLOAD_DIR/dist/"
rsync -av node_modules/ "$PAYLOAD_DIR/node_modules/"
cp package.json "$PAYLOAD_DIR/"

# Crear el ZIP
cd "$ROOT_DIR/terraform"
rm -f lambda_function.zip
cd .lambda_payload
zip -r ../lambda_function.zip . > /dev/null
cd ..
rm -rf .lambda_payload

# 3. Aplicar Terraform
echo -e "${BLUE}☁️ Paso 3: Aplicando infraestructura con Terraform...${NC}"
terraform apply -auto-approve

echo -e "${GREEN}✅ ¡Despliegue completado con éxito!${NC}"
echo -e "${BLUE}Logs sugeridos: check CloudWatch for /aws/lambda/finance-agent-stream-processor${NC}"
