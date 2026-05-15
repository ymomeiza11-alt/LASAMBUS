document.getElementById('loginForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const identifier = document.getElementById('identifier');
  const password = document.getElementById('password');
  const identifierError = document.getElementById('identifier-error');
  const passwordError = document.getElementById('password-error');
  const credentialsError = document.getElementById('credentials-error');

  let valid = true;

  // Reset errors
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

  // Hardcoded login for Phase 1 skeleton (replaced in backend phase)
  const HARDCODED_USER = 'admin';
  const HARDCODED_PASS = 'password123';

  if (
    (identifier.value.trim() === HARDCODED_USER || identifier.value.trim() === 'admin@lasambus.gov.ng') &&
    password.value === HARDCODED_PASS
  ) {
    window.location.href = 'dashboard.html';
  } else {
    credentialsError.classList.add('visible');
    password.classList.add('error');
  }
});
