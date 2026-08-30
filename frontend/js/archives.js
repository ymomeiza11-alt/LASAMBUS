async function loadArchives() {
  const gallery = document.getElementById('archive-gallery');
  try {
    const archives = await apiFetch('/api/archives');
    if (!archives.length) {
      gallery.innerHTML = '<p style="color:#888; font-style:italic;">No archived photos yet.</p>';
      return;
    }
    gallery.innerHTML = archives.map(a => `
      <a class="photo-gallery-item" href="/api/archives/${a.archive_id}/file" target="_blank" rel="noopener" title="${a.title || a.original_filename || ''}">
        <img src="/api/archives/${a.archive_id}/file" alt="${a.title || a.original_filename || 'Archived photo'}" />
      </a>`).join('');
  } catch (err) {
    console.error('Archives load error:', err);
  }
}

async function uploadArchivePhotos() {
  const input = document.getElementById('archive-upload-input');
  if (!input.files.length) return;
  const title = document.getElementById('archive-title-input').value.trim();

  const formData = new FormData();
  if (title) formData.append('title', title);
  Array.from(input.files).forEach(f => formData.append('photos', f));

  try {
    const res = await fetch('/api/archives', { method: 'POST', body: formData });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Upload failed' }));
      throw new Error(err.error || 'Upload failed');
    }
    input.value = '';
    document.getElementById('archive-title-input').value = '';
    loadArchives();
  } catch (err) {
    alert('Upload failed: ' + err.message);
  }
}

document.addEventListener('componentsReady', () => {
  loadArchives();
});
