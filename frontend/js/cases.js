// ── "Other" select helper ─────────────────────────────
function handleOtherSelect(sel, otherId) {
  const v = sel.value;
  const el = document.getElementById(otherId);
  if (!el) return;
  if (v === 'Other' || v === 'Others') {
    el.classList.remove('hidden');
  } else {
    el.classList.add('hidden');
    el.value = '';
  }
}

function getOtherValue(selectId, otherId) {
  const sel = document.getElementById(selectId);
  if (!sel) return null;
  const v = sel.value;
  if ((v === 'Other' || v === 'Others') && otherId) {
    const txt = document.getElementById(otherId)?.value.trim();
    return txt || v;
  }
  return v;
}

// ── State ─────────────────────────────────────────────
let casesPage    = 1;
const CASES_LIMIT = 50;
let casesTotal    = 0;
let casesFilters  = { date: null, lgas: [], status: null };
let currentCaseId = null;
const ncSelectedParamedics = [];
const selectedParamedics   = [];

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

document.getElementById('cases-filter-modal')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) closeCasesFilterModal();
});

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

async function loadAvailableParamedicsDropdown(dropdownId) {
  try {
    const paramedics = await apiFetch('/api/paramedics/available');
    const sel = document.getElementById(dropdownId);
    sel.innerHTML = '<option value="">-- Select Paramedic --</option>' +
      paramedics.map(p => `<option value="${p.user_id}">${p.username} — ${p.first_name} ${p.last_name}</option>`).join('');
  } catch { /* leave as is */ }
}

async function loadAvailableAmbulancesDropdown(selectId) {
  try {
    const ambs = await apiFetch('/api/ambulances/available');
    const sel = document.getElementById(selectId);
    sel.innerHTML = '<option value="">-- Select Available Ambulance --</option>' +
      ambs.map(a => `<option value="${a.ambulance_id}">${a.ambulance_code} — ${a.vehicle_name}</option>`).join('');
  } catch { /* leave as is */ }
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
    date_of_incident:    document.getElementById('nc-date').value,
    time_of_incident:    document.getElementById('nc-time').value,
    notified_by:         getOtherValue('nc-notified-by', 'nc-notified-by-other'),
    lga_lcda:            document.getElementById('nc-lga').value,
    incident_type:       getOtherValue('nc-incident-type', 'nc-incident-type-other'),
    incident_severity:   getOtherValue('nc-severity', 'nc-severity-other'),
    incident_location:   document.getElementById('nc-location').value,
    incident_description: document.getElementById('nc-description').value,
    dispatch_time:       document.getElementById('nc-dispatch-time').value || null,
    ambulance_id:        ambulanceSelect.value || null,
    paramedic_ids:       ncSelectedParamedics.map(p => parseInt(p.id)),
  };

  try {
    const { case_id } = await apiFetch('/api/cases', { method: 'POST', body: JSON.stringify(payload) });
    closeNewCaseOverlay();
    loadCases();
    openCaseOverlay(case_id);
  } catch (err) {
    alert('Could not create case: ' + err.message);
  }
});

