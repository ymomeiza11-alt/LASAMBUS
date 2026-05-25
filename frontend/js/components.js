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
      <div class="header-right">
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

  startClock();
  initSidebar();
  setActiveSidebarLink();

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
  if (!toggle || !sidebar) return;

  const collapsed = localStorage.getItem('sidebarCollapsed') === 'true';
  if (collapsed) {
    sidebar.classList.add('collapsed');
    if (layout) layout.classList.add('sidebar-collapsed');
  }

  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    if (layout) layout.classList.toggle('sidebar-collapsed');
    localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
  });
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

document.addEventListener('DOMContentLoaded', injectComponents);
