let paramedicMode = 'add';
let editParamedicId = null;

// ── Load paramedics table ─────────────────────────────
async function loadParamedics() {
  try {
    const paramedics = await apiFetch('/api/paramedics');
    renderParamedicsTable(paramedics);
  } catch (err) {
    console.error('Paramedics load error:', err);
  }
}

function statusBadge(status) {
  const map = { Available: 'status-available', Assigned: 'status-active', Unavailable: 'status-cancelled' };
  return `<span class="status-badge ${map[status] || ''}">${status}</span>`;
}

function renderParamedicsTable(list) {
  const tbody   = document.getElementById('paramedics-table-body');
  const isAdmin = window.__currentUser?.is_admin;

  // Show/hide Add button based on admin status
  const addBtn = document.querySelector('[onclick="openParamedicOverlay(\'add\')"]');
  if (addBtn) addBtn.style.display = isAdmin ? '' : 'none';

  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:#888;">No paramedics found.</td></tr>';
    return;
  }
  tbody.innerHTML = list.map(p => `
    <tr ${isAdmin ? `class="clickable-row" onclick="openParamedicOverlay('edit', ${p.user_id})"` : ''}>
      <td>${p.username}</td>
      <td>${p.title ? p.title + '. ' : ''}${p.first_name} ${p.last_name}</td>
      <td>${p.cadre || '—'}</td>
      <td>${p.grade_level || '—'}</td>
      <td>${statusBadge(p.status)}</td>
    </tr>`).join('');
}

// ── Overlay ───────────────────────────────────────────
async function openParamedicOverlay(mode, userId) {
  paramedicMode    = mode;
  editParamedicId  = userId || null;

  const overlay         = document.getElementById('paramedic-overlay');
  const title           = document.getElementById('paramedic-overlay-title');
  const deleteBtn       = document.getElementById('btn-delete-paramedic');
  const changePwSection = document.getElementById('change-password-section');
  const passwordGroup   = document.getElementById('password-group');
  const statusGroup     = document.getElementById('p-status-group');

  clearParamedicForm();

  if (mode === 'edit' && userId) {
    title.textContent = 'Edit Paramedic';
    deleteBtn.classList.remove('hidden');
    changePwSection.classList.remove('hidden');
    passwordGroup.classList.add('hidden');
    statusGroup.classList.remove('hidden');

    try {
      const p = await apiFetch(`/api/paramedics/${userId}`);
      document.getElementById('p-title').value     = p.title || '';
      document.getElementById('p-firstname').value = p.first_name || '';
      document.getElementById('p-lastname').value  = p.last_name || '';
      document.getElementById('p-username').value  = p.username || '';
      document.getElementById('p-email').value     = p.email || '';
      document.getElementById('p-cadre').value     = p.cadre || '';
      document.getElementById('p-grade').value     = p.grade_level || '';
      document.getElementById('p-is-admin').value  = p.is_admin ? 'yes' : 'no';
      document.getElementById('p-status').value    = p.status || 'Available';
      document.getElementById('p-unavailable-reason').value = p.unavailable_reason || '';
      toggleParamedicUnavailableReason(p.status);
    } catch (err) {
      alert('Could not load paramedic: ' + err.message);
      return;
    }
  } else {
    title.textContent = 'Add Paramedic';
    deleteBtn.classList.add('hidden');
    changePwSection.classList.add('hidden');
    passwordGroup.classList.remove('hidden');
    statusGroup.classList.add('hidden');
    document.getElementById('p-unavailable-reason-group').classList.add('hidden');
  }

  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeParamedicOverlay() {
  document.getElementById('paramedic-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function clearParamedicForm() {
  ['p-title','p-firstname','p-lastname','p-username','p-email','p-password',
   'p-cadre','p-grade','p-new-password','p-unavailable-reason'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.value = ''; el.classList.remove('error'); }
  });
  document.querySelectorAll('#paramedicForm .error-msg').forEach(e => e.classList.remove('visible'));
}

function toggleParamedicUnavailableReason(status) {
  document.getElementById('p-unavailable-reason-group').classList.toggle('hidden', status !== 'Unavailable');
}

const paramedicRequiredFields = [
  { id: 'p-title',     errId: 'err-p-title' },
  { id: 'p-firstname', errId: 'err-p-firstname' },
  { id: 'p-lastname',  errId: 'err-p-lastname' },
  { id: 'p-username',  errId: 'err-p-username' },
  { id: 'p-email',     errId: 'err-p-email' },
];

