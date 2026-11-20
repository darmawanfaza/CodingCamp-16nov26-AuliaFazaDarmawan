(() => {
  'use strict';

  /* ---------- Storage helpers ---------- */
  const KEYS = {
    tasks: 'ldb_tasks',
    links: 'ldb_links',
    name: 'ldb_name',
    theme: 'ldb_theme'
  };

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* storage full or blocked: app still works for this session */
    }
  }

  const $ = (id) => document.getElementById(id);

  /* =====================================================
     THEME (Challenge: Light / Dark mode)
     ===================================================== */
  const themeToggle = $('theme-toggle');

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const isDark = theme === 'dark';
    themeToggle.textContent = isDark ? '☀️' : '🌙';
    themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  }

  function initTheme() {
    const saved = load(KEYS.theme, null);
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(saved || (prefersDark ? 'dark' : 'light'));
  }

  themeToggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    save(KEYS.theme, next);
  });

  /* =====================================================
     CLOCK & GREETING (with custom name)
     ===================================================== */
  const clockEl = $('clock');
  const dateEl = $('date');
  const greetingEl = $('greeting');
  const nameDetails = $('name-details');
  const nameSummary = $('name-summary');
  const nameForm = $('name-form');
  const nameInput = $('name-input');
  const nameCancel = $('name-cancel');

  let userName = load(KEYS.name, '');

  function getGreeting(hour) {
    if (hour < 5) return 'Good Night';
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    if (hour < 21) return 'Good Evening';
    return 'Good Night';
  }

  function updateClock() {
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString('en-GB'); // 24-hour HH:MM:SS
    dateEl.textContent = now.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
    dateEl.dateTime = now.toLocaleDateString('en-CA'); // YYYY-MM-DD for the <time> element
    const base = getGreeting(now.getHours());
    greetingEl.textContent = userName ? `${base}, ${userName}` : base;
  }

  function updateNameSummary() {
    nameSummary.textContent = userName ? '✎ Change name' : '✎ Set your name';
  }

  // <details> opens/closes by itself; we only prefill and focus the input
  nameDetails.addEventListener('toggle', () => {
    if (nameDetails.open) {
      nameInput.value = userName;
      nameInput.focus();
    }
  });
  nameCancel.addEventListener('click', () => { nameDetails.open = false; });
  nameForm.addEventListener('submit', (e) => {
    e.preventDefault();
    userName = nameInput.value.trim();
    save(KEYS.name, userName); // empty name = back to plain greeting
    updateNameSummary();
    updateClock();
    nameDetails.open = false;
  });

  /* =====================================================
     FOCUS TIMER (25 minutes)
     ===================================================== */
  const TIMER_SECONDS = 25 * 60;
  const timerDisplay = $('timer-display');
  const timerStatus = $('timer-status');
  const startBtn = $('timer-start');
  const stopBtn = $('timer-stop');
  const resetBtn = $('timer-reset');

  let remaining = TIMER_SECONDS;
  let timerId = null;
  let endTime = 0;

  function renderTimer() {
    const m = String(Math.floor(remaining / 60)).padStart(2, '0');
    const s = String(remaining % 60).padStart(2, '0');
    timerDisplay.textContent = `${m}:${s}`;
  }

  function stopTimer() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function tick() {
    // Based on a target end time so it stays accurate even if the tab is throttled
    remaining = Math.max(0, Math.round((endTime - Date.now()) / 1000));
    renderTimer();
    if (remaining === 0) {
      stopTimer();
      timerStatus.textContent = "Time's up! Take a short break 🎉";
    }
  }

  startBtn.addEventListener('click', () => {
    if (timerId !== null || remaining === 0) return;
    endTime = Date.now() + remaining * 1000;
    timerId = setInterval(tick, 250);
    timerStatus.textContent = 'Stay focused...';
  });

  stopBtn.addEventListener('click', () => {
    if (timerId === null) return;
    tick();
    stopTimer();
    timerStatus.textContent = 'Paused';
  });

  resetBtn.addEventListener('click', () => {
    stopTimer();
    remaining = TIMER_SECONDS;
    renderTimer();
    timerStatus.textContent = '';
  });

  /* =====================================================
     TO-DO LIST (with duplicate prevention)
     ===================================================== */
  const taskForm = $('task-form');
  const taskInput = $('task-input');
  const taskList = $('task-list');
  const taskEmpty = $('task-empty');
  const taskMessage = $('task-message');

  let tasks = load(KEYS.tasks, []);
  let editingId = null;

  const normalize = (text) => text.trim().replace(/\s+/g, ' ').toLowerCase();

  // Challenge: Prevent duplicate tasks (case-insensitive, ignores extra spaces)
  function isDuplicate(text, ignoreId = null) {
    const target = normalize(text);
    return tasks.some((t) => t.id !== ignoreId && normalize(t.text) === target);
  }

  function showTaskMessage(msg) {
    taskMessage.textContent = msg;
    taskMessage.hidden = !msg;
  }

  function persistTasks() {
    save(KEYS.tasks, tasks);
  }

  function appendTask(article) {
    const item = document.createElement('li');
    item.appendChild(article);
    taskList.appendChild(item);
  }

  function renderTasks() {
    taskList.innerHTML = '';
    taskEmpty.hidden = tasks.length > 0;

    tasks.forEach((task) => {
      const li = document.createElement('article'); // each task is a self-contained <article>
      li.className = 'task-item' + (task.done ? ' done' : '');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.done;
      checkbox.setAttribute('aria-label', 'Mark task as done');
      checkbox.addEventListener('change', () => {
        task.done = checkbox.checked;
        persistTasks();
        renderTasks();
      });
      li.appendChild(checkbox);

      if (editingId === task.id) {
        const editInput = document.createElement('input');
        editInput.type = 'text';
        editInput.className = 'task-edit-input';
        editInput.maxLength = 120;
        editInput.value = task.text;
        li.appendChild(editInput);

        const saveEdit = () => {
          const value = editInput.value.trim();
          if (!value) {
            showTaskMessage('Task cannot be empty.');
            return;
          }
          if (isDuplicate(value, task.id)) {
            showTaskMessage('That task already exists.');
            return;
          }
          task.text = value;
          editingId = null;
          showTaskMessage('');
          persistTasks();
          renderTasks();
        };

        editInput.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') saveEdit();
          if (e.key === 'Escape') {
            editingId = null;
            showTaskMessage('');
            renderTasks();
          }
        });

        const actions = document.createElement('div');
        actions.className = 'task-actions';

        const saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'btn btn--primary btn--small';
        saveBtn.textContent = 'Save';
        saveBtn.addEventListener('click', saveEdit);

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn--neutral btn--small';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => {
          editingId = null;
          showTaskMessage('');
          renderTasks();
        });

        actions.append(saveBtn, cancelBtn);
        li.appendChild(actions);
        appendTask(li);
        editInput.focus();
        return;
      }

      const text = document.createElement('span');
      text.className = 'task-text';
      text.textContent = task.text; // textContent prevents HTML injection
      li.appendChild(text);

      const actions = document.createElement('div');
      actions.className = 'task-actions';

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.className = 'btn btn--neutral btn--small';
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => {
        editingId = task.id;
        showTaskMessage('');
        renderTasks();
      });

      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn btn--danger';
      delBtn.textContent = 'Delete';
      delBtn.addEventListener('click', () => {
        tasks = tasks.filter((t) => t.id !== task.id);
        persistTasks();
        renderTasks();
      });

      actions.append(editBtn, delBtn);
      li.appendChild(actions);
      appendTask(li);
    });
  }

  taskForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const value = taskInput.value.trim();
    if (!value) {
      showTaskMessage('Please enter a task.');
      return;
    }
    if (isDuplicate(value)) {
      showTaskMessage('That task already exists.');
      return;
    }
    tasks.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), text: value, done: false });
    persistTasks();
    taskInput.value = '';
    showTaskMessage('');
    renderTasks();
  });

  taskInput.addEventListener('input', () => showTaskMessage(''));

  /* =====================================================
     QUICK LINKS
     ===================================================== */
  const linkForm = $('link-form');
  const linkNameInput = $('link-name');
  const linkUrlInput = $('link-url');
  const linkList = $('link-list');
  const linkMessage = $('link-message');

  const DEFAULT_LINKS = [
    { id: 'l1', name: 'Google', url: 'https://www.google.com' },
    { id: 'l2', name: 'Gmail', url: 'https://mail.google.com' },
    { id: 'l3', name: 'Calendar', url: 'https://calendar.google.com' }
  ];

  let links = load(KEYS.links, DEFAULT_LINKS);

  function showLinkMessage(msg) {
    linkMessage.textContent = msg;
    linkMessage.hidden = !msg;
  }

  // Returns a safe http(s) URL string, or null if invalid
  function normalizeUrl(input) {
    let value = input.trim();
    if (!value) return null;
    if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) value = 'https://' + value;
    try {
      const url = new URL(value);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
      return url.href;
    } catch (e) {
      return null;
    }
  }

  function renderLinks() {
    linkList.innerHTML = '';
    links.forEach((link) => {
      const wrap = document.createElement('div');
      wrap.className = 'link-item';

      const a = document.createElement('a');
      a.className = 'link-open';
      a.href = link.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = link.name;
      a.title = link.url;

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'link-remove';
      remove.textContent = '✕';
      remove.setAttribute('aria-label', `Remove ${link.name}`);
      remove.addEventListener('click', () => {
        links = links.filter((l) => l.id !== link.id);
        save(KEYS.links, links);
        renderLinks();
      });

      wrap.append(a, remove);
      linkList.appendChild(wrap);
    });
  }

  linkForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = linkNameInput.value.trim();
    const url = normalizeUrl(linkUrlInput.value);
    if (!name) {
      showLinkMessage('Please enter a link name.');
      return;
    }
    if (!url) {
      showLinkMessage('Please enter a valid URL (e.g. youtube.com).');
      return;
    }
    links.push({ id: Date.now().toString(36), name, url });
    save(KEYS.links, links);
    linkNameInput.value = '';
    linkUrlInput.value = '';
    showLinkMessage('');
    renderLinks();
  });

  /* =====================================================
     INIT
     ===================================================== */
  initTheme();
  updateNameSummary();
  updateClock();
  setInterval(updateClock, 1000);
  renderTimer();
  renderTasks();
  renderLinks();
})();
