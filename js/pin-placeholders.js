<<<<<<< HEAD
// Logo Click: Toggelt Admin- und Entwicklerbereich (5 Klicks = An, weitere 5 Klicks = Aus)
(function() {
  if (typeof FeuerwehrApp === 'undefined') return;

  FeuerwehrApp.prototype.handleLogoSecretClick = function(e) {
    if (e) e.stopPropagation();
    this.logoClickCounter++;
    clearTimeout(this.logoClickTimer);
    this.logoClickTimer = setTimeout(() => {
      this.logoClickCounter = 0;
    }, 2000);

    if (this.logoClickCounter >= 5) {
      this.logoClickCounter = 0;
      if (this.adminVisible || this.devVisible) {
        // Wieder ausblenden und sperren
        this.adminVisible = false;
        this.devVisible = false;
        this.adminUnlocked = false;
        this.devUnlocked = false;
        alert('🔒 Admin- & Entwickler-Bereich wieder ausgeblendet.');
        if (this.currentTab === 'admin' || this.currentTab === 'dev') {
          this.switchTab('home');
        } else {
          this.render();
        }
      } else {
        // Einblenden
        this.adminVisible = true;
        this.devVisible = true;
        alert('🔓 Admin- & Entwickler-Bereich freigeschaltet.');
        this.switchTab('admin');
      }
    }
  };

  // Neutraler, sicherer Platzhalter OHNE Standard-PIN im Text
  const origAdminRender = FeuerwehrApp.prototype.renderAdminView;
  if (origAdminRender) {
    FeuerwehrApp.prototype.renderAdminView = function() {
      let html = origAdminRender.call(this);
      if (!this.adminUnlocked && !this.devUnlocked) {
        html = html.replace(/placeholder="[^"]*"/, 'placeholder="PIN eingeben"');
        html = html.replace(/<label>[^<]*<\/label>/, '<label>Admin-PIN eingeben</label>');
      }
      return html;
    };
  }

=======
// Lock Screen & Role Modals and Placeholder overrides
(function() {
  // Passende Platzhalter für Entwickler-PIN und Admin-PIN
>>>>>>> main
  const origDevRender = FeuerwehrApp.prototype.renderDeveloperView;
  if (origDevRender) {
    FeuerwehrApp.prototype.renderDeveloperView = function() {
      let html = origDevRender.call(this);
      if (!this.devUnlocked) {
<<<<<<< HEAD
        html = html.replace(/placeholder="[^"]*"/, 'placeholder="PIN eingeben"');
        html = html.replace(/<label>[^<]*<\/label>/, '<label>Entwickler-PIN eingeben</label>');
=======
        // Ersetze Standard-Placeholder durch konkretes Beispiel
        html = html.replace(
          'placeholder="PIN eingeben"',
          'placeholder="z. B. Entwickler-PIN 1120"'
        );
        html = html.replace(
          '<label>Entwickler-PIN eingeben</label>',
          '<label>Entwickler-PIN eingeben (Standard: 1120)</label>'
        );
>>>>>>> main
      }
      return html;
    };
  }
<<<<<<< HEAD
=======

  // Falls Admin-Modal oder Lock-Screen vorhanden ist
  if (FeuerwehrApp.prototype.openAdminModal) {
    const origAdminModal = FeuerwehrApp.prototype.openAdminModal;
    FeuerwehrApp.prototype.openAdminModal = function() {
      origAdminModal.call(this);
      const inEl = document.getElementById('admin-pin-input');
      if (inEl) inEl.placeholder = 'z. B. Admin-PIN 1122';
    };
  }
>>>>>>> main
})();
