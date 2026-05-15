let ambMode = 'add';
let deleteTarget = null;

function openAmbOverlay(mode, code) {
  ambMode = mode;
  const overlay = document.getElementById('amb-overlay');
  const title = document.getElementById('amb-overlay-title');
  const deleteBtn = document.getElementById('btn-delete-amb');

  clearAmbForm();

  if (mode === 'edit') {
    title.textContent = 'Edit Ambulance';
    deleteBtn.classList.remove('hidden');
    // Phase 1: placeholder data
    document.getElementById('amb-vehicle-name').value = 'Toyota HiAce';
    document.getElementById('amb-code').value = code;
  } else {
    title.textContent = 'Add Ambulance';
    deleteBtn.classList.add('hidden');
  }

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeAmbOverlay() {
  document.getElementById('amb-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function clearAmbForm() {
  document.getElementById('amb-vehicle-name').value = '';
  document.getElementById('amb-code').value = '';
  ['err-amb-name', 'err-amb-code'].forEach(id => document.getElementById(id).classList.remove('visible'));
  ['amb-vehicle-name', 'amb-code'].forEach(id => document.getElementById(id).classList.remove('error'));
}

document.getElementById('ambForm').addEventListener('submit', function (e) {
  e.preventDefault();
  let valid = true;

  const name = document.getElementById('amb-vehicle-name');
  const code = document.getElementById('amb-code');

  [{ el: name, err: 'err-amb-name' }, { el: code, err: 'err-amb-code' }].forEach(({ el, err }) => {
    el.classList.remove('error');
    document.getElementById(err).classList.remove('visible');
    if (!el.value.trim()) {
      el.classList.add('error');
      document.getElementById(err).classList.add('visible');
      valid = false;
    }
  });

  if (!valid) return;
  closeAmbOverlay();
});

function openDeleteConfirm(type) {
  deleteTarget = type;
  document.getElementById('delete-popup').classList.add('open');
}

function closeDeleteConfirm() {
  document.getElementById('delete-popup').classList.remove('open');
  deleteTarget = null;
}

function confirmDelete() {
  closeDeleteConfirm();
  closeAmbOverlay();
}

function updateAmbStatus(select, code) {
  // Backend will persist this
}

function searchAmbulances() {
  const query = document.getElementById('search-amb-code').value.trim().toLowerCase();
  const rows = document.querySelectorAll('#ambulance-table-body tr');
  rows.forEach(row => {
    const code = row.querySelector('td')?.textContent.toLowerCase() || '';
    row.style.display = !query || code.includes(query) ? '' : 'none';
  });
}
