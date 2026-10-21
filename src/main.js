import './style.css';

const KEY = 'claude-multiple-profiles-v1';
const MAX_PROFILES = 5;
const slots = [1, 2, 3, 4, 5];
let profiles = loadProfiles();
let editingId = null;
let countdownTimer = null;

function loadProfiles() {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(value) ? value.map((profile, index) => ({ ...profile, slot: Number(profile.slot) || (index < 5 ? index + 1 : null) })) : [];
  } catch {
    return [];
  }
}
function save() {
  localStorage.setItem(KEY, JSON.stringify(profiles));
  render();
}
function uid() {
  return globalThis.crypto?.randomUUID?.() || String(Date.now()) + Math.random().toString(36).slice(2);
}
function esc(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}
function countdownLabel(time) {
  if (!time || !/^\\d{2}:\\d{2}$/.test(time)) return '';
  const parts = time.split(':').map(Number);
  const now = new Date(), target = new Date(now);
  target.setHours(parts[0], parts[1], 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1);
  const total = Math.max(1, Math.ceil((target - now) / 60000));
  const h = Math.floor(total / 60), m = total % 60;
  if (h && m) return h + 'h ' + m + 'm remaining';
  if (h) return h + 'h remaining';
  return m + 'm remaining';
}
function refreshCountdowns() {
  document.querySelectorAll('[data-countdown]').forEach(node => {
    const p = profiles.find(item => item.id === node.dataset.countdown);
    node.textContent = p && p.showCountdown && p.time ? countdownLabel(p.time) : '';
    node.hidden = !node.textContent;
  });
}
function render() {
  document.querySelector('#app').innerHTML = `
    <main class="shell">
      <header><div class="mark">C</div><div><p class="eyebrow">CLAUDE WORKSPACE</p><h1>Claude <span>Multiple</span></h1></div><button class="iconbtn" id="add" aria-label="Add profile">＋</button></header>
      <section class="intro"><p class="eyebrow">YOUR PROFILES</p><h2>Every workspace, <em>one tap away.</em></h2><p class="sub">Each profile keeps its own Claude login and website data. Up to five isolated profiles are supported.</p></section>
      <section class="profile-list">
      ${profiles.length ? profiles.map((p, i) => `<article class="profile"><div class="avatar">${esc((p.name || '?').trim().slice(0, 1).toUpperCase())}</div><div class="details"><h3>${esc(p.name)}</h3>${p.showCountdown && p.time ? '<p class="countdown" data-countdown="' + esc(p.id) + '">' + esc(countdownLabel(p.time)) + '</p>' : ''}<small>PROFILE ${String(i + 1).padStart(2, '0')}</small></div><button class="open" data-open="${esc(p.id)}">Open ↗</button><button class="more" data-edit="${esc(p.id)}" aria-label="Edit profile">···</button></article>`).join('') : `<div class="empty"><div class="emptyicon">＋</div><h3>No profiles yet</h3><p>Create your first Claude profile to get started.</p><button class="primary" id="emptyAdd">Create profile</button></div>`}
      </section>
      <footer><span class="dot"></span> Saved on this device <span class="footright">CLAUDE WEB</span></footer>
    </main>
    <dialog id="editor"><form id="profileForm"><div class="modalhead"><div><p class="eyebrow">PROFILE SETTINGS</p><h2 id="formTitle">New profile</h2></div><button type="button" class="iconbtn" id="close">×</button></div><label for="name">Profile name</label><input id="name" maxlength="40" placeholder="e.g. Personal" required autocomplete="off"><label class="toggle-label"><input id="showCountdown" type="checkbox"> Show countdown on profile</label><label for="time">Target time</label><input id="time" type="time" autocomplete="off" disabled><p class="hint">Tick the box to show time remaining until this time. If the time has passed today, it counts down to tomorrow. Unchecked means nothing is shown.</p><div class="actions"><button type="button" class="secondary" id="cancel">Cancel</button><button class="primary" type="submit">Save profile</button></div><button type="button" id="delete" class="delete">Delete profile</button></form></dialog>`;
  document.querySelector('#add')?.addEventListener('click', () => openEditor());
  document.querySelector('#emptyAdd')?.addEventListener('click', () => openEditor());
  document.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => openProfile(button.dataset.open)));
  document.querySelectorAll('[data-edit]').forEach(button => button.addEventListener('click', () => openEditor(button.dataset.edit)));
  const dialog = document.querySelector('#editor');
  document.querySelector('#close').onclick = () => dialog.close();
  document.querySelector('#cancel').onclick = () => dialog.close();
  document.querySelector('#profileForm').onsubmit = event => {
    event.preventDefault();
    const name = document.querySelector('#name').value.trim();
    const time = document.querySelector('#time').value;
    const showCountdown = document.querySelector('#showCountdown').checked;
    if (!name) return;
    if (editingId) profiles = profiles.map(p => p.id === editingId ? { ...p, name, time, showCountdown } : p);
    else {
      const used = new Set(profiles.map(p => Number(p.slot)).filter(Boolean));
      const slot = slots.find(value => !used.has(value));
      if (!slot) { alert('Maximum 5 isolated profiles supported on this device.'); return; }
      profiles.push({ id: uid(), name, time, showCountdown, slot, createdAt: Date.now() });
    }
    dialog.close();
    save();
  };
  document.querySelector('#delete').onclick = () => {
    if (editingId && confirm('Delete this profile?')) {
      profiles = profiles.filter(p => p.id !== editingId);
      dialog.close();
      save();
    }
  };
}
function openEditor(id = null) {
  editingId = id;
  const profile = profiles.find(item => item.id === id);
  const dialog = document.querySelector('#editor');
  document.querySelector('#formTitle').textContent = profile ? 'Edit profile' : 'New profile';
  document.querySelector('#name').value = profile?.name || '';
  document.querySelector('#time').value = /^\\d{2}:\\d{2}$/.test(profile?.time || '') ? profile.time : '';
  document.querySelector('#showCountdown').checked = Boolean(profile?.showCountdown);
  document.querySelector('#time').disabled = !profile?.showCountdown;
  document.querySelector('#delete').style.display = profile ? 'block' : 'none';
  document.querySelector('#showCountdown').onchange = event => {
    document.querySelector('#time').disabled = !event.target.checked;
    if (!event.target.checked) document.querySelector('#time').value = '';
  };
  dialog.showModal();
  setTimeout(() => document.querySelector('#name').focus(), 40);
}
async function openProfile(id) {
  const profile = profiles.find(item => item.id === id);
  if (!profile) return;
  if (!profile.slot) {
    const used = new Set(profiles.filter(p => p.id !== id).map(p => Number(p.slot)).filter(Boolean));
    profile.slot = slots.find(value => !used.has(value));
    if (!profile.slot) { alert('Maximum 5 isolated profiles supported on this device.'); return; }
    save();
  }
  const native = globalThis.Capacitor?.Plugins?.IsolatedProfiles;
  if (!native?.openProfile) {
    alert('Native isolated-profile support is missing. Install the latest APK built from the repository.');
    return;
  }
  try {
    await native.openProfile({ slot: Number(profile.slot), name: profile.name || 'Claude' });
  } catch (error) {
    console.error(error);
    alert('Could not open this isolated profile. Check the installed app version.');
  }
}
render();
countdownTimer = setInterval(refreshCountdowns, 30000);
