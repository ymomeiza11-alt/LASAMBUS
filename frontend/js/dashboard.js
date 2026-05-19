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
