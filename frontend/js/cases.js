// ── State ─────────────────────────────────────────────
let casesPage    = 1;
const CASES_LIMIT = 50;
let casesTotal    = 0;
let casesFilters  = { date: null, lgas: [], status: null };
const ncSelectedParamedics = [];

// ── Cases list ────────────────────────────────────────
async function loadCases() {
  const params = new URLSearchParams({
    page:  casesPage,
    limit: CASES_LIMIT,
  });
  const search = document.getElementById('search-case-id')?.value.trim();
  if (search) params.set('search', search);
  if (casesFilters.date) params.set('date', casesFilters.date);
  if (casesFilters.status) params.set('status', casesFilters.status);
  casesFilters.lgas.forEach(l => params.append('lga', l));

  try {
    const data  = await apiFetch(`/api/cases?${params}`);
    casesTotal  = data.total;
    renderCasesTable(data.cases);
    renderPagination();
  } catch (err) {
    console.error('Cases load error:', err);
  }
}

function renderCasesTable(cases) {
  const tbody = document.getElementById('cases-table-body');
  if (!cases.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;color:#888;">No cases found.</td></tr>';
    return;
  }
  const offset = (casesPage - 1) * CASES_LIMIT;
  tbody.innerHTML = cases.map((c, i) => `
    <tr class="clickable-row" onclick="openCaseOverlay(${c.case_id})">
      <td>${offset + i + 1}</td>
      <td>${c.case_id}</td>
      <td>${formatDate(c.date_of_incident)}</td>
      <td>${c.time_of_incident || '—'}</td>
      <td>${c.incident_type || '—'}</td>
      <td>${c.lga_lcda || '—'}</td>
      <td>${c.incident_location || '—'}</td>
      <td>${c.dispatch_time || '—'}</td>
      <td>${statusBadge(c.case_status)}</td>
    </tr>`).join('');
}

function renderPagination() {
  const totalPages = Math.max(1, Math.ceil(casesTotal / CASES_LIMIT));
  const start = (casesPage - 1) * CASES_LIMIT + 1;
  const end   = Math.min(casesPage * CASES_LIMIT, casesTotal);
  document.getElementById('pagination-info').textContent =
    `Showing ${casesTotal ? start : 0}–${end} of ${casesTotal} cases`;

  document.getElementById('btn-prev').disabled = casesPage <= 1;
  document.getElementById('btn-next').disabled = casesPage >= totalPages;
  document.getElementById('btn-last').disabled = casesPage >= totalPages;

  document.getElementById('btn-prev').onclick = () => { casesPage--; loadCases(); };
  document.getElementById('btn-next').onclick = () => { casesPage++; loadCases(); };
  document.getElementById('btn-last').onclick = () => { casesPage = totalPages; loadCases(); };
}

// ── Search ────────────────────────────────────────────
function searchCases() {
  casesPage = 1;
  loadCases();
}
document.getElementById('search-case-id')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') searchCases();
});

// ── Filter modal ──────────────────────────────────────
function openCasesFilterModal()  { document.getElementById('cases-filter-modal').classList.add('open'); }
function closeCasesFilterModal() { document.getElementById('cases-filter-modal').classList.remove('open'); }

function applyCasesFilter() {
  casesFilters.date   = document.getElementById('filter-date').value || null;
  casesFilters.lgas   = Array.from(
    document.querySelectorAll('#cases-filter-modal input[type="checkbox"]:checked')
  ).map(cb => cb.value);
  casesPage = 1;
  renderActiveFilters();
  closeCasesFilterModal();
  loadCases();
}

function renderActiveFilters() {
  const container = document.getElementById('cases-active-filters');
  const { date, lgas } = casesFilters;
  if (!date && !lgas.length) { container.classList.add('hidden'); return; }

  container.classList.remove('hidden');
  let html = '<span class="active-filters-label">Active Filters:</span>';
  if (date) html += `<span class="filter-tag">${date} <button class="filter-tag-remove" onclick="removeCasesFilter('date')">×</button></span>`;
  lgas.forEach(lga => {
    html += `<span class="filter-tag">${lga} <button class="filter-tag-remove" onclick="removeCasesFilter('lga','${lga}')">×</button></span>`;
  });
  container.innerHTML = html;
}

function removeCasesFilter(type, value) {
  if (type === 'date') {
    casesFilters.date = null;
    document.getElementById('filter-date').value = '';
  } else {
    casesFilters.lgas = casesFilters.lgas.filter(l => l !== value);
    const cb = document.querySelector(`#cases-filter-modal input[value="${value}"]`);
    if (cb) cb.checked = false;
  }
  casesPage = 1;
  renderActiveFilters();
  loadCases();
}

