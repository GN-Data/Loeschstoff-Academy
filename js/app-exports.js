/**
 * Erweiterung: Separate Export- und Download-Funktionen für
 * 1) Fragebögen (frageboegen.js / frageboegen.json)
 * 2) Dokumente (dokumente.js / dokumente.json)
 * 3) Einstellungen / Branding (einstellungen.js / einstellungen.json)
 * Inklusive Info-Modal ("ℹ️ Hilfe zu .js vs .json").
 */

if (typeof FeuerwehrApp !== 'undefined') {
  FeuerwehrApp.prototype.downloadDocumentsJson = function() {
    const jsonStr = this.storage.exportDocumentsAsJson();
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dokumente.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  FeuerwehrApp.prototype.downloadConfigJson = function() {
    const jsonStr = this.storage.exportAppConfigAsJson();
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'einstellungen.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  FeuerwehrApp.prototype.downloadDefaultDocumentsJs = function() {
    const docs = this.storage.getDocuments();
    const jsContent = `/**\n * Standard-Dokumente & Dienstvorschriften für LÖSCHSTOFF ACADEMY\n */\n\nwindow.DEFAULT_DOCUMENTS = ${JSON.stringify(docs, null, 2)};\n`;
    const blob = new Blob([jsContent], { type: 'application/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'dokumente.js';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  FeuerwehrApp.prototype.downloadDefaultConfigJs = function() {
    const cfg = this.storage.getAppConfig();
    const jsContent = `/**\n * Standard-App-Konfiguration für LÖSCHSTOFF ACADEMY\n */\n\nwindow.DEFAULT_APP_CONFIG = ${JSON.stringify(cfg, null, 2)};\n`;
    const blob = new Blob([jsContent], { type: 'application/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'einstellungen.js';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  FeuerwehrApp.prototype.downloadDefaultCatalogsJs = function() {
    const cats = this.storage.getCatalogs();
    const jsContent = `/**\n * Standard-Fragebögen für LÖSCHSTOFF ACADEMY\n */\n\nwindow.DEFAULT_CATALOGS = ${JSON.stringify(cats, null, 2)};\n`;
    const blob = new Blob([jsContent], { type: 'application/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'frageboegen.js';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  FeuerwehrApp.prototype.openExportInfoModal = function() {
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="modal-backdrop" onclick="if(event.target===this) app.closeModal()">
        <div class="modal-box" style="max-width:560px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h3 style="margin:0; font-size:1.15rem; display:flex; align-items:center; gap:8px;">
              ℹ️ Warum gibt es .js und .json Exporte?
            </h3>
            <button class="btn btn-outline btn-sm" onclick="app.closeModal()">✕</button>
          </div>

          <div style="background:rgba(22, 163, 74, 0.1); border:1.5px solid #16A34A; border-radius:8px; padding:12px 14px; margin-bottom:14px;">
            <div style="font-weight:800; color:#16A34A; margin-bottom:4px; font-size:0.95rem;">
              🚀 Schnell-Zusammenfassung für GitHub:
            </div>
            <p style="margin:0; font-size:0.86rem; line-height:1.5; color:var(--text-main);">
              Für das Veröffentlichen auf <strong>GitHub Pages</strong> reicht es vollkommen, wenn du einfach die <strong>.js-Dateien</strong> herunterlädst und im Ordner <code>data/</code> ablegst:
            </p>
            <ul style="margin:6px 0 0 0; padding-left:20px; font-size:0.84rem; line-height:1.5; font-family:monospace;">
              <li>data/frageboegen.js</li>
              <li>data/dokumente.js</li>
              <li>data/einstellungen.js</li>
            </ul>
            <p style="margin:6px 0 0 0; font-size:0.82rem; color:var(--text-muted);">
              Die App liest diese direkt ein und alle Benutzer auf GitHub Pages haben sofort denselben Stand wie du!
            </p>
          </div>

          <div style="margin-bottom:14px;">
            <h4 style="margin:0 0 4px 0; font-size:0.92rem; color:var(--text-main);">
              📄 1. Warum die .js-Dateien (.js)?
            </h4>
            <p style="margin:0; font-size:0.84rem; color:var(--text-muted); line-height:1.45;">
              Wird die App lokal auf einem Rechner ohne Server geöffnet (z.B. per Doppelklick als <code>file:///...</code> oder vom USB-Stick), blockieren Browser das Nachladen externer JSON-Dateien aus Sicherheitsgründen (CORS). Eine <code>.js</code>-Datei funktioniert dagegen <strong>immer 100% fehlerfrei und sofort</strong>!
            </p>
          </div>

          <div style="margin-bottom:16px;">
            <h4 style="margin:0 0 4px 0; font-size:0.92rem; color:var(--text-main);">
              💾 2. Wofür sind die .json-Dateien (.json)?
            </h4>
            <p style="margin:0; font-size:0.84rem; color:var(--text-muted); line-height:1.45;">
              JSON ist das weltweite Datenstandardformat. Es dient als Rohdaten-Sicherung und eignet sich ideal, falls du Fragen oder Daten in anderen Programmen, Tabellen oder mit einer KI weiterverarbeiten willst.
            </p>
          </div>

          <button class="btn btn-navy" style="width:100%;" onclick="app.closeModal()">
            Verstanden, schließen
          </button>
        </div>
      </div>
    `;
  };

  // Injiziere den sauberen Top-Bar-Bereich in den Entwickler-Modus (voll kompatibel mit Hell & Dunkel)
  const origDevRender = FeuerwehrApp.prototype.renderDeveloperView;
  if (origDevRender) {
    FeuerwehrApp.prototype.renderDeveloperView = function() {
      let html = origDevRender.call(this);
      if (!this.devUnlocked) return html;

      const oldTopBarRegex = /<!-- TOP BAR ENTWICKLER -->[\s\S]*?<!-- 1\. STARTSEITEN-BANNER/;

      const btnStyleJs = 'background:#1E293B; color:#FFFFFF; border:1px solid #334155; font-weight:700; font-size:0.8rem; padding:6px 10px; border-radius:6px; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,0.15);';
      const btnStyleJson = 'background:#FFFFFF; color:#0F172A; border:1px solid #CBD5E1; font-weight:700; font-size:0.8rem; padding:6px 10px; border-radius:6px; cursor:pointer; box-shadow:0 1px 3px rgba(0,0,0,0.08);';

      const newTopBar = `<!-- TOP BAR ENTWICKLER -->
      <div class="card" style="background:var(--bg-card); color:var(--text-main); border:1.5px solid var(--border-color); padding:16px; box-shadow:var(--shadow-md);">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; margin-bottom:14px;">
          <div>
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
              <span class="badge" style="background:var(--fw-gold); color:#0F172A; font-weight:800;">⚙️ Entwickler-Modus aktiv</span>
            </div>
            <h2 style="margin:0; font-size:1.18rem; color:var(--text-main);">Fragebögen, Dokumente & App-Einstellungen</h2>
          </div>
          <button class="btn btn-sm" style="background:#EF4444; color:#FFFFFF; border:none; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer; padding:6px 14px; border-radius:6px; box-shadow:0 2px 6px rgba(239,68,68,0.3);"
                  onclick="app.devUnlocked=false; app.render();" title="Entwickler-Modus jetzt wieder sperren">
            🔒 Sperren
          </button>
        </div>

        <div style="background:var(--bg-subtle); border:1px solid var(--border-color); border-radius:8px; padding:12px 14px;">
          <div style="font-size:0.75rem; color:var(--text-muted); font-weight:800; margin-bottom:8px; text-transform:uppercase; letter-spacing:0.5px;">
            Exporte für GitHub / Web-Ablage:
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
            <button style="${btnStyleJs}" onclick="app.downloadDefaultCatalogsJs()" title="Empfohlen: In data/frageboegen.js speichern">💾 Fragen (.js)</button>
            <button style="${btnStyleJson}" onclick="app.downloadCatalogsJson()" title="Backup: In data/frageboegen.json speichern">💾 Fragen (.json)</button>
            <button style="${btnStyleJs}" onclick="app.downloadDefaultDocumentsJs()" title="Empfohlen: In data/dokumente.js speichern">📄 Dokumente (.js)</button>
            <button style="${btnStyleJson}" onclick="app.downloadDocumentsJson()" title="Backup: In data/dokumente.json speichern">📄 Dokumente (.json)</button>
            <button style="${btnStyleJs}" onclick="app.downloadDefaultConfigJs()" title="Empfohlen: In data/einstellungen.js speichern">⚙️ Einstellungen (.js)</button>
            <button style="${btnStyleJson}" onclick="app.downloadConfigJson()" title="Backup: In data/einstellungen.json speichern">⚙️ Einstellungen (.json)</button>
            <button class="btn btn-sm" style="background:#0284C7; color:#FFFFFF; font-weight:800; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;" onclick="app.openExportInfoModal()" title="Erklärung: Warum .js vs .json?">ℹ️ Info</button>
          </div>
        </div>
      </div>

      <!-- 1. STARTSEITEN-BANNER`;

      html = html.replace(oldTopBarRegex, newTopBar);
      return html;
    };
  }

  // Admin Top Bar: Sperren-Button kontrastreich
  const origAdminRender = FeuerwehrApp.prototype.renderAdminView;
  if (origAdminRender) {
    FeuerwehrApp.prototype.renderAdminView = function() {
      let html = origAdminRender.call(this);
      if (!this.adminUnlocked && !this.devUnlocked) return html;

      html = html.replace(
        /<button class="btn btn-outline btn-sm"[^>]*onclick="app\.adminUnlocked=false; app\.render\(\);"[^>]*>[\s\S]*?🔒 Sperren[\s\S]*?<\/button>/,
        `<button class="btn btn-sm" style="background:#EF4444; color:#FFFFFF; border:none; font-weight:700; padding:6px 14px; border-radius:6px; cursor:pointer; box-shadow:0 2px 6px rgba(239,68,68,0.3);"
                 onclick="app.adminUnlocked=false; app.render();" title="Admin-Bereich sperren">🔒 Sperren</button>`
      );
      return html;
    };
  }
}
