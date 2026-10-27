# DiscAnalytix 🥏🎬

Web app per l'**analisi video delle partite di Ultimate Frisbee**. Si guarda il video di una partita da YouTube e si registrano le azioni punto per punto: lanci, prese, turnover, mete, break. L'app ricava in automatico la timeline della partita e le statistiche di squadra e di ogni giocatore.

**Demo:** [discanalytix.web.app](https://discanalytix.web.app). Si può entrare come ospite in sola lettura.

Sviluppata con **React Native + Expo (web)** e **Firebase**, pubblicata come **PWA** su Firebase Hosting.


<p align="center">
    <img width="700"  alt="Home" src="https://github.com/user-attachments/assets/7ed42ef6-30bb-40ac-8030-c7ec5e386bc1" />
    <img width="700"  alt="Interazione" src="https://github.com/user-attachments/assets/2b070998-1085-40eb-bce9-3ae288555d25" />
    <img width="700"  alt="Timeline" src="https://github.com/user-attachments/assets/ecfe7123-c051-4c61-a4a1-24aaf9fadbd4" />
</p>

## Funzionalità

**Analisi di una partita**
- Video di **YouTube** integrato. I video si importano direttamente dal proprio canale grazie all'accesso con Google e alle YouTube Data API.
- **Tagging delle azioni** a ogni meta: si sceglie il giocatore e l'azione (lancio completato, presa, drop, errore, intercetto, handblock…) e l'app ricostruisce la sequenza di passaggi.
- **Scorciatoie da tastiera** configurabili, anche sul tastierino numerico, per registrare le azioni senza staccare gli occhi dal video.
- **Timeline degli eventi** collegata al video: cliccando l'inizio o la fine di una meta il video salta a quel momento. Gli eventi si possono modificare o cancellare.
- **Player in una finestra separata**, sincronizzato con la schermata di analisi. È comodo con due monitor.
- **Tipi di evento personalizzabili**: si possono definire le azioni da tracciare e le relative scorciatoie.

**Statistiche**
- Punteggio, **hold e break**, conversione dei break e attacchi puliti per ogni partita.
- **Analisi avanzata** con filtri per partita, squadra e giocatore, efficienza e sequenze di azioni.
- **Export in CSV** dei dati filtrati.

**Utenti e ruoli**
- Accesso con Google, con email o come ospite.
- Quattro ruoli: *viewer* (ospite, sola lettura), *player*, *editor* (analizza le partite) e *modder* (gestisce gli utenti).
- I permessi sono applicati anche lato server con le **regole di sicurezza Firestore** (`firestore.rules`).

## Stack tecnico

| Area | Tecnologie |
|---|---|
| App | React Native, Expo, React Navigation (export web) |
| Video | YouTube IFrame Player, YouTube Data API v3 |
| Backend | Firebase Authentication (Google, email, anonimo), Cloud Firestore |
| Deploy | Expo web export → PWA su Firebase Hosting |

## Struttura del progetto

```
src/
├── screens/       Schermate: home, analisi, statistiche avanzate, squadre, tipi di evento, admin
├── components/    Player video, mappa della tastiera, componenti della schermata di analisi
├── hooks/         Ruolo dell'utente, sincronizzazione con il player esterno
├── navigation/    Navigazione tra le schermate
└── utils/         Rinnovo del token YouTube
firestore.rules    Regole di sicurezza del database
```

## Avvio in locale

```bash
npm install
# inserisci la configurazione del tuo progetto Firebase in firebaseConfig.js
npx expo start --web
```

Pubblicazione su Firebase Hosting (build web, manifest PWA, regole Firestore): `deploy.bat`

## Autore

**Davide Ruggeri**, studente di Ingegneria Informatica all'Università degli Studi di Brescia.