// ── Case overlay ──────────────────────────────────────
async function openCaseOverlay(caseId) {
  currentCaseId = caseId;
  document.getElementById('case-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  switchTab('overview', document.querySelector('#case-overlay .inpage-tab'));
  await loadCaseDetail(caseId);
}

function closeCaseOverlay() {
  document.getElementById('case-overlay').classList.remove('open');
  if (!document.getElementById('new-case-overlay').classList.contains('open')) {
    document.body.style.overflow = '';
  }
}

async function loadCaseDetail(caseId) {
  try {
    const c = await apiFetch(`/api/cases/${caseId}`);
    document.getElementById('overlay-title').textContent =
      `Case ${c.case_id}${c.incident_type ? ' — ' + c.incident_type : ''}`;

    // Overview tab
    document.getElementById('ov-case-id').textContent       = c.case_id;
    document.getElementById('ov-date').textContent          = formatDate(c.date_of_incident);
    document.getElementById('ov-report-time').textContent   = c.time_of_incident || '—';
    document.getElementById('ov-dispatch-time').textContent = c.dispatch_time || 'Not yet dispatched';
    document.getElementById('ov-incident-type').textContent = c.incident_type || '—';
    document.getElementById('ov-severity').textContent      = c.incident_severity || '—';
    document.getElementById('ov-lga').textContent           = c.lga_lcda || '—';
    document.getElementById('ov-location').textContent      = c.incident_location || '—';

    const badge = document.getElementById('ov-status-badge');
    const map   = { Active: 'status-active', Complete: 'status-complete', Cancelled: 'status-cancelled' };
    badge.className = `status-badge ${map[c.case_status] || 'status-active'}`;
    badge.textContent = c.case_status === 'Complete' ? 'Completed' : c.case_status;

    setSelectVal('edit-incident-type', c.incident_type);
    setSelectVal('edit-severity', c.incident_severity);
    setSelectVal('edit-lga', c.lga_lcda);
    const locEl = document.getElementById('edit-location');
    if (locEl) locEl.value = c.incident_location || '';
    setSelectVal('edit-status', c.case_status);
    toggleEditMode(false);

    // Dispatch tab
    populateDispatch(c);

    // Arrival tab
    populateArrival(c);

    // Patient list
    loadPatientList(caseId);
  } catch (err) {
    console.error('Load case detail error:', err);
  }
}

function setSelectVal(id, val) {
  const el = document.getElementById(id);
  if (el && val) el.value = val;
}

// ── Overview edit ─────────────────────────────────────
function toggleEditMode(enable) {
  document.getElementById('overview-view').classList.toggle('hidden', enable);
  document.getElementById('overview-edit').classList.toggle('hidden', !enable);
  document.getElementById('btn-edit-case').classList.toggle('hidden', enable);
  document.getElementById('btn-save-overview').classList.toggle('hidden', !enable);
  document.getElementById('btn-cancel-edit').classList.toggle('hidden', !enable);
}

async function saveOverview() {
  const payload = {
    incident_type:        getOtherValue('edit-incident-type', 'edit-incident-type-other'),
    incident_severity:    getOtherValue('edit-severity', 'edit-severity-other'),
    lga_lcda:             document.getElementById('edit-lga').value,
    incident_location:    document.getElementById('edit-location').value,
    case_status:          document.getElementById('edit-status').value,
  };
  try {
    await apiFetch(`/api/cases/${currentCaseId}`, { method: 'PUT', body: JSON.stringify(payload) });
    await loadCaseDetail(currentCaseId);
    loadCases();
  } catch (err) {
    alert('Save failed: ' + err.message);
  }
}

// ── Dispatch tab ──────────────────────────────────────
function populateDispatch(c) {
  if (c.dispatch_time) {
    document.getElementById('dispatch-form').classList.add('hidden');
    document.getElementById('dispatch-saved').classList.remove('hidden');
    document.getElementById('saved-dispatch-date').textContent = formatDate(c.dispatch_date);
    document.getElementById('saved-dispatch-time').textContent = c.dispatch_time;
    document.getElementById('saved-ambulance').textContent =
      c.ambulance_code ? `${c.ambulance_code} — ${c.vehicle_name}` : '—';
    document.getElementById('saved-paramedics').textContent =
      (c.paramedics || []).map(p => `${p.username} (${p.first_name} ${p.last_name})`).join(', ') || '—';
  } else {
    document.getElementById('dispatch-form').classList.remove('hidden');
    document.getElementById('dispatch-saved').classList.add('hidden');
    document.getElementById('dispatch-date').value = c.date_of_incident || '';
    selectedParamedics.length = 0;
    document.getElementById('paramedic-selected-list').innerHTML = '';
    loadAvailableParamedicsDropdown('paramedic-select-dropdown');
    loadAvailableAmbulancesDropdown('dispatch-ambulance');
  }
}

function addParamedicRow() {
  const dropdown = document.getElementById('paramedic-select-dropdown');
  dropdown.classList.toggle('hidden');
  dropdown.onchange = function () {
    const val  = this.value;
    const text = this.options[this.selectedIndex].text;
    if (!val || selectedParamedics.find(p => p.id == val)) return;
    selectedParamedics.push({ id: val, label: text });
    const tag = document.createElement('span');
    tag.className = 'filter-tag';
    tag.innerHTML = `${text} <button class="filter-tag-remove" onclick="removeParamedic('${val}', this)">×</button>`;
    document.getElementById('paramedic-selected-list').appendChild(tag);
    this.value = '';
  };
}

function removeParamedic(val, btn) {
  const idx = selectedParamedics.findIndex(p => p.id == val);
  if (idx > -1) selectedParamedics.splice(idx, 1);
  btn.parentElement.remove();
}

async function saveDispatch() {
  const date      = document.getElementById('dispatch-date').value;
  const time      = document.getElementById('dispatch-time').value;
  const ambulance = document.getElementById('dispatch-ambulance').value;
  if (!date || !time) { alert('Please fill in date and time.'); return; }

  const payload = {
    dispatch_date: date,
    dispatch_time: time,
    ambulance_id:  ambulance || null,
    paramedic_ids: selectedParamedics.map(p => parseInt(p.id)),
  };
  try {
    await apiFetch(`/api/cases/${currentCaseId}/dispatch`, { method: 'POST', body: JSON.stringify(payload) });
    await loadCaseDetail(currentCaseId);
    loadCases();
  } catch (err) {
    alert('Dispatch failed: ' + err.message);
  }
}

// ── Arrival tab ───────────────────────────────────────
function populateArrival(c) {
  if (c.arrival_time) {
    document.getElementById('arrival-form').classList.add('hidden');
    document.getElementById('arrival-saved').classList.remove('hidden');
    document.getElementById('saved-arrival-date').textContent = formatDate(c.arrival_date);
    document.getElementById('saved-arrival-time').textContent = c.arrival_time;
    document.getElementById('saved-situation').textContent    = c.situation_on_arrival || '—';
  } else {
    document.getElementById('arrival-form').classList.remove('hidden');
    document.getElementById('arrival-saved').classList.add('hidden');
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    document.getElementById('arrival-date').value = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    document.getElementById('arrival-time').value = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  }
}

async function saveArrival() {
  const date      = document.getElementById('arrival-date').value;
  const time      = document.getElementById('arrival-time').value;
  const situation = document.getElementById('arrival-situation').value;
  if (!date || !time || !situation) { alert('Please fill in all arrival fields.'); return; }

  try {
    await apiFetch(`/api/cases/${currentCaseId}/arrival`, {
      method: 'POST',
      body: JSON.stringify({ arrival_date: date, arrival_time: time, situation_on_arrival: situation }),
    });
    await loadCaseDetail(currentCaseId);
    loadCases();
  } catch (err) {
    alert('Arrival save failed: ' + err.message);
  }
}

// ── Patient form ──────────────────────────────────────
let currentPatientPage  = 1;
const totalPatientPages = 7;

function patientFormNav(direction) {
  const pages   = document.querySelectorAll('.patient-page');
  const steps   = document.querySelectorAll('.progress-step');
  const prevBtn = document.getElementById('btn-prev-page');
  const nextBtn = document.getElementById('btn-next-page');
  const saveBtn = document.getElementById('btn-save-final');

  pages[currentPatientPage - 1].classList.remove('active');
  steps[currentPatientPage - 1].classList.remove('current');
  if (direction > 0) steps[currentPatientPage - 1].classList.add('done');

  currentPatientPage = Math.min(Math.max(currentPatientPage + direction, 1), totalPatientPages);

  pages[currentPatientPage - 1].classList.add('active');
  steps[currentPatientPage - 1].classList.remove('done');
  steps[currentPatientPage - 1].classList.add('current');

  prevBtn.disabled = currentPatientPage === 1;
  nextBtn.classList.toggle('hidden', currentPatientPage === totalPatientPages);
  saveBtn.classList.toggle('hidden', currentPatientPage !== totalPatientPages);
}

async function savePatientFinal() {
  const g = id => document.getElementById(id)?.value.trim() || null;
  const payload = {
    full_name: g('p-fullname'), age: g('p-age'), gender: g('p-gender'),
    home_address: g('p-address'), state_of_origin: g('p-state'), lga: g('p-lga'),
    phone_number: g('p-phone'), occupation: g('p-occupation'),
    respiratory_rate: g('p-resp-rate'), temperature: g('p-temp'),
    condition_on_arrival: g('p-condition'), spo2: g('p-spo2'),
    gastrointestinal: g('p-gastro'), known_medical_history: g('p-medical-hx'),
    cancer_diagnosis: g('p-cancer'), renal_urological: g('p-renal'),
    level_of_consciousness: g('p-consciousness'), airway: g('p-airway'),
    breathing: g('p-breathing'), circulation: g('p-circulation'),
    airway_management: g('p-airway-mgmt'), airway_additional: g('p-airway-add'),
    breathing_assistance: g('p-breathing-assist'), breathing_additional: g('p-breathing-add'),
    cardiac_care: g('p-cardiac'),
    hospital_name: g('p-hospital'), transport_departure_time: g('p-depart-time'),
    transport_arrival_time: g('p-arrive-hosp-time'), outcome_at_hospital: g('p-outcome'),
    hospital_date: g('p-hosp-date'), hospital_time: g('p-hosp-time'),
    hcp_designation: g('p-hcp-designation'), hcp_name: g('p-hcp-name'),
    law_enforcement: g('p-law'), patient_belongings: g('p-belongings'),
    witnesses: g('p-witnesses'),
    situation_on_arrival: document.getElementById('saved-situation')?.textContent.trim() || null,
  };

  try {
    await apiFetch(`/api/cases/${currentCaseId}/patients`, { method: 'POST', body: JSON.stringify(payload) });
    switchTab('patient-list', document.querySelectorAll('#case-overlay .inpage-tab')[4]);
    loadPatientList(currentCaseId);
  } catch (err) {
    alert('Could not save patient: ' + err.message);
  }
}

// ── Patient list ──────────────────────────────────────
async function loadPatientList(caseId) {
  try {
    const patients = await apiFetch(`/api/cases/${caseId}/patients`);
    const tbody    = document.getElementById('patient-list-body');
    if (!patients.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#888;">No patients recorded yet.</td></tr>';
      return;
    }
    tbody.innerHTML = patients.map((p, i) => `
      <tr class="clickable-row" onclick="openViewMore(${p.patient_id})">
        <td>${i + 1}</td>
        <td>${p.situation_on_arrival || '—'}</td>
        <td>${p.full_name || '—'}</td>
        <td>${p.home_address || '—'}</td>
        <td>${p.gender || '—'}</td>
        <td>${p.submitted_by_username || '—'}</td>
      </tr>`).join('');
  } catch (err) {
    console.error('Patient list error:', err);
  }
}

let viewMorePatientId   = null;
let viewMorePatientData = null;

async function openViewMore(patientId) {
  viewMorePatientId   = patientId;
  viewMorePatientData = null;
  document.getElementById('view-more-overlay').classList.add('open');
  try {
    const p = await apiFetch(`/api/cases/${currentCaseId}/patients/${patientId}`);
    viewMorePatientData = p;
    const display = (v) => v || '—';
    document.getElementById('view-more-content').innerHTML = `
      <div class="view-more-section">
        <h3 class="view-more-section-title">Patient Information</h3>
        <div class="info-grid">
          <div class="info-row"><span class="info-label">Full Name</span><span class="info-value">${display(p.full_name)}</span></div>
          <div class="info-row"><span class="info-label">Age</span><span class="info-value">${display(p.age)}</span></div>
          <div class="info-row"><span class="info-label">Gender</span><span class="info-value">${display(p.gender)}</span></div>
          <div class="info-row"><span class="info-label">Home Address</span><span class="info-value">${display(p.home_address)}</span></div>
          <div class="info-row"><span class="info-label">State of Origin</span><span class="info-value">${display(p.state_of_origin)}</span></div>
          <div class="info-row"><span class="info-label">LGA</span><span class="info-value">${display(p.lga)}</span></div>
          <div class="info-row"><span class="info-label">Phone Number</span><span class="info-value">${display(p.phone_number)}</span></div>
          <div class="info-row"><span class="info-label">Occupation</span><span class="info-value">${display(p.occupation)}</span></div>
          <div class="info-row"><span class="info-label">Situation on Arrival</span><span class="info-value">${display(p.situation_on_arrival)}</span></div>
          <div class="info-row"><span class="info-label">Submitted By</span><span class="info-value">${display(p.submitted_by_username)}</span></div>
        </div>
      </div>
      ${p.condition_on_arrival ? `
      <div class="view-more-section">
        <h3 class="view-more-section-title">General Assessment</h3>
        <div class="info-grid">
          <div class="info-row"><span class="info-label">Condition on Arrival</span><span class="info-value">${display(p.condition_on_arrival)}</span></div>
          <div class="info-row"><span class="info-label">Respiratory Rate</span><span class="info-value">${display(p.respiratory_rate)}</span></div>
          <div class="info-row"><span class="info-label">Temperature</span><span class="info-value">${display(p.temperature)}</span></div>
          <div class="info-row"><span class="info-label">SpO2</span><span class="info-value">${display(p.spo2)}</span></div>
        </div>
      </div>` : ''}`;
  } catch (err) {
    console.error('View more error:', err);
  }
}

function closeViewMore() {
  document.getElementById('view-more-overlay').classList.remove('open');
}

function editPatientFromViewMore() {
  closeViewMore();
  if (viewMorePatientData) openEditPatientModal(viewMorePatientData);
}

// ── Edit Patient Modal ────────────────────────────────
let epCurrentPage = 1;
const EP_TOTAL_PAGES = 7;

function openEditPatientModal(p) {
  const s = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };

  s('ep-fullname', p.full_name);    s('ep-age', p.age);
  s('ep-gender', p.gender);         s('ep-address', p.home_address);
  s('ep-state', p.state_of_origin); s('ep-lga', p.lga);
  s('ep-phone', p.phone_number);    s('ep-occupation', p.occupation);

  s('ep-resp-rate', p.respiratory_rate); s('ep-temp', p.temperature);
  s('ep-condition', p.condition_on_arrival); s('ep-spo2', p.spo2);

  s('ep-gastro', p.gastrointestinal);     s('ep-medical-hx', p.known_medical_history);
  s('ep-cancer', p.cancer_diagnosis);     s('ep-renal', p.renal_urological);

  s('ep-consciousness', p.level_of_consciousness); s('ep-airway', p.airway);
  s('ep-breathing', p.breathing);                  s('ep-circulation', p.circulation);

  s('ep-airway-mgmt', p.airway_management);       s('ep-airway-add', p.airway_additional);
  s('ep-breathing-assist', p.breathing_assistance); s('ep-breathing-add', p.breathing_additional);
  s('ep-cardiac', p.cardiac_care);

  s('ep-hospital', p.hospital_name);
  s('ep-depart-time', p.transport_departure_time);
  s('ep-arrive-hosp-time', p.transport_arrival_time);
  s('ep-outcome', p.outcome_at_hospital);
  s('ep-hosp-date', p.hospital_date);  s('ep-hosp-time', p.hospital_time);

  s('ep-hcp-designation', p.hcp_designation); s('ep-hcp-name', p.hcp_name);
  s('ep-law', p.law_enforcement);
  s('ep-belongings', p.patient_belongings);   s('ep-witnesses', p.witnesses);

  epCurrentPage = 1;
  document.querySelectorAll('.ep-page').forEach((pg, i) => pg.classList.toggle('active', i === 0));
  document.querySelectorAll('#ep-progress .progress-step').forEach((st, i) => {
    st.classList.toggle('current', i === 0);
    st.classList.remove('done');
  });
  document.getElementById('ep-btn-prev').disabled = true;
  document.getElementById('ep-btn-next').classList.remove('hidden');
  document.getElementById('ep-btn-save').classList.add('hidden');

  document.getElementById('edit-patient-modal').classList.add('open');
}

