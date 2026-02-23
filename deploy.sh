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

# 2. Preparar Terraform
echo -e "${BLUE}☁️ Paso 2: Aplicando infraestructura con Terraform...${NC}"
cd "$ROOT_DIR/terraform"

# Ejecutamos terraform apply
# Nota: Si el usuario prefiere revisar, puede quitar el -auto-approve
terraform apply -auto-approve

echo -e "${GREEN}✅ ¡Despliegue completado con éxito!${NC}"
echo -e "${BLUE}Logs sugeridos: check CloudWatch for /aws/lambda/finance-agent-stream-processor${NC}"
