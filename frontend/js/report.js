let reportFilters = { start: null, end: null };

async function apiFetch(url, opts = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Request failed');
  return res.json();
}

// ── Load metrics ──────────────────────────────────────
async function loadReport() {
  const params = new URLSearchParams();
  if (reportFilters.start) params.set('start', reportFilters.start);
  if (reportFilters.end)   params.set('end',   reportFilters.end);

  try {
    const data = await apiFetch(`/api/report?${params}`);
    document.getElementById('r-total-cases').textContent  = data.totalCases;
    document.getElementById('r-success-rate').textContent = data.successRate + '%';
    document.getElementById('r-avg-monthly').textContent  = data.avgMonthly;
    document.getElementById('r-cancelled').textContent    = data.cancelled;
    document.getElementById('r-total-patients').textContent = data.totalPatients;
    document.getElementById('r-avg-transit').textContent  = data.avgTransit;
  } catch (err) {
    console.error('Report load error:', err);
  }
}

// ── Top 5 ─────────────────────────────────────────────
async function renderTop5() {
  const by = document.getElementById('top5-selector').value;
  const params = new URLSearchParams({ by });
  if (reportFilters.start) params.set('start', reportFilters.start);
  if (reportFilters.end)   params.set('end',   reportFilters.end);

  try {
    const rows = await apiFetch(`/api/report/top5?${params}`);
    const chart = document.getElementById('top5-chart');
    if (!rows.length) { chart.innerHTML = '<p style="color:#888;">No data available.</p>'; return; }

    const max = rows[0].count || 1;
    chart.innerHTML = rows.map(r => `
      <div class="bar-chart-row">
        <span class="bar-label">${r.label || '(unknown)'}</span>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.round((r.count / max) * 100)}%;"></div></div>
        <span class="bar-value">${r.count}</span>
      </div>`).join('');
  } catch (err) {
    console.error('Top5 error:', err);
  }
}

// ── Report filter modal ───────────────────────────────
function openReportFilterModal()  { document.getElementById('report-filter-modal').classList.add('open'); }
function closeReportFilterModal() { document.getElementById('report-filter-modal').classList.remove('open'); }

function applyReportFilter() {
  reportFilters.start = document.getElementById('rf-start-date').value || null;
  reportFilters.end   = document.getElementById('rf-end-date').value   || null;
  renderReportActiveFilters();
  closeReportFilterModal();
  loadReport();
  renderTop5();
}

function renderReportActiveFilters() {
  const container = document.getElementById('report-active-filters');
  if (!reportFilters.start && !reportFilters.end) { container.classList.add('hidden'); return; }
  container.classList.remove('hidden');
  let html = '<span class="active-filters-label">Date Range:</span>';
  if (reportFilters.start) html += `<span class="filter-tag">${reportFilters.start}</span>`;
  html += '<span style="margin:0 4px;">–</span>';
  if (reportFilters.end) html += `<span class="filter-tag">${reportFilters.end}</span>`;
  html += `<button class="filter-tag-remove" style="margin-left:8px;" onclick="clearReportFilter()">Clear</button>`;
  container.innerHTML = html;
}

function clearReportFilter() {
  reportFilters = { start: null, end: null };
  document.getElementById('rf-start-date').value = '';
  document.getElementById('rf-end-date').value   = '';
  renderReportActiveFilters();
  loadReport();
  renderTop5();
}

document.getElementById('report-filter-modal')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) closeReportFilterModal();
});

document.addEventListener('componentsReady', () => { loadReport(); renderTop5(); });