function closeEditPatientModal() {
  document.getElementById('edit-patient-modal').classList.remove('open');
}

function epFormNav(direction) {
  const pages   = document.querySelectorAll('.ep-page');
  const steps   = document.querySelectorAll('#ep-progress .progress-step');
  const prevBtn = document.getElementById('ep-btn-prev');
  const nextBtn = document.getElementById('ep-btn-next');
  const saveBtn = document.getElementById('ep-btn-save');

  pages[epCurrentPage - 1].classList.remove('active');
  steps[epCurrentPage - 1].classList.remove('current');
  if (direction > 0) steps[epCurrentPage - 1].classList.add('done');

  epCurrentPage = Math.min(Math.max(epCurrentPage + direction, 1), EP_TOTAL_PAGES);

  pages[epCurrentPage - 1].classList.add('active');
  steps[epCurrentPage - 1].classList.remove('done');
  steps[epCurrentPage - 1].classList.add('current');

  prevBtn.disabled = epCurrentPage === 1;
  nextBtn.classList.toggle('hidden', epCurrentPage === EP_TOTAL_PAGES);
  saveBtn.classList.toggle('hidden', epCurrentPage !== EP_TOTAL_PAGES);
}

async function saveEditPatient() {
  const g = id => document.getElementById(id)?.value.trim() || null;
  const payload = {
    full_name: g('ep-fullname'), age: g('ep-age'), gender: g('ep-gender'),
    home_address: g('ep-address'), state_of_origin: g('ep-state'), lga: g('ep-lga'),
    phone_number: g('ep-phone'), occupation: g('ep-occupation'),
    respiratory_rate: g('ep-resp-rate'), temperature: g('ep-temp'),
    condition_on_arrival: g('ep-condition'), spo2: g('ep-spo2'),
    gastrointestinal: g('ep-gastro'), known_medical_history: g('ep-medical-hx'),
    cancer_diagnosis: g('ep-cancer'), renal_urological: g('ep-renal'),
    level_of_consciousness: g('ep-consciousness'), airway: g('ep-airway'),
    breathing: g('ep-breathing'), circulation: g('ep-circulation'),
    airway_management: g('ep-airway-mgmt'), airway_additional: g('ep-airway-add'),
    breathing_assistance: g('ep-breathing-assist'), breathing_additional: g('ep-breathing-add'),
    cardiac_care: g('ep-cardiac'),
    hospital_name: g('ep-hospital'), transport_departure_time: g('ep-depart-time'),
    transport_arrival_time: g('ep-arrive-hosp-time'), outcome_at_hospital: g('ep-outcome'),
    hospital_date: g('ep-hosp-date'), hospital_time: g('ep-hosp-time'),
    hcp_designation: g('ep-hcp-designation'), hcp_name: g('ep-hcp-name'),
    law_enforcement: g('ep-law'), patient_belongings: g('ep-belongings'),
    witnesses: g('ep-witnesses'),
    situation_on_arrival: viewMorePatientData?.situation_on_arrival || null,
  };

  try {
    await apiFetch(`/api/cases/${currentCaseId}/patients/${viewMorePatientId}`, {
      method: 'PUT', body: JSON.stringify(payload),
    });
    closeEditPatientModal();
    loadPatientList(currentCaseId);
  } catch (err) {
    alert('Could not save patient: ' + err.message);
  }
}

