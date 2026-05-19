function openExportOverlay() {
  document.getElementById('export-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeExportOverlay() {
  document.getElementById('export-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function handleRangeChange(value) {
  document.getElementById('custom-range-group').classList.toggle('hidden', value !== 'custom');
}

document.getElementById('export-overlay')?.addEventListener('click', e => {
  if (e.target === e.currentTarget) closeExportOverlay();
});

document.getElementById('exportForm')?.addEventListener('submit', async function (e) {
  e.preventDefault();

  const table  = document.getElementById('export-table').value;
  const range  = document.getElementById('row-range').value;
  const format = document.getElementById('export-format').value;
  const params = new URLSearchParams({ table, range, format });

  if (range === 'custom') {
    const from = document.getElementById('custom-from').value;
    const to   = document.getElementById('custom-to').value;
    if (!from || !to || parseInt(from) > parseInt(to)) {
      alert('Please enter a valid custom range.');
      return;
    }
    params.set('from', from);
    params.set('to', to);
  }

  window.location.href = `/api/export?${params}`;
});
