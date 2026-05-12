# ==========================================
# ANDROID STUDIO + SDK + AVD SETUP
# Execute como Administrador
# ==========================================

$ErrorActionPreference = "Stop"
$WarningPreference = "SilentlyContinue"

Write-Host "======================================" -ForegroundColor Cyan
Write-Host "SETUP Android Dev Environment" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# =========== 1. INSTALAR ANDROID STUDIO ===========
Write-Host "`n[1/5] Instalando Android Studio..." -ForegroundColor Yellow

$ASUrl = "https://redirector.gstatic.com/edgedl/android/studio/install/2024.3.1.4/android-studio-2024.3.1.4-windows.exe"
$ASPath = "$env:TEMP\android-studio-installer.exe"

if (!(Test-Path $ASPath)) {
    Write-Host "  → Baixando Android Studio..." -ForegroundColor Gray
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
    Invoke-WebRequest -Uri $ASUrl -OutFile $ASPath -ErrorAction SilentlyContinue
}

if (Test-Path $ASPath) {
    Write-Host "  → Executando instalador..." -ForegroundColor Gray
    & $ASPath | Out-Null
    Write-Host "  ✓ Android Studio instalador aberto (clique Next > Finish)" -ForegroundColor Green
    Write-Host "  ⏳ Aguarde conclusão e PRESSIONE ENTER quando terminar..."
    Read-Host
} else {
    Write-Host "  ⚠ Download falhou. Baixe em: https://developer.android.com/studio" -ForegroundColor Red
}

# =========== 2. DEFINIR VARIÁVEIS DE AMBIENTE ===========
Write-Host "`n[2/5] Configurando Variáveis de Ambiente..." -ForegroundColor Yellow

$AndroidHome = "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"
$AndroidStudioPath = "C:\Program Files\Android\Android Studio\bin"

# Criar SDK folder se não existir
if (!(Test-Path $AndroidHome)) {
    New-Item -ItemType Directory -Path $AndroidHome -Force | Out-Null
    Write-Host "  → Criada pasta SDK em: $AndroidHome" -ForegroundColor Gray
}

# Set Environment Variables
[Environment]::SetEnvironmentVariable("ANDROID_HOME", $AndroidHome, "User")
[Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $AndroidHome, "User")
$pathValue = [Environment]::GetEnvironmentVariable("Path", "User")
if ($pathValue -notlike "*$AndroidHome*") {
    $newPath = "$pathValue;$AndroidHome\platform-tools;$AndroidHome\tools;$AndroidHome\tools\bin;$AndroidHome\emulator"
    [Environment]::SetEnvironmentVariable("Path", $newPath, "User")
}

Write-Host "  ✓ ANDROID_HOME = $AndroidHome" -ForegroundColor Green
Write-Host "  ✓ PATH atualizado com ferramentas" -ForegroundColor Green

# =========== 3. DOWNLOAD COMPONENTES SDK ===========
Write-Host "`n[3/5] Baixando Android SDK Components..." -ForegroundColor Yellow

# Precisa do Android Studio aberto pelo menos uma vez
Write-Host "  → Aguardando SDKmanager..." -ForegroundColor Gray
$sdkmanager = "$AndroidHome\cmdline-tools\latest\bin\sdkmanager.bat"

if (!(Test-Path $sdkmanager)) {
    Write-Host "  ⚠ Abra Android Studio e conclua o First Run antes de continuar" -ForegroundColor Yellow
    Write-Host "  ⏳ PRESSIONE ENTER quando terminar..."
    Read-Host
}

if (Test-Path $sdkmanager) {
    Write-Host "  → Instalando componentes..." -ForegroundColor Gray
    & $sdkmanager "platform-tools" "platforms;android-35" "build-tools;35.0.0" "emulator" "patcher;v4" --sdk_root=$AndroidHome 2>$null
    Write-Host "  ✓ SDK components instalados" -ForegroundColor Green
} else {
    Write-Host "  ⚠ SDKmanager não encontrado. Configure manualmente no Android Studio." -ForegroundColor Red
}

# =========== 4. CRIAR AVD OTIMIZADO ===========
Write-Host "`n[4/5] Criando Android Virtual Device..." -ForegroundColor Yellow

