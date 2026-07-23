// Exposed globally so other page scripts can read the logged-in user
window.__currentUser = null;

async function injectComponents() {
  // Auth check — redirect to login if session is invalid
  try {
    const res = await fetch('/api/auth/me');
    if (!res.ok) { window.location.href = '/pages/login.html'; return; }
    window.__currentUser = await res.json();
  } catch {
    window.location.href = '/pages/login.html';
    return;
  }

  const header = `
    <header class="lasambus-header">
      <div class="header-left">
        <button class="header-icon-btn mobile-menu-btn" id="mobileMenuBtn" title="Menu" onclick="toggleMobileSidebar()">
          <i class="bi bi-list"></i>
        </button>
      </div>
      <div class="header-right">
        <button class="header-icon-btn notif-bell-btn" id="notifBellBtn" title="Notifications" onclick="toggleNotifPanel()">
          <i class="bi bi-bell"></i>
          <span class="notif-badge hidden" id="notifBadge">0</span>
        </button>
        <a href="profile.html" class="header-icon-btn" title="Profile">
          <i class="bi bi-person-circle"></i>
        </a>
        <button class="header-icon-btn logout-btn" title="Logout" onclick="handleLogout()">
          <i class="bi bi-box-arrow-right"></i>
        </button>
      </div>
    </header>`;

  const sidebar = `
    <nav class="lasambus-sidebar" id="sidebar">
      <div class="sidebar-logo-wrap">
        <img src="../assets/LASAMBUS Logo.png" alt="LASAMBUS Logo" class="sidebar-logo" />
      </div>
      <button class="sidebar-toggle" id="sidebarToggle" title="Toggle Sidebar">
        <i class="bi bi-list"></i>
      </button>
      <ul class="sidebar-nav">
        <li>
          <a href="dashboard.html" class="sidebar-link">
            <i class="bi bi-speedometer2"></i>
            <span class="sidebar-label">Dashboard</span>
          </a>
        </li>
        <li>
          <a href="cases.html" class="sidebar-link">
            <i class="bi bi-folder2-open"></i>
            <span class="sidebar-label">Cases</span>
          </a>
        </li>
        <li>
          <a href="javascript:void(0)" class="sidebar-link" onclick="sidebarNewCase()">
            <i class="bi bi-plus-circle"></i>
            <span class="sidebar-label">New Case</span>
          </a>
        </li>
        <li>
          <a href="ambulance.html" class="sidebar-link">
            <i class="bi bi-hospital"></i>
            <span class="sidebar-label">Ambulance</span>
          </a>
        </li>
        <li>
          <a href="paramedics.html" class="sidebar-link">
            <i class="bi bi-person-badge"></i>
            <span class="sidebar-label">Paramedics</span>
          </a>
        </li>
        <li>
          <a href="report.html" class="sidebar-link">
            <i class="bi bi-bar-chart-line"></i>
            <span class="sidebar-label">Report</span>
          </a>
        </li>
        <li>
          <a href="javascript:void(0)" class="sidebar-link" onclick="openExportOverlay()">
            <i class="bi bi-download"></i>
            <span class="sidebar-label">Export</span>
          </a>
        </li>
      </ul>
      <div class="sidebar-datetime">
        <span id="sidebar-date"></span>
        <span id="sidebar-time"></span>
      </div>
    </nav>`;

  const footer = `
    <footer class="lasambus-footer">
      <p>&copy; Copyright Lagos State Ambulance Service (LASAMBUS) Dashboard. All Rights Reserved.</p>
    </footer>`;

  const headerEl  = document.getElementById('header-placeholder');
  const sidebarEl = document.getElementById('sidebar-placeholder');
  const footerEl  = document.getElementById('footer-placeholder');

  if (headerEl)  headerEl.innerHTML  = header;
  if (sidebarEl) sidebarEl.innerHTML = sidebar;
  if (footerEl)  footerEl.innerHTML  = footer;

  // Inject export overlay into every page if not already present
  if (!document.getElementById('export-overlay')) {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="overlay-backdrop" id="export-overlay">
        <div class="overlay-panel" style="max-width:500px;">
          <button class="overlay-back-btn" onclick="closeExportOverlay()">
            <i class="bi bi-arrow-left"></i> Back
          </button>
          <h2 class="page-title">Export Data</h2>
          <form id="exportForm">
            <div class="form-group">
              <label>Table</label>
              <select id="export-table">
                <option value="cases">Cases</option>
                <option value="paramedics">Paramedics</option>
                <option value="patient_info">Patient Info</option>
                <option value="ambulances">Ambulances</option>
              </select>
            </div>
            <div class="form-group">
              <label>Row Range</label>
              <select id="row-range" onchange="handleRangeChange(this.value)">
                <option value="50">1 - 50</option>
                <option value="100">1 - 100</option>
                <option value="150">1 - 150</option>
                <option value="200">1 - 200</option>
                <option value="250">1 - 250</option>
                <option value="300">1 - 300</option>
                <option value="full">Full Table</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div id="custom-range-group" class="hidden">
              <div class="form-row">
                <div class="form-group">
                  <label>From (Row)</label>
                  <input type="number" id="custom-from" placeholder="1" min="1" value="1" />
                </div>
                <div class="form-group">
                  <label>To (Row)</label>
                  <input type="number" id="custom-to" placeholder="e.g. 75" min="1" />
                </div>
              </div>
            </div>
            <div class="form-group">
              <label>Export Format</label>
              <select id="export-format">
                <option value="csv">CSV</option>
                <option value="excel">Excel (.xlsx)</option>
              </select>
            </div>
            <button type="submit" class="btn btn-primary">
              <i class="bi bi-download"></i> Export
            </button>
          </form>
        </div>
      </div>`);

    document.getElementById('export-overlay').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeExportOverlay();
    });

    document.getElementById('exportForm').addEventListener('submit', function (e) {
      e.preventDefault();
      const table  = document.getElementById('export-table').value;
      const range  = document.getElementById('row-range').value;
      const format = document.getElementById('export-format').value;
      const params = new URLSearchParams({ table, range, format });
      if (range === 'custom') {
        const from = document.getElementById('custom-from').value;
        const to   = document.getElementById('custom-to').value;
        if (!from || !to || parseInt(from) > parseInt(to)) {
          alert('Please enter a valid custom range.');
          return;
        }
        params.set('from', from);
        params.set('to', to);
      }
      window.location.href = `/api/export?${params}`;
    });
  }

  injectNotifPanel();
  injectToastContainer();
  startClock();
  initSidebar();
  setActiveSidebarLink();
  initNotifications();

  // Fire a custom event so page scripts know components are ready
  document.dispatchEvent(new CustomEvent('componentsReady', { detail: window.__currentUser }));
}

function startClock() {
  function update() {
    const now    = new Date();
    const dateEl = document.getElementById('sidebar-date');
    const timeEl = document.getElementById('sidebar-time');
    if (dateEl) dateEl.textContent = now.toLocaleDateString('en-GB', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric'
    });
    if (timeEl) timeEl.textContent = now.toLocaleTimeString('en-GB');
  }
  update();
  setInterval(update, 1000);
}

function initSidebar() {
  const toggle  = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');
  const layout  = document.querySelector('.lasambus-layout');
  if (!sidebar) return;

  // Desktop: restore collapsed state
  if (window.innerWidth > 768) {
    const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
    if (collapsed) {
      sidebar.classList.add('collapsed');
      if (layout) layout.classList.add('sidebar-collapsed');
    }
  }

  if (toggle) {
    toggle.addEventListener('click', () => {
      if (window.innerWidth <= 768) {
        closeMobileSidebar();
      } else {
        sidebar.classList.toggle('collapsed');
        if (layout) layout.classList.toggle('sidebar-collapsed');
        localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
      }
    });
  }

  // Close mobile sidebar when any nav link is clicked
  sidebar.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', () => {
      if (window.innerWidth <= 768) closeMobileSidebar();
    });
  });
}

function toggleMobileSidebar() {
  const placeholder = document.getElementById('sidebar-placeholder');
  if (!placeholder) return;
  if (placeholder.classList.contains('mobile-open')) {
    closeMobileSidebar();
  } else {
    openMobileSidebar();
  }
}

function openMobileSidebar() {
  const placeholder = document.getElementById('sidebar-placeholder');
  if (!placeholder) return;
  placeholder.classList.add('mobile-open');

  let backdrop = document.getElementById('mobile-sidebar-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.id = 'mobile-sidebar-backdrop';
    backdrop.className = 'mobile-sidebar-backdrop';
    backdrop.addEventListener('click', closeMobileSidebar);
    document.body.appendChild(backdrop);
  }
  backdrop.classList.add('open');
}

function closeMobileSidebar() {
  const placeholder = document.getElementById('sidebar-placeholder');
  const backdrop    = document.getElementById('mobile-sidebar-backdrop');
  if (placeholder) placeholder.classList.remove('mobile-open');
  if (backdrop)    backdrop.classList.remove('open');
}

function sidebarNewCase() {
  if (window.innerWidth <= 768) closeMobileSidebar();
  if (typeof openNewCaseOverlay === 'function') {
    openNewCaseOverlay();
  } else {
    window.location.href = 'cases.html?action=new';
  }
}

function setActiveSidebarLink() {
  const currentPage = window.location.pathname.split('/').pop();
  document.querySelectorAll('.sidebar-link').forEach(link => {
    if (link.getAttribute('href') === currentPage) link.classList.add('active');
  });
}

async function handleLogout() {
  await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {});
  window.location.href = '/pages/login.html';
}

// ── Shared utilities (available to all page scripts) ──
async function apiFetch(url, opts = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

function formatDate(d) {
  if (!d) return '—';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

// Case status badge — page scripts may override for their own status types
function statusBadge(s) {
  const map = { Active: 'status-active', Complete: 'status-complete', Cancelled: 'status-cancelled' };
  const cls = map[s] || 'status-active';
  const label = s === 'Complete' ? 'Completed' : s;
  return `<span class="status-badge ${cls}">${label}</span>`;
}

// ── Export overlay (available on every page) ──────────
function openExportOverlay() {
  document.getElementById('export-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeExportOverlay() {
  document.getElementById('export-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function handleRangeChange(value) {
  document.getElementById('custom-range-group').classList.toggle('hidden', value !== 'custom');
}

// ── Notifications ─────────────────────────────────────
let _seenNotifIds = null;
let _notifPanelOpen = false;

function injectNotifPanel() {
  if (document.getElementById('notif-panel')) return;
  document.body.insertAdjacentHTML('beforeend', `
    <div class="notif-panel" id="notif-panel">
      <div class="notif-panel-header">
        <span>Notifications</span>
        <button class="notif-mark-all-btn" onclick="markAllNotifsRead()">Mark all read</button>
      </div>
      <div class="notif-list" id="notif-list"></div>
    </div>`);

  document.addEventListener('click', e => {
    const panel = document.getElementById('notif-panel');
    const bell  = document.getElementById('notifBellBtn');
    if (panel && !panel.contains(e.target) && bell && !bell.contains(e.target)) {
      panel.classList.remove('open');
      _notifPanelOpen = false;
    }
  });
}

function injectToastContainer() {
  if (document.getElementById('notif-toast-container')) return;
  document.body.insertAdjacentHTML('beforeend', `<div class="notif-toast-container" id="notif-toast-container"></div>`);
}

async function initNotifications() {
  await pollNotifications();
  setInterval(pollNotifications, 30000);
}

async function pollNotifications() {
  try {
    const data = await fetch('/api/notifications').then(r => r.ok ? r.json() : []);
    if (!Array.isArray(data)) return;

    const unread = data.filter(n => !n.is_read).length;
    const badge  = document.getElementById('notifBadge');
    if (badge) {
      badge.textContent = unread > 99 ? '99+' : unread;
      badge.classList.toggle('hidden', unread === 0);
    }

    if (_seenNotifIds === null) {
      _seenNotifIds = new Set(data.map(n => n.notification_id));
    } else {
      const newOnes = data.filter(n => !_seenNotifIds.has(n.notification_id));
      newOnes.forEach(n => {
        _seenNotifIds.add(n.notification_id);
        if (n.type === 'dispatch') showToast(n);
      });
    }

    if (_notifPanelOpen) renderNotifPanel(data.slice(0, 10));
  } catch { /* silent */ }
}

function renderNotifPanel(notifications) {
  const list = document.getElementById('notif-list');
  if (!list) return;
  if (!notifications.length) {
    list.innerHTML = `<div class="notif-empty">No notifications yet</div>`;
    return;
  }
  list.innerHTML = notifications.map(n => {
    const time = formatNotifTime(n.created_at);
    const caseBtn = n.case_id
      ? `<button class="notif-open-case-btn" onclick="openCaseFromNotif(${n.case_id}, ${n.notification_id})">Open Case</button>`
      : '';
    return `
      <div class="notif-item ${n.is_read ? '' : 'unread'}" data-id="${n.notification_id}" onclick="markNotifRead(${n.notification_id}, this)">
        <div class="notif-item-title">${escHtml(n.title)}</div>
        <div class="notif-item-msg">${escHtml(n.message)}</div>
        <div class="notif-item-meta">
          <span class="notif-item-time">${time}</span>
          ${caseBtn}
        </div>
      </div>`;
  }).join('');
}

async function toggleNotifPanel() {
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  _notifPanelOpen = !_notifPanelOpen;
  panel.classList.toggle('open', _notifPanelOpen);
  if (_notifPanelOpen) {
    const data = await fetch('/api/notifications').then(r => r.ok ? r.json() : []);
    renderNotifPanel(data.slice(0, 10));
  }
}

async function markNotifRead(id, el) {
  if (el && el.classList.contains('unread')) {
    el.classList.remove('unread');
    await fetch(`/api/notifications/${id}/read`, { method: 'POST' }).catch(() => {});
    await pollNotifications();
  }
}

async function markAllNotifsRead() {
  await fetch('/api/notifications/read-all', { method: 'POST' }).catch(() => {});
  document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
  await pollNotifications();
}

function openCaseFromNotif(caseId, notifId) {
  fetch(`/api/notifications/${notifId}/read`, { method: 'POST' }).catch(() => {});
  const panel = document.getElementById('notif-panel');
  if (panel) { panel.classList.remove('open'); _notifPanelOpen = false; }
  if (typeof openCaseModal === 'function') {
    openCaseModal(caseId);
  } else {
    window.location.href = `cases.html?case=${caseId}`;
  }
}

function showToast(n) {
  const container = document.getElementById('notif-toast-container');
  if (!container) return;
  const id  = `toast-${n.notification_id}`;
  const caseBtn = n.case_id
    ? `<button class="notif-toast-open-btn" onclick="openCaseFromNotif(${n.case_id}, ${n.notification_id}); dismissToast('${id}')">Open Case</button>`
    : '';
  container.insertAdjacentHTML('beforeend', `
    <div class="notif-toast" id="${id}">
      <div class="notif-toast-title">${escHtml(n.title)}</div>
      <div class="notif-toast-msg">${escHtml(n.message)}</div>
      <div class="notif-toast-actions">
        ${caseBtn}
        <button class="notif-toast-dismiss-btn" onclick="dismissToast('${id}')">Dismiss</button>
      </div>
    </div>`);
  setTimeout(() => dismissToast(id), 8000);
}

function dismissToast(id) {
  const el = document.getElementById(id);
  if (el) el.remove();
}

function formatNotifTime(ts) {
  if (!ts) return '';
  const d   = new Date(ts);
  const now = new Date();
  const diffMs  = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1)  return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24)   return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1)  return 'Yesterday';
  if (diffD < 7)    return d.toLocaleDateString('en-GB', { weekday: 'long' });
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', injectComponents);
