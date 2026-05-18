document.addEventListener('componentsReady', e => {
  const u = e.detail;
  if (!u) return;

  const fullName = [u.title, u.first_name, u.last_name].filter(Boolean).join(' ');

  document.getElementById('profile-username').textContent = u.username  || '—';
  document.getElementById('profile-fullname').textContent = fullName    || '—';
  document.getElementById('profile-email').textContent    = u.email     || '—';
  document.getElementById('profile-cadre').textContent    = u.cadre     || '—';
  document.getElementById('profile-grade').textContent    = u.grade_level || '—';
});
