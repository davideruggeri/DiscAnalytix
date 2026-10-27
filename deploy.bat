@echo off
echo 🚀 Inizio processo di Deploy per DiscAnalytix...

echo 📦 Generazione della build ottimizzata per il Web (Expo)...
call npx expo export
if %errorlevel% neq 0 (
    echo ❌ Errore durante la creazione della build. Deploy annullato.
    pause
    exit /b %errorlevel%
)

echo 💉 Iniezione del manifest PWA...
call node scripts/inject-pwa.js
if %errorlevel% neq 0 (
    echo ❌ Errore durante l'iniezione del manifest PWA. Deploy annullato.
    pause
    exit /b %errorlevel%
)

echo 🔥 Caricamento su Firebase Hosting...
call firebase deploy --only hosting,firestore
if %errorlevel% neq 0 (
    echo ❌ Errore durante il deploy su Firebase.
    pause
    exit /b %errorlevel%
)

echo ✅ Deploy completato con successo! La tua PWA e online. 🌍✨
pause
