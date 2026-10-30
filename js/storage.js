/**
 * Storage & Data Layer – LÖSCHSTOFF ACADEMY
 * Verwaltet Profile, individuellen Lernfortschritt, Prüfungsstatistiken,
 * Einladungslinks & Zugangsberechtigungen, Admin- & Dev-Rollen,
 * Fragebögen sowie JSON-, CSV- und Excel-(.xlsx)-Import/Export.
 */

const STORAGE_KEYS = {
  PROFILES: 'fw_trainer_profiles_v1',
  ACTIVE_PROFILE: 'fw_trainer_active_profile_v1',
  CUSTOM_CATALOGS: 'fw_trainer_catalogs_v1',
  DEV_PIN: 'fw_trainer_dev_pin_v1',
  ADMIN_PIN: 'fw_trainer_admin_pin_v1',
  INVITES: 'fw_trainer_invites_v1',
  AUTH_TOKEN: 'fw_trainer_auth_v1',
  APP_CONFIG: 'fw_trainer_app_config_v1',
  DOCUMENTS: 'fw_trainer_documents_v1'
};

const AVATAR_COLORS = [
  '#D32F2F', '#1976D2', '#388E3C', '#F57C00', '#7B1FA2', '#00796B', '#C2185B', '#455A64'
];

class AppStorage {
  constructor() {
    this.catalogs = [];
    this.profiles = [];
    this.activeProfileId = null;
    this.appConfig = { logo: 'assets/app-logo.jpg', feuerwehrName: 'Freiwillige Feuerwehr', subtitle: '', theme: 'auto' };
    this.documents = [];
    this.invites = [];
    this.init();
  }

