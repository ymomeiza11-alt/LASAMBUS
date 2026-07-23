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

    document.getElementById('stat-cases-month').textContent  = data.casesMonth;
    document.getElementById('stat-completed').textContent    = data.completed;
    document.getElementById('stat-success-rate').textContent = data.successRate + '%';

    const tbody = document.getElementById('dashboard-table-body');
    if (!data.recentCases.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#888;">No cases yet.</td></tr>';
      return;
    }
    tbody.innerHTML = data.recentCases.map((c, i) => `
      <tr class="clickable-row" onclick="openCaseOverlay(${c.case_id})">
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
