# 🚒 Feuerwehr Prüfungs- & Ausbildungs-Trainer (PWA für Android & iOS)

Diese App wurde als **Progressive Web App (PWA)** entwickelt. Sie lässt sich **ohne Google Play Store und ohne Apple App Store** direkt auf jedem Android-Smartphone und iPhone/iPad auf dem Home-Bildschirm installieren und funktioniert danach auch **100 % offline**.

---

## 🚀 Schnellstart auf deinem PC & im WLAN

1. Doppelklicke auf **`START_APP.bat`** (oder führe im Terminal `npm start` bzw. `node server.js` aus).
2. Die App öffnet sich sofort unter `http://localhost:3000`.
3. Im Terminal-Fenster wird dir außerdem deine **lokale WLAN-Adresse** angezeigt (z. B. `http://192.168.178.xx:3000`), über die du die App sofort auf deinem iPhone oder Android-Handy im selben WLAN öffnen und installieren kannst.
4. Alternativ lässt sich `index.html` auch direkt per Doppelklick im Browser öffnen.

---

## ⚙️ Für dich als Entwickler: Neue Funktionen & Einstellungen

### 1. Eigenes Feuerwehr-Logo im Kopfbereich
- Im Reiter **`⚙️ Entwickler`** (PIN: `1120`) findest du direkt ganz oben den Punkt **„Feuerwehr-Logo anpassen“**.
- Dort kannst du das Wappen oder Logo eurer Feuerwehr per Klick als Bilddatei hochladen. Es wird sofort oben links im Kopfbereich der App angezeigt.

### 2. Fragen mit Bildern (Symbole, Skizzen, Gefahrstofftafeln)
- Wenn du im Entwickler-Bereich eine Frage bearbeitest oder neu erstellst, findest du das Feld **„🖼 Bild zur Frage hinterlegen“**.
- Dort kannst du direkt eine Bilddatei hochladen. Das Bild wird in der Frage über den Antworten gestochen scharf dargestellt.

### 3. Dokumente & Lernmaterial (PDFs, Dienstvorschriften)
- In der App gibt es den Reiter **`📚 Lernmaterial`**.
- Hier stehen für die Kameraden Dienstvorschriften (z. B. FwDV 3, FwDV 10, BayFwG) bereit.
- Als Entwickler kannst du im Entwickler-Bereich oder direkt im Reiter *Lernmaterial* neue PDFs hochladen oder Links zu Merkblättern hinterlegen.

### 4. Immer gemischte Fragen beim Üben
- Im Übungsmodus werden die Fragen jetzt **immer automatisch zufällig gemischt**, genau wie die Antwortslots A, B, C, D. Die überflüssige Checkbox wurde entfernt.

### 5. Fragebögen & Prüfungsbedingungen verwalten

### Möglichkeit 1: Direkt in der App über den Entwickler-Bereich (Empfohlen)
1. Öffne in der unteren Navigationsleiste der App den Reiter **`⚙️ Entwickler`**.
2. Gib die Entwickler-PIN ein: **`1120`**.
3. Hier kannst du:
   - **Prüfungsbedingungen jederzeit pro Fragebogen einstellen:**
     - **Anzahl Prüfungsfragen (Zufall):** z. B. `50` Fragen werden zufällig aus dem Katalog gezogen.
     - **Bestehensgrenze in Prozent:** z. B. `75` % müssen richtig beantwortet sein.
     - **Zeitlimit in Minuten:** z. B. `45` Minuten (oder `0` für unbegrenzte Zeit).
   - **Neue Fragebögen anlegen** (`+ Neuer Fragebogen`).
   - **Fragen per Datei-Upload importieren:**
     - **Excel-Dateien (`.xlsx`)**, **CSV-Tabellen (`.csv`)** oder **JSON-Dateien (`.json`)** direkt hochladen!
     - Über den Button **`📄 CSV-Vorlage`** kannst du dir jederzeit eine Muster-Tabelle für Excel herunterladen.
   - **Einzelne Fragen im visuellen Editor hinzufügen/bearbeiten:**
     - Beliebig viele Antworten (`A`, `B`, `C`, `D`...) anlegen und per grünem Haken **eine oder mehrere richtige Antworten** festlegen.

> **Automatische Speicherung:** Wenn du die App über `START_APP.bat` / `node server.js` gestartet hast, werden alle Änderungen im Entwickler-Bereich automatisch direkt in den Projektdateien `data/frageboegen.json` und `data/defaultCatalogs.js` gespeichert! Zusätzlich kannst du jederzeit auf **`💾 frageboegen.json exportieren`** klicken.

### Möglichkeit 2: Direkt in den JSON-/Code-Dateien (`data/frageboegen.json`)
Alle Fragebögen liegen im klaren JSON-Format in `data/frageboegen.json` (sowie `data/defaultCatalogs.js`):

```json
{
  "id": "mta-zwischenpruefung",
  "title": "MTA Zwischenprüfung – Basismodul",
  "subtitle": "Modulare Truppausbildung – Schriftlicher Teil",
  "category": "Grundausbildung / MTA",
  "icon": "🚒",
  "examConfig": {
    "questionCount": 50,
    "passPercentage": 75,
    "timeLimitMinutes": 45
  },
  "questions": [
    {
      "number": 1,
      "question": "Wer ist nach dem BayFwG für die gemeindlichen Feuerwehren verantwortlich?",
      "explanation": "Pflichtaufgabe der Gemeinden im eigenen Wirkungskreis.",
      "answers": [
        { "text": "Die jeweilige Gemeinde bzw. Stadt", "isCorrect": true },
        { "text": "Der Freistaat Bayern", "isCorrect": false },
        { "text": "Der Kreisfeuerwehrverband", "isCorrect": false },
        { "text": "Der Feuerwehrverein e.V.", "isCorrect": false }
      ]
    }
  ]
}
```

---

## 📲 Bereitstellung für deine Feuerwehr-Kameraden (Android & iOS ohne Store)

Du kannst den gesamten Projektordner kostenlos auf jedem normalen Webspace (z. B. eurer Feuerwehr-Webseite in einem Unterordner `/pruefung/`, GitHub Pages, Netlify oder Vercel) ablegen:
- **Auf dem iPhone (iOS):** Link in Safari öffnen → **Teilen-Symbol 📤** → **„Zum Home-Bildschirm“**.
- **Auf Android:** Link in Chrome öffnen → **„App installieren“** / **„Zum Startbildschirm hinzufügen“**.
