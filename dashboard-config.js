# Script de Deploy Automático para IYF Orlando - Dashboard
# Ejecutar: .\deploy.ps1 "Mensaje del commit"

param(
    [Parameter(Mandatory=$true)]
    [string]$CommitMessage
)

Write-Host "🚀 Iniciando proceso de deploy automático para Dashboard..." -ForegroundColor Green

# Verificar si git está disponible
try {
    git --version | Out-Null
    Write-Host "✅ Git detectado" -ForegroundColor Green
} catch {
    Write-Host "❌ Git no está instalado o no está en el PATH" -ForegroundColor Red
    Write-Host "Por favor instala Git desde: https://git-scm.com/downloads" -ForegroundColor Yellow
    exit 1
}

# Verificar si Firebase CLI está disponible
try {
    firebase --version | Out-Null
    Write-Host "✅ Firebase CLI detectado" -ForegroundColor Green
} catch {
    Write-Host "❌ Firebase CLI no está instalado" -ForegroundColor Red
    Write-Host "Instalando Firebase CLI..." -ForegroundColor Yellow
    npm install -g firebase-tools
}

# Build del proyecto
Write-Host "🔨 Construyendo el proyecto..." -ForegroundColor Blue
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error en el build del proyecto" -ForegroundColor Red
    exit 1
}

# Desplegar reglas de Firestore
Write-Host "🔥 Desplegando reglas de Firestore..." -ForegroundColor Blue
firebase deploy --only firestore:rules

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error desplegando reglas de Firestore" -ForegroundColor Red
    exit 1
}

# Agregar todos los archivos
Write-Host "📁 Agregando archivos al staging..." -ForegroundColor Blue
git add .

# Hacer commit
Write-Host "💾 Haciendo commit con mensaje: '$CommitMessage'" -ForegroundColor Blue
git commit -m "$CommitMessage"

# Push a la rama main
Write-Host "⬆️ Haciendo push a la rama main..." -ForegroundColor Blue
git push origin main

Write-Host "✅ Deploy completado!" -ForegroundColor Green
Write-Host "🌐 Tu dashboard se actualizará automáticamente" -ForegroundColor Cyan
Write-Host "🔥 Reglas de Firestore desplegadas" -ForegroundColor Cyan
Write-Host "📱 Ve a tu dashboard para ver los cambios" -ForegroundColor Cyan
