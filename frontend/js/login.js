document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const identifier      = document.getElementById('identifier');
  const password        = document.getElementById('password');
  const identifierError = document.getElementById('identifier-error');
  const passwordError   = document.getElementById('password-error');
  const credentialsError = document.getElementById('credentials-error');

  let valid = true;
  [identifier, password].forEach(el => el.classList.remove('error'));
  [identifierError, passwordError, credentialsError].forEach(el => el.classList.remove('visible'));

  if (!identifier.value.trim()) {
    identifier.classList.add('error');
    identifierError.classList.add('visible');
    valid = false;
  }
  if (!password.value.trim()) {
    password.classList.add('error');
    passwordError.classList.add('visible');
    valid = false;
  }
  if (!valid) return;

  try {
    const res  = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: identifier.value.trim(), password: password.value }),
    });
    const data = await res.json();

    if (res.ok) {
      window.location.href = 'dashboard.html';
    } else {
      credentialsError.textContent = data.error || 'Invalid credentials';
      credentialsError.classList.add('visible');
      password.classList.add('error');
    }
  } catch {
    credentialsError.textContent = 'Could not reach server. Is the backend running?';
    credentialsError.classList.add('visible');
  }
});