$avdManager = "$AndroidHome\cmdline-tools\latest\bin\avdmanager.bat"
$avdName = "MobileDevAVD"

if (Test-Path $avdManager) {
    # Deletar AVD anterior se existir
    & $avdManager delete avd -n $avdName 2>$null
    
    Write-Host "  → Criando AVD otimizado ($avdName)..." -ForegroundColor Gray
    
    # Criar AVD com otimizações
    $avdConfig = @"
hw.device.name=pixel_6
hw.dpi=420
hw.gps=yes
hw.initial.orientation=portrait
hw.initialOrientation=portrait
hw.keyboard=yes
hw.mainKeys=no
hw.ramMB=2048
hw.sdCard=yes
hw.sensors.proximity=yes
hw.trackBall=no
image.sysdir.1=system-images/android-35/google_apis_playstore/x86_64
skin.dynamic=yes
showDeviceFrame=yes
hw.lcd.density=420
hw.opengl=auto
vm.heapSize=512
hw.gpu.enabled=yes
hw.gpu.mode=auto
hw.cpu.ncore=4
hw.device.manufacturer=Google
hw.device.model=Pixel 6
hw.screen.height=2400
hw.screen.width=1080
"@
    
    & $avdManager create avd -n $avdName -k "system-images;android-35;google_apis_playstore;x86_64" -d "pixel_6" 2>$null
    
    # Aplicar configurações
    $avdDir = "$env:USERPROFILE\.android\avd\$avdName.avd"
    if (Test-Path $avdDir) {
        $configFile = "$avdDir\config.ini"
        $avdConfig | Out-File $configFile -Encoding utf8
        Write-Host "  ✓ AVD '$avdName' criado com otimizações" -ForegroundColor Green
    }
} else {
    Write-Host "  ⚠ avdmanager não encontrado" -ForegroundColor Red
}

# =========== 5. INSTALAR NODE + EXPO (se não houver) ===========
Write-Host "`n[5/5] Configurando Node.js e Expo..." -ForegroundColor Yellow

$nodeCheck = node --version 2>$null
if ($nodeCheck) {
    Write-Host "  ✓ Node.js já instalado: $nodeCheck" -ForegroundColor Green
} else {
    Write-Host "  → Node.js não encontrado" -ForegroundColor Yellow
    Write-Host "    Baixe em: https://nodejs.org (LTS)" -ForegroundColor Gray
}

$expoCheck = npx expo --version 2>$null
if ($expoCheck) {
    Write-Host "  ✓ Expo CLI instalado: $expoCheck" -ForegroundColor Green
} else {
    Write-Host "  → Instalando Expo CLI..." -ForegroundColor Gray
    npm install -g expo-cli 2>$null
    Write-Host "  ✓ Expo CLI instalado" -ForegroundColor Green
}

# =========== RESUMO FINAL ===========
Write-Host "`n======================================" -ForegroundColor Green
Write-Host "✓ SETUP CONCLUÍDO!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green

Write-Host "`nPróximos Passos:" -ForegroundColor Cyan
Write-Host "1. FECHE e REABRA PowerShell/CMD para carregar variáveis" -ForegroundColor Gray
Write-Host "2. Teste os comandos:" -ForegroundColor Gray
Write-Host "   adb devices" -ForegroundColor White
Write-Host "   emulator -list-avds" -ForegroundColor White
Write-Host "3. Inicie o AVD:" -ForegroundColor Gray
Write-Host "   emulator -avd MobileDevAVD -no-snapshot -no-boot-anim -gpu on &" -ForegroundColor White
Write-Host "4. Em outro terminal, inicie seu app:" -ForegroundColor Gray
Write-Host "   npx expo start -c" -ForegroundColor White
Write-Host "   (Pressione 'a' para abrir no Android)" -ForegroundColor White

Write-Host "`nVariáveis configuradas:" -ForegroundColor Cyan
Write-Host "  ANDROID_HOME = $AndroidHome" -ForegroundColor Gray
Write-Host "  PATH += platform-tools, emulator, tools" -ForegroundColor Gray

Write-Host "`nPROTIP: Crie atalhos de comando nos próximos passos" -ForegroundColor Yellow
Write-Host "======================================`n" -ForegroundColor Green