// ── Tab switching ─────────────────────────────────────
function switchTab(tabName, btn) {
  document.querySelectorAll('#case-overlay .tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('#case-overlay .inpage-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tabName).classList.add('active');
  if (btn) btn.classList.add('active');
  // Reset patient form to page 1 when switching to it
  if (tabName === 'patient-form') {
    currentPatientPage = 1;
    document.querySelectorAll('.patient-page').forEach((p, i) => p.classList.toggle('active', i === 0));
    document.querySelectorAll('.progress-step').forEach((s, i) => {
      s.classList.toggle('current', i === 0);
      s.classList.remove('done');
    });
    document.getElementById('btn-prev-page').disabled = true;
    document.getElementById('btn-next-page').classList.remove('hidden');
    document.getElementById('btn-save-final').classList.add('hidden');
  }
}

// ── Backdrop clicks ───────────────────────────────────
document.getElementById('case-overlay')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) closeCaseOverlay();
});
document.getElementById('new-case-overlay')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) closeNewCaseOverlay();
});
document.getElementById('view-more-overlay')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) closeViewMore();
});
document.getElementById('edit-patient-modal')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) closeEditPatientModal();
});
document.getElementById('cases-filter-modal')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) closeCasesFilterModal();
});

// ── Boot ──────────────────────────────────────────────
document.addEventListener('componentsReady', async () => {
  await loadCases();
  const openId = new URLSearchParams(window.location.search).get('open');
  if (openId) openCaseOverlay(parseInt(openId));
});
