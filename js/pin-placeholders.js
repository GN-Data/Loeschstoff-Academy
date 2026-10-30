// Lock Screen & Role Modals and Placeholder overrides
(function() {
  // Passende Platzhalter für Entwickler-PIN und Admin-PIN
  const origDevRender = FeuerwehrApp.prototype.renderDeveloperView;
  if (origDevRender) {
    FeuerwehrApp.prototype.renderDeveloperView = function() {
      let html = origDevRender.call(this);
      if (!this.devUnlocked) {
        // Ersetze Standard-Placeholder durch konkretes Beispiel
        html = html.replace(
          'placeholder="PIN eingeben"',
          'placeholder="z. B. Entwickler-PIN 1120"'
        );
        html = html.replace(
          '<label>Entwickler-PIN eingeben</label>',
          '<label>Entwickler-PIN eingeben (Standard: 1120)</label>'
        );
      }
      return html;
    };
  }

  // Falls Admin-Modal oder Lock-Screen vorhanden ist
  if (FeuerwehrApp.prototype.openAdminModal) {
    const origAdminModal = FeuerwehrApp.prototype.openAdminModal;
    FeuerwehrApp.prototype.openAdminModal = function() {
      origAdminModal.call(this);
      const inEl = document.getElementById('admin-pin-input');
      if (inEl) inEl.placeholder = 'z. B. Admin-PIN 1122';
    };
  }
})();
