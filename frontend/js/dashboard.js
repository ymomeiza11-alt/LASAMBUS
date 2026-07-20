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

// ── New Case overlay ──────────────────────────────────
const ncSelectedParamedics = [];

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
    treatment_centre:    document.getElementById('nc-treatment-centre').value || null,
    paramedic_ids:       ncSelectedParamedics.map(p => parseInt(p.id)),
  };

  try {
    const { case_id } = await apiFetch('/api/cases', { method: 'POST', body: JSON.stringify(payload) });
    closeNewCaseOverlay();
    // Navigate to cases page and open the newly created case
    window.location.href = `cases.html?open=${case_id}`;
  } catch (err) {
    alert('Could not create case: ' + err.message);
  }
});

// ── Backdrop click ────────────────────────────────────
document.getElementById('new-case-overlay')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) closeNewCaseOverlay();
});

async function loadDashboard() {
  try {
    const res  = await fetch('/api/dashboard');
    if (!res.ok) return;
    const data = await res.json();

    document.getElementById('stat-cases-month').textContent = data.casesMonth;
    document.getElementById('stat-completed').textContent   = data.completed;
    document.getElementById('stat-success-rate').textContent = data.successRate + '%';

    const tbody = document.getElementById('dashboard-table-body');
    if (!data.recentCases.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;">No cases yet.</td></tr>';
      return;
    }
    tbody.innerHTML = data.recentCases.map((c, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${formatDate(c.date_of_incident)}</td>
        <td>${c.incident_description || '—'}</td>
        <td>${c.incident_location || '—'}</td>
        <td>${c.situation_on_arrival || '—'}</td>
        <td>${statusBadge(c.case_status)}</td>
      </tr>`).join('');
  } catch (err) {
    console.error('Dashboard load error:', err);
  }
}

document.addEventListener('componentsReady', loadDashboard);
