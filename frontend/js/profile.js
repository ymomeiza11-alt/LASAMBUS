document.addEventListener('componentsReady', e => {
  const u = e.detail;
  if (!u) return;

  const fullName = [u.title, u.first_name, u.last_name].filter(Boolean).join(' ');

  document.getElementById('profile-username').textContent = u.username    || '—';
  document.getElementById('profile-fullname').textContent = fullName      || '—';
  document.getElementById('profile-email').textContent    = u.email       || '—';
  document.getElementById('profile-cadre').textContent    = u.cadre       || '—';
  document.getElementById('profile-grade').textContent    = u.grade_level || '—';

  if (u.is_admin) {
    document.getElementById('change-password-card').classList.remove('hidden');
  }
});

document.getElementById('changePasswordForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const currentEl  = document.getElementById('cp-current');
  const newEl      = document.getElementById('cp-new');
  const confirmEl  = document.getElementById('cp-confirm');
  const serverErr  = document.getElementById('cp-server-error');
  const successMsg = document.getElementById('cp-success');

  // Clear previous state
  [currentEl, newEl, confirmEl].forEach(el => el.classList.remove('error'));
  ['err-cp-current', 'err-cp-new', 'err-cp-confirm'].forEach(id =>
    document.getElementById(id).classList.remove('visible')
  );
  serverErr.classList.remove('visible');
  serverErr.textContent = '';
  successMsg.classList.add('hidden');

  let valid = true;

  if (!currentEl.value) {
    currentEl.classList.add('error');
    document.getElementById('err-cp-current').classList.add('visible');
    valid = false;
  }
  if (newEl.value.length < 8) {
    newEl.classList.add('error');
    document.getElementById('err-cp-new').classList.add('visible');
    valid = false;
  }
  if (confirmEl.value !== newEl.value) {
    confirmEl.classList.add('error');
    document.getElementById('err-cp-confirm').classList.add('visible');
    valid = false;
  }
  if (!valid) return;

  const submitBtn = this.querySelector('[type="submit"]');
  submitBtn.disabled = true;

  try {
    const res = await fetch('/api/auth/change-password', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        current_password: currentEl.value,
        new_password:     newEl.value,
      }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      serverErr.textContent = data.error || 'Failed to update password.';
      serverErr.classList.add('visible');
      if (res.status === 401) currentEl.classList.add('error');
      return;
    }

    this.reset();
    successMsg.classList.remove('hidden');
  } catch {
    serverErr.textContent = 'Could not reach server.';
    serverErr.classList.add('visible');
  } finally {
    submitBtn.disabled = false;
  }
});
