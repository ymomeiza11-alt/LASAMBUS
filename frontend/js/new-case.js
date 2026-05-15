// Auto-fill current date and time
(function () {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  document.getElementById('date-of-incident').value =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  document.getElementById('time-of-incident').value =
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
})();

const requiredFields = [
  { id: 'notified-by',       errId: 'err-notified-by' },
  { id: 'lga-lcda',          errId: 'err-lga' },
  { id: 'incident-type',     errId: 'err-incident-type' },
  { id: 'incident-severity', errId: 'err-severity' },
  { id: 'incident-location', errId: 'err-location' },
  { id: 'incident-description', errId: 'err-description' },
];

document.getElementById('newCaseForm').addEventListener('submit', function (e) {
  e.preventDefault();

  let valid = true;

  requiredFields.forEach(({ id, errId }) => {
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

  // Phase 1: navigate to cases page (backend will open the new case overlay)
  window.location.href = 'cases.html';
});
