/**
 * LÖSCHSTOFF ACADEMY – Hauptanwendungslogik
 * Wissen. Trainieren. Einsatzbereit.
 * Entwickelt von Nico Galicki
 */

class FeuerwehrApp {
  constructor() {
    this.storage = window.appStorage;
    this.currentTab = 'home'; // 'home' | 'docs' | 'stats' | 'profiles' | 'admin' | 'dev' | 'install'
    this.selectedCatalogId = (this.storage.getCatalogs()[0]?.id) || 'mta-zwischenpruefung';

    // Practice configuration state
    this.practiceModeType = 'all'; // 'all' | 'range' | 'mistakes'
    this.rangeFrom = 11;
    this.rangeTo = 23;
    this.shufflePracticeQuestions = false;

    // Active quiz session state (Practice or Exam)
    this.session = null;

    // Evaluation / Result view state
    this.lastResult = null;
    this.resultFilter = 'all'; // 'all' | 'wrong' | 'correct'

    // Role, Admin & Developer state
    this.adminVisible = false;
    this.adminUnlocked = false;
    this.devVisible = false;
    this.devUnlocked = false;
    this.devEditingCatalogId = this.selectedCatalogId;
    this.devEditingQuestionIdx = null; // null | 'new' | index
    this.devSearchQuery = '';
    this.urlInviteToken = '';
    this.logoClickCounter = 0;
    this.logoClickTimer = null;

    // PWA deferred install prompt (Android / Chrome)
    this.deferredInstallPrompt = null;
    this.timerInterval = null;

    this.init();
  }

