let ambMode = 'add';

function openAmbOverlay(mode, code) {
  ambMode = mode;
  const overlay = document.getElementById('amb-overlay');
  const title = document.getElementById('amb-overlay-title');
  const deleteBtn = document.getElementById('btn-delete-amb');
  const statusGroup = document.getElementById('amb-status-group');

  clearAmbForm();

  if (mode === 'edit') {
    title.textContent = 'Edit Ambulance';
    deleteBtn.classList.remove('hidden');
    statusGroup.classList.remove('hidden');
    // Phase 1: placeholder data
    document.getElementById('amb-vehicle-name').value = 'Toyota HiAce';
    document.getElementById('amb-code-input').value = code;
    document.getElementById('amb-status').value = 'Assigned';
    toggleAmbUnavailableReason('Assigned');
  } else {
    title.textContent = 'Add Ambulance';
    deleteBtn.classList.add('hidden');
    statusGroup.classList.add('hidden');
    document.getElementById('amb-unavailable-reason-group').classList.add('hidden');
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
  document.getElementById('amb-code-input').value = '';
  document.getElementById('amb-unavailable-reason').value = '';
  ['err-amb-name', 'err-amb-code'].forEach(id => document.getElementById(id).classList.remove('visible'));
  ['amb-vehicle-name', 'amb-code-input'].forEach(id => document.getElementById(id).classList.remove('error'));
}

function toggleAmbUnavailableReason(status) {
  const group = document.getElementById('amb-unavailable-reason-group');
  group.classList.toggle('hidden', status !== 'Unavailable');
}

document.getElementById('ambForm').addEventListener('submit', function (e) {
  e.preventDefault();
  let valid = true;

  const name = document.getElementById('amb-vehicle-name');
  const code = document.getElementById('amb-code-input');
  [{ el: name, err: 'err-amb-name' }, { el: code, err: 'err-amb-code' }].forEach(({ el, err }) => {
    el.classList.remove('error');
    document.getElementById(err).classList.remove('visible');
    if (!el.value.trim()) { el.classList.add('error'); document.getElementById(err).classList.add('visible'); valid = false; }
  });

  if (ambMode === 'edit') {
    const status = document.getElementById('amb-status').value;
    if (status === 'Unavailable' && !document.getElementById('amb-unavailable-reason').value.trim()) {
      alert('Please provide a reason for unavailability.');
      valid = false;
    }
  }

  if (!valid) return;
  closeAmbOverlay();
});

function openDeleteConfirm() {
  document.getElementById('delete-popup').classList.add('open');
}

function closeDeleteConfirm() {
  document.getElementById('delete-popup').classList.remove('open');
}

function confirmDelete() {
  closeDeleteConfirm();
  closeAmbOverlay();
}

function searchAmbulances() {
  const query = document.getElementById('search-amb-code').value.trim().toLowerCase();
  document.querySelectorAll('#ambulance-table-body tr').forEach(row => {
    const code = row.cells[0]?.textContent.toLowerCase() || '';
    row.style.display = !query || code.includes(query) ? '' : 'none';
  });
}

document.getElementById('search-amb-code').addEventListener('keydown', e => {
  if (e.key === 'Enter') searchAmbulances();
});

document.getElementById('amb-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeAmbOverlay();
});
