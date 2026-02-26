# Installare Canzoniere su iPhone

## Prerequisiti

- **macOS** con [Homebrew](https://brew.sh) installato
- **Node.js** (v18+) e **npm**
- **mkcert** — per generare certificati HTTPS trusted in locale:
  ```bash
  brew install mkcert nss
  mkcert -install
  ```
- iPhone e Mac sulla **stessa rete Wi-Fi**

---

## 1. Deploy (una tantum)

### In locale con HTTPS (mkcert)

Per installare la PWA su iPhone dalla rete locale, il browser Safari richiede HTTPS.
Con **mkcert** puoi generare un certificato locale trusted senza dipendere da servizi esterni.

**Prerequisiti:**

```bash
brew install mkcert nss
mkcert -install   # installa la CA locale nel sistema (una volta sola)
```

**Genera il certificato per la tua macchina:**

```bash
# Sostituisci con l'IP locale della tua macchina (es. 192.168.1.x)
mkcert 192.168.1.x localhost 127.0.0.1
```

Vengono creati due file: `192.168.1.x+2.pem` e `192.168.1.x+2-key.pem`.

**Build e avvio del server HTTPS:**

```bash
npm run build
npx serve dist --ssl-cert 192.168.1.x+2.pem --ssl-key 192.168.1.x+2-key.pem --listen 443
```

**Installa la CA su iPhone** (necessario affinché Safari si fidi del certificato):

1. Copia `~/.local/share/mkcert/rootCA.pem` sull'iPhone (AirDrop o email)
2. Apri il file → iOS chiede di installare il profilo: vai in **Impostazioni → Generali → VPN e gestione dispositivi** e installa
3. Vai in **Impostazioni → Generali → Info → Impostazioni trust certificati** e abilita la CA mkcert

Ora da Safari su iPhone puoi raggiungere `https://192.168.1.x` senza avvisi di sicurezza.

### Con Vercel o Netlify (alternativa cloud)

```bash
npm run build
npx vercel dist --prod
# oppure
npx netlify deploy --prod --dir dist
```

---

## 2. Installazione su iPhone

1. Apri **Safari** (obbligatorio — Chrome e altri browser iOS non supportano "Aggiungi a schermata Home")
2. Vai all'URL dell'app
3. Tocca l'icona **Condividi** (il quadrato con la freccia in su, in basso)
4. Scorri e tocca **"Aggiungi a schermata Home"**
5. Modifica il nome se vuoi, poi tocca **Aggiungi**

L'icona di Canzoniere apparirà nella schermata home. Aprendo da lì, l'app si avvia in modalità standalone (senza barra del browser).

---

## 3. Uso offline

Dopo la prima apertura, il service worker scarica tutti gli asset in cache.
Da quel momento l'app funziona **anche senza connessione** (modalità aereo inclusa).

---

## 4. Aggiornamenti

Quando fai un nuovo deploy, la prossima volta che apri l'app con connessione attiva il service worker si aggiorna automaticamente in background. Al lancio successivo trovi già la versione nuova.