document.getElementById('paramedicForm')?.addEventListener('submit', async function (e) {
  e.preventDefault();
  let valid = true;
  const fields = [...paramedicRequiredFields];
  if (paramedicMode === 'add') fields.push({ id: 'p-password', errId: 'err-p-password' });

  fields.forEach(({ id, errId }) => {
    const el  = document.getElementById(id);
    const err = document.getElementById(errId);
    el.classList.remove('error'); err.classList.remove('visible');
    if (!el.value.trim()) { el.classList.add('error'); err.classList.add('visible'); valid = false; }
  });

  if (paramedicMode === 'edit') {
    const status = document.getElementById('p-status').value;
    if (status === 'Unavailable' && !document.getElementById('p-unavailable-reason').value.trim()) {
      alert('Please provide a reason for unavailability.');
      valid = false;
    }
  }
  if (!valid) return;

  try {
    if (paramedicMode === 'add') {
      const payload = {
        title:       document.getElementById('p-title').value,
        first_name:  document.getElementById('p-firstname').value.trim(),
        last_name:   document.getElementById('p-lastname').value.trim(),
        username:    document.getElementById('p-username').value.trim(),
        email:       document.getElementById('p-email').value.trim(),
        password:    document.getElementById('p-password').value,
        cadre:       document.getElementById('p-cadre').value.trim(),
        grade_level: document.getElementById('p-grade').value.trim(),
        is_admin:    document.getElementById('p-is-admin').value === 'yes',
      };
      await apiFetch('/api/paramedics', { method: 'POST', body: JSON.stringify(payload) });
    } else {
      const status = document.getElementById('p-status').value;
      const payload = {
        title:               document.getElementById('p-title').value,
        first_name:          document.getElementById('p-firstname').value.trim(),
        last_name:           document.getElementById('p-lastname').value.trim(),
        email:               document.getElementById('p-email').value.trim(),
        cadre:               document.getElementById('p-cadre').value.trim(),
        grade_level:         document.getElementById('p-grade').value.trim(),
        is_admin:            document.getElementById('p-is-admin').value === 'yes',
        status,
        unavailable_reason:  document.getElementById('p-unavailable-reason').value.trim(),
      };
      await apiFetch(`/api/paramedics/${editParamedicId}`, { method: 'PUT', body: JSON.stringify(payload) });
    }
    closeParamedicOverlay();
    loadParamedics();
  } catch (err) {
    alert('Could not save: ' + err.message);
  }
});

// ── Delete ────────────────────────────────────────────
function openDeleteParamedic() {
  document.getElementById('paramedic-delete-popup').classList.add('open');
}

function closeDeleteParamedicPopup() {
  document.getElementById('paramedic-delete-popup').classList.remove('open');
}

async function confirmDeleteParamedic() {
  try {
    await apiFetch(`/api/paramedics/${editParamedicId}`, { method: 'DELETE' });
    closeDeleteParamedicPopup();
    closeParamedicOverlay();
    loadParamedics();
  } catch (err) {
    alert('Delete failed: ' + err.message);
  }
}

// ── Change password (admin) ───────────────────────────
async function changeParamedicPassword() {
  const newPw = document.getElementById('p-new-password').value.trim();
  if (!newPw) { alert('Please enter a new password.'); return; }
  try {
    await apiFetch(`/api/paramedics/${editParamedicId}/password`, {
      method: 'POST',
      body: JSON.stringify({ password: newPw }),
    });
    alert('Password updated.');
    document.getElementById('p-new-password').value = '';
  } catch (err) {
    alert('Password change failed: ' + err.message);
  }
}

// ── Search (client-side filter on rendered table) ─────
function searchParamedics() {
  const query = document.getElementById('search-paramedic').value.trim().toLowerCase();
  document.querySelectorAll('#paramedics-table-body tr').forEach(row => {
    const text = row.textContent.toLowerCase();
    row.style.display = !query || text.includes(query) ? '' : 'none';
  });
}

document.getElementById('search-paramedic')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') searchParamedics();
});

document.getElementById('paramedic-overlay')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) closeParamedicOverlay();
});

document.addEventListener('componentsReady', loadParamedics);
