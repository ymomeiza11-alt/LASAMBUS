let ambulances    = [];
let currentAmbId  = null;

async function apiFetch(url, opts = {}) {
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

function statusBadge(status) {
  const map = { Available: 'status-available', Assigned: 'status-assigned', Unavailable: 'status-unavailable' };
  return `<span class="status-badge ${map[status] || ''}">${status}</span>`;
}

// ── Load & render ─────────────────────────────────────
async function loadAmbulances() {
  try {
    ambulances = await apiFetch('/api/ambulances');
    renderTable(ambulances);
  } catch (err) {
    console.error('Ambulances load error:', err);
  }
}

function renderTable(list) {
  const tbody = document.getElementById('ambulance-table-body');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:#888;">No ambulances found.</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(a => `
    <tr>
      <td><a href="#" class="amb-code-link" onclick="openEditOverlay(${a.ambulance_id}); return false;">${a.ambulance_code}</a></td>
      <td>${a.vehicle_name}</td>
      <td>${statusBadge(a.status)}</td>
    </tr>`).join('');
}

// ── Search (client-side filter) ───────────────────────
function searchAmbulances() {
  const q = document.getElementById('search-amb-code').value.trim().toLowerCase();
  renderTable(q ? ambulances.filter(a => a.ambulance_code.toLowerCase().includes(q)) : ambulances);
}

document.getElementById('search-amb-code').addEventListener('keydown', e => {
  if (e.key === 'Enter') searchAmbulances();
});

// ── Overlay helpers ───────────────────────────────────
function openAddOverlay() {
  currentAmbId = null;
  clearAmbForm();
  document.getElementById('amb-overlay-title').textContent = 'Add Ambulance';
  document.getElementById('btn-delete-amb').classList.add('hidden');
  document.getElementById('amb-status-group').classList.add('hidden');
  document.getElementById('amb-unavailable-reason-group').classList.add('hidden');
  document.getElementById('amb-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function openEditOverlay(id) {
  const amb = ambulances.find(a => a.ambulance_id === id);
  if (!amb) return;
  currentAmbId = id;
  clearAmbForm();
  document.getElementById('amb-overlay-title').textContent = 'Edit Ambulance';
  document.getElementById('btn-delete-amb').classList.remove('hidden');
  document.getElementById('amb-status-group').classList.remove('hidden');
  document.getElementById('amb-vehicle-name').value  = amb.vehicle_name;
  document.getElementById('amb-code-input').value    = amb.ambulance_code;
  document.getElementById('amb-status').value        = amb.status;
  document.getElementById('amb-unavailable-reason').value = amb.unavailable_reason || '';
  toggleAmbUnavailableReason(amb.status);
  document.getElementById('amb-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeAmbOverlay() {
  document.getElementById('amb-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function clearAmbForm() {
  ['amb-vehicle-name', 'amb-code-input', 'amb-unavailable-reason'].forEach(id => {
    document.getElementById(id).value = '';
  });
  ['err-amb-name', 'err-amb-code'].forEach(id => document.getElementById(id).classList.remove('visible'));
  ['amb-vehicle-name', 'amb-code-input'].forEach(id => document.getElementById(id).classList.remove('error'));
}

function toggleAmbUnavailableReason(status) {
  document.getElementById('amb-unavailable-reason-group').classList.toggle('hidden', status !== 'Unavailable');
}

document.getElementById('amb-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeAmbOverlay();
});

// ── Submit (add or edit) ──────────────────────────────
document.getElementById('ambForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const nameEl = document.getElementById('amb-vehicle-name');
  const codeEl = document.getElementById('amb-code-input');
  let valid = true;

  [{ el: nameEl, err: 'err-amb-name' }, { el: codeEl, err: 'err-amb-code' }].forEach(({ el, err }) => {
    el.classList.remove('error');
    document.getElementById(err).classList.remove('visible');
    if (!el.value.trim()) {
      el.classList.add('error');
      document.getElementById(err).classList.add('visible');
      valid = false;
    }
  });

  const status = document.getElementById('amb-status').value;
  const reason = document.getElementById('amb-unavailable-reason').value.trim();
  if (currentAmbId && status === 'Unavailable' && !reason) {
    alert('Please provide a reason for unavailability.');
    return;
  }

  if (!valid) return;

  const submitBtn = this.querySelector('[type="submit"]');
  submitBtn.disabled = true;

  try {
    const body = {
      vehicle_name:       nameEl.value.trim(),
      ambulance_code:     codeEl.value.trim(),
      status,
      unavailable_reason: reason || null,
    };

    if (currentAmbId) {
      await apiFetch(`/api/ambulances/${currentAmbId}`, { method: 'PUT', body: JSON.stringify(body) });
    } else {
      await apiFetch('/api/ambulances', { method: 'POST', body: JSON.stringify(body) });
    }

    closeAmbOverlay();
    await loadAmbulances();
  } catch (err) {
    alert(err.message);
  } finally {
    submitBtn.disabled = false;
  }
});

// ── Delete ────────────────────────────────────────────
function openDeleteConfirm()  { document.getElementById('delete-popup').classList.add('open'); }
function closeDeleteConfirm() { document.getElementById('delete-popup').classList.remove('open'); }

async function confirmDelete() {
  if (!currentAmbId) return;
  try {
    await apiFetch(`/api/ambulances/${currentAmbId}`, { method: 'DELETE' });
    closeDeleteConfirm();
    closeAmbOverlay();
    await loadAmbulances();
  } catch (err) {
    alert(err.message);
  }
}

// ── Boot ──────────────────────────────────────────────
document.addEventListener('componentsReady', loadAmbulances);
