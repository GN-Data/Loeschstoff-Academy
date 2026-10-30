// Export helpers for Documents and Config
AppStorage.prototype.exportDocumentsAsJson = function() {
  return JSON.stringify(this.documents || [], null, 2);
};

AppStorage.prototype.exportAppConfigAsJson = function() {
  return JSON.stringify(this.appConfig || {}, null, 2);
};
