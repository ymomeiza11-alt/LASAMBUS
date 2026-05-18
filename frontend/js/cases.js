// ── New Case overlay ──
function openNewCaseOverlay() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  document.getElementById('nc-date').value =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  document.getElementById('nc-time').value =
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  document.getElementById('nc-dispatch-time').value =
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  document.getElementById('new-case-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeNewCaseOverlay() {
  document.getElementById('new-case-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

// New case paramedic tags
const ncSelectedParamedics = [];

function ncAddParamedic() {
  const dropdown = document.getElementById('nc-paramedic-dropdown');
  dropdown.classList.toggle('hidden');
  dropdown.onchange = function () {
    const val = this.value;
    const text = this.options[this.selectedIndex].text;
    if (!val || ncSelectedParamedics.includes(val)) return;
    ncSelectedParamedics.push(val);
    const tag = document.createElement('span');
    tag.className = 'filter-tag';
    tag.innerHTML = `${text} <button class="filter-tag-remove" onclick="ncRemoveParamedic('${val}', this)">×</button>`;
    document.getElementById('nc-paramedic-list').appendChild(tag);
    this.value = '';
  };
}

function ncRemoveParamedic(val, btn) {
  const idx = ncSelectedParamedics.indexOf(val);
  if (idx > -1) ncSelectedParamedics.splice(idx, 1);
  btn.parentElement.remove();
}

document.getElementById('newCaseForm').addEventListener('submit', function (e) {
  e.preventDefault();
  const required = [
    { id: 'nc-notified-by', errId: 'err-nc-notified-by' },
    { id: 'nc-lga',         errId: 'err-nc-lga' },
    { id: 'nc-incident-type', errId: 'err-nc-type' },
    { id: 'nc-severity',    errId: 'err-nc-severity' },
    { id: 'nc-location',    errId: 'err-nc-location' },
    { id: 'nc-description', errId: 'err-nc-description' },
  ];
  let valid = true;
  required.forEach(({ id, errId }) => {
    const el = document.getElementById(id);
    const err = document.getElementById(errId);
    el.classList.remove('error');
    err.classList.remove('visible');
    if (!el.value.trim()) { el.classList.add('error'); err.classList.add('visible'); valid = false; }
  });
  if (!valid) return;
  closeNewCaseOverlay();
  // Phase 1: open the edit case overlay to simulate opening the new case
  openCaseOverlay('NEW');
});

// ── Specific Case overlay ──
function openCaseOverlay(caseId) {
  document.getElementById('case-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  // Reset to overview tab
  switchTab('overview', document.querySelector('#case-overlay .inpage-tab'));
}

function closeCaseOverlay() {
  document.getElementById('case-overlay').classList.remove('open');
  if (!document.getElementById('new-case-overlay').classList.contains('open')) {
    document.body.style.overflow = '';
  }
}

function openViewMore() {
  document.getElementById('view-more-overlay').classList.add('open');
}

function closeViewMore() {
  document.getElementById('view-more-overlay').classList.remove('open');
}

// ── In-page tab switching ──
function switchTab(tabName, btn) {
  document.querySelectorAll('#case-overlay .tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('#case-overlay .inpage-tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + tabName).classList.add('active');
  if (btn) btn.classList.add('active');
}

// ── Overview edit mode ──
function toggleEditMode(enable) {
  document.getElementById('overview-view').classList.toggle('hidden', enable);
  document.getElementById('overview-edit').classList.toggle('hidden', !enable);
  document.getElementById('btn-edit-case').classList.toggle('hidden', enable);
  document.getElementById('btn-save-overview').classList.toggle('hidden', !enable);
  document.getElementById('btn-cancel-edit').classList.toggle('hidden', !enable);
}

function saveOverview() {
  toggleEditMode(false);
}

// ── Dispatch tab — paramedic tags ──
const selectedParamedics = [];

function addParamedicRow() {
  const dropdown = document.getElementById('paramedic-select-dropdown');
  dropdown.classList.toggle('hidden');
  dropdown.onchange = function () {
    const val = this.value;
    const text = this.options[this.selectedIndex].text;
    if (!val || selectedParamedics.includes(val)) return;
    selectedParamedics.push(val);
    const tag = document.createElement('span');
    tag.className = 'filter-tag';
    tag.innerHTML = `${text} <button class="filter-tag-remove" onclick="removeParamedic('${val}', this)">×</button>`;
    document.getElementById('paramedic-selected-list').appendChild(tag);
    this.value = '';
  };
}

function removeParamedic(val, btn) {
  const idx = selectedParamedics.indexOf(val);
  if (idx > -1) selectedParamedics.splice(idx, 1);
  btn.parentElement.remove();
}

function saveDispatch() {
  const date = document.getElementById('dispatch-date').value;
  const time = document.getElementById('dispatch-time').value;
  const ambulance = document.getElementById('dispatch-ambulance').value;
  if (!date || !time || !ambulance) { alert('Please fill in date, time and ambulance.'); return; }

  document.getElementById('saved-dispatch-date').textContent = date;
  document.getElementById('saved-dispatch-time').textContent = time;
  document.getElementById('saved-ambulance').textContent = ambulance;
  document.getElementById('saved-paramedics').textContent = selectedParamedics.join(', ') || '—';
  document.getElementById('dispatch-form').classList.add('hidden');
  document.getElementById('dispatch-saved').classList.remove('hidden');
}

// ── Arrival ──
function saveArrival() {
  const date = document.getElementById('arrival-date').value;
  const time = document.getElementById('arrival-time').value;
  const situation = document.getElementById('arrival-situation').value;
  if (!date || !time || !situation) { alert('Please fill in all arrival fields.'); return; }

  document.getElementById('saved-arrival-date').textContent = date;
  document.getElementById('saved-arrival-time').textContent = time;
  document.getElementById('saved-situation').textContent = situation;
  document.getElementById('arrival-form').classList.add('hidden');
  document.getElementById('arrival-saved').classList.remove('hidden');
}

// ── Patient Entry Form ──
let currentPatientPage = 1;
const totalPatientPages = 7;

function patientFormNav(direction) {
  const pages = document.querySelectorAll('.patient-page');
  const steps = document.querySelectorAll('.progress-step');
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

function savePatientDraft() { alert('Draft saved.'); }
function savePatientFinal() {
  alert('Patient record saved.');
  switchTab('patient-list', document.querySelectorAll('#case-overlay .inpage-tab')[4]);
}

function editPatientFromViewMore() {
  closeViewMore();
  switchTab('patient-form', document.querySelectorAll('#case-overlay .inpage-tab')[3]);
}

// ── Search ──
function searchCases() {
  const query = document.getElementById('search-case-id').value.trim().toLowerCase();
  document.querySelectorAll('#cases-table-body tr').forEach(row => {
    const caseId = row.cells[1]?.textContent.toLowerCase() || '';
    row.style.display = !query || caseId.includes(query) ? '' : 'none';
  });
}

document.getElementById('search-case-id').addEventListener('keydown', e => {
  if (e.key === 'Enter') searchCases();
});

// ── Filter modal ──
let casesFilters = { date: null, lgas: [] };

function openCasesFilterModal() {
  document.getElementById('cases-filter-modal').classList.add('open');
}

function closeCasesFilterModal() {
  document.getElementById('cases-filter-modal').classList.remove('open');
}

function applyCasesFilter() {
  casesFilters.date = document.getElementById('filter-date').value || null;
  casesFilters.lgas = Array.from(
    document.querySelectorAll('#cases-filter-modal input[type="checkbox"]:checked')
  ).map(cb => cb.value);
  renderActiveFilters();
  closeCasesFilterModal();
}

function renderActiveFilters() {
  const container = document.getElementById('cases-active-filters');
  const { date, lgas } = casesFilters;
  if (!date && lgas.length === 0) { container.classList.add('hidden'); return; }

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
  renderActiveFilters();
}

// ── Backdrop click to close ──
document.getElementById('case-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeCaseOverlay(); });
document.getElementById('new-case-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeNewCaseOverlay(); });
document.getElementById('view-more-overlay').addEventListener('click', e => { if (e.target === e.currentTarget) closeViewMore(); });
document.getElementById('cases-filter-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeCasesFilterModal(); });
