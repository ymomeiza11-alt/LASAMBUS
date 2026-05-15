let paramedicMode = 'add';

function openParamedicOverlay(mode, username) {
  paramedicMode = mode;
  const overlay = document.getElementById('paramedic-overlay');
  const title = document.getElementById('paramedic-overlay-title');
  const deleteBtn = document.getElementById('btn-delete-paramedic');
  const changePwSection = document.getElementById('change-password-section');
  const passwordGroup = document.getElementById('password-group');

  clearParamedicForm();

  if (mode === 'edit') {
    title.textContent = 'Edit Paramedic';
    deleteBtn.classList.remove('hidden');
    changePwSection.classList.remove('hidden');
    passwordGroup.classList.add('hidden');

    // Phase 1: placeholder data
    document.getElementById('p-title').value = 'Mr';
    document.getElementById('p-firstname').value = 'John';
    document.getElementById('p-lastname').value = 'Doe';
    document.getElementById('p-username').value = username;
    document.getElementById('p-email').value = `${username}@lasambus.gov.ng`;
    document.getElementById('p-cadre').value = 'Senior Paramedic';
    document.getElementById('p-grade').value = 'GL-08';
    document.getElementById('p-is-admin').value = 'no';
  } else {
    title.textContent = 'Add Paramedic';
    deleteBtn.classList.add('hidden');
    changePwSection.classList.add('hidden');
    passwordGroup.classList.remove('hidden');
  }

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeParamedicOverlay() {
  document.getElementById('paramedic-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function clearParamedicForm() {
  ['p-title', 'p-firstname', 'p-lastname', 'p-username', 'p-email',
   'p-password', 'p-cadre', 'p-grade'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; el.classList.remove('error'); }
  });
  document.querySelectorAll('#paramedicForm .error-msg').forEach(e => e.classList.remove('visible'));
}

const paramedicRequiredFields = [
  { id: 'p-title',     errId: 'err-p-title' },
  { id: 'p-firstname', errId: 'err-p-firstname' },
  { id: 'p-lastname',  errId: 'err-p-lastname' },
  { id: 'p-username',  errId: 'err-p-username' },
  { id: 'p-email',     errId: 'err-p-email' },
];

document.getElementById('paramedicForm').addEventListener('submit', function (e) {
  e.preventDefault();
  let valid = true;

  const fields = [...paramedicRequiredFields];
  if (paramedicMode === 'add') {
    fields.push({ id: 'p-password', errId: 'err-p-password' });
  }

  fields.forEach(({ id, errId }) => {
    const el = document.getElementById(id);
    const err = document.getElementById(errId);
    el.classList.remove('error');
    err.classList.remove('visible');
    if (!el.value.trim()) {
      el.classList.add('error');
      err.classList.add('visible');
      valid = false;
    }
  });

  if (!valid) return;
  closeParamedicOverlay();
});

function openDeleteParamedic() {
  document.getElementById('paramedic-delete-popup').classList.add('open');
}

function closeDeleteParamedicPopup() {
  document.getElementById('paramedic-delete-popup').classList.remove('open');
}

function confirmDeleteParamedic() {
  closeDeleteParamedicPopup();
  closeParamedicOverlay();
}

function changeParamedicPassword() {
  const newPw = document.getElementById('p-new-password').value.trim();
  if (!newPw) { alert('Please enter a new password.'); return; }
  alert('Password updated. (Backend will persist this.)');
  document.getElementById('p-new-password').value = '';
}

function updateParamedicStatus(select, username) {
  // Backend will persist this
}

function searchParamedics() {
  const query = document.getElementById('search-paramedic').value.trim().toLowerCase();
  const rows = document.querySelectorAll('#paramedics-table-body tr');
  rows.forEach(row => {
    const username = row.cells[0]?.textContent.toLowerCase() || '';
    const name = row.cells[1]?.textContent.toLowerCase() || '';
    row.style.display = !query || username.includes(query) || name.includes(query) ? '' : 'none';
  });
}