// ── New Case overlay ──────────────────────────────────
function openNewCaseOverlay() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  document.getElementById('nc-date').value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  document.getElementById('nc-time').value = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  document.getElementById('nc-dispatch-time').value = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  ncSelectedParamedics.length = 0;
  document.getElementById('nc-paramedic-list').innerHTML = '';
  loadAvailableParamedicsDropdown('nc-paramedic-dropdown');
  loadAvailableAmbulancesDropdown('nc-ambulance');
  document.getElementById('new-case-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeNewCaseOverlay() {
  document.getElementById('new-case-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function ncAddParamedic() {
  const dropdown = document.getElementById('nc-paramedic-dropdown');
  dropdown.classList.toggle('hidden');
  dropdown.onchange = function () {
    const val  = this.value;
    const text = this.options[this.selectedIndex].text;
    if (!val || ncSelectedParamedics.find(p => p.id == val)) return;
    ncSelectedParamedics.push({ id: val, label: text });
    const tag = document.createElement('span');
    tag.className = 'filter-tag';
    tag.innerHTML = `${text} <button class="filter-tag-remove" onclick="ncRemoveParamedic('${val}', this)">×</button>`;
    document.getElementById('nc-paramedic-list').appendChild(tag);
    this.value = '';
  };
}

function ncRemoveParamedic(val, btn) {
  const idx = ncSelectedParamedics.findIndex(p => p.id == val);
  if (idx > -1) ncSelectedParamedics.splice(idx, 1);
  btn.parentElement.remove();
}

document.getElementById('newCaseForm')?.addEventListener('submit', async function (e) {
  e.preventDefault();
  const required = [
    { id: 'nc-notified-by',    errId: 'err-nc-notified-by' },
    { id: 'nc-lga',            errId: 'err-nc-lga' },
    { id: 'nc-incident-type',  errId: 'err-nc-type' },
    { id: 'nc-severity',       errId: 'err-nc-severity' },
    { id: 'nc-location',       errId: 'err-nc-location' },
    { id: 'nc-description',    errId: 'err-nc-description' },
  ];
  let valid = true;
  required.forEach(({ id, errId }) => {
    const el  = document.getElementById(id);
    const err = document.getElementById(errId);
    el.classList.remove('error'); err.classList.remove('visible');
    if (!el.value.trim()) { el.classList.add('error'); err.classList.add('visible'); valid = false; }
  });
  if (!valid) return;

  const ambulanceSelect = document.getElementById('nc-ambulance');

  const payload = {
    date_of_incident:     document.getElementById('nc-date').value,
    time_of_incident:     document.getElementById('nc-time').value,
    notified_by:          getOtherValue('nc-notified-by', 'nc-notified-by-other'),
    lga_lcda:             document.getElementById('nc-lga').value,
    incident_type:        getOtherValue('nc-incident-type', 'nc-incident-type-other'),
    incident_severity:    getOtherValue('nc-severity', 'nc-severity-other'),
    incident_location:    document.getElementById('nc-location').value.trim(),
    incident_description: document.getElementById('nc-description').value.trim(),
  };

  const dispatchTime = document.getElementById('nc-dispatch-time').value;
  if (dispatchTime) payload.dispatch_time = dispatchTime;

  const ambulanceId = ambulanceSelect?.value;
  if (ambulanceId) payload.ambulance_id = parseInt(ambulanceId);

  const treatmentCentre = document.getElementById('nc-treatment-centre')?.value;
  if (treatmentCentre) payload.treatment_centre = treatmentCentre;

  const paramedicIds = ncSelectedParamedics.map(p => parseInt(p.id)).filter(id => !isNaN(id));
  if (paramedicIds.length > 0) payload.paramedic_ids = paramedicIds;

  try {
    const res = await fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const responseBody = await res.text();
    if (!res.ok) {
      let errMsg = `Server returned ${res.status} ${res.statusText}`;
      try {
        const errJson = JSON.parse(responseBody);
        errMsg += `\nServer says: ${JSON.stringify(errJson, null, 2)}`;
      } catch {
        if (responseBody) errMsg += `\nBody: ${responseBody}`;
      }
      throw new Error(errMsg);
    }

    const response = JSON.parse(responseBody);
    const case_id = response.case_id;
    closeNewCaseOverlay();
    loadCases();
    openCaseOverlay(case_id);
  } catch (err) {
    console.error('Case creation failed:', err);
    alert('Could not create case:\n' + (err.message || err));
  }
});

// ── Backdrop clicks ───────────────────────────────────
document.getElementById('new-case-overlay')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) closeNewCaseOverlay();
});
document.getElementById('cases-filter-modal')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) closeCasesFilterModal();
});

// ── Boot ──────────────────────────────────────────────
document.addEventListener('componentsReady', async () => {
  await loadCases();
  const params = new URLSearchParams(window.location.search);
  const openId = params.get('open');
  if (openId) openCaseOverlay(parseInt(openId));
  if (params.get('action') === 'new') openNewCaseOverlay();
});
