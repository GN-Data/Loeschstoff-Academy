# Projekt-Gedächtnis & Status – LÖSCHSTOFF ACADEMY

## 1. Projekt- & Marken-Infos
- **App-Name**: LÖSCHSTOFF ACADEMY
- **Claim / Slogan**: WISSEN. TRAINIEREN. EINSATZBEREIT.
- **Entwickler**: Nico Galicki
- **Projektverzeichnis**: `C:\Projekte\Löschstoff Academy`
- **GitHub Repository**: `https://github.com/GN-Data/Loeschstoff-Academy.git`
- **GitHub Pages URL**: `https://gn-data.github.io/Loeschstoff-Academy/`

---

## 2. Verbindliche Git- & Branching-Regeln
1. **Basis-Branch für Entwicklung (`dev`)**:
   - Alle neuen Änderungen, Features und Bugfixes starten ausgehend von `dev`.
   - Niemals direkt auf `main` oder `dev` committen.
2. **Feature-Branch**:
   - Für jede Änderung zuerst einen Feature-Branch anlegen (z. B. `git checkout -b feature/<name>`).
3. **Merge in `dev`**:
   - Erst nach Prüfung & Freigabe durch Nico Galicki in `dev` mergen.
4. **Merge in `main` (Produktion / GitHub Pages)**:
   - Nur auf explizite Anweisung von Nico Galicki in `main` mergen und pushen.

---

## 3. Architektur & Authentifizierung
- **100% Serverless & Offline-fähig (PWA)**:
  - Keine Backend-Datenbank erforderlich.
- **Admin- & Entwickler-Zugang (Geheimer 5-Klick-Toggle)**:
  - Durch 5-maliges Klicken auf das Logo oben links werden der Admin- und Entwicklerbereich freigeschaltet.
  - Durch weitere 5 Klicks werden beide Bereiche sofort wieder **komplett ausgeblendet und gesperrt**.
- **Rollen & PINs**:
  - **Admin-PIN**: Standard `1122` (Darf NUR Einladungslinks und Teilnehmer-PINs generieren und verwalten).
  - **Entwickler-PIN**: Standard `1120` (Voller Zugriff auf Fragen-Editor, Datei-Import, Dokumente, Exporte, App-Wappen & Namen).
  - **Teilnehmer-Zugang**: Erfolgt über Einladungslink mit kryptografischem Salt-Hash-Token und 4-stelliger PIN. Nach einmaliger Eingabe speichert das Gerät die Autorisierung lokal ab.
  - **Kein Dienstgrad**: Der Dienstgrad wurde auf Wunsch vollständig aus den Profilen entfernt.

---

## 4. Daten- & Export-Struktur (`data/`)
Für volle Offline- und `file:///`-Kompatibilität existieren identische `.js`- und `.json`-Pendants:
- **Fragen**: `data/frageboegen.js` & `data/frageboegen.json` (Aktuell: 55 Fragen MTA Zwischenprüfung + 15 Fragen Sprechfunk BOS).
- **Dokumente**: `data/dokumente.js` & `data/dokumente.json` (PDFs liegen im Ordner `docs/`).
- **Einstellungen**: `data/einstellungen.js` & `data/einstellungen.json` (Eigenes Wappen & Feuerwehrname).
- **Export-Toolbar im Entwicklermodus**:
  - Separater Export für Fragen, Dokumente und Einstellungen.
  - Hoher Kontrast für Hell- und Dunkelmodus.
  - Info-Button (`ℹ️ Info`) mit Erklärung zu `.js` vs. `.json`.
