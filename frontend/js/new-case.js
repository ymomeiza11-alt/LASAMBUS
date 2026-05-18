(function () {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  document.getElementById('date-of-incident').value =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  document.getElementById('time-of-incident').value =
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
})();

const requiredFields = [
  { id: 'notified-by',          errId: 'err-notified-by' },
  { id: 'lga-lcda',             errId: 'err-lga' },
  { id: 'incident-type',        errId: 'err-incident-type' },
  { id: 'incident-severity',    errId: 'err-severity' },
  { id: 'incident-location',    errId: 'err-location' },
  { id: 'incident-description', errId: 'err-description' },
];

document.getElementById('newCaseForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  let valid = true;
  requiredFields.forEach(({ id, errId }) => {
    const el  = document.getElementById(id);
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

  const submitBtn = this.querySelector('[type="submit"]');
  submitBtn.disabled = true;

  try {
    const res = await fetch('/api/cases', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date_of_incident:     document.getElementById('date-of-incident').value,
        time_of_incident:     document.getElementById('time-of-incident').value,
        notified_by:          document.getElementById('notified-by').value,
        lga_lcda:             document.getElementById('lga-lcda').value,
        incident_type:        document.getElementById('incident-type').value,
        incident_severity:    document.getElementById('incident-severity').value,
        incident_location:    document.getElementById('incident-location').value,
        incident_description: document.getElementById('incident-description').value,
      }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create case');

    window.location.href = `cases.html?open=${data.case_id}`;
  } catch (err) {
    alert(err.message);
    submitBtn.disabled = false;
  }
});