  init() {
    // Load config
    try {
      const savedConfig = localStorage.getItem(STORAGE_KEYS.APP_CONFIG);
      if (savedConfig) {
        this.appConfig = Object.assign(this.appConfig, JSON.parse(savedConfig));
        // Auto-Migration: If previously stored default was the old generic icon.svg, update to new branding
        if (!this.appConfig.logo || this.appConfig.logo === 'assets/icon.svg') {
          this.appConfig.logo = 'assets/app-logo.jpg';
          localStorage.setItem(STORAGE_KEYS.APP_CONFIG, JSON.stringify(this.appConfig));
        }
      }
    } catch (_) {}

    // Load documents
    try {
      const savedDocs = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      if (savedDocs) {
        this.documents = JSON.parse(savedDocs);
      }
    } catch (_) {}

    if (!Array.isArray(this.documents) || this.documents.length === 0) {
      this.documents = [
        {
          id: 'doc_fwdv3',
          title: 'FwDV 3 – Einheiten im Lösch- und Hilfeleistungseinsatz',
          category: 'Dienstvorschrift',
          date: '2026-10-30',
          size: '1.2 MB',
          description: 'Grundlegende Feuerwehr-Dienstvorschrift für den Löscheinsatz und die Technische Hilfeleistung.',
          url: 'https://www.feuerwehrschulen.bayern.de'
        },
        {
          id: 'doc_fwdv10',
          title: 'FwDV 10 – Die tragbaren Leitern',
          category: 'Dienstvorschrift',
          date: '2026-10-30',
          size: '850 KB',
          description: 'Handhabung und Sicherheitsvorschriften für Steckleiter, Schiebleiter und Klappleiter.',
          url: 'https://www.feuerwehrschulen.bayern.de'
        },
        {
          id: 'doc_bayfwg',
          title: 'Bayerisches Feuerwehrgesetz (BayFwG)',
          category: 'Gesetzestext',
          date: '2026-10-30',
          size: '620 KB',
          description: 'Rechtliche Grundlagen über Organisation, Rechte und Pflichten der Feuerwehren in Bayern.',
          url: 'https://www.gesetze-bayern.de'
        }
      ];
    }

    // Load invites
    this.invites = this.getInvites();

    // Load profiles
    try {
      const savedProfiles = localStorage.getItem(STORAGE_KEYS.PROFILES);
      this.profiles = savedProfiles ? JSON.parse(savedProfiles) : [];
    } catch (e) {
      this.profiles = [];
    }

    const savedActive = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROFILE);
    if (savedActive && this.profiles.some(p => p.id === savedActive)) {
      this.activeProfileId = savedActive;
    } else if (this.profiles.length > 0) {
      this.activeProfileId = this.profiles[0].id;
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE, this.activeProfileId);
    }

    // Load catalogs (merge default + developer customizations)
    this.loadCatalogs();
  }

  loadCatalogs() {
    const defaults = Array.isArray(window.DEFAULT_CATALOGS)
      ? JSON.parse(JSON.stringify(window.DEFAULT_CATALOGS))
      : [];

    try {
      const customRaw = localStorage.getItem(STORAGE_KEYS.CUSTOM_CATALOGS);
      if (customRaw) {
        const customList = JSON.parse(customRaw);
        if (Array.isArray(customList) && customList.length > 0) {
          this.catalogs = customList;
          return;
        }
      }
    } catch (e) {
      console.warn('Fehler beim Laden benutzerdefinierter Fragebögen:', e);
    }

    this.catalogs = defaults;
  }

  async syncExternalJsonIfAvailable() {
    // Falls noch keine lokalen Entwickler-Änderungen vorliegen, versuche data/frageboegen.json zu laden
    if (localStorage.getItem(STORAGE_KEYS.CUSTOM_CATALOGS)) return;
    try {
      const res = await fetch('./data/frageboegen.json', { cache: 'no-cache' });
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json) && json.length > 0) {
          this.catalogs = json;
        }
      }
    } catch (_) {
      // Offline oder file:// Protokoll -> nutzt window.DEFAULT_CATALOGS
    }
  }

  saveCatalogs() {
    localStorage.setItem(STORAGE_KEYS.CUSTOM_CATALOGS, JSON.stringify(this.catalogs));
    if (location.protocol.startsWith('http')) {
      fetch('/api/save-catalogs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(this.catalogs)
      }).catch(() => {});
    }
  }

  resetCatalogsToDefault() {
    localStorage.removeItem(STORAGE_KEYS.CUSTOM_CATALOGS);
    this.catalogs = Array.isArray(window.DEFAULT_CATALOGS)
      ? JSON.parse(JSON.stringify(window.DEFAULT_CATALOGS))
      : [];
    return this.catalogs;
  }

  getCatalogs() {
    return this.catalogs;
  }

  getCatalogById(id) {
    return this.catalogs.find(c => c.id === id) || this.catalogs[0] || null;
  }

  upsertCatalog(catalog) {
    const idx = this.catalogs.findIndex(c => c.id === catalog.id);
    if (idx >= 0) {
      this.catalogs[idx] = catalog;
    } else {
      this.catalogs.push(catalog);
    }
    this.saveCatalogs();
    return catalog;
  }

  deleteCatalog(catalogId) {
    this.catalogs = this.catalogs.filter(c => c.id !== catalogId);
    this.saveCatalogs();
  }

  // ==================== APP CONFIG & LOGO ====================

  getAppConfig() {
    return this.appConfig;
  }

  setAppLogo(logoDataUrl) {
    this.appConfig.logo = logoDataUrl || 'assets/app-logo.jpg';
    localStorage.setItem(STORAGE_KEYS.APP_CONFIG, JSON.stringify(this.appConfig));
  }

  setFeuerwehrName(name) {
    this.appConfig.feuerwehrName = (name || '').trim() || 'Freiwillige Feuerwehr';
    localStorage.setItem(STORAGE_KEYS.APP_CONFIG, JSON.stringify(this.appConfig));
  }

  getTheme() {
    return this.appConfig.theme || 'auto'; // 'light' | 'dark' | 'auto'
  }

  setTheme(mode) {
    if (!['light', 'dark', 'auto'].includes(mode)) mode = 'auto';
    this.appConfig.theme = mode;
    localStorage.setItem(STORAGE_KEYS.APP_CONFIG, JSON.stringify(this.appConfig));
    return mode;
  }

  // ==================== DOCUMENTS & PDFS ====================

  getDocuments() {
    return this.documents || [];
  }

  getDocumentById(docId) {
    return (this.documents || []).find(d => d.id === docId) || null;
  }

  saveDocuments() {
    localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(this.documents));
  }

  addDocument(doc) {
    if (!doc.id) doc.id = 'doc_' + Date.now();
    this.documents.unshift(doc);
    this.saveDocuments();
    return doc;
  }

  updateDocument(docId, updates) {
    const idx = (this.documents || []).findIndex(d => d.id === docId);
    if (idx === -1) return null;
    this.documents[idx] = {
      ...this.documents[idx],
      ...updates,
      id: docId,
      date: new Date().toISOString().slice(0, 10)
    };
    this.saveDocuments();
    return this.documents[idx];
  }

  deleteDocument(docId) {
    this.documents = this.documents.filter(d => d.id !== docId);
    this.saveDocuments();
  }

  // ==================== PROFILES ====================

  getProfiles() {
    return this.profiles;
  }

  getActiveProfile() {
    return this.profiles.find(p => p.id === this.activeProfileId) || null;
  }

  setActiveProfile(profileId) {
    if (this.profiles.some(p => p.id === profileId)) {
      this.activeProfileId = profileId;
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE, profileId);
      return this.getActiveProfile();
    }
    return null;
  }

  createProfile(name, color = null) {
    const cleanName = (name || '').trim();
    if (!cleanName) return null;

    const chosenColor = color || AVATAR_COLORS[this.profiles.length % AVATAR_COLORS.length];
    const newProfile = {
      id: 'prof_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      name: cleanName,
      color: chosenColor,
      createdAt: new Date().toISOString(),
      progress: {}, // { [catalogId]: { [questionNumber]: { correctCount, wrongCount, lastResult, updatedAt } } }
      history: []   // Array of completed exams & practice sessions
    };

    this.profiles.push(newProfile);
    this.activeProfileId = newProfile.id;
    this.saveProfiles();
    localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE, newProfile.id);
    return newProfile;
  }

  updateProfile(profileId, updates) {
    const prof = this.profiles.find(p => p.id === profileId);
    if (!prof) return null;
    if (updates.name) prof.name = updates.name.trim();
    if (updates.color) prof.color = updates.color;
    this.saveProfiles();
    return prof;
  }

  deleteProfile(profileId) {
    this.profiles = this.profiles.filter(p => p.id !== profileId);
    if (this.activeProfileId === profileId) {
      this.activeProfileId = this.profiles.length > 0 ? this.profiles[0].id : null;
      if (this.activeProfileId) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE, this.activeProfileId);
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_PROFILE);
      }
    }
    this.saveProfiles();
  }

  saveProfiles() {
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(this.profiles));
  }

  // ==================== LEARNING PROGRESS & STATS ====================

  recordQuestionResult(catalogId, questionNumber, isCorrectFirstTry) {
    const profile = this.getActiveProfile();
    if (!profile) return;

    if (!profile.progress) profile.progress = {};
    if (!profile.progress[catalogId]) profile.progress[catalogId] = {};

    const qKey = String(questionNumber);
    const existing = profile.progress[catalogId][qKey] || {
      correctCount: 0,
      wrongCount: 0,
      lastResult: null,
      updatedAt: null
    };

    if (isCorrectFirstTry) {
      existing.correctCount += 1;
      existing.lastResult = 'correct';
    } else {
      existing.wrongCount += 1;
      existing.lastResult = 'wrong';
    }
    existing.updatedAt = new Date().toISOString();

    profile.progress[catalogId][qKey] = existing;
    this.saveProfiles();
  }

  recordSessionHistory(sessionSummary) {
    const profile = this.getActiveProfile();
    if (!profile) return;
    if (!Array.isArray(profile.history)) profile.history = [];

    profile.history.unshift({
      id: 'sess_' + Date.now(),
      timestamp: new Date().toISOString(),
      ...sessionSummary
    });

    if (profile.history.length > 100) {
      profile.history = profile.history.slice(0, 100);
    }
    this.saveProfiles();
  }

  resetProfileCatalogProgress(catalogId) {
    const profile = this.getActiveProfile();
    if (!profile) return;
    if (profile.progress && profile.progress[catalogId]) {
      delete profile.progress[catalogId];
    }
    if (Array.isArray(profile.history)) {
      profile.history = profile.history.filter(h => h.catalogId !== catalogId);
    }
    this.saveProfiles();
  }

  getCatalogStatsForProfile(catalogId, profile = this.getActiveProfile()) {
    const catalog = this.getCatalogById(catalogId);
    if (!catalog) {
      return {
        totalQuestions: 0,
        masteredCount: 0,
        wrongCount: 0,
        unseenCount: 0,
        masteredPercent: 0,
        examsCount: 0,
        examsPassed: 0,
        passRate: 0,
        avgExamPercent: 0,
        lastExam: null,
        wrongQuestionNumbers: [],
        unseenQuestionNumbers: []
      };
    }

    const totalQuestions = catalog.questions.length;
    const catProgress = (profile && profile.progress && profile.progress[catalogId]) || {};

    let masteredCount = 0;
    let wrongCount = 0;
    let unseenCount = 0;
    const wrongQuestionNumbers = [];
    const unseenQuestionNumbers = [];

    for (const q of catalog.questions) {
      const p = catProgress[String(q.number)];
      if (!p || !p.lastResult) {
        unseenCount++;
        unseenQuestionNumbers.push(q.number);
      } else if (p.lastResult === 'correct') {
        masteredCount++;
      } else {
        wrongCount++;
        wrongQuestionNumbers.push(q.number);
      }
    }

    const masteredPercent = totalQuestions > 0 ? Math.round((masteredCount / totalQuestions) * 100) : 0;

    const history = (profile && Array.isArray(profile.history))
      ? profile.history.filter(h => h.catalogId === catalogId)
      : [];
    const exams = history.filter(h => h.mode === 'exam');
    const examsCount = exams.length;
    const examsPassed = exams.filter(e => e.passed).length;
    const passRate = examsCount > 0 ? Math.round((examsPassed / examsCount) * 100) : 0;
    const avgExamPercent = examsCount > 0
      ? Math.round(exams.reduce((acc, e) => acc + (e.percentage || 0), 0) / examsCount)
      : 0;

    return {
      totalQuestions,
      masteredCount,
      wrongCount,
      unseenCount,
      masteredPercent,
      examsCount,
      examsPassed,
      passRate,
      avgExamPercent,
      lastExam: exams[0] || null,
      history,
      wrongQuestionNumbers,
      unseenQuestionNumbers
    };
  }

  // ==================== ROLES & PINS (ENTWICKLER & ADMIN) ====================

  getDevPin() {
    return localStorage.getItem(STORAGE_KEYS.DEV_PIN) || '1120';
  }

  setDevPin(newPin) {
    localStorage.setItem(STORAGE_KEYS.DEV_PIN, String(newPin).trim());
  }

  getAdminPin() {
    return localStorage.getItem(STORAGE_KEYS.ADMIN_PIN) || '1122';
  }

  setAdminPin(newPin) {
    localStorage.setItem(STORAGE_KEYS.ADMIN_PIN, String(newPin).trim());
  }

  // ==================== TOKEN CRYPTO (OHNE BACKEND / SERVER) ====================

  hashPinWithSalt(pin, salt) {
    const str = String(pin).trim() + ':' + String(salt);
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, '0');
  }

  generateInviteToken(pin) {
    const salt = Math.floor(1000 + Math.random() * 9000).toString(16).padStart(4, '0');
    const hash = this.hashPinWithSalt(pin, salt);
    return `${salt}${hash}`;
  }

  verifyInviteToken(token, pin) {
    if (!token || token.length < 8) return false;
    const salt = token.slice(0, 4);
    const expectedHash = token.slice(4);
    return this.hashPinWithSalt(pin, salt) === expectedHash;
  }

  // ==================== INVITES & ACCESS CONTROL ====================

  getInvites() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.INVITES);
      if (saved) {
        const list = JSON.parse(saved);
        if (Array.isArray(list)) return list;
      }
    } catch (_) {}
    return [];
  }

  saveInvites(invites) {
    this.invites = invites;
    localStorage.setItem(STORAGE_KEYS.INVITES, JSON.stringify(invites));
  }

  createInvite(customPin = null) {
    const invites = this.getInvites();
    // 4-stellige Zugangs-PIN
    const cleanPin = (customPin && String(customPin).trim().length >= 4)
      ? String(customPin).trim()
      : Math.floor(1000 + Math.random() * 9000).toString();

    const token = this.generateInviteToken(cleanPin);

    const newInvite = {
      id: 'inv_' + Date.now(),
      pin: cleanPin,
      token: token,
      createdAt: new Date().toISOString().slice(0, 10)
    };

    invites.unshift(newInvite);
    this.saveInvites(invites);
    return newInvite;
  }

  deleteInvite(inviteId) {
    const invites = this.getInvites().filter(i => i.id !== inviteId);
    this.saveInvites(invites);
  }

  isDeviceAuthorized() {
    try {
      const auth = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (auth) return true;
    } catch (_) {}
    return false;
  }

  getAuthInfo() {
    try {
      const auth = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
      if (auth) return JSON.parse(auth);
    } catch (_) {}
    return null;
  }

  authorizeDevice(enteredPin, urlToken = '') {
    const cleanPin = String(enteredPin || '').trim();
    if (!cleanPin) {
      return { success: false, error: 'Bitte gib eine PIN ein.' };
    }

    // 1. Entwickler-Master-PIN
    if (cleanPin === this.getDevPin()) {
      const authData = { role: 'dev', title: 'Entwickler-Vollzugriff', authorizedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, JSON.stringify(authData));
      return { success: true, role: 'dev' };
    }

    // 2. Admin-PIN
    if (cleanPin === this.getAdminPin()) {
      const authData = { role: 'admin', title: 'Administrator', authorizedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, JSON.stringify(authData));
      return { success: true, role: 'admin' };
    }

    // 3. Prüfung gegen den Token im Einladungslink (mathematisch & offline ohne Backend!)
    if (urlToken && this.verifyInviteToken(urlToken, cleanPin)) {
      const authData = { role: 'user', token: urlToken, authorizedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, JSON.stringify(authData));
      return { success: true, role: 'user' };
    }

    // 4. Prüfung gegen lokal auf dem Admin-Gerät gespeicherte Einladungs-PINs
    const invites = this.getInvites();
    const matchingInvite = invites.find(inv => inv.pin === cleanPin);
    if (matchingInvite) {
      const authData = { role: 'user', token: matchingInvite.token, authorizedAt: new Date().toISOString() };
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, JSON.stringify(authData));
      return { success: true, role: 'user' };
    }

    return { success: false, error: 'Falsche PIN! Bitte prüfe deine Eingabe oder wende dich an deinen Administrator.' };
  }

  revokeDeviceAuthorization() {
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  // ==================== IMPORT / EXPORT HELPERS ====================

  exportCatalogsAsJson() {
    return JSON.stringify(this.catalogs, null, 2);
  }

  importCatalogsFromJsonString(jsonStr, merge = true) {
    const parsed = JSON.parse(jsonStr);
    const list = Array.isArray(parsed) ? parsed : [parsed];

    const validCatalogs = [];
    for (const item of list) {
      if (!item || !Array.isArray(item.questions)) continue;
      const normalized = {
        id: item.id || ('cat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)),
        title: item.title || 'Importierter Fragebogen',
        subtitle: item.subtitle || '',
        category: item.category || 'Allgemein',
        icon: item.icon || '🚒',
        updatedAt: new Date().toISOString().slice(0, 10),
        examConfig: {
          questionCount: Number(item.examConfig?.questionCount) || Math.min(50, item.questions.length),
          passPercentage: Number(item.examConfig?.passPercentage) || 75,
          timeLimitMinutes: Number(item.examConfig?.timeLimitMinutes) || 0
        },
        questions: item.questions.map((q, idx) => ({
          number: Number(q.number) || (idx + 1),
          question: String(q.question || '').trim(),
          explanation: String(q.explanation || '').trim(),
          image: q.image || '',
          answers: Array.isArray(q.answers)
            ? q.answers.map(a => ({
                text: String(a.text || '').trim(),
                isCorrect: Boolean(a.isCorrect)
              })).filter(a => a.text.length > 0)
            : []
        })).filter(q => q.question.length > 0 && q.answers.length > 0)
      };
      validCatalogs.push(normalized);
    }

    if (validCatalogs.length === 0) {
      throw new Error('Keine gültigen Fragebögen in der JSON-Datei gefunden.');
    }

    if (merge) {
      for (const cat of validCatalogs) {
        this.upsertCatalog(cat);
      }
    } else {
      this.catalogs = validCatalogs;
      this.saveCatalogs();
    }

    return validCatalogs;
  }

  parseRowsToQuestions(rows) {
    if (!rows || rows.length === 0) return [];

    const firstRowStr = rows[0].map(c => String(c || '').toLowerCase().trim());
    const hasHeader = firstRowStr.some(c =>
      c.includes('frage') || c.includes('question') || c.includes('antwort') || c === 'nr' || c === 'nummer'
    );

    const dataRows = hasHeader ? rows.slice(1) : rows;
    const questions = [];

    for (let i = 0; i < dataRows.length; i++) {
      const cols = dataRows[i].map(c => String(c ?? '').trim());
      if (cols.every(c => !c)) continue;

      let number = i + 1;
      let questionText = '';
      let rawAnswers = [];
      let correctSpec = '';
      let explanation = '';

      if (cols.length >= 6) {
        const parsedNum = parseInt(cols[0], 10);
        if (!isNaN(parsedNum)) {
          number = parsedNum;
          questionText = cols[1];
          rawAnswers = [cols[2], cols[3], cols[4], cols[5]];
          correctSpec = cols[6] || 'A';
          explanation = cols[7] || '';
        } else {
          questionText = cols[0];
          rawAnswers = [cols[1], cols[2], cols[3], cols[4]];
          correctSpec = cols[5] || 'A';
          explanation = cols[6] || '';
        }
      } else if (cols.length >= 4) {
        questionText = cols[0];
        rawAnswers = cols.slice(1, cols.length - 1);
        correctSpec = cols[cols.length - 1];
      }

      if (!questionText) continue;

      const correctUpper = correctSpec.toUpperCase();
      const letterMap = ['A', 'B', 'C', 'D', 'E', 'F'];
      const answers = [];

      rawAnswers.forEach((ansText, idx) => {
        if (!ansText) return;
        const letter = letterMap[idx];
        const idxStr = String(idx + 1);
        const isCorrect =
          correctUpper.includes(letter) ||
          correctUpper.split(/[,;\s/]+/).includes(idxStr) ||
          (idx === 0 && !correctSpec);
        answers.push({
          text: ansText,
          isCorrect
        });
      });

      if (answers.length >= 2) {
        if (!answers.some(a => a.isCorrect)) {
          answers[0].isCorrect = true;
        }
        questions.push({
          number,
          question: questionText,
          explanation,
          answers
        });
      }
    }

    return questions;
  }

  parseCsvToQuestions(csvText) {
    const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim().length > 0);
    if (lines.length === 0) return [];
    const delimiter = lines[0].includes(';') ? ';' : ',';

    const rows = lines.map(line => {
      const result = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (ch === delimiter && !inQuotes) {
          result.push(current);
          current = '';
        } else {
          current += ch;
        }
      }
      result.push(current);
      return result;
    });

    return this.parseRowsToQuestions(rows);
  }

  async parseXlsxFileToQuestions(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    const view = new DataView(arrayBuffer);
    const entries = {};

    let offset = 0;
    while (offset + 30 <= bytes.length) {
      const sig = view.getUint32(offset, true);
      if (sig !== 0x04034b50) break;
      const compression = view.getUint16(offset + 8, true);
      const compressedSize = view.getUint32(offset + 18, true);
      const fileNameLen = view.getUint16(offset + 26, true);
      const extraLen = view.getUint16(offset + 28, true);
      const nameBytes = bytes.subarray(offset + 30, offset + 30 + fileNameLen);
      const fileName = new TextDecoder('utf-8').decode(nameBytes);
      const dataStart = offset + 30 + fileNameLen + extraLen;
      const compData = bytes.subarray(dataStart, dataStart + compressedSize);

      if (fileName === 'xl/sharedStrings.xml' || fileName.startsWith('xl/worksheets/sheet')) {
        if (compression === 0) {
          entries[fileName] = new TextDecoder('utf-8').decode(compData);
        } else if (compression === 8 && typeof DecompressionStream !== 'undefined') {
          const ds = new DecompressionStream('deflate-raw');
          const writer = ds.writable.getWriter();
          writer.write(compData);
          writer.close();
          const decompressedBuf = await new Response(ds.readable).arrayBuffer();
          entries[fileName] = new TextDecoder('utf-8').decode(decompressedBuf);
        }
      }
      offset = dataStart + compressedSize;
    }

    const parser = new DOMParser();
    const sharedStrings = [];
    if (entries['xl/sharedStrings.xml']) {
      const ssDoc = parser.parseFromString(entries['xl/sharedStrings.xml'], 'application/xml');
      const siNodes = ssDoc.getElementsByTagName('si');
      for (let i = 0; i < siNodes.length; i++) {
        const tNodes = siNodes[i].getElementsByTagName('t');
        let text = '';
        for (let j = 0; j < tNodes.length; j++) {
          text += tNodes[j].textContent || '';
        }
        sharedStrings.push(text);
      }
    }

    const sheetKey = Object.keys(entries).find(k => k.startsWith('xl/worksheets/sheet1')) ||
                     Object.keys(entries).find(k => k.startsWith('xl/worksheets/sheet'));
    if (!sheetKey) {
      throw new Error('Kein Tabellenblatt in der Excel-Datei gefunden.');
    }

    const sheetDoc = parser.parseFromString(entries[sheetKey], 'application/xml');
    const rowNodes = sheetDoc.getElementsByTagName('row');
    const rows = [];

    const colLettersToIndex = (cellRef) => {
      const match = String(cellRef || '').match(/[A-Z]+/);
      if (!match) return 0;
      const letters = match[0];
      let idx = 0;
      for (let i = 0; i < letters.length; i++) {
        idx = idx * 26 + (letters.charCodeAt(i) - 64);
      }
      return idx - 1;
    };

    for (let r = 0; r < rowNodes.length; r++) {
      const cNodes = rowNodes[r].getElementsByTagName('c');
      const rowArr = [];
      for (let c = 0; c < cNodes.length; c++) {
        const cell = cNodes[c];
        const colIdx = colLettersToIndex(cell.getAttribute('r'));
        const type = cell.getAttribute('t');
        const vNode = cell.getElementsByTagName('v')[0];
        const isNode = cell.getElementsByTagName('is')[0];
        let val = '';
        if (type === 's' && vNode) {
          val = sharedStrings[parseInt(vNode.textContent, 10)] || '';
        } else if (type === 'inlineStr' && isNode) {
          val = isNode.textContent || '';
        } else if (vNode) {
          val = vNode.textContent || '';
        }
        rowArr[colIdx] = val;
      }
      for (let k = 0; k < rowArr.length; k++) {
        if (rowArr[k] === undefined) rowArr[k] = '';
      }
      if (rowArr.some(x => String(x).trim().length > 0)) {
        rows.push(rowArr);
      }
    }

    return this.parseRowsToQuestions(rows);
  }
}

window.AVATAR_COLORS = AVATAR_COLORS;
window.appStorage = new AppStorage();
