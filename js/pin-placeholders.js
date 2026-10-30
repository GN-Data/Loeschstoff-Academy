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

  const origDevRender = FeuerwehrApp.prototype.renderDeveloperView;
  if (origDevRender) {
    FeuerwehrApp.prototype.renderDeveloperView = function() {
      let html = origDevRender.call(this);
      if (!this.devUnlocked) {
        html = html.replace(/placeholder="[^"]*"/, 'placeholder="PIN eingeben"');
        html = html.replace(/<label>[^<]*<\/label>/, '<label>Entwickler-PIN eingeben</label>');
      }
      return html;
    };
  }
})();
