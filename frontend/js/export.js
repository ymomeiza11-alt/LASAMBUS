function handleRangeChange(value) {
  document.getElementById('custom-range-group').classList.toggle('hidden', value !== 'custom');
}

document.getElementById('exportForm')?.addEventListener('submit', async function (e) {
  e.preventDefault();

  const range  = document.getElementById('row-range').value;
  const format = document.getElementById('export-format').value;
  const params = new URLSearchParams({ range, format });

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

  // Trigger file download
  window.location.href = `/api/export?${params}`;
});
