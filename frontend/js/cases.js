// ── Overlay open/close ──
function openCaseOverlay(caseId) {
  document.getElementById('case-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  switchTab('overview', document.querySelector('.inpage-tab'));
}

function closeCaseOverlay() {
  document.getElementById('case-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function openViewMore(patientId) {
  document.getElementById('view-more-overlay').classList.add('open');
}

function closeViewMore() {
  document.getElementById('view-more-overlay').classList.remove('open');
}

// ── In-page tab switching ──
function switchTab(tabName, btn) {
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.inpage-tab').forEach(t => t.classList.remove('active'));
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
  // Phase 1: just close edit mode (backend wires this up later)
  toggleEditMode(false);
}

// ── Dispatch ──
function addParamedicRow() {
  const dropdown = document.getElementById('paramedic-select-dropdown');
  dropdown.classList.toggle('hidden');
}

function saveDispatch() {
  const date = document.getElementById('dispatch-date').value;
  const time = document.getElementById('dispatch-time').value;
  const ambulance = document.getElementById('dispatch-ambulance').value;

  if (!date || !time || !ambulance) {
    alert('Please fill in all dispatch fields.');
    return;
  }

  document.getElementById('saved-dispatch-date').textContent = date;
  document.getElementById('saved-dispatch-time').textContent = time;
  document.getElementById('saved-ambulance').textContent = ambulance;
  document.getElementById('saved-paramedics').textContent = 'jdoe'; // placeholder

  document.getElementById('dispatch-form').classList.add('hidden');
  document.getElementById('dispatch-saved').classList.remove('hidden');
}

// ── Arrival ──
function saveArrival() {
  const date = document.getElementById('arrival-date').value;
  const time = document.getElementById('arrival-time').value;
  const situation = document.getElementById('arrival-situation').value;

  if (!date || !time || !situation) {
    alert('Please fill in all arrival fields.');
    return;
  }

  document.getElementById('saved-arrival-date').textContent = date;
  document.getElementById('saved-arrival-time').textContent = time;
  document.getElementById('saved-situation').textContent = situation;

  document.getElementById('arrival-form').classList.add('hidden');
  document.getElementById('arrival-saved').classList.remove('hidden');
}

// ── Patient Entry Form pagination ──
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
  steps[currentPatientPage - 1].classList.add('done');

  currentPatientPage += direction;

  if (currentPatientPage < 1) currentPatientPage = 1;
  if (currentPatientPage > totalPatientPages) currentPatientPage = totalPatientPages;

  pages[currentPatientPage - 1].classList.add('active');
  steps[currentPatientPage - 1].classList.remove('done');
  steps[currentPatientPage - 1].classList.add('current');

  prevBtn.disabled = currentPatientPage === 1;
  nextBtn.classList.toggle('hidden', currentPatientPage === totalPatientPages);
  saveBtn.classList.toggle('hidden', currentPatientPage !== totalPatientPages);
}

function savePatientDraft() {
  alert('Draft saved. (Backend will persist this in the database.)');
}

function savePatientFinal() {
  alert('Patient record saved.');
  switchTab('patient-list', document.querySelectorAll('.inpage-tab')[4]);
}

function editPatientFromViewMore() {
  closeViewMore();
  switchTab('patient-form', document.querySelectorAll('.inpage-tab')[3]);
}

// Close overlays on backdrop click
document.getElementById('case-overlay').addEventListener('click', function (e) {
  if (e.target === this) closeCaseOverlay();
});

document.getElementById('view-more-overlay').addEventListener('click', function (e) {
  if (e.target === this) closeViewMore();
});
