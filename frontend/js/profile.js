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

  loadNotifFeed();
});

async function loadNotifFeed() {
  const body = document.getElementById('notif-feed-body');
  if (!body) return;
  try {
    const data = await fetch('/api/notifications').then(r => r.ok ? r.json() : []);
    if (!data.length) {
      body.innerHTML = `<div class="notif-empty">No notifications yet</div>`;
      return;
    }

    const groups = groupNotifsByDate(data);
    body.innerHTML = groups.map(g => `
      <div class="notif-date-group">
        <div class="notif-date-label">${escHtml(g.label)}</div>
        ${g.items.map(n => {
          const caseBtn = n.case_id
            ? `<button class="notif-open-case-btn" onclick="openCaseFromNotif(${n.case_id}, ${n.notification_id})">Open Case</button>`
            : '';
          return `
            <div class="notif-feed-item ${n.is_read ? '' : 'unread'}" data-id="${n.notification_id}"
                 onclick="markNotifRead(${n.notification_id}, this); this.classList.remove('unread')">
              <div class="notif-feed-item-title">${escHtml(n.title)}</div>
              <div class="notif-feed-item-msg">${escHtml(n.message)}</div>
              <div class="notif-feed-item-meta">
                <span class="notif-feed-item-time">${formatNotifAbsTime(n.created_at)}</span>
                ${caseBtn}
              </div>
            </div>`;
        }).join('')}
      </div>`).join('');
  } catch {
    body.innerHTML = `<div class="notif-empty">Could not load notifications</div>`;
  }
}

function groupNotifsByDate(notifications) {
  const groups = [];
  const seen   = new Map();
  const now    = new Date();
  const today     = toDateStr(now);
  const yesterday = toDateStr(new Date(now - 86400000));

  for (const n of notifications) {
    const d   = new Date(n.created_at);
    const key = toDateStr(d);
    let label;
    if (key === today)         label = 'Today';
    else if (key === yesterday) label = 'Yesterday';
    else {
      const diffDays = Math.floor((now - d) / 86400000);
      if (diffDays < 7) label = d.toLocaleDateString('en-GB', { weekday: 'long' });
      else              label = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    if (!seen.has(label)) { seen.set(label, []); groups.push({ label, items: seen.get(label) }); }
    seen.get(label).push(n);
  }
  return groups;
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function formatNotifAbsTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

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
