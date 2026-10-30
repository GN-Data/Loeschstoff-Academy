# Agent-Richtlinien – LÖSCHSTOFF ACADEMY

## Projekt- & Marken-Infos
- **App-Name**: LÖSCHSTOFF ACADEMY
- **Claim / Slogan**: WISSEN. TRAINIEREN. EINSATZBEREIT.
- **Entwickler**: Nico Galicki
- **Projektverzeichnis**: `C:\Projekte\Löschstoff Academy`
- **GitHub-Repository**: https://github.com/GN-Data/Loeschstoff-Academy

## Git- & Branching-Workflow (Verbindliche Regel)
1. **Basis-Branch für Entwicklung (`dev`)**:
   - Alle neuen Änderungen, Features, Bugfixes oder Ideen starten **immer** ausgehend vom aktuellen Stand des `dev`-Branches.
   - Es wird **niemals** direkt auf `main` oder `dev` entwickelt.

2. **Neuer Feature-/Änderungs-Branch**:
   - Für jede Änderung oder neue Idee muss zuerst ein eigener Branch aus `dev` erstellt werden (z. B. `git checkout dev && git checkout -b feature/<name>` oder `fix/<name>`).

3. **Freigabe & Merge in `dev`**:
   - Erst nach ausdrücklicher Prüfung und **Freigabe durch den Nutzer (Nico Galicki)** darf der Feature-/Änderungs-Branch in den `dev`-Branch gemerged werden (`git checkout dev && git merge <branch>`).

4. **Freigabe & Merge in `main` (Produktion / Release)**:
   - Ein Merge von `dev` in den `main`-Branch erfolgt **ausschließlich dann**, wenn der Nutzer dies explizit anweist.