  async init() {
    this.applyTheme();
    if (window.matchMedia) {
      try {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
          if (this.storage.getTheme() === 'auto') {
            this.applyTheme();
          }
        });
      } catch (_) {}
    }

    // URL-Check für Einladungstoken, Entwickler- oder Admin-Modus
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash || '';

      // Token aus URL (?token=xyz oder ?invite=xyz oder #token=xyz)
      let t = urlParams.get('token') || urlParams.get('invite');
      if (!t && hash.startsWith('#token=')) t = hash.replace('#token=', '').split('&')[0];
      if (!t && hash.startsWith('#invite=')) t = hash.replace('#invite=', '').split('&')[0];
      if (t) {
        this.urlInviteToken = t.trim();
      }

      if (urlParams.get('dev') === '1' || hash === '#dev') {
        this.devVisible = true;
      }
      if (urlParams.get('admin') === '1' || hash === '#admin') {
        this.adminVisible = true;
      }
    } catch (_) {}

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredInstallPrompt = e;
      this.render();
    });

    await this.storage.syncExternalJsonIfAvailable();
    if (!this.storage.getCatalogById(this.selectedCatalogId)) {
      this.selectedCatalogId = this.storage.getCatalogs()[0]?.id || '';
    }

    this.render();
  }

  applyTheme() {
    const mode = this.storage.getTheme(); // 'light' | 'dark' | 'auto'
    let resolved = mode;
    if (mode === 'auto') {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolved = prefersDark ? 'dark' : 'light';
    }
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.setAttribute('data-theme', resolved);
    }
    return resolved;
  }

  setTheme(mode) {
    this.storage.setTheme(mode);
    this.applyTheme();
    this.render();
  }

  cycleTheme() {
    const current = this.storage.getTheme();
    const order = ['auto', 'light', 'dark'];
    const next = order[(order.indexOf(current) + 1) % order.length];
    this.setTheme(next);
  }

  handleLogoSecretClick(e) {
    if (e) e.stopPropagation();
    this.logoClickCounter++;
    clearTimeout(this.logoClickTimer);
    this.logoClickTimer = setTimeout(() => {
      this.logoClickCounter = 0;
    }, 2000);

    if (this.logoClickCounter >= 5) {
      this.logoClickCounter = 0;
      this.adminVisible = true;
      this.devVisible = true;
      alert('🔓 Admin- & Entwickler-Optionen in der Navigation freigeschaltet!');
      this.switchTab('admin');
    }
  }

  // ==================== UTILITIES ====================

  escapeHtml(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  shuffleArray(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  formatDate(isoStr) {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (_) {
      return isoStr;
    }
  }

  formatSeconds(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  getSelectedCatalog() {
    return this.storage.getCatalogById(this.selectedCatalogId);
  }

  ensureActiveProfile() {
    let prof = this.storage.getActiveProfile();
    if (!prof) {
      this.openCreateProfileModal(true);
      return null;
    }
    return prof;
  }

  // ==================== NAVIGATION ====================

  switchTab(tab) {
    if (this.session && !this.session.finished) {
      const msg = this.session.mode === 'exam'
        ? 'Möchtest du die laufende Prüfung wirklich abbrechen?'
        : 'Möchtest du die laufende Übung wirklich beenden?';
      if (!confirm(msg)) return;
      this.stopTimer();
      this.session = null;
    }
    this.lastResult = null;
    this.currentTab = tab;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.render();
  }

  selectCatalog(catalogId) {
    this.selectedCatalogId = catalogId;
    const cat = this.getSelectedCatalog();
    if (cat && cat.questions.length > 0) {
      const maxNum = Math.max(...cat.questions.map(q => q.number));
      if (this.rangeFrom > maxNum) this.rangeFrom = 1;
      if (this.rangeTo > maxNum) this.rangeTo = Math.min(23, maxNum);
    }
    this.render();
  }

  // ==================== ZUGANGSSCHUTZ / LOCK SCREEN (NUR 1 PIN-FELD) ====================

  renderLockScreen() {
    const appConfig = this.storage.getAppConfig();
    const fwName = appConfig.feuerwehrName || 'Freiwillige Feuerwehr';
    const hasToken = Boolean(this.urlInviteToken);

    return `
      <div style="min-height:100vh; display:flex; align-items:center; justify-content:center; padding:20px; background:linear-gradient(135deg, #0F172A 0%, #1E293B 100%);">
        <div class="card" style="max-width:440px; width:100%; border:1px solid rgba(255,255,255,0.15); box-shadow:0 14px 40px rgba(0,0,0,0.55); text-align:center; padding:32px 24px;">
          <img src="assets/app-logo.jpg" alt="LÖSCHSTOFF ACADEMY Logo"
               style="width:84px; height:84px; border-radius:20px; object-fit:cover; margin:0 auto 14px auto; box-shadow:0 6px 20px rgba(198,40,40,0.35); border:2px solid var(--border-color); display:block;" />

          <div style="font-size:0.75rem; font-weight:800; text-transform:uppercase; letter-spacing:0.08em; color:var(--fw-red); margin-bottom:4px;">
            🚒 ${this.escapeHtml(fwName)}
          </div>
          <h1 style="font-size:1.4rem; font-weight:900; margin:0 0 4px 0; letter-spacing:0.03em; color:var(--text-main);">
            LÖSCHSTOFF <span style="color:var(--fw-red);">ACADEMY</span>
          </h1>
          <div style="font-size:0.72rem; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-muted); margin-bottom:18px;">
            Wissen. Trainieren. Einsatzbereit.
          </div>

          <div style="background:var(--bg-subtle); border-radius:12px; padding:14px; text-align:left; font-size:0.86rem; line-height:1.45; color:var(--text-main); margin-bottom:20px; border:1px solid var(--border-color);">
            ${hasToken
              ? `🔒 <strong>Einladungslink erkannt:</strong><br/>Bitte gib die 4-stellige Zugangs-PIN ein, um die App auf diesem Gerät dauerhaft freizuschalten (funktioniert danach auch komplett offline).`
              : `🔒 <strong>Geschützter App-Zugang:</strong><br/>Bitte gib die Zugangs-PIN oder die Admin-/Entwickler-PIN ein:`}
          </div>

          <form onsubmit="event.preventDefault(); app.submitLockPin();">
            <div class="input-group" style="text-align:left; margin-bottom:18px;">
              <label style="text-align:center; display:block; font-weight:700;">PIN eingeben</label>
              <input type="password" id="lock-pin-input" class="form-input"
                     placeholder="PIN"
                     autocomplete="off" maxlength="10" style="font-weight:900; font-size:1.3rem; text-align:center; letter-spacing:0.25em; padding:12px;" required autofocus />
            </div>

            <button type="submit" class="btn btn-primary btn-block" style="padding:13px; font-size:1rem; font-weight:800;">
              🔓 App freischalten & starten
            </button>
          </form>
        </div>
      </div>
    `;
  }

  submitLockPin() {
    const pin = document.getElementById('lock-pin-input')?.value.trim();
    if (!pin) {
      alert('Bitte gib eine PIN ein.');
      return;
    }
    const res = this.storage.authorizeDevice(pin, this.urlInviteToken);
    if (res.success) {
      if (res.role === 'dev') {
        this.devUnlocked = true;
        this.devVisible = true;
        this.adminUnlocked = true;
        this.adminVisible = true;
      } else if (res.role === 'admin') {
        this.adminUnlocked = true;
        this.adminVisible = true;
      }
      alert('Erfolgreich freigeschaltet! Willkommen bei der LÖSCHSTOFF ACADEMY.');
      this.render();
    } else {
      alert(res.error || 'Falsche PIN!');
    }
  }

  // ==================== START PRACTICE OR EXAM ====================

  startPractice(customQuestions = null, customLabel = null) {
    const profile = this.ensureActiveProfile();
    if (!profile) return;

    const catalog = this.getSelectedCatalog();
    if (!catalog || !catalog.questions.length) {
      alert('Dieser Fragebogen enthält noch keine Fragen.');
      return;
    }

    let pool = [];
    let modeLabel = customLabel || 'Alle Fragen';

    if (Array.isArray(customQuestions) && customQuestions.length > 0) {
      pool = [...customQuestions];
    } else if (this.practiceModeType === 'range') {
      const from = Math.min(this.rangeFrom, this.rangeTo);
      const to = Math.max(this.rangeFrom, this.rangeTo);
      pool = catalog.questions.filter(q => q.number >= from && q.number <= to);
      modeLabel = `Frage ${from} bis ${to}`;
      if (pool.length === 0) {
        alert(`Im Bereich Frage ${from} bis ${to} wurden keine Fragen gefunden.`);
        return;
      }
    } else if (this.practiceModeType === 'mistakes') {
      const stats = this.storage.getCatalogStatsForProfile(catalog.id, profile);
      const targetNums = new Set([...stats.wrongQuestionNumbers, ...stats.unseenQuestionNumbers]);
      pool = catalog.questions.filter(q => targetNums.has(q.number));
      modeLabel = 'Fehler & offene Fragen';
      if (pool.length === 0) {
        alert('Super! Du hast bereits alle Fragen dieses Fragebogens fehlerfrei gemeistert.');
        return;
      }
    } else {
      pool = [...catalog.questions];
      modeLabel = `Alle Fragen (1–${catalog.questions.length})`;
    }

    pool = this.shuffleArray(pool);

    const items = pool.map(q => {
      const shuffledAnswers = this.shuffleArray(
        q.answers.map((a, idx) => ({
          id: 'ans_' + idx,
          text: a.text,
          isCorrect: Boolean(a.isCorrect),
          clicked: false
        }))
      );
      return {
        questionNumber: q.number,
        question: q.question,
        explanation: q.explanation || '',
        image: q.image || '',
        answers: shuffledAnswers,
        hadWrongClick: false,
        completed: false,
        recordedInStorage: false
      };
    });

    this.session = {
      mode: 'practice',
      catalogId: catalog.id,
      catalogTitle: catalog.title,
      modeLabel,
      startedAt: Date.now(),
      currentIndex: 0,
      items,
      finished: false
    };
    this.lastResult = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.render();
  }

  startExam() {
    const profile = this.ensureActiveProfile();
    if (!profile) return;

    const catalog = this.getSelectedCatalog();
    if (!catalog || !catalog.questions.length) {
      alert('Dieser Fragebogen enthält noch keine Fragen.');
      return;
    }

    const desiredCount = Math.min(
      Number(catalog.examConfig?.questionCount) || 50,
      catalog.questions.length
    );
    const passPercentage = Number(catalog.examConfig?.passPercentage) || 75;
    const timeLimitMinutes = Number(catalog.examConfig?.timeLimitMinutes) || 0;

    const randomQuestions = this.shuffleArray(catalog.questions).slice(0, desiredCount);

    const items = randomQuestions.map(q => {
      const shuffledAnswers = this.shuffleArray(
        q.answers.map((a, idx) => ({
          id: 'ans_' + idx,
          text: a.text,
          isCorrect: Boolean(a.isCorrect),
          selected: false
        }))
      );
      return {
        questionNumber: q.number,
        question: q.question,
        explanation: q.explanation || '',
        image: q.image || '',
        answers: shuffledAnswers
      };
    });

    this.stopTimer();
    this.session = {
      mode: 'exam',
      catalogId: catalog.id,
      catalogTitle: catalog.title,
      modeLabel: `Prüfung (${desiredCount} Fragen, mind. ${passPercentage}%)`,
      passPercentage,
      timeLimitSeconds: timeLimitMinutes > 0 ? timeLimitMinutes * 60 : 0,
      remainingSeconds: timeLimitMinutes > 0 ? timeLimitMinutes * 60 : 0,
      startedAt: Date.now(),
      currentIndex: 0,
      items,
      finished: false
    };

    if (this.session.timeLimitSeconds > 0) {
      this.timerInterval = setInterval(() => {
        if (!this.session || this.session.mode !== 'exam' || this.session.finished) {
          this.stopTimer();
          return;
        }
        this.session.remainingSeconds--;
        const timerEl = document.getElementById('exam-timer-display');
        if (timerEl) {
          timerEl.textContent = '⏱ ' + this.formatSeconds(Math.max(0, this.session.remainingSeconds));
        }
        if (this.session.remainingSeconds <= 0) {
          this.stopTimer();
          alert('Die Prüfungszeit ist abgelaufen! Deine Prüfung wird jetzt ausgewertet.');
          this.finishExam(true);
        }
      }, 1000);
    }

    this.lastResult = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.render();
  }

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  // ==================== PRACTICE & EXAM INTERACTION ====================

  handleAnswerClick(answerIndex) {
    if (!this.session || this.session.finished) return;
    const currentItem = this.session.items[this.session.currentIndex];
    if (!currentItem) return;
    const ans = currentItem.answers[answerIndex];
    if (!ans) return;

    if (this.session.mode === 'practice') {
      if (ans.clicked) return;
      ans.clicked = true;

      if (!ans.isCorrect) {
        currentItem.hadWrongClick = true;
      }

      const allCorrectClicked = currentItem.answers
        .filter(a => a.isCorrect)
        .every(a => a.clicked);

      if (allCorrectClicked) {
        currentItem.completed = true;
        if (!currentItem.recordedInStorage) {
          currentItem.recordedInStorage = true;
          this.storage.recordQuestionResult(
            this.session.catalogId,
            currentItem.questionNumber,
            !currentItem.hadWrongClick
          );
        }
      }

      this.render();
    } else {
      ans.selected = !ans.selected;
      this.render();
    }
  }

  nextQuestion() {
    if (!this.session) return;
    const item = this.session.items[this.session.currentIndex];

    if (this.session.mode === 'practice' && !item.completed) {
      return;
    }

    if (this.session.currentIndex < this.session.items.length - 1) {
      this.session.currentIndex++;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.render();
    } else {
      if (this.session.mode === 'practice') {
        this.finishPractice();
      } else {
        this.finishExam(false);
      }
    }
  }

  prevQuestion() {
    if (!this.session) return;
    if (this.session.currentIndex > 0) {
      this.session.currentIndex--;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.render();
    }
  }

  jumpToQuestion(index) {
    if (!this.session || this.session.mode !== 'exam') return;
    if (index >= 0 && index < this.session.items.length) {
      this.session.currentIndex = index;
      this.render();
    }
  }

  finishPractice() {
    if (!this.session) return;
    this.session.finished = true;

    const total = this.session.items.length;
    let correctCount = 0;

    const evaluatedItems = this.session.items.map(item => {
      const isCorrect = item.completed && !item.hadWrongClick;
      if (isCorrect) correctCount++;
      return {
        questionNumber: item.questionNumber,
        question: item.question,
        explanation: item.explanation,
        isCorrect,
        answers: item.answers.map(a => ({
          text: a.text,
          isCorrect: a.isCorrect,
          userSelected: a.clicked
        }))
      };
    });

    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const catalog = this.storage.getCatalogById(this.session.catalogId);
    const passPercentage = Number(catalog?.examConfig?.passPercentage) || 75;
    const passed = percentage >= passPercentage;

    const resultObj = {
      mode: 'practice',
      catalogId: this.session.catalogId,
      catalogTitle: this.session.catalogTitle,
      modeLabel: this.session.modeLabel,
      totalQuestions: total,
      correctCount,
      wrongCount: total - correctCount,
      percentage,
      passPercentage,
      passed,
      durationSeconds: Math.round((Date.now() - this.session.startedAt) / 1000),
      items: evaluatedItems
    };

    this.storage.recordSessionHistory(resultObj);
    this.lastResult = resultObj;
    this.resultFilter = 'all';
    this.session = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.render();
  }

  finishExam(forceSubmit = false) {
    if (!this.session || this.session.mode !== 'exam') return;

    if (!forceSubmit) {
      const unansweredCount = this.session.items.filter(
        it => !it.answers.some(a => a.selected)
      ).length;
      const confirmMsg = unansweredCount > 0
        ? `Du hast noch ${unansweredCount} Frage(n) nicht beantwortet. Möchtest du die Prüfung trotzdem jetzt abgeben und auswerten?`
        : 'Möchtest du die Prüfung jetzt verbindlich abgeben und auswerten?';
      if (!confirm(confirmMsg)) return;
    }

    this.stopTimer();
    this.session.finished = true;

    const total = this.session.items.length;
    let correctCount = 0;

    const evaluatedItems = this.session.items.map(item => {
      const isCorrect = item.answers.every(a => a.isCorrect === a.selected);
      if (isCorrect) correctCount++;

      this.storage.recordQuestionResult(
        this.session.catalogId,
        item.questionNumber,
        isCorrect
      );

      return {
        questionNumber: item.questionNumber,
        question: item.question,
        explanation: item.explanation,
        isCorrect,
        answers: item.answers.map(a => ({
          text: a.text,
          isCorrect: a.isCorrect,
          userSelected: a.selected
        }))
      };
    });

    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;
    const passPercentage = this.session.passPercentage || 75;
    const passed = percentage >= passPercentage;

    const resultObj = {
      mode: 'exam',
      catalogId: this.session.catalogId,
      catalogTitle: this.session.catalogTitle,
      modeLabel: this.session.modeLabel,
      totalQuestions: total,
      correctCount,
      wrongCount: total - correctCount,
      percentage,
      passPercentage,
      passed,
      durationSeconds: Math.round((Date.now() - this.session.startedAt) / 1000),
      items: evaluatedItems
    };

    this.storage.recordSessionHistory(resultObj);
    this.lastResult = resultObj;
    this.resultFilter = 'all';
    this.session = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    this.render();
  }

  retryWrongQuestionsFromResult() {
    if (!this.lastResult) return;
    const catalog = this.storage.getCatalogById(this.lastResult.catalogId);
    if (!catalog) return;

    const wrongNums = new Set(
      this.lastResult.items.filter(i => !i.isCorrect).map(i => i.questionNumber)
    );
    const wrongQuestions = catalog.questions.filter(q => wrongNums.has(q.number));
    if (wrongQuestions.length === 0) return;

    this.selectedCatalogId = catalog.id;
    this.startPractice(wrongQuestions, `Wiederholung (${wrongQuestions.length} falsche Fragen)`);
  }

  // ==================== PROFILE MODAL (OHNE DIENSTGRAD) ====================

  openCreateProfileModal(isFirstProfile = false) {
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;

    const AVATAR_COLORS = [
      '#DC2626', '#EA580C', '#D97706', '#16A34A',
      '#0284C7', '#2563EB', '#7C3AED', '#DB2777'
    ];
    let selectedColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const renderModal = () => {
      modalRoot.innerHTML = `
        <div class="modal-backdrop" onclick="if(event.target===this && !${isFirstProfile}) app.closeModal()">
          <div class="modal-box">
            <h3 style="margin:0 0 6px 0; font-size:1.2rem;">👤 Neues Profil anlegen</h3>
            <p style="margin:0 0 16px 0; font-size:0.86rem; color:var(--text-muted);">
              Lege dein persönliches Profil an, um deinen individuellen Lernfortschritt und deine Prüfungsergebnisse zu speichern.
            </p>
            <div class="input-group" style="margin-bottom:14px;">
              <label>Dein Name / Vorname</label>
              <input type="text" id="new-profile-name" class="form-input" placeholder="z. B. Max Mustermann" autofocus
                     onkeydown="if(event.key==='Enter') app.confirmCreateProfile()" />
            </div>
            <div class="input-group" style="margin-bottom:18px;">
              <label>Profilfarbe wählen</label>
              <div class="color-swatches">
                ${AVATAR_COLORS.map(c => `
                  <div class="color-swatch ${c === selectedColor ? 'selected' : ''}"
                       style="background:${c}"
                       onclick="document.querySelectorAll('.color-swatch').forEach(el=>el.classList.remove('selected')); this.classList.add('selected'); this.dataset.picked='1'; window._pickedProfileColor='${c}';">
                  </div>
                `).join('')}
              </div>
            </div>
            <div style="display:flex; gap:10px;">
              ${!isFirstProfile ? `<button class="btn btn-outline" style="flex:1" onclick="app.closeModal()">Abbrechen</button>` : ''}
              <button class="btn btn-primary" style="flex:2" onclick="app.confirmCreateProfile()">Profil erstellen</button>
            </div>
          </div>
        </div>
      `;
      window._pickedProfileColor = selectedColor;
      setTimeout(() => document.getElementById('new-profile-name')?.focus(), 50);
    };

    renderModal();
  }

  confirmCreateProfile() {
    const nameInput = document.getElementById('new-profile-name');
    const name = nameInput?.value.trim();
    if (!name) {
      alert('Bitte gib einen Namen für das Profil ein.');
      nameInput?.focus();
      return;
    }
    const color = window._pickedProfileColor || '#DC2626';
    this.storage.createProfile(name, color);
    this.closeModal();
    this.render();
  }

  closeModal() {
    const modalRoot = document.getElementById('modal-root');
    if (modalRoot) modalRoot.innerHTML = '';
  }

  // ==================== MAIN RENDER ROUTER ====================

  renderThemeSelectorBar() {
    const mode = this.storage.getTheme();
    return `
      <div class="theme-segmented" role="group" aria-label="Darstellungsmodus">
        <button type="button" class="theme-seg-btn ${mode === 'light' ? 'active' : ''}"
                onclick="app.setTheme('light')">
          ☀️ Hell
        </button>
        <button type="button" class="theme-seg-btn ${mode === 'dark' ? 'active' : ''}"
                onclick="app.setTheme('dark')">
          🌙 Dunkel
        </button>
        <button type="button" class="theme-seg-btn ${mode === 'auto' ? 'active' : ''}"
                onclick="app.setTheme('auto')">
          🌓 Automatisch
        </button>
      </div>
    `;
  }

  render() {
    this.applyTheme();
    const root = document.getElementById('app-root');
    if (!root) return;

    // ZUGANGSKONTROLLE: Wenn das Gerät noch nicht autorisiert ist, Lock Screen anzeigen
    if (!this.storage.isDeviceAuthorized()) {
      root.innerHTML = this.renderLockScreen();
      return;
    }

    const activeProfile = this.storage.getActiveProfile();
    const appConfig = this.storage.getAppConfig();
    const themeMode = this.storage.getTheme();
    const themeIcon = themeMode === 'light' ? '☀️ Hell' : (themeMode === 'dark' ? '🌙 Dunkel' : '🌓 Auto');
    const initials = activeProfile
      ? activeProfile.name.split(/\s+/).map(p => p[0]).join('').toUpperCase().slice(0, 2)
      : '?';

    root.innerHTML = `
      <div class="app-shell">
        <header class="app-header">
          <div class="brand-wrap" onclick="app.switchTab('home')">
            <img src="assets/app-logo.jpg" alt="LÖSCHSTOFF ACADEMY Logo" class="brand-icon" style="object-fit:cover; cursor:pointer; border-radius:10px;"
                 onclick="app.handleLogoSecretClick(event)" title="LÖSCHSTOFF ACADEMY – Wissen. Trainieren. Einsatzbereit." />
            <div>
              <div class="brand-title" style="letter-spacing:0.04em;">LÖSCHSTOFF <span style="font-weight:600; font-size:0.82em; opacity:0.92;">ACADEMY</span></div>
              <div style="font-size:0.65rem; font-weight:700; letter-spacing:0.08em; opacity:0.85; text-transform:uppercase; margin-top:1px;">
                Wissen. Trainieren. Einsatzbereit.
              </div>
            </div>
          </div>
          <div class="header-actions">
            <button class="theme-pill-btn" onclick="app.cycleTheme()" title="Design umschalten (Hell / Dunkel / Automatisch)">
              <span>${themeIcon}</span>
            </button>
            <button class="profile-pill" onclick="app.switchTab('profiles')" title="Profil wechseln oder verwalten">
              <span class="profile-avatar" style="background:${activeProfile ? activeProfile.color : '#64748B'}">
                ${this.escapeHtml(initials)}
              </span>
              <span>${activeProfile ? this.escapeHtml(activeProfile.name) : 'Profil'} ▾</span>
            </button>
          </div>
        </header>

        <main class="main-content">
          ${this.renderMainView()}
          <footer style="text-align:center; padding:18px 12px 8px 12px; font-size:0.76rem; color:var(--text-muted); opacity:0.85;">
            <strong>LÖSCHSTOFF ACADEMY</strong> · Wissen. Trainieren. Einsatzbereit.<br/>
            Entwickelt von <strong>Nico Galicki</strong>
          </footer>
        </main>

        ${!this.session ? this.renderBottomNav() : ''}
      </div>
    `;
  }

  renderBottomNav() {
    const tabs = [
      { id: 'home', icon: '🎯', label: 'Üben & Prüfung' },
      { id: 'docs', icon: '📚', label: 'Lernmaterial' },
      { id: 'stats', icon: '📊', label: 'Statistik' },
      { id: 'profiles', icon: '👥', label: 'Profile' }
    ];

    if (this.adminVisible || this.adminUnlocked) {
      tabs.push({ id: 'admin', icon: '🛡️', label: 'Admin' });
    }

    if (this.devVisible || this.devUnlocked) {
      tabs.push({ id: 'dev', icon: '⚙️', label: 'Entwickler' });
    }

    tabs.push({ id: 'install', icon: '📲', label: 'App-Infos' });

    return `
      <nav class="bottom-nav">
        ${tabs.map(t => `
          <button class="nav-btn ${this.currentTab === t.id ? 'active' : ''}"
                  onclick="app.switchTab('${t.id}')">
            <span class="nav-icon">${t.icon}</span>
            <span>${t.label}</span>
          </button>
        `).join('')}
      </nav>
    `;
  }

  renderMainView() {
    if (this.session) {
      return this.renderQuizSessionView();
    }
    if (this.lastResult) {
      return this.renderEvaluationView(this.lastResult);
    }

    switch (this.currentTab) {
      case 'docs':
        return this.renderDocumentsView();
      case 'stats':
        return this.renderStatsView();
      case 'profiles':
        return this.renderProfilesView();
      case 'admin':
        return this.renderAdminView();
      case 'dev':
        return this.renderDeveloperView();
      case 'install':
        return this.renderInstallView();
      case 'home':
      default:
        return this.renderHomeView();
    }
  }

  // ==================== VIEW 1: HOME (ÜBEN & PRÜFUNG) ====================

  renderHomeView() {
    const catalogs = this.storage.getCatalogs();
    const activeCatalog = this.getSelectedCatalog();
    const activeProfile = this.storage.getActiveProfile();
    const stats = activeCatalog
      ? this.storage.getCatalogStatsForProfile(activeCatalog.id, activeProfile)
      : null;

    const maxQ = activeCatalog?.questions.length || 1;
    const minNum = activeCatalog && activeCatalog.questions.length
      ? Math.min(...activeCatalog.questions.map(q => q.number))
      : 1;
    const maxNum = activeCatalog && activeCatalog.questions.length
      ? Math.max(...activeCatalog.questions.map(q => q.number))
      : 1;

    const correctPct = stats && stats.totalQuestions > 0
      ? Math.round((stats.masteredCount / stats.totalQuestions) * 100)
      : 0;
    const wrongPct = stats && stats.totalQuestions > 0
      ? Math.round((stats.wrongCount / stats.totalQuestions) * 100)
      : 0;

    const appConfig = this.storage.getAppConfig();
    const customLogo = appConfig.logo || 'assets/app-logo.jpg';
    const fwName = appConfig.feuerwehrName || 'Freiwillige Feuerwehr';

    return `
      <!-- STARTSEITEN-BANNER MIT EIGENEM FEUERWEHR-LOGO / WAPPEN -->
      <div class="card" style="background:linear-gradient(135deg, #1E293B 0%, #0F172A 100%); color:#FFF; border:none; padding:18px 20px;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap;">
          <div style="display:flex; align-items:center; gap:16px; flex:1; min-width:230px;">
            <img src="${this.escapeHtml(customLogo)}"
                 alt="Feuerwehr Logo"
                 style="width:68px; height:68px; border-radius:16px; object-fit:contain; background:rgba(255,255,255,0.08); padding:4px; border:2px solid rgba(255,255,255,0.2); box-shadow:0 4px 12px rgba(0,0,0,0.35); flex-shrink:0;" />
            <div>
              <div style="font-size:0.75rem; font-weight:800; text-transform:uppercase; letter-spacing:0.06em; color:var(--fw-gold); margin-bottom:2px;">
                🚒 ${this.escapeHtml(fwName)}
              </div>
              <h2 style="margin:0 0 4px 0; font-size:1.18rem; font-weight:900; color:#FFF;">
                ${activeProfile
                  ? `Hallo, ${this.escapeHtml(activeProfile.name)}!`
                  : 'Willkommen bei der LÖSCHSTOFF ACADEMY!'}
              </h2>
              <p style="margin:0; font-size:0.84rem; color:#CBD5E1; line-height:1.35;">
                ${activeProfile
                  ? 'Dein persönlicher Lernstand wird automatisch auf diesem Gerät gespeichert.'
                  : 'Lege jetzt dein persönliches Profil an, damit dein Lernfortschritt gespeichert wird.'}
              </p>
            </div>
          </div>
          ${!activeProfile ? `
            <button class="btn btn-primary btn-sm" onclick="app.openCreateProfileModal(false)">
              + Profil anlegen
            </button>
          ` : `
            <button class="btn btn-outline btn-sm" style="border-color:rgba(255,255,255,0.25); color:#FFF; background:rgba(255,255,255,0.08);" onclick="app.switchTab('stats')">
              📊 Meine Statistik
            </button>
          `}
        </div>
      </div>

      <!-- FRAGEBOGEN AUSWAHL -->
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">1. Fragebogen wählen</h2>
            <p class="card-subtitle">Wähle den Fragenkatalog aus, für den du üben möchtest</p>
          </div>
          <span class="badge badge-slate">${catalogs.length} Kataloge</span>
        </div>

        <div class="catalog-grid">
          ${catalogs.map(cat => {
            const catStats = this.storage.getCatalogStatsForProfile(cat.id, activeProfile);
            const isSelected = cat.id === activeCatalog?.id;
            return `
              <div class="catalog-item ${isSelected ? 'selected' : ''}"
                   onclick="app.selectCatalog('${this.escapeHtml(cat.id)}')">
                <div class="catalog-icon">${cat.icon || '🚒'}</div>
                <div class="catalog-info">
                  <div class="catalog-name">${this.escapeHtml(cat.title)}</div>
                  <div class="catalog-meta">
                    ${cat.questions.length} Fragen im Katalog ·
                    Prüfung: ${Math.min(cat.examConfig?.questionCount || 50, cat.questions.length)} Fragen (${cat.examConfig?.passPercentage || 75}% zum Bestehen)
                  </div>
                  ${activeProfile ? `
                    <div style="margin-top:6px; font-size:0.76rem; font-weight:700; color:${catStats.masteredPercent >= 75 ? '#16A34A' : '#475569'};">
                      Lernstand (${this.escapeHtml(activeProfile.name)}): ${catStats.masteredCount}/${catStats.totalQuestions} gemeistert (${catStats.masteredPercent}%)
                    </div>
                  ` : ''}
                </div>
                <div style="font-size:1.2rem; color:${isSelected ? 'var(--fw-red)' : '#CBD5E1'};">
                  ${isSelected ? '●' : '○'}
                </div>
              </div>
            `;
          }).join('')}
        </div>

        ${activeCatalog && stats ? `
          <div style="margin-top:14px; padding-top:14px; border-top:1px solid var(--border-color);">
            <div style="display:flex; justify-content:space-between; font-size:0.8rem; font-weight:700; margin-bottom:6px;">
              <span style="color:#16A34A;">✓ ${stats.masteredCount} Richtig</span>
              <span style="color:#DC2626;">✗ ${stats.wrongCount} Fehler</span>
              <span style="color:#64748B;">○ ${stats.unseenCount} Offen</span>
            </div>
            <div class="progress-bar-track">
              <div class="progress-seg-correct" style="width:${correctPct}%"></div>
              <div class="progress-seg-wrong" style="width:${wrongPct}%"></div>
            </div>
          </div>
        ` : ''}
      </div>

      ${activeCatalog ? `
        <!-- MODUS AUSWAHL: ÜBEN vs. PRÜFUNG -->
        <div class="mode-grid">
          <!-- ÜBUNGSMODUS -->
          <div class="mode-card practice-card">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span class="badge badge-green">Lernmodus</span>
                <span style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">Sofort-Feedback</span>
              </div>
              <h3 style="margin:0 0 6px 0; font-size:1.15rem;">📚 Fragen üben</h3>
              <p style="margin:0 0 14px 0; font-size:0.84rem; color:var(--text-muted); line-height:1.4;">
                Jede angetippte Antwort wird <strong>sofort grün oder rot</strong> ausgewertet. Der Weiter-Button erscheint erst, wenn alle richtigen Antworten gefunden wurden.
              </p>

              <div style="display:flex; flex-direction:column; gap:8px; margin-bottom:12px;">
                <label class="catalog-item ${this.practiceModeType === 'all' ? 'selected' : ''}" style="padding:10px 12px;"
                       onclick="app.practiceModeType='all'; app.render();">
                  <input type="radio" name="pmode" ${this.practiceModeType === 'all' ? 'checked' : ''} />
                  <div style="font-size:0.88rem; font-weight:700;">
                    Alle Fragen üben (Frage ${minNum} bis ${maxNum})
                  </div>
                </label>

                <label class="catalog-item ${this.practiceModeType === 'range' ? 'selected' : ''}" style="padding:10px 12px;"
                       onclick="app.practiceModeType='range'; app.render();">
                  <input type="radio" name="pmode" ${this.practiceModeType === 'range' ? 'checked' : ''} />
                  <div style="font-size:0.88rem; font-weight:700;">
                    Bestimmten Bereich üben (z. B. Frage 11 bis 23)
                  </div>
                </label>

                ${this.practiceModeType === 'range' ? `
                  <div style="padding:10px 12px; background:var(--bg-subtle); border-radius:var(--radius-sm); border:1px solid var(--border-color);">
                    <div class="range-inputs">
                      <div class="input-group">
                        <label>Von Frage</label>
                        <input type="number" class="form-input" min="${minNum}" max="${maxNum}" value="${this.rangeFrom}"
                               onchange="app.rangeFrom = Math.max(${minNum}, Math.min(${maxNum}, parseInt(this.value,10)||1)); app.render();" />
                      </div>
                      <div style="font-weight:800; padding-top:18px;">bis</div>
                      <div class="input-group">
                        <label>Bis Frage</label>
                        <input type="number" class="form-input" min="${minNum}" max="${maxNum}" value="${this.rangeTo}"
                               onchange="app.rangeTo = Math.max(${minNum}, Math.min(${maxNum}, parseInt(this.value,10)||${maxNum})); app.render();" />
                      </div>
                    </div>
                    <div class="quick-ranges">
                      <button class="chip-btn ${this.rangeFrom===1 && this.rangeTo===15 ? 'active':''}"
                              onclick="app.rangeFrom=1; app.rangeTo=Math.min(15,${maxNum}); app.render();">1 – 15</button>
                      <button class="chip-btn ${this.rangeFrom===11 && this.rangeTo===23 ? 'active':''}"
                              onclick="app.rangeFrom=Math.min(11,${maxNum}); app.rangeTo=Math.min(23,${maxNum}); app.render();">11 – 23</button>
                      <button class="chip-btn ${this.rangeFrom===16 && this.rangeTo===30 ? 'active':''}"
                              onclick="app.rangeFrom=Math.min(16,${maxNum}); app.rangeTo=Math.min(30,${maxNum}); app.render();">16 – 30</button>
                      <button class="chip-btn ${this.rangeFrom===31 && this.rangeTo===maxNum ? 'active':''}"
                              onclick="app.rangeFrom=Math.min(31,${maxNum}); app.rangeTo=${maxNum}; app.render();">31 – ${maxNum}</button>
                    </div>
                  </div>
                ` : ''}

                <label class="catalog-item ${this.practiceModeType === 'mistakes' ? 'selected' : ''}" style="padding:10px 12px;"
                       onclick="app.practiceModeType='mistakes'; app.render();">
                  <input type="radio" name="pmode" ${this.practiceModeType === 'mistakes' ? 'checked' : ''} />
                  <div style="font-size:0.88rem; font-weight:700;">
                    Gezielt Fehler & offene Fragen (${(stats?.wrongCount || 0) + (stats?.unseenCount || 0)})
                  </div>
                </label>
              </div>
            </div>

            <button class="btn btn-success btn-block" onclick="app.startPractice()">
              ▶ Übung jetzt starten
            </button>
          </div>

          <!-- PRÜFUNGSMODUS -->
          <div class="mode-card exam-card">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <span class="badge badge-red">Ernstfall-Simulation</span>
                <span style="font-size:0.78rem; color:var(--text-muted); font-weight:700;">Auswertung am Ende</span>
              </div>
              <h3 style="margin:0 0 6px 0; font-size:1.15rem;">🎓 Prüfungssimulation</h3>
              <p style="margin:0 0 14px 0; font-size:0.84rem; color:var(--text-muted); line-height:1.4;">
                Übe unter echten Prüfungsbedingungen wie beim schriftlichen Leistungsnachweis. Während des Tests gibt es keine Hilfe – erst bei Abgabe folgt die Endauswertung!
              </p>

              <div style="background:var(--bg-selected-red); border:1px solid var(--border-selected-red); border-radius:var(--radius-md); padding:12px 14px; margin-bottom:14px;">
                <div style="font-size:0.8rem; font-weight:800; color:#EF4444; text-transform:uppercase; margin-bottom:8px;">
                  Prüfungsbedingungen (${this.escapeHtml(activeCatalog.title)})
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.86rem; padding:4px 0; border-bottom:1px dashed var(--border-selected-red);">
                  <span>Zufällige Fragen:</span>
                  <strong>${Math.min(activeCatalog.examConfig?.questionCount || 50, maxQ)} aus ${maxQ} Fragen</strong>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.86rem; padding:4px 0; border-bottom:1px dashed var(--border-selected-red);">
                  <span>Bestehensgrenze:</span>
                  <strong>mind. ${activeCatalog.examConfig?.passPercentage || 75}% richtig</strong>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:0.86rem; padding:4px 0;">
                  <span>Zeitlimit:</span>
                  <strong>${activeCatalog.examConfig?.timeLimitMinutes ? activeCatalog.examConfig.timeLimitMinutes + ' Minuten' : 'Kein Zeitlimit'}</strong>
                </div>
              </div>

              ${stats?.lastExam ? `
                <div style="font-size:0.8rem; color:var(--text-muted); margin-bottom:8px;">
                  Letzte Prüfung: <strong style="color:${stats.lastExam.passed ? '#16A34A' : '#DC2626'}">
                    ${stats.lastExam.percentage}% (${stats.lastExam.passed ? 'Bestanden' : 'Nicht bestanden'})
                  </strong>
                </div>
              ` : ''}
            </div>

            <button class="btn btn-primary btn-block" onclick="app.startExam()">
              📝 Prüfung starten (${Math.min(activeCatalog.examConfig?.questionCount || 50, maxQ)} Fragen)
            </button>
          </div>
        </div>
      ` : ''}
    `;
  }

  // ==================== VIEW 2: QUIZ SESSION (PRACTICE & EXAM) ====================

  renderQuizSessionView() {
    const s = this.session;
    const item = s.items[s.currentIndex];
    const total = s.items.length;
    const isPractice = s.mode === 'practice';
    const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

    const totalCorrectAnswers = item.answers.filter(a => a.isCorrect).length;
    const foundCorrectAnswers = item.answers.filter(a => a.isCorrect && a.clicked).length;
    const remainingCorrect = totalCorrectAnswers - foundCorrectAnswers;
    const progressPct = Math.round(((s.currentIndex + 1) / total) * 100);

    return `
      <div class="quiz-topbar">
        <button class="btn btn-outline btn-sm" onclick="app.switchTab('home')">
          ✕ Beenden
        </button>
        <div style="text-align:center;">
          <div style="font-size:0.75rem; font-weight:800; color:var(--text-muted); text-transform:uppercase;">
            ${this.escapeHtml(s.modeLabel)}
          </div>
          <div style="font-size:0.9rem; font-weight:800;">
            Frage ${s.currentIndex + 1} von ${total}
          </div>
        </div>
        ${!isPractice && s.timeLimitSeconds > 0 ? `
          <span id="exam-timer-display" class="badge badge-red" style="font-size:0.85rem;">
            ⏱ ${this.formatSeconds(s.remainingSeconds)}
          </span>
        ` : `
          <span class="badge ${isPractice ? 'badge-green' : 'badge-red'}">
            ${isPractice ? 'Übung' : 'Prüfung'}
          </span>
        `}
      </div>

      <div class="progress-bar-track" style="height:6px; margin-bottom:12px;">
        <div style="background:${isPractice ? '#16A34A' : 'var(--fw-red)'}; width:${progressPct}%; height:100%; transition:width 0.2s ease;"></div>
      </div>

      ${!isPractice ? `
        <div class="exam-nav-strip">
          ${s.items.map((it, idx) => {
            const isAns = it.answers.some(a => a.selected);
            const isCurr = idx === s.currentIndex;
            return `
              <button class="exam-q-pill ${isAns ? 'answered' : ''} ${isCurr ? 'current' : ''}"
                      onclick="app.jumpToQuestion(${idx})"
                      title="Frage Nr. ${it.questionNumber}">
                ${idx + 1}
              </button>
            `;
          }).join('')}
        </div>
      ` : ''}

      <div class="question-card">
        <div class="question-meta-row">
          <span class="question-number-tag">Katalog-Frage Nr. ${item.questionNumber}</span>
          <span class="badge badge-slate">
            ${totalCorrectAnswers > 1 ? `Multiple-Choice (${totalCorrectAnswers} richtige Antworten)` : '1 richtige Antwort'}
          </span>
        </div>

        <h2 class="question-text">${this.escapeHtml(item.question)}</h2>

        ${item.image ? `
          <div class="question-image-wrap" style="margin:12px 0 16px 0; text-align:center;">
            <img src="${this.escapeHtml(item.image)}" alt="Fragenbild" style="max-width:100%; max-height:260px; border-radius:12px; border:2px solid var(--border-color); box-shadow:0 2px 8px rgba(0,0,0,0.12);" />
          </div>
        ` : ''}

        <div class="answers-list">
          ${item.answers.map((ans, idx) => {
            const letter = letters[idx] || String(idx + 1);

            if (isPractice) {
              let stateClass = '';
              let statusHtml = '<span style="color:#94A3B8; font-size:0.8rem;">Antippen</span>';

              if (ans.clicked) {
                if (ans.isCorrect) {
                  stateClass = 'practice-correct locked';
                  statusHtml = '<span>✓ Richtig</span>';
                } else {
                  stateClass = 'practice-wrong locked';
                  statusHtml = '<span>✗ Falsch</span>';
                }
              } else if (item.completed) {
                stateClass = 'locked';
                statusHtml = '';
              }

              return `
                <button type="button"
                        class="answer-slot ${stateClass}"
                        onclick="app.handleAnswerClick(${idx})">
                  <span class="slot-letter">${letter}</span>
                  <span class="slot-text">${this.escapeHtml(ans.text)}</span>
                  <span class="slot-status">${statusHtml}</span>
                </button>
              `;
            } else {
              const selClass = ans.selected ? 'exam-selected' : '';
              return `
                <button type="button"
                        class="answer-slot ${selClass}"
                        onclick="app.handleAnswerClick(${idx})">
                  <span class="slot-letter">${letter}</span>
                  <span class="slot-text">${this.escapeHtml(ans.text)}</span>
                  <span class="exam-checkbox">${ans.selected ? '✕' : ''}</span>
                </button>
              `;
            }
          }).join('')}
        </div>

        ${isPractice ? `
          ${item.completed ? `
            ${item.explanation ? `
              <div class="explanation-box">
                <strong>💡 Erklärung / Merksatz:</strong><br/>
                ${this.escapeHtml(item.explanation)}
              </div>
            ` : ''}
            <div style="margin-top:16px;">
              <button class="btn btn-success btn-block" onclick="app.nextQuestion()">
                ${s.currentIndex < total - 1 ? 'Weiter zur nächsten Frage →' : 'Übung abschließen & Auswertung anzeigen →'}
              </button>
            </div>
          ` : `
            <div class="practice-hint-banner">
              👆 Wähle ${remainingCorrect === totalCorrectAnswers
                ? (totalCorrectAnswers > 1 ? `alle ${totalCorrectAnswers} richtigen Antworten` : 'die richtige Antwort')
                : `noch ${remainingCorrect} weitere richtige Antwort(en)`} aus, um den <strong>Weiter-Button</strong> freizuschalten.
            </div>
          `}
        ` : `
          <div style="display:flex; gap:10px; margin-top:18px;">
            <button class="btn btn-outline" style="flex:1"
                    ${s.currentIndex === 0 ? 'disabled' : ''}
                    onclick="app.prevQuestion()">
              ← Zurück
            </button>
            ${s.currentIndex < total - 1 ? `
              <button class="btn btn-navy" style="flex:2" onclick="app.nextQuestion()">
                Nächste Frage →
              </button>
            ` : `
              <button class="btn btn-primary" style="flex:2" onclick="app.finishExam(false)">
                🎓 Prüfung abgeben & auswerten
              </button>
            `}
          </div>

          <div style="margin-top:12px; text-align:center;">
            <button class="btn btn-outline btn-sm" onclick="app.finishExam(false)">
              Prüfung vorzeitig abgeben & auswerten
            </button>
          </div>
        `}
      </div>
    `;
  }

  // ==================== VIEW 3: EVALUATION / RESULT SCREEN ====================

  renderEvaluationView(res) {
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];
    const filteredItems = res.items.filter(item => {
      if (this.resultFilter === 'wrong') return !item.isCorrect;
      if (this.resultFilter === 'correct') return item.isCorrect;
      return true;
    });

    return `
      <div class="result-hero ${res.passed ? 'passed' : 'failed'}">
        <div style="font-size:2.4rem;">${res.passed ? '🏆' : '⚠️'}</div>
        <h2 style="margin:6px 0 2px 0; font-size:1.5rem; font-weight:900;">
          ${res.passed ? 'BESTANDEN!' : 'NICHT BESTANDEN'}
        </h2>
        <div style="font-size:0.9rem; opacity:0.92;">
          ${this.escapeHtml(res.catalogTitle)} (${this.escapeHtml(res.modeLabel)})
        </div>
        <div class="result-percent">${res.percentage}%</div>
        <div style="font-size:0.9rem; font-weight:700;">
          ${res.correctCount} von ${res.totalQuestions} Fragen richtig
          (mind. ${res.passPercentage}% erforderlich)
        </div>
      </div>

      <div class="stats-kpi-grid">
        <div class="kpi-box">
          <div class="kpi-val" style="color:#16A34A;">${res.correctCount}</div>
          <div class="kpi-lbl">✓ Richtige Fragen</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-val" style="color:#DC2626;">${res.wrongCount}</div>
          <div class="kpi-lbl">✗ Falsche Fragen</div>
        </div>
        <div class="kpi-box">
          <div class="kpi-val">${this.formatSeconds(res.durationSeconds || 0)}</div>
          <div class="kpi-lbl">⏱ Dauer</div>
        </div>
      </div>

      <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:18px;">
        <button class="btn btn-outline" style="flex:1" onclick="app.lastResult=null; app.switchTab('home');">
          ← Zurück zur Übersicht
        </button>
        ${res.wrongCount > 0 ? `
          <button class="btn btn-primary" style="flex:2" onclick="app.retryWrongQuestionsFromResult()">
            🔁 ${res.wrongCount} falsche Frage(n) jetzt gezielt üben
          </button>
        ` : ''}
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Einzelauswertung der Fragen</h3>
        </div>

        <div class="filter-tabs">
          <button class="tab-btn ${this.resultFilter === 'all' ? 'active' : ''}"
                  onclick="app.resultFilter='all'; app.render();">
            Alle (${res.totalQuestions})
          </button>
          <button class="tab-btn ${this.resultFilter === 'wrong' ? 'active' : ''}"
                  onclick="app.resultFilter='wrong'; app.render();">
            ✗ Falsch (${res.wrongCount})
          </button>
          <button class="tab-btn ${this.resultFilter === 'correct' ? 'active' : ''}"
                  onclick="app.resultFilter='correct'; app.render();">
            ✓ Richtig (${res.correctCount})
          </button>
        </div>

        ${filteredItems.length === 0 ? `
          <p style="text-align:center; color:var(--text-muted); padding:16px 0;">
            Keine Fragen in dieser Filter-Ansicht.
          </p>
        ` : filteredItems.map(item => `
          <div class="review-item ${item.isCorrect ? 'review-correct' : 'review-wrong'}">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
              <span style="font-weight:800; font-size:0.84rem; color:var(--text-main);">
                Frage Nr. ${item.questionNumber}
              </span>
              <span class="badge ${item.isCorrect ? 'badge-green' : 'badge-red'}">
                ${item.isCorrect ? '✓ Richtig beantwortet' : '✗ Falsch / Mit Fehler'}
              </span>
            </div>
            <div style="font-weight:700; font-size:0.96rem; margin-bottom:10px;">
              ${this.escapeHtml(item.question)}
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
              ${item.answers.map((a, idx) => {
                let bg = 'var(--bg-subtle)';
                let border = 'var(--border-color)';
                let badge = '';

                if (a.isCorrect && a.userSelected) {
                  bg = 'var(--success-bg)'; border = 'var(--success-border)';
                  badge = '<span class="badge badge-green">✓ Deine Wahl (Richtig)</span>';
                } else if (a.isCorrect && !a.userSelected) {
                  bg = 'rgba(234, 179, 8, 0.18)'; border = '#CA8A04';
                  badge = '<span class="badge" style="background:#FEF08A;color:#854D0E;">✓ Richtige Antwort (nicht gewählt)</span>';
                } else if (!a.isCorrect && a.userSelected) {
                  bg = 'var(--danger-bg)'; border = 'var(--danger-border)';
                  badge = '<span class="badge badge-red">✗ Deine Wahl (Falsch)</span>';
                }

                return `
                  <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding:8px 10px; border-radius:8px; background:${bg}; border:1.5px solid ${border}; font-size:0.85rem;">
                    <span><strong>${letters[idx] || ''}:</strong> ${this.escapeHtml(a.text)}</span>
                    ${badge}
                  </div>
                `;
              }).join('')}
            </div>
            ${item.explanation ? `
              <div style="margin-top:8px; font-size:0.8rem; color:var(--success-text); background:var(--success-bg); padding:8px 10px; border-radius:6px;">
                💡 ${this.escapeHtml(item.explanation)}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  // ==================== VIEW 4: STATISTIK & FORTSCHRITT ====================

  renderStatsView() {
    const profile = this.storage.getActiveProfile();
    const catalogs = this.storage.getCatalogs();
    const catalog = this.getSelectedCatalog();

    if (!profile) {
      return `
        <div class="card" style="text-align:center; padding:32px 18px;">
          <h3>👤 Noch kein Profil ausgewählt</h3>
          <p style="color:var(--text-muted); font-size:0.9rem;">
            Bitte lege zuerst ein Profil an, um deine persönliche Lern- und Prüfungsstatistik zu sehen.
          </p>
          <button class="btn btn-primary" onclick="app.openCreateProfileModal(false)">
            + Jetzt Profil anlegen
          </button>
        </div>
      `;
    }

    const stats = this.storage.getCatalogStatsForProfile(catalog?.id, profile);
    const correctPct = stats.totalQuestions > 0 ? Math.round((stats.masteredCount / stats.totalQuestions) * 100) : 0;
    const wrongPct = stats.totalQuestions > 0 ? Math.round((stats.wrongCount / stats.totalQuestions) * 100) : 0;

    return `
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">📊 Statistik für ${this.escapeHtml(profile.name)}</h2>
            <p class="card-subtitle">Persönlicher Lernfortschritt & Prüfungsergebnisse</p>
          </div>
          <select class="form-select" style="width:auto; font-weight:700; font-size:0.85rem;"
                  onchange="app.selectCatalog(this.value)">
            ${catalogs.map(c => `
              <option value="${this.escapeHtml(c.id)}" ${c.id === catalog?.id ? 'selected' : ''}>
                ${this.escapeHtml(c.title)}
              </option>
            `).join('')}
          </select>
        </div>

        <div class="stats-kpi-grid">
          <div class="kpi-box">
            <div class="kpi-val" style="color:#16A34A;">${stats.masteredPercent}%</div>
            <div class="kpi-lbl">Katalog gemeistert (${stats.masteredCount}/${stats.totalQuestions})</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-val" style="color:var(--fw-red);">${stats.examsPassed}/${stats.examsCount}</div>
            <div class="kpi-lbl">Prüfungen bestanden (${stats.passRate}%)</div>
          </div>
          <div class="kpi-box">
            <div class="kpi-val">${stats.avgExamPercent}%</div>
            <div class="kpi-lbl">Ø Prüfungs-Ergebnis</div>
          </div>
        </div>

        <div style="margin-bottom:12px;">
          <div style="display:flex; justify-content:space-between; font-size:0.82rem; font-weight:700; margin-bottom:6px;">
            <span style="color:#16A34A;">✓ Sicher gewusst: ${stats.masteredCount}</span>
            <span style="color:#DC2626;">✗ Zuletzt falsch: ${stats.wrongCount}</span>
            <span style="color:#64748B;">○ Noch offen: ${stats.unseenCount}</span>
          </div>
          <div class="progress-bar-track" style="height:12px;">
            <div class="progress-seg-correct" style="width:${correctPct}%"></div>
            <div class="progress-seg-wrong" style="width:${wrongPct}%"></div>
          </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; padding-top:10px; border-top:1px solid var(--border-color);">
          ${stats.wrongCount > 0 ? `
            <button class="btn btn-primary btn-sm" onclick="app.practiceModeType='mistakes'; app.switchTab('home'); app.startPractice();">
              🎯 ${stats.wrongCount} Problemfrage(n) jetzt üben
            </button>
          ` : `<span style="font-size:0.82rem; color:#16A34A; font-weight:700;">Keine offenen Fehlerfragen!</span>`}

          <button class="btn btn-danger-outline btn-sm"
                  onclick="if(confirm('Lernfortschritt von ${this.escapeHtml(profile.name)} für diesen Fragebogen wirklich zurücksetzen?')) { app.storage.resetProfileCatalogProgress('${this.escapeHtml(catalog.id)}'); app.render(); }">
            Fortschritt zurücksetzen
          </button>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">🕓 Letzte Prüfungen & Übungen</h3>
        </div>
        ${!stats.history || stats.history.length === 0 ? `
          <p style="color:var(--text-muted); font-size:0.88rem; text-align:center; padding:14px 0;">
            Noch keine abgeschlossenen Durchgänge für diesen Fragebogen vorhanden.
          </p>
        ` : `
          <div style="display:flex; flex-direction:column; gap:10px;">
            ${stats.history.slice(0, 20).map((h) => `
              <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; padding:12px; border-radius:var(--radius-md); border:1px solid var(--border-color); background:var(--bg-subtle);">
                <div>
                  <div style="display:flex; align-items:center; gap:6px; margin-bottom:3px;">
                    <span class="badge ${h.mode === 'exam' ? 'badge-red' : 'badge-green'}">
                      ${h.mode === 'exam' ? '🎓 Prüfung' : '📚 Übung'}
                    </span>
                    <strong style="font-size:0.9rem;">${h.percentage}% (${h.correctCount}/${h.totalQuestions} richtig)</strong>
                  </div>
                  <div style="font-size:0.78rem; color:var(--text-muted);">
                    ${this.escapeHtml(h.modeLabel || '')} · ${this.formatDate(h.timestamp)}
                  </div>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                  <span class="badge ${h.passed ? 'badge-green' : 'badge-red'}">
                    ${h.passed ? 'Bestanden' : 'Nicht best.'}
                  </span>
                  ${Array.isArray(h.items) ? `
                    <button class="btn btn-outline btn-sm"
                            onclick="app.viewHistorySession('${this.escapeHtml(h.id)}')">
                      Details
                    </button>
                  ` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  }

  viewHistorySession(sessionId) {
    const profile = this.storage.getActiveProfile();
    if (!profile || !Array.isArray(profile.history)) return;
    const found = profile.history.find(h => h.id === sessionId);
    if (found) {
      this.lastResult = found;
      this.resultFilter = 'all';
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.render();
    }
  }

  // ==================== VIEW 5: PROFILE VERWALTEN (OHNE DIENSTGRAD) ====================

  renderProfilesView() {
    const profiles = this.storage.getProfiles();
    const active = this.storage.getActiveProfile();
    const defaultCatId = this.selectedCatalogId;

    return `
      <div class="card">
        <div class="card-header" style="margin-bottom:4px;">
          <div>
            <h2 class="card-title">🎨 Darstellung & Design-Modus</h2>
            <p class="card-subtitle">Wähle zwischen hellem Design, dunklem Nachtmodus oder automatischer Anpassung</p>
          </div>
          ${this.renderThemeSelectorBar()}
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">👥 Benutzer-Profile</h2>
            <p class="card-subtitle">Jedes Profil speichert seinen eigenen Lernfortschritt und eigene Prüfungsergebnisse</p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="app.openCreateProfileModal(false)">
            + Neues Profil
          </button>
        </div>

        ${profiles.length === 0 ? `
          <div style="text-align:center; padding:24px 12px;">
            <p style="color:var(--text-muted);">Noch kein Profil angelegt. Erstelle jetzt dein erstes Profil!</p>
            <button class="btn btn-primary" onclick="app.openCreateProfileModal(false)">
              + Erstes Profil erstellen
            </button>
          </div>
        ` : `
          <div style="display:flex; flex-direction:column; gap:10px;">
            ${profiles.map(p => {
              const isAct = active && active.id === p.id;
              const initials = p.name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
              const pStats = this.storage.getCatalogStatsForProfile(defaultCatId, p);
              return `
                <div class="catalog-item ${isAct ? 'selected' : ''}"
                     onclick="app.storage.setActiveProfile('${this.escapeHtml(p.id)}'); app.render();">
                  <div class="profile-avatar" style="width:44px; height:44px; font-size:1rem; background:${p.color}; border-color:#E2E8F0;">
                    ${this.escapeHtml(initials)}
                  </div>
                  <div class="catalog-info">
                    <div class="catalog-name">
                      ${this.escapeHtml(p.name)}
                      ${isAct ? '<span class="badge badge-green" style="margin-left:6px;">Aktiv</span>' : ''}
                    </div>
                    <div class="catalog-meta">
                      Lernstand: ${pStats.masteredPercent}% (${pStats.masteredCount}/${pStats.totalQuestions}) · Prüfungen: ${pStats.examsCount}
                    </div>
                  </div>
                  <button class="btn btn-danger-outline btn-sm"
                          onclick="event.stopPropagation(); if(confirm('Profil „${this.escapeHtml(p.name)}“ wirklich löschen?')) { app.storage.deleteProfile('${this.escapeHtml(p.id)}'); app.render(); }">
                    🗑
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    `;
  }

  // ==================== VIEW 6: ADMIN-BEREICH (NUR EINLADUNGSLINKS & ADMIN-PIN) ====================

  renderAdminView() {
    if (!this.adminUnlocked && !this.devUnlocked) {
      return `
        <div class="card" style="max-width:440px; margin:20px auto; text-align:center;">
          <div style="font-size:2.5rem; margin-bottom:8px;">🛡️</div>
          <h2 class="card-title">Admin-Bereich</h2>
          <p class="card-subtitle" style="margin-bottom:16px;">
            Hier kannst du Einladungslinks und PINs für den App-Zugang erstellen und verwalten.
          </p>
          <div class="input-group" style="text-align:left; margin-bottom:14px;">
            <label>Admin-PIN eingeben</label>
            <input type="password" id="admin-pin-input" class="form-input" placeholder="Admin-PIN (Standard: 1122)"
                   onkeydown="if(event.key==='Enter') app.unlockAdminArea()" />
          </div>
          <button class="btn btn-primary btn-block" onclick="app.unlockAdminArea()">
            Admin-Bereich entsperren
          </button>
          <div style="margin-top:14px; text-align:center;">
            <button class="btn btn-outline btn-sm" onclick="app.resetAdminPinPrompt()" style="font-size:0.75rem; color:var(--text-muted);">
              PIN vergessen?
            </button>
          </div>
        </div>
      `;
    }

    const invites = this.storage.getInvites();

    return `
      <!-- TOP BAR ADMIN -->
      <div class="card" style="background:linear-gradient(135deg, #1E293B 0%, #0F172A 100%); color:#FFF; border:none;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            <span class="badge" style="background:var(--fw-gold); color:#0F172A; margin-bottom:4px; font-weight:800;">🛡️ Admin-Bereich</span>
            <h2 style="margin:0; font-size:1.15rem;">Zugangslinks & PIN-Verwaltung</h2>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="btn btn-outline btn-sm" style="color:#FFF; border-color:rgba(255,255,255,0.3);" onclick="app.adminUnlocked=false; app.render();">
              🔒 Sperren
            </button>
          </div>
        </div>
      </div>

      <!-- 1. EINLADUNGSLINKS FÜR APP-ZUGANG -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">🎟 Einladungslinks für App-Zugang</h3>
            <p class="card-subtitle">
              Generiere Zugangslinks für deine Feuerwehr-Kameraden. Kopiere den Link zusammen mit der PIN und sende ihn weiter. Beim ersten Öffnen tippt der Nutzer die PIN ein und hat vollen Zugriff auf die gesamte App (auch 100% offline).
            </p>
          </div>
          <button class="btn btn-primary btn-sm" onclick="app.openCreateInviteModal()">
            + Neuen Zugangslink erstellen
          </button>
        </div>

        ${invites.length === 0 ? `
          <div style="text-align:center; padding:24px 16px; background:var(--bg-subtle); border-radius:var(--radius-md); border:1px dashed var(--input-border);">
            <p style="margin:0 0 12px 0; color:var(--text-muted); font-size:0.9rem;">
              Noch keine Zugangslinks erstellt. Klicke auf den Button, um den ersten Link mit PIN zu generieren.
            </p>
            <button class="btn btn-primary" onclick="app.openCreateInviteModal()">
              + Jetzt ersten Einladungslink generieren
            </button>
          </div>
        ` : `
          <div style="display:flex; flex-direction:column; gap:12px;">
            ${invites.map(inv => `
              <div style="display:flex; align-items:center; justify-content:space-between; gap:14px; padding:14px 16px; border-radius:var(--radius-md); border:1.5px solid var(--border-color); background:var(--bg-subtle); flex-wrap:wrap;">
                <div style="flex:1; min-width:200px;">
                  <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px;">
                    <span style="font-size:0.8rem; font-weight:800; color:var(--text-muted); text-transform:uppercase;">Zugangs-PIN:</span>
                    <span class="badge badge-green" style="font-size:1.1rem; font-weight:900; letter-spacing:0.12em; padding:4px 12px;">
                      ${this.escapeHtml(inv.pin)}
                    </span>
                  </div>
                  <div style="font-size:0.78rem; color:var(--text-muted);">
                    Erstellt am ${this.formatDate(inv.createdAt)}
                  </div>
                </div>

                <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                  <button class="btn btn-primary btn-sm" onclick="app.copyInviteWithPin('${this.escapeHtml(inv.token)}', '${this.escapeHtml(inv.pin)}')">
                    📋 Link + PIN kopieren
                  </button>
                  <button class="btn btn-outline btn-sm" onclick="app.copyInviteOnlyLink('${this.escapeHtml(inv.token)}')">
                    🔗 Nur Link kopieren
                  </button>
                  <button class="btn btn-danger-outline btn-sm" onclick="app.deleteInvite('${this.escapeHtml(inv.id)}')">
                    🗑
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- 2. ADMIN-PIN ÄNDERN -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">🔑 Admin-PIN ändern</h3>
            <p class="card-subtitle">PIN zum Entsperren dieses Admin-Bereichs (Standard: 1122)</p>
          </div>
        </div>
        <div style="display:flex; align-items:flex-end; gap:10px; flex-wrap:wrap;">
          <div class="input-group" style="flex:1; min-width:200px;">
            <label>Neue Admin-PIN</label>
            <input type="text" id="admin-new-pin" class="form-input" placeholder="Neue PIN"
                   value="${this.escapeHtml(this.storage.getAdminPin())}" />
          </div>
          <button class="btn btn-navy btn-sm" onclick="app.saveNewAdminPin()">
            PIN speichern
          </button>
        </div>
      </div>
    `;
  }

  // ==================== VIEW 7: ENTWICKLER-BEREICH (ROOT / CODE / EXPORT) ====================

  renderDeveloperView() {
    if (!this.devUnlocked) {
      return `
        <div class="card" style="max-width:440px; margin:20px auto; text-align:center;">
          <div style="font-size:2.5rem; margin-bottom:8px;">⚙️</div>
          <h2 class="card-title">Entwickler-Bereich (Root)</h2>
          <p class="card-subtitle" style="margin-bottom:16px;">
            Entwickler-Werkzeuge für Fragebögen, Dokumente, Startseiten-Wappen, Code-Synchronisation und Git-Export.
          </p>
          <div class="input-group" style="text-align:left; margin-bottom:14px;">
            <label>Entwickler-PIN eingeben</label>
            <input type="password" id="dev-pin-input" class="form-input" placeholder="PIN eingeben (Standard: 1120)"
                   onkeydown="if(event.key==='Enter') app.unlockDevArea()" />
          </div>
          <button class="btn btn-primary btn-block" onclick="app.unlockDevArea()">
            Entwickler-Bereich entsperren
          </button>
          <div style="margin-top:14px; text-align:center;">
            <button class="btn btn-outline btn-sm" onclick="app.resetDevPinPrompt()" style="font-size:0.75rem; color:var(--text-muted);">
              PIN vergessen?
            </button>
          </div>
        </div>
      `;
    }

    const catalogs = this.storage.getCatalogs();
    const editCat = this.storage.getCatalogById(this.devEditingCatalogId) || catalogs[0];
    if (editCat && this.devEditingCatalogId !== editCat.id) {
      this.devEditingCatalogId = editCat.id;
    }

    const filteredQuestions = editCat
      ? editCat.questions.filter(q => {
          if (!this.devSearchQuery.trim()) return true;
          const s = this.devSearchQuery.toLowerCase();
          return String(q.number).includes(s) || q.question.toLowerCase().includes(s);
        })
      : [];

    return `
      <!-- TOP BAR ENTWICKLER -->
      <div class="card" style="background:linear-gradient(135deg, #1E293B 0%, #0F172A 100%); color:#FFF; border:none;">
        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
          <div>
            <span class="badge" style="background:#38BDF8; color:#0F172A; margin-bottom:4px; font-weight:800;">⚙️ Entwickler-Modus aktiv</span>
            <h2 style="margin:0; font-size:1.15rem;">Code-Verwaltung & Inhalte pflegen</h2>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap;">
            <button class="btn btn-primary btn-sm" onclick="app.downloadCatalogsJson()">
              💾 frageboegen.json exportieren
            </button>
            <button class="btn btn-outline btn-sm" style="color:#FFF; border-color:rgba(255,255,255,0.3);" onclick="app.devUnlocked=false; app.render();">
              🔒 Sperren
            </button>
          </div>
        </div>
      </div>

      <!-- 1. STARTSEITEN-BANNER (LOGO & NAME) -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">🚒 1. Feuerwehr-Wappen & Name auf Startseite</h3>
            <p class="card-subtitle">Personalisiere das Startseiten-Banner für die Feuerwehr</p>
          </div>
        </div>

        <div style="display:flex; align-items:center; gap:16px; flex-wrap:wrap; margin-bottom:16px; padding-bottom:14px; border-bottom:1px solid var(--border-color);">
          <img src="${this.escapeHtml(this.storage.getAppConfig().logo || 'assets/app-logo.jpg')}"
               alt="Vorschau Startseiten-Logo"
               style="width:68px; height:68px; border-radius:14px; object-fit:contain; background:var(--bg-subtle); padding:4px; border:2px solid var(--border-color); box-shadow:0 2px 6px rgba(0,0,0,0.15);" />
          <div style="flex:1; min-width:200px;">
            <label style="font-size:0.8rem; font-weight:700; color:var(--text-muted); display:block; margin-bottom:4px;">
              Eigenes Feuerwehr-Logo / Wappen hochladen (.png, .svg, .jpg)
            </label>
            <input type="file" id="admin-logo-input" accept="image/*" class="form-input" style="padding:6px;"
                   onchange="app.handleLogoUpload(this.files[0])" />
          </div>
          <button class="btn btn-outline btn-sm" onclick="app.storage.setAppLogo('assets/app-logo.jpg'); app.render();">
            Standard-Logo wiederherstellen
          </button>
        </div>

        <div style="display:flex; align-items:flex-end; gap:10px; flex-wrap:wrap;">
          <div class="input-group" style="flex:1; min-width:200px;">
            <label>Name der Feuerwehr im Startseiten-Banner</label>
            <input type="text" id="admin-fw-name" class="form-input" placeholder="z. B. Freiwillige Feuerwehr Musterstadt"
                   value="${this.escapeHtml(this.storage.getAppConfig().feuerwehrName || 'Freiwillige Feuerwehr')}" />
          </div>
          <button class="btn btn-navy btn-sm" onclick="app.saveFeuerwehrName()">
            Name speichern
          </button>
        </div>
      </div>

      <!-- 2. FRAGEBOGEN AUSWAHL & IMPORT -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">2. Fragenkatalog auswählen oder neu hinzufügen</h3>
          <button class="btn btn-primary btn-sm" onclick="app.openNewCatalogModal()">
            + Neuer Fragebogen
          </button>
        </div>

        <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap; margin-bottom:14px;">
          <select class="form-select" style="flex:1; min-width:220px; font-weight:700;"
                  onchange="app.devEditingCatalogId=this.value; app.devEditingQuestionIdx=null; app.render();">
            ${catalogs.map(c => `
              <option value="${this.escapeHtml(c.id)}" ${c.id === editCat?.id ? 'selected' : ''}>
                ${c.icon || '🚒'} ${this.escapeHtml(c.title)} (${c.questions.length} Fragen)
              </option>
            `).join('')}
          </select>

          ${editCat && catalogs.length > 1 ? `
            <button class="btn btn-danger-outline btn-sm"
                    onclick="if(confirm('Fragebogen „${this.escapeHtml(editCat.title)}“ wirklich komplett löschen?')) { app.storage.deleteCatalog('${this.escapeHtml(editCat.id)}'); app.devEditingCatalogId=app.storage.getCatalogs()[0]?.id; app.render(); }">
              🗑 Katalog löschen
            </button>
          ` : ''}
        </div>

        <div style="background:var(--bg-subtle); border:1.5px dashed var(--input-border); border-radius:var(--radius-md); padding:14px;">
          <div style="font-weight:800; font-size:0.9rem; margin-bottom:4px;">
            📥 Fragen aus Datei importieren (Excel .xlsx, CSV oder JSON)
          </div>
          <p style="margin:0 0 10px 0; font-size:0.8rem; color:var(--text-muted);">
            Lade eine Excel-Tabelle (<code>.xlsx</code>), CSV oder JSON hoch, um Fragen in diesen Katalog zu importieren.
          </p>
          <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
            <input type="file" id="dev-file-import" accept=".xlsx,.csv,.json" class="form-input" style="flex:1; padding:7px;" />
            <button class="btn btn-navy btn-sm" onclick="app.handleDeveloperFileUpload()">
              Datei importieren
            </button>
            <button class="btn btn-outline btn-sm" onclick="app.downloadCsvTemplate()">
              📄 CSV-Vorlage
            </button>
          </div>
        </div>
      </div>

      ${editCat ? `
        <!-- PRÜFUNGSBEDINGUNGEN -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">3. Prüfungsbedingungen für „${this.escapeHtml(editCat.title)}“</h3>
              <p class="card-subtitle">Gilt sofort für die Prüfungssimulation</p>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(200px, 1fr)); gap:12px; margin-bottom:14px;">
            <div class="input-group">
              <label>Titel des Fragebogens</label>
              <input type="text" id="dev-cat-title" class="form-input" value="${this.escapeHtml(editCat.title)}" />
            </div>
            <div class="input-group">
              <label>Untertitel / Beschreibung</label>
              <input type="text" id="dev-cat-subtitle" class="form-input" value="${this.escapeHtml(editCat.subtitle || '')}" />
            </div>
          </div>

          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:12px; background:var(--bg-selected-red); padding:14px; border-radius:var(--radius-md); border:1px solid var(--border-selected-red); margin-bottom:14px;">
            <div class="input-group">
              <label style="color:var(--fw-red);">Anzahl Prüfungsfragen (Zufall)</label>
              <input type="number" id="dev-exam-count" class="form-input" min="1" max="500"
                     value="${editCat.examConfig?.questionCount || 50}" />
              <span style="font-size:0.74rem; color:var(--text-muted);">z. B. 50 zufällige Fragen (aktuell ${editCat.questions.length})</span>
            </div>

            <div class="input-group">
              <label style="color:var(--fw-red);">Bestehensgrenze (%)</label>
              <input type="number" id="dev-exam-pass" class="form-input" min="1" max="100"
                     value="${editCat.examConfig?.passPercentage || 75}" />
              <span style="font-size:0.74rem; color:var(--text-muted);">z. B. 75 % richtige Antworten</span>
            </div>

            <div class="input-group">
              <label style="color:var(--fw-red);">Zeitlimit in Minuten (0 = ohne)</label>
              <input type="number" id="dev-exam-time" class="form-input" min="0" max="300"
                     value="${editCat.examConfig?.timeLimitMinutes ?? 45}" />
              <span style="font-size:0.74rem; color:var(--text-muted);">0 für unbegrenzte Zeit</span>
            </div>
          </div>

          <button class="btn btn-primary btn-block" onclick="app.saveCatalogConfig()">
            ✓ Prüfungsbedingungen & Titel speichern
          </button>
        </div>

        <!-- FRAGEN-EDITOR -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">4. Fragenkatalog bearbeiten (${editCat.questions.length} Fragen)</h3>
              <p class="card-subtitle">Klicke auf ✏️ zum Bearbeiten oder füge neue Fragen hinzu</p>
            </div>
            <button class="btn btn-success btn-sm" onclick="app.openQuestionModal(-1)">
              + Neue Frage hinzufügen
            </button>
          </div>

          <div style="margin-bottom:12px;">
            <input type="text" class="form-input" placeholder="🔍 Frage oder Fragenummer suchen..."
                   value="${this.escapeHtml(this.devSearchQuery)}"
                   oninput="app.devSearchQuery=this.value; app.render();" />
          </div>

          <div style="max-height:480px; overflow-y:auto; border:1px solid var(--border-color); border-radius:var(--radius-md);">
            ${filteredQuestions.length === 0 ? `
              <div style="padding:20px; text-align:center; color:var(--text-muted);">
                Keine Fragen gefunden.
              </div>
            ` : filteredQuestions.map(q => {
              const realIdx = editCat.questions.findIndex(item => item.number === q.number && item.question === q.question);
              const correctCount = q.answers.filter(a => a.isCorrect).length;
              return `
                <div class="dev-question-row">
                  <div style="flex:1;">
                    <div style="font-size:0.78rem; font-weight:800; color:var(--fw-red);">
                      Frage Nr. ${q.number} · ${q.answers.length} Antworten (${correctCount} richtig)
                    </div>
                    <div style="font-size:0.9rem; font-weight:700; margin-top:2px;">
                      ${this.escapeHtml(q.question)}
                    </div>
                  </div>
                  <div style="display:flex; gap:6px; flex-shrink:0;">
                    <button class="btn btn-outline btn-sm" onclick="app.openQuestionModal(${realIdx})">
                      ✏️
                    </button>
                    <button class="btn btn-danger-outline btn-sm" onclick="app.deleteQuestionFromCatalog(${realIdx})">
                      🗑
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <!-- 5. DOKUMENTE & LERNMATERIAL (PDF) -->
      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">5. Dokumente & Lernmaterial verwalten (${this.storage.getDocuments().length})</h3>
            <p class="card-subtitle">Bestehende PDFs austauschen, Merkblätter anpassen oder neue hinzufügen</p>
          </div>
          <button class="btn btn-success btn-sm" onclick="app.openDocumentModal(null)">
            + Neues Dokument
          </button>
        </div>

        <div style="display:flex; flex-direction:column; gap:8px;">
          ${this.storage.getDocuments().map(doc => `
            <div class="dev-question-row" style="border:1px solid var(--border-color); border-radius:var(--radius-sm); padding:10px 12px;">
              <div style="flex:1; min-width:0;">
                <div style="font-size:0.76rem; font-weight:800; color:var(--fw-red);">
                  ${this.escapeHtml(doc.category || 'Dokument')} ${doc.size ? '· ' + this.escapeHtml(doc.size) : ''}
                </div>
                <div style="font-size:0.92rem; font-weight:700; margin-top:2px;">
                  ${this.escapeHtml(doc.title)}
                </div>
                ${doc.description ? `<div style="font-size:0.8rem; color:var(--text-muted);">${this.escapeHtml(doc.description)}</div>` : ''}
              </div>
              <div style="display:flex; gap:6px; flex-shrink:0; align-items:center;">
                <button class="btn btn-outline btn-sm" onclick="app.openDocumentModal('${this.escapeHtml(doc.id)}')">
                  ✏️ Ändern / Tauschen
                </button>
                <button class="btn btn-danger-outline btn-sm"
                        onclick="if(confirm('Dokument „${this.escapeHtml(doc.title)}“ wirklich löschen?')) { app.storage.deleteDocument('${this.escapeHtml(doc.id)}'); app.render(); }">
                  🗑
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- 6. CODE-SYNCHRONISATION & RESET -->
      <div class="card">
        <h3 class="card-title" style="margin-bottom:6px;">6. Quellcode-Synchronisation (Git frageboegen.json)</h3>
        <p class="card-subtitle" style="margin-bottom:14px;">
          Exportiere alle hier bearbeiteten Fragebögen als JSON, um sie direkt in das Git-Repository unter <code>data/frageboegen.json</code> einzupflegen.
        </p>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="app.downloadCatalogsJson()">
            💾 frageboegen.json exportieren
          </button>
          <button class="btn btn-danger-outline"
                  onclick="if(confirm('Alle lokalen Änderungen verwerfen und auf die Standard-Kataloge aus dem Code zurücksetzen?')) { app.storage.resetCatalogsToDefault(); app.render(); }">
            🔄 Auf Standard-Kataloge zurücksetzen
          </button>
        </div>
      </div>

      <!-- 7. PIN-VERWALTUNG & MASTER-RESET -->
      <div class="card">
        <h3 class="card-title" style="margin-bottom:6px;">7. Entwickler-PIN & Admin-Master-Reset</h3>
        <p class="card-subtitle" style="margin-bottom:14px;">
          Hier kannst du deine Entwickler-PIN ändern oder die Admin-PIN auf 1122 zurücksetzen.
        </p>

        <div style="display:flex; align-items:flex-end; gap:10px; flex-wrap:wrap; margin-bottom:16px;">
          <div class="input-group" style="flex:1; min-width:200px;">
            <label>Entwickler-PIN ändern (Standard: 1120)</label>
            <input type="text" id="dev-new-pin" class="form-input"
                   value="${this.escapeHtml(this.storage.getDevPin())}" />
          </div>
          <button class="btn btn-navy btn-sm" onclick="app.saveNewDevPin()">
            Entwickler-PIN speichern
          </button>
        </div>

        <div style="padding-top:14px; border-top:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
          <div>
            <div style="font-weight:700; font-size:0.9rem;">Admin-PIN zurücksetzen</div>
            <div style="font-size:0.8rem; color:var(--text-muted);">Setzt die Admin-PIN sofort wieder auf den Standard 1122 zurück.</div>
          </div>
          <button class="btn btn-outline btn-sm" onclick="app.storage.setAdminPin('1122'); alert('Admin-PIN erfolgreich auf 1122 zurückgesetzt!'); app.render();">
            Admin-PIN auf 1122 resetten
          </button>
        </div>
      </div>
    `;
  }

  // ==================== INVITE ACTIONS (ADMIN) ====================

  openCreateInviteModal() {
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;
    const randomPin = Math.floor(1000 + Math.random() * 9000).toString();

    modalRoot.innerHTML = `
      <div class="modal-backdrop" onclick="if(event.target===this) app.closeModal()">
        <div class="modal-box" style="max-width:440px;">
          <h3 style="margin:0 0 10px 0;">🎟 Neuen Zugangslink erstellen</h3>
          <p style="font-size:0.84rem; color:var(--text-muted); margin:0 0 16px 0;">
            Lege die 4-stellige Zugangs-PIN für diesen Link fest. Beim Öffnen des Links tippt der Nutzer diese PIN ein.
          </p>

          <div class="input-group" style="margin-bottom:18px;">
            <label>4-stellige Zugangs-PIN</label>
            <input type="text" id="invite-pin-input" class="form-input"
                   placeholder="z. B. 4819" value="${randomPin}"
                   maxlength="8" style="font-weight:900; font-size:1.3rem; text-align:center; letter-spacing:0.2em;" autofocus />
          </div>

          <div style="display:flex; gap:10px;">
            <button class="btn btn-outline" style="flex:1" onclick="app.closeModal()">Abbrechen</button>
            <button class="btn btn-primary" style="flex:2" onclick="app.confirmCreateInvite()">Link erstellen</button>
          </div>
        </div>
      </div>
    `;
    setTimeout(() => document.getElementById('invite-pin-input')?.focus(), 50);
  }

  confirmCreateInvite() {
    const pin = document.getElementById('invite-pin-input')?.value.trim();
    if (!pin || pin.length < 4) {
      alert('Bitte gib eine mindestens 4-stellige PIN ein.');
      return;
    }

    const invite = this.storage.createInvite(pin);
    this.closeModal();
    this.render();
    this.copyInviteWithPin(invite.token, invite.pin);
  }

  getBaseAppUrl() {
    // Wenn lokal von der Festplatte getestet wird (file:/// oder localhost),
    // erzeugen wir direkt die echte GitHub-Pages-URL für die Kameraden:
    if (window.location.protocol === 'file:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'https://gn-data.github.io/Loeschstoff-Academy/';
    }
    return window.location.href.split('?')[0].split('#')[0];
  }

  copyInviteWithPin(token, pin) {
    const baseUrl = this.getBaseAppUrl();
    const url = `${baseUrl}?token=${encodeURIComponent(token)}`;
    const fullText = `Hier ist dein Zugangslink zur LÖSCHSTOFF ACADEMY:\n${url}\n\nDeine Zugangs-PIN: ${pin}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(fullText).then(() => {
        alert(`📋 Link & PIN in die Zwischenablage kopiert!\n\nLink: ${url}\nZugangs-PIN: ${pin}\n\nKannst du jetzt direkt per WhatsApp, Signal oder E-Mail an den Kameraden senden.`);
      }).catch(() => {
        prompt('Hier ist dein Text zum Kopieren:', fullText);
      });
    } else {
      prompt('Hier ist dein Text zum Kopieren:', fullText);
    }
  }

  copyInviteOnlyLink(token) {
    const baseUrl = this.getBaseAppUrl();
    const url = `${baseUrl}?token=${encodeURIComponent(token)}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => {
        alert(`🔗 Link in die Zwischenablage kopiert!\n\n${url}`);
      }).catch(() => {
        prompt('Hier ist dein Link zum Kopieren:', url);
      });
    } else {
      prompt('Hier ist dein Link zum Kopieren:', url);
    }
  }

  deleteInvite(id) {
    if (!confirm('Diesen Zugangslink wirklich löschen? Bereits freigeschaltete Geräte können die App weiterhin offline nutzen.')) return;
    this.storage.deleteInvite(id);
    this.render();
  }

  unlockAdminArea() {
    const input = document.getElementById('admin-pin-input');
    const pin = input?.value.trim();
    if (pin === this.storage.getAdminPin() || pin === this.storage.getDevPin()) {
      this.adminUnlocked = true;
      this.render();
    } else {
      alert('Falsche Admin-PIN! (Standard: 1122)');
    }
  }

  resetAdminPinPrompt() {
    const answer = prompt(
      'Sicherheitsabfrage zum Zurücksetzen der Admin-PIN:\n\n' +
      'Wie lautet die europaweite Feuerwehr-Notrufnummer? (3 Ziffern):'
    );
    if (answer === null) return;
    if (answer.trim() === '112') {
      this.storage.setAdminPin('1122');
      alert('Erfolg! Die Admin-PIN wurde auf den Standard „1122“ zurückgesetzt.');
      this.render();
    } else {
      alert('Falsche Antwort. PIN wurde nicht zurückgesetzt.');
    }
  }

  saveNewAdminPin() {
    const input = document.getElementById('admin-new-pin');
    const newPin = input?.value.trim();
    if (!newPin || newPin.length < 3) {
      alert('Bitte gib eine gültige PIN mit mindestens 3 Zeichen ein.');
      return;
    }
    this.storage.setAdminPin(newPin);
    alert(`Admin-PIN erfolgreich auf „${newPin}“ geändert!`);
    this.render();
  }

  unlockDevArea() {
    const input = document.getElementById('dev-pin-input');
    const pin = input?.value.trim();
    if (pin === this.storage.getDevPin()) {
      this.devUnlocked = true;
      this.adminUnlocked = true;
      this.render();
    } else {
      alert('Falsche Entwickler-PIN! (Standard: 1120)');
    }
  }

  resetDevPinPrompt() {
    const answer = prompt(
      'Sicherheitsabfrage zum Zurücksetzen der Entwickler-PIN:\n\n' +
      'Wie lautet die europaweite Feuerwehr-Notrufnummer? (3 Ziffern):'
    );
    if (answer === null) return;
    if (answer.trim() === '112') {
      this.storage.setDevPin('1120');
      alert('Erfolg! Die Entwickler-PIN wurde auf den Standard „1120“ zurückgesetzt.');
      this.render();
    } else {
      alert('Falsche Antwort. PIN wurde nicht zurückgesetzt.');
    }
  }

  saveNewDevPin() {
    const input = document.getElementById('dev-new-pin');
    const newPin = input?.value.trim();
    if (!newPin || newPin.length < 3) {
      alert('Bitte gib eine gültige Entwickler-PIN mit mindestens 3 Zeichen ein.');
      return;
    }
    this.storage.setDevPin(newPin);
    alert(`Entwickler-PIN erfolgreich auf „${newPin}“ geändert!`);
    this.render();
  }

  handleLogoUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      this.storage.setAppLogo(e.target.result);
      alert('Eigenes Feuerwehr-Logo für die Startseite erfolgreich aktualisiert!');
      this.render();
    };
    reader.readAsDataURL(file);
  }

  saveFeuerwehrName() {
    const input = document.getElementById('admin-fw-name') || document.getElementById('dev-fw-name');
    const name = input?.value.trim() || 'Freiwillige Feuerwehr';
    this.storage.setFeuerwehrName(name);
    alert(`Feuerwehr-Name auf der Startseite wurde auf „${name}“ geändert!`);
    this.render();
  }

  saveCatalogConfig() {
    const cat = this.storage.getCatalogById(this.devEditingCatalogId);
    if (!cat) return;

    const title = document.getElementById('dev-cat-title')?.value.trim() || cat.title;
    const subtitle = document.getElementById('dev-cat-subtitle')?.value.trim() || '';
    const qCount = Math.max(1, parseInt(document.getElementById('dev-exam-count')?.value, 10) || 50);
    const passPct = Math.min(100, Math.max(1, parseInt(document.getElementById('dev-exam-pass')?.value, 10) || 75));
    const timeLimit = Math.max(0, parseInt(document.getElementById('dev-exam-time')?.value, 10) || 0);

    cat.title = title;
    cat.subtitle = subtitle;
    cat.updatedAt = new Date().toISOString().slice(0, 10);
    cat.examConfig = {
      questionCount: qCount,
      passPercentage: passPct,
      timeLimitMinutes: timeLimit
    };

    this.storage.upsertCatalog(cat);
    alert(`Einstellungen für „${cat.title}“ gespeichert!\n• Prüfungsfragen: ${qCount}\n• Bestehensgrenze: ${passPct}%\n• Zeitlimit: ${timeLimit > 0 ? timeLimit + ' Min.' : 'Kein Zeitlimit'}`);
    this.render();
  }

  openNewCatalogModal() {
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="modal-backdrop" onclick="if(event.target===this) app.closeModal()">
        <div class="modal-box">
          <h3 style="margin:0 0 12px 0;">➕ Neuen Fragebogen anlegen</h3>
          <div class="input-group" style="margin-bottom:10px;">
            <label>Name des Fragebogens / Lehrgangs</label>
            <input type="text" id="new-cat-title" class="form-input" placeholder="z. B. Maschinist / Truppführer" />
          </div>
          <div class="input-group" style="margin-bottom:10px;">
            <label>Untertitel / Beschreibung</label>
            <input type="text" id="new-cat-sub" class="form-input" placeholder="z. B. Übungsfragen für den Lehrgang" />
          </div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px;">
            <div class="input-group">
              <label>Anzahl Prüfungsfragen</label>
              <input type="number" id="new-cat-qcount" class="form-input" value="50" />
            </div>
            <div class="input-group">
              <label>Bestehensgrenze (%)</label>
              <input type="number" id="new-cat-pass" class="form-input" value="75" />
            </div>
          </div>
          <div style="display:flex; gap:10px;">
            <button class="btn btn-outline" style="flex:1" onclick="app.closeModal()">Abbrechen</button>
            <button class="btn btn-primary" style="flex:2" onclick="app.confirmCreateCatalog()">Anlegen</button>
          </div>
        </div>
      </div>
    `;
  }

  confirmCreateCatalog() {
    const title = document.getElementById('new-cat-title')?.value.trim();
    if (!title) {
      alert('Bitte gib einen Namen für den Fragebogen ein.');
      return;
    }
    const subtitle = document.getElementById('new-cat-sub')?.value.trim() || '';
    const qCount = parseInt(document.getElementById('new-cat-qcount')?.value, 10) || 50;
    const passPct = parseInt(document.getElementById('new-cat-pass')?.value, 10) || 75;

    const newCat = {
      id: 'cat_' + Date.now(),
      title,
      subtitle,
      category: 'Feuerwehr',
      icon: '🚒',
      updatedAt: new Date().toISOString().slice(0, 10),
      examConfig: {
        questionCount: qCount,
        passPercentage: passPct,
        timeLimitMinutes: 45
      },
      questions: []
    };

    this.storage.upsertCatalog(newCat);
    this.devEditingCatalogId = newCat.id;
    this.selectedCatalogId = newCat.id;
    this.closeModal();
    this.render();
  }

  openQuestionModal(questionIdx) {
    const cat = this.storage.getCatalogById(this.devEditingCatalogId);
    if (!cat) return;

    const isNew = questionIdx < 0 || questionIdx >= cat.questions.length;
    const nextNum = cat.questions.length > 0
      ? Math.max(...cat.questions.map(q => q.number)) + 1
      : 1;

    const qData = isNew
      ? {
          number: nextNum,
          question: '',
          explanation: '',
          image: '',
          answers: [
            { text: '', isCorrect: true },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false },
            { text: '', isCorrect: false }
          ]
        }
      : JSON.parse(JSON.stringify(cat.questions[questionIdx]));

    window._editingQuestionData = qData;
    window._editingQuestionIdx = isNew ? -1 : questionIdx;

    this.renderQuestionModalContent();
  }

  renderQuestionModalContent() {
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot || !window._editingQuestionData) return;
    const qData = window._editingQuestionData;
    const isNew = window._editingQuestionIdx === -1;
    const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

    modalRoot.innerHTML = `
      <div class="modal-backdrop" onclick="if(event.target===this) app.closeModal()">
        <div class="modal-box" style="max-width:600px;">
          <h3 style="margin:0 0 12px 0;">${isNew ? '➕ Neue Frage hinzufügen' : `✏️ Frage Nr. ${qData.number} bearbeiten`}</h3>

          <div style="display:grid; grid-template-columns:110px 1fr; gap:10px; margin-bottom:12px;">
            <div class="input-group">
              <label>Frage-Nr.</label>
              <input type="number" id="qmodal-num" class="form-input" value="${qData.number}"
                     oninput="window._editingQuestionData.number = parseInt(this.value,10)||1" />
            </div>
            <div class="input-group">
              <label>Fragetext</label>
              <input type="text" id="qmodal-text" class="form-input" value="${this.escapeHtml(qData.question)}"
                     placeholder="Wie lautet die Prüfungsfrage?"
                     oninput="window._editingQuestionData.question = this.value" />
            </div>
          </div>

          <div class="input-group" style="margin-bottom:12px;">
            <label>Antwortmöglichkeiten (Haken setzen bei allen richtigen Antworten!)</label>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${qData.answers.map((a, idx) => `
                <div style="display:flex; align-items:center; gap:8px;">
                  <input type="checkbox" ${a.isCorrect ? 'checked' : ''}
                         style="width:20px; height:20px; accent-color:#16A34A; cursor:pointer;"
                         title="Als richtige Antwort markieren"
                         onchange="window._editingQuestionData.answers[${idx}].isCorrect = this.checked" />
                  <span style="font-weight:800; width:22px;">${letters[idx] || (idx + 1)}:</span>
                  <input type="text" class="form-input" style="flex:1; padding:8px 10px;"
                         placeholder="Antwort ${letters[idx] || (idx + 1)}"
                         value="${this.escapeHtml(a.text)}"
                         oninput="window._editingQuestionData.answers[${idx}].text = this.value" />
                  ${qData.answers.length > 2 ? `
                    <button class="btn btn-danger-outline btn-sm"
                            onclick="window._editingQuestionData.answers.splice(${idx},1); app.renderQuestionModalContent();">
                      ✕
                    </button>
                  ` : ''}
                </div>
              `).join('')}
            </div>
            ${qData.answers.length < 6 ? `
              <button class="btn btn-outline btn-sm" style="margin-top:8px; align-self:flex-start;"
                      onclick="window._editingQuestionData.answers.push({text:'', isCorrect:false}); app.renderQuestionModalContent();">
                + Weitere Antwortmöglichkeit
              </button>
            ` : ''}
          </div>

          <div class="input-group" style="margin-bottom:12px;">
            <label>Erklärung / Hinweis beim Üben (optional)</label>
            <input type="text" class="form-input" value="${this.escapeHtml(qData.explanation || '')}"
                   placeholder="Kurze Erklärung zur richtigen Lösung"
                   oninput="window._editingQuestionData.explanation = this.value" />
          </div>

          <div class="input-group" style="margin-bottom:16px; background:#F8FAFC; border:1px solid #CBD5E1; padding:10px 12px; border-radius:8px;">
            <label>🖼 Bild zur Frage hinterlegen (optional für Symbole, Skizzen, Tafeln)</label>
            <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-top:4px;">
              <input type="file" id="qmodal-image-file" accept="image/*" class="form-input" style="flex:1; padding:6px;"
                     onchange="app.handleQuestionImageFile(this.files[0])" />
              ${qData.image ? `
                <button type="button" class="btn btn-danger-outline btn-sm"
                        onclick="window._editingQuestionData.image=''; app.renderQuestionModalContent();">
                  Bild entfernen
                </button>
              ` : ''}
            </div>
            ${qData.image ? `
              <div style="margin-top:8px; text-align:center;">
                <img src="${this.escapeHtml(qData.image)}" alt="Vorschau" style="max-height:120px; max-width:100%; border-radius:6px; border:1px solid #CBD5E1;" />
              </div>
            ` : ''}
          </div>

          <div style="display:flex; gap:10px;">
            <button class="btn btn-outline" style="flex:1" onclick="app.closeModal()">Abbrechen</button>
            <button class="btn btn-success" style="flex:2" onclick="app.saveQuestionFromModal()">Frage speichern</button>
          </div>
        </div>
      </div>
    `;
  }

  saveQuestionFromModal() {
    const cat = this.storage.getCatalogById(this.devEditingCatalogId);
    const qData = window._editingQuestionData;
    if (!cat || !qData) return;

    const cleanQuestion = String(qData.question || '').trim();
    const validAnswers = qData.answers
      .map(a => ({ text: String(a.text || '').trim(), isCorrect: Boolean(a.isCorrect) }))
      .filter(a => a.text.length > 0);

    if (!cleanQuestion) {
      alert('Bitte gib einen Fragetext ein.');
      return;
    }
    if (validAnswers.length < 2) {
      alert('Bitte gib mindestens 2 Antwortmöglichkeiten ein.');
      return;
    }
    if (!validAnswers.some(a => a.isCorrect)) {
      alert('Bitte markiere mindestens eine Antwort per Haken als richtig!');
      return;
    }

    const finalQ = {
      number: Number(qData.number) || (cat.questions.length + 1),
      question: cleanQuestion,
      explanation: String(qData.explanation || '').trim(),
      image: qData.image || '',
      answers: validAnswers
    };

    if (window._editingQuestionIdx >= 0) {
      cat.questions[window._editingQuestionIdx] = finalQ;
    } else {
      cat.questions.push(finalQ);
    }
    cat.questions.sort((a, b) => a.number - b.number);
    this.storage.upsertCatalog(cat);
    this.closeModal();
    this.render();
  }

  handleQuestionImageFile(file) {
    if (!file || !window._editingQuestionData) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      window._editingQuestionData.image = e.target.result;
      this.renderQuestionModalContent();
    };
    reader.readAsDataURL(file);
  }

  deleteQuestionFromCatalog(idx) {
    const cat = this.storage.getCatalogById(this.devEditingCatalogId);
    if (!cat || !cat.questions[idx]) return;
    if (!confirm(`Frage Nr. ${cat.questions[idx].number} wirklich löschen?`)) return;
    cat.questions.splice(idx, 1);
    this.storage.upsertCatalog(cat);
    this.render();
  }

  async handleDeveloperFileUpload() {
    const fileInput = document.getElementById('dev-file-import');
    const file = fileInput?.files?.[0];
    if (!file) {
      alert('Bitte wähle zuerst eine Datei (.xlsx, .csv oder .json) aus.');
      return;
    }

    const fileName = file.name.toLowerCase();
    const targetCat = this.storage.getCatalogById(this.devEditingCatalogId);

    try {
      if (fileName.endsWith('.json')) {
        const text = await file.text();
        const imported = this.storage.importCatalogsFromJsonString(text, true);
        this.devEditingCatalogId = imported[0].id;
        this.selectedCatalogId = imported[0].id;
        alert(`JSON-Import erfolgreich! ${imported.length} Fragebogen/Katalog(e) geladen.`);
      } else if (fileName.endsWith('.csv')) {
        const text = await file.text();
        const questions = this.storage.parseCsvToQuestions(text);
        if (!questions.length) throw new Error('Keine gültigen Fragen in der CSV-Datei erkannt.');
        if (targetCat) {
          targetCat.questions = questions;
          this.storage.upsertCatalog(targetCat);
          alert(`${questions.length} Fragen erfolgreich in „${targetCat.title}“ importiert!`);
        }
      } else if (fileName.endsWith('.xlsx')) {
        const buf = await file.arrayBuffer();
        const questions = await this.storage.parseXlsxFileToQuestions(buf);
        if (!questions.length) throw new Error('Keine Fragen in der Excel-Datei erkannt.');
        if (targetCat) {
          targetCat.questions = questions;
          this.storage.upsertCatalog(targetCat);
          alert(`${questions.length} Fragen aus Excel-Datei erfolgreich in „${targetCat.title}“ importiert!`);
        }
      } else {
        alert('Bitte wähle eine .xlsx, .csv oder .json Datei.');
      }
      this.render();
    } catch (err) {
      alert('Fehler beim Datei-Import: ' + (err.message || err));
    }
  }

  downloadCatalogsJson() {
    const jsonStr = this.storage.exportCatalogsAsJson();
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'frageboegen.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  downloadCsvTemplate() {
    const sample = [
      'Nummer;Frage;AntwortA;AntwortB;AntwortC;AntwortD;Richtig;Erklärung',
      '1;Welche Notrufnummer gilt europaweit für die Feuerwehr?;112;110;116117;19222;A;Der Euronotruf 112 gilt in der gesamten EU.',
      '2;Was gehört zur Mindest-PSA?;Feuerwehrschutzanzug;Feuerwehrhelm;Badelatschen;Sonnenbrille;A,B;Mehrere richtige Antworten werden mit Komma getrennt (z.B. A,B).'
    ].join('\r\n');
    const blob = new Blob([sample], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vorlage_feuerwehr_fragen.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ==================== VIEW: DOKUMENTE & LERNMATERIAL (PDF) ====================

  renderDocumentsView() {
    const docs = this.storage.getDocuments();

    return `
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">📚 Feuerwehr Dokumente & Lernmaterial</h2>
            <p class="card-subtitle">Dienstvorschriften (FwDV), Gesetze, Lehrgangsunterlagen & Merkblätter</p>
          </div>
          <div style="display:flex; gap:8px; align-items:center;">
            ${this.devUnlocked ? `
              <button class="btn btn-primary btn-sm" onclick="app.openDocumentModal(null)">
                + Dokument hinzufügen
              </button>
            ` : ''}
          </div>
        </div>

        ${docs.length === 0 ? `
          <div style="text-align:center; padding:30px 16px; color:var(--text-muted);">
            Noch keine Dokumente hinterlegt.
          </div>
        ` : `
          <div style="display:flex; flex-direction:column; gap:12px;">
            ${docs.map(doc => `
              <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:14px; padding:14px; border-radius:var(--radius-md); border:1.5px solid var(--border-color); background:var(--bg-subtle); box-shadow:var(--shadow-sm);">
                <div style="font-size:2.2rem; line-height:1; padding-top:2px;">📄</div>
                <div style="flex:1; min-width:0;">
                  <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-bottom:4px;">
                    <span class="badge badge-slate" style="font-size:0.72rem;">${this.escapeHtml(doc.category || 'Dokument')}</span>
                    ${doc.size ? `<span style="font-size:0.74rem; color:var(--text-muted);">${this.escapeHtml(doc.size)}</span>` : ''}
                  </div>
                  <div style="font-weight:800; font-size:1rem; color:var(--text-main); margin-bottom:4px;">
                    ${this.escapeHtml(doc.title)}
                  </div>
                  ${doc.description ? `
                    <div style="font-size:0.84rem; color:var(--text-muted); line-height:1.4; margin-bottom:8px;">
                      ${this.escapeHtml(doc.description)}
                    </div>
                  ` : ''}
                  <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                    <a href="${this.escapeHtml(doc.url)}" target="_blank" rel="noopener noreferrer"
                       class="btn btn-navy btn-sm" style="text-decoration:none;">
                      📖 Dokument öffnen / ansehen
                    </a>
                    ${this.devUnlocked ? `
                      <button class="btn btn-outline btn-sm" onclick="app.openDocumentModal('${this.escapeHtml(doc.id)}')">
                        ✏️ Ändern / Datei austauschen
                      </button>
                      <button class="btn btn-danger-outline btn-sm" onclick="if(confirm('Dokument „${this.escapeHtml(doc.title)}“ wirklich löschen?')) { app.storage.deleteDocument('${this.escapeHtml(doc.id)}'); app.render(); }">
                        🗑 Löschen
                      </button>
                    ` : ''}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    `;
  }

  openDocumentModal(docId = null) {
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;

    const existingDoc = docId ? this.storage.getDocumentById(docId) : null;
    const isEdit = Boolean(existingDoc);

    window._editingDocId = isEdit ? existingDoc.id : null;
    window._newDocData = {
      title: existingDoc?.title || '',
      category: existingDoc?.category || 'Dienstvorschrift',
      description: existingDoc?.description || '',
      url: existingDoc?.url || '',
      size: existingDoc?.size || ''
    };

    const categories = [
      { val: 'Dienstvorschrift', label: 'Dienstvorschrift (FwDV)' },
      { val: 'Lehrgangsunterlage', label: 'Lehrgangsunterlage / MTA' },
      { val: 'Gesetzestext', label: 'Gesetzestext / Verordnung' },
      { val: 'Merkblatt', label: 'Merkblatt / Leitfaden' },
      { val: 'Sonstiges', label: 'Sonstiges' }
    ];

    const isEmbeddedPdf = (existingDoc?.url || '').startsWith('data:');
    const displayUrlValue = isEmbeddedPdf ? '' : (existingDoc?.url || '');

    modalRoot.innerHTML = `
      <div class="modal-backdrop" onclick="if(event.target===this) app.closeModal()">
        <div class="modal-box" style="max-width:540px;">
          <h3 style="margin:0 0 12px 0;">
            ${isEdit ? '✏️ Dokument bearbeiten / Datei austauschen' : '📄 Neues Dokument / PDF bereitstellen'}
          </h3>
          <div class="input-group" style="margin-bottom:10px;">
            <label>Titel des Dokuments</label>
            <input type="text" id="doc-title-in" class="form-input"
                   value="${this.escapeHtml(window._newDocData.title)}"
                   placeholder="z. B. FwDV 1 – Grundtätigkeiten" />
          </div>
          <div class="input-group" style="margin-bottom:10px;">
            <label>Kategorie</label>
            <select id="doc-cat-in" class="form-select">
              ${categories.map(c => `
                <option value="${this.escapeHtml(c.val)}" ${window._newDocData.category === c.val ? 'selected' : ''}>
                  ${this.escapeHtml(c.label)}
                </option>
              `).join('')}
            </select>
          </div>
          <div class="input-group" style="margin-bottom:12px;">
            <label>Kurzbeschreibung (optional)</label>
            <input type="text" id="doc-desc-in" class="form-input"
                   value="${this.escapeHtml(window._newDocData.description)}"
                   placeholder="Worum geht es in dem Dokument?" />
          </div>

          ${isEdit ? `
            <div style="margin-bottom:12px; padding:8px 12px; border-radius:8px; background:var(--exam-bg); border:1px solid var(--exam-border); font-size:0.82rem; color:var(--exam-text);">
              <strong>Aktuell hinterlegt:</strong>
              ${isEmbeddedPdf
                ? `Eingebettete PDF-Datei (${this.escapeHtml(existingDoc.size || 'PDF')})`
                : `Link: ${this.escapeHtml(existingDoc.url)}`}
            </div>
          ` : ''}

          <div class="input-group" style="margin-bottom:12px; background:var(--bg-subtle); padding:10px; border-radius:8px; border:1px solid var(--input-border);">
            <label>${isEdit ? 'Option A: Neue PDF-Datei hochladen (tauscht Datei aus)' : 'Option A: Lokale PDF-Datei hochladen'}</label>
            <input type="file" id="doc-file-in" accept=".pdf,application/pdf" class="form-input" style="padding:6px;"
                   onchange="app.handleDocFileUpload(this.files[0])" />
          </div>

          <div class="input-group" style="margin-bottom:16px;">
            <label>${isEdit ? 'Option B: Link / URL ändern' : 'Option B: Link / URL zum Dokument'}</label>
            <input type="text" id="doc-url-in" class="form-input"
                   value="${this.escapeHtml(displayUrlValue)}"
                   placeholder="${isEmbeddedPdf ? 'Aktuelle PDF-Datei bleibt erhalten (oder neuen Link eingeben)' : 'https://... oder datei.pdf'}" />
          </div>

          <div style="display:flex; gap:10px;">
            <button class="btn btn-outline" style="flex:1" onclick="app.closeModal()">Abbrechen</button>
            <button class="btn btn-primary" style="flex:2" onclick="app.confirmSaveDocument()">
              ${isEdit ? '✓ Änderungen speichern' : 'Dokument speichern'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  handleDocFileUpload(file) {
    if (!file) return;
    const titleInput = document.getElementById('doc-title-in');
    if (titleInput && !titleInput.value.trim()) {
      titleInput.value = file.name.replace(/\.[^/.]+$/, "");
    }
    const sizeKb = Math.round(file.size / 1024);
    const sizeStr = sizeKb > 1024 ? (sizeKb / 1024).toFixed(1) + ' MB' : sizeKb + ' KB';

    const reader = new FileReader();
    reader.onload = (e) => {
      window._newDocData.uploadedUrl = e.target.result;
      window._newDocData.size = sizeStr;
      const urlInput = document.getElementById('doc-url-in');
      if (urlInput) urlInput.value = `[Neue PDF-Datei ausgewählt: ${file.name} (${sizeStr})]`;
    };
    reader.readAsDataURL(file);
  }

  confirmSaveDocument() {
    const title = document.getElementById('doc-title-in')?.value.trim();
    const category = document.getElementById('doc-cat-in')?.value || 'Dokument';
    const description = document.getElementById('doc-desc-in')?.value.trim() || '';
    const manualUrlInput = document.getElementById('doc-url-in')?.value.trim() || '';

    let finalUrl = window._newDocData?.url || '';
    if (window._newDocData?.uploadedUrl) {
      finalUrl = window._newDocData.uploadedUrl;
    } else if (manualUrlInput && !manualUrlInput.startsWith('[Neue PDF-Datei')) {
      finalUrl = manualUrlInput;
    }

    if (!title) {
      alert('Bitte gib einen Titel für das Dokument ein.');
      return;
    }
    if (!finalUrl) {
      alert('Bitte lade eine PDF-Datei hoch oder gib einen Link ein.');
      return;
    }

    if (window._editingDocId) {
      this.storage.updateDocument(window._editingDocId, {
        title,
        category,
        description,
        url: finalUrl,
        size: window._newDocData?.size || ''
      });
    } else {
      this.storage.addDocument({
        title,
        category,
        description,
        url: finalUrl,
        size: window._newDocData?.size || '',
        date: new Date().toISOString().slice(0, 10)
      });
    }

    this.closeModal();
    this.render();
  }

  // ==================== VIEW 8: INSTALLATION (OHNE APP STORE) ====================

  renderInstallView() {
    return `
      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">📲 App direkt auf Android & iOS installieren (ohne Store)</h2>
            <p class="card-subtitle">So installieren deine Feuerwehr-Kameraden die App direkt auf ihrem Smartphone</p>
          </div>
        </div>

        ${this.deferredInstallPrompt ? `
          <div style="margin-bottom:16px;">
            <button class="btn btn-primary btn-block" onclick="app.triggerNativeInstall()">
              📲 App jetzt direkt auf diesem Gerät installieren
            </button>
          </div>
        ` : ''}

        <div class="mode-grid">
          <div class="mode-card" style="border-top:4px solid #0F172A;">
            <div>
              <h3 style="margin:0 0 8px 0;">🍎 iPhone & iPad (iOS)</h3>
              <ol style="margin:0; padding-left:18px; font-size:0.88rem; line-height:1.6;">
                <li>Öffne den Einladungslink in <strong>Safari</strong> auf dem iPhone.</li>
                <li>Tippe unten in der Leiste auf das <strong>Teilen-Symbol 📤</strong> (Quadrat mit Pfeil nach oben).</li>
                <li>Wähle im Menü den Punkt <strong>„Zum Home-Bildschirm“</strong> aus.</li>
                <li>Tippe oben rechts auf <strong>„Hinzufügen“</strong>.</li>
              </ol>
              <p style="margin:10px 0 0 0; font-size:0.8rem; color:var(--text-muted);">
                ✓ Die App erscheint mit dem Löschstoff-Icon auf dem Homescreen, läuft im Vollbildmodus und funktioniert 100% offline!
              </p>
            </div>
          </div>

          <div class="mode-card" style="border-top:4px solid #16A34A;">
            <div>
              <h3 style="margin:0 0 8px 0;">🤖 Android (Chrome / Samsung)</h3>
              <ol style="margin:0; padding-left:18px; font-size:0.88rem; line-height:1.6;">
                <li>Öffne den Einladungslink in <strong>Google Chrome</strong> auf dem Smartphone.</li>
                <li>Tippe auf das Banner <strong>„App installieren“</strong> oder oben rechts auf das <strong>Drei-Punkte-Menü (⋮)</strong>.</li>
                <li>Wähle <strong>„App installieren“</strong> bzw. <strong>„Zum Startbildschirm hinzufügen“</strong>.</li>
              </ol>
              <p style="margin:10px 0 0 0; font-size:0.8rem; color:var(--text-muted);">
                ✓ Kein Play-Store-Download nötig, sofort einsatzbereit und vollständig offline-fähig!
              </p>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">👨‍💻 Über LÖSCHSTOFF ACADEMY</h3>
            <p class="card-subtitle">WISSEN. TRAINIEREN. EINSATZBEREIT.</p>
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:14px; flex-wrap:wrap;">
          <img src="assets/app-logo.jpg" alt="LÖSCHSTOFF ACADEMY" style="width:60px; height:60px; border-radius:14px; object-fit:cover; border:2px solid var(--border-color);" />
          <div style="flex:1; min-width:200px; font-size:0.88rem; line-height:1.55; color:var(--text-main);">
            <div><strong>Entwickelt von:</strong> Nico Galicki</div>
            <div><strong>App-Version:</strong> 2.0 (Progressive Web App – 100% Offline-fähig)</div>
          </div>
        </div>
      </div>
    `;
  }

  async triggerNativeInstall() {
    if (!this.deferredInstallPrompt) return;
    this.deferredInstallPrompt.prompt();
    await this.deferredInstallPrompt.userChoice;
    this.deferredInstallPrompt = null;
    this.render();
  }
}

window.FeuerwehrApp = FeuerwehrApp;
window.addEventListener('DOMContentLoaded', () => {
  window.app = new FeuerwehrApp();
});
