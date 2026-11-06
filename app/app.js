'use strict';
/* Mundo Vending · Disponibilidad de Máquinas — App (PWA) */

const CFG = window.MV_CONFIG || {};
const CATS = ["Falla técnica", "Medios de pago", "Desabastecimiento", "Sin conexión / telemetría", "Energía", "Vandalismo", "Retiro / traslado", "Mantenimiento preventivo", "Otro"];
const H = 3600e3;
const ROLE = { admin: 'Administrador', supervisor: 'Supervisor', tecnico: 'Técnico', operador: 'Operador' };
const MAX_PHOTOS = 3, MAX_VIDEO_S = 20;
const POLL_MS = 20000;

const S = {
  token: localStorage.getItem('mv_token') || null,
  user: jparse(localStorage.getItem('mv_user')),
  machines: [], inc: [], techs: [], rev: null, loaded: false, busy: false, online: true,
  sort: { k: 'av', d: 1 }, allRoutes: false
};
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtD = ms => ms ? new Date(ms).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
const fmtH = h => h < 1 ? Math.max(0, Math.round(h * 60)) + " min" : h < 48 ? h.toFixed(1).replace(".", ",") + " h" : (h / 24).toFixed(1).replace(".", ",") + " d";
const pct = x => (x * 100).toFixed(1).replace(".", ",") + " %";
const toLocalInput = ms => { const d = new Date(ms - new Date(ms).getTimezoneOffset() * 6e4); return d.toISOString().slice(0, 16); };
const fromLocalInput = v => v ? new Date(v).getTime() : null;
const role = () => S.user && S.user.role;
const isMgr = () => role() === 'admin' || role() === 'supervisor';
const isTech = () => role() === 'tecnico';
const isOp = () => role() === 'operador';
const canAct = i => isMgr() || (isTech() && i.assignedTo === S.user.name);
function jparse(s) { try { return s ? JSON.parse(s) : null; } catch (e) { return null; } }
function uid() { return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2)); }

/* ===================== Iconos ===================== */
const IC = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  flag: '<path d="M4 21V4h11l-1.5 4L15 12H4"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r="1"/><circle cx="4.5" cy="12" r="1"/><circle cx="4.5" cy="18" r="1"/>',
  machine: '<rect x="5" y="2.5" width="14" height="19" rx="2"/><path d="M8 6h5v8H8zM16 7v2M16 12v1M8 18h8"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alert: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17h.01"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/>',
  check: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  wifi: '<path d="M2 2l20 20M8.5 16.5a5 5 0 0 1 7 0M5 13a10 10 0 0 1 5.2-2.8M19 13a10 10 0 0 0-2-1.6M12 20h.01"/>',
  down: '<path d="M3 3v18h18"/><path d="m7 10 4 4 3-3 5 5"/>',
  wrench: '<path d="M14.7 6.3a4 4 0 0 0 5 5L22 14l-8 8-2.4-2.4L4 12l2.3-2.3a4 4 0 0 0 5 0z" transform="scale(.9) translate(1 1)"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h4"/>',
  box: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5 12 12l9-4.5M12 12v9"/>',
  zap: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="M12 8v4M12 15h.01"/>',
  truck: '<path d="M2 6h12v10H2zM14 10h4l3 3v3h-7"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  cal: '<rect x="3" y="4.5" width="18" height="16" rx="2"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4M9 15l2 2 4-4"/>',
  dots: '<circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>',
  camera: '<path d="M3 8a2 2 0 0 1 2-2h2.5l1.5-2h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><circle cx="12" cy="13" r="3.8"/>',
  video: '<rect x="2.5" y="6" width="13" height="12" rx="2"/><path d="m15.5 10.5 6-3.5v10l-6-3.5"/>',
  bell: '<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  bellOn: '<path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4z" fill="currentColor"/><path d="M10 20a2 2 0 0 0 4 0"/>',
  out: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>',
  flip: '<path d="M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  dl: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>'
};
const ico = (n, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${IC[n] || ""}</svg>`;
const CATSTY = { "Falla técnica": ["wrench", "--c1"], "Medios de pago": ["card", "--c2"], "Desabastecimiento": ["box", "--c3"], "Sin conexión / telemetría": ["wifi", "--c4"], "Energía": ["zap", "--c5"], "Vandalismo": ["shield", "--c6"], "Retiro / traslado": ["truck", "--c7"], "Mantenimiento preventivo": ["cal", "--c8"], "Otro": ["dots", "--c9"] };
const stCol = v => v >= .98 ? "var(--ok)" : v >= .95 ? "var(--warn)" : "var(--bad)";

/* ===================== API ===================== */
async function api(action, data = {}, timeout = 60000) {
  if (!CFG.API_URL || !/^https?:\/\//.test(CFG.API_URL)) { const e = new Error('Falta configurar el enlace de Apps Script en config.js'); e.code = 'cfg'; throw e; }
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeout);
  let r;
  try {
    r = await fetch(CFG.API_URL, { method: 'POST', body: JSON.stringify({ action, token: S.token, ...data }), signal: ctl.signal });
  } catch (e) { const x = new Error('Sin conexión'); x.code = 'net'; throw x; }
  finally { clearTimeout(t); }
  let j;
  try { j = await r.json(); } catch (e) { const x = new Error('Respuesta no válida del servidor'); x.code = 'net'; throw x; }
  if (!j.ok) {
    if (j.code === 'auth' && action !== 'login') logout(j.error);
    const x = new Error(j.error || 'Error'); x.code = j.code; throw x;
  }
  return j;
}

/* ===================== Toast / sonido / alertas ===================== */
function toast(html, opts = {}) {
  const el = document.createElement('div');
  el.className = 'tst' + (opts.alert ? ' alert' : '');
  el.innerHTML = html;
  el.onclick = () => { el.remove(); opts.onclick && opts.onclick(); };
  $('toast').appendChild(el);
  setTimeout(() => el.remove(), opts.ms || 5000);
}
let actx = null;
function beep() {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    [0, .18].forEach(d => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.frequency.value = 880; o.type = 'sine';
      g.gain.setValueAtTime(.0001, actx.currentTime + d);
      g.gain.exponentialRampToValueAtTime(.25, actx.currentTime + d + .02);
      g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + d + .15);
      o.connect(g).connect(actx.destination); o.start(actx.currentTime + d); o.stop(actx.currentTime + d + .16);
    });
  } catch (e) { }
  try { navigator.vibrate && navigator.vibrate([180, 80, 180]); } catch (e) { }
}
async function sysNotify(title, body, id) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const opts = { body, icon: 'icons/icon-192.png', badge: 'icons/badge-96.png', tag: id, renotify: true, data: { url: './#inc=' + id } };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) return reg.showNotification(title, opts);
  } catch (e) { }
  try { new Notification(title, opts); } catch (e) { }
}
function updateBell() {
  const b = $('bBell');
  if (isOp() || !('Notification' in window)) { b.hidden = true; return; }
  b.hidden = false;
  const on = Notification.permission === 'granted';
  b.innerHTML = ico(on ? 'bellOn' : 'bell', 18) + `<span class="hidem">${on ? '' : 'Alertas'}</span>`;
  b.title = on ? 'Alertas activadas en este dispositivo' : 'Activar alertas de nuevos reportes';
}
$('bBell').onclick = async () => {
  if (Notification.permission === 'granted') { toast('Las alertas ya están activas en este dispositivo.'); beep(); return; }
  if (Notification.permission === 'denied') { toast('Las alertas están bloqueadas. Actívalas en la configuración del navegador para este sitio.'); return; }
  const p = await Notification.requestPermission();
  updateBell();
  if (p === 'granted') { toast('Alertas activadas. Te avisaremos cada vez que llegue un reporte.'); beep(); }
};

/* ===================== Instalación (PWA) ===================== */
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; $('bInstall').hidden = false; $('lInstall').hidden = false; });
window.addEventListener('appinstalled', () => { deferredInstall = null; $('bInstall').hidden = true; $('lInstall').hidden = true; toast('App instalada. Ya la tienes en tu pantalla de inicio.'); });
async function doInstall() {
  if (deferredInstall) { deferredInstall.prompt(); await deferredInstall.userChoice; deferredInstall = null; $('bInstall').hidden = true; $('lInstall').hidden = true; }
}
$('bInstall').onclick = doInstall; $('lInstall').onclick = doInstall;
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => { });
  navigator.serviceWorker.addEventListener('message', e => { if (e.data?.type === 'open') { const u = new URL(e.data.url); location.hash = u.hash || '#'; } });
}

/* ===================== Sesión ===================== */
async function showLogin(msg) {
  $('app').hidden = true; $('login').hidden = false;
  $('lErr').textContent = msg || '';
  if (isIOS && !standalone) $('lErr').innerHTML = (msg ? esc(msg) + '<br>' : '') + '<span class="mut">Para instalarla en iPhone: botón Compartir → “Agregar a inicio”.</span>';
  try {
    const j = await api('users');
    const last = localStorage.getItem('mv_last') || '';
    $('lName').innerHTML = '<option value="">Selecciona tu nombre…</option>' + j.users.map(u => `<option ${u === last ? 'selected' : ''}>${esc(u)}</option>`).join('');
  } catch (e) {
    $('lName').innerHTML = '<option value="">—</option>';
    $('lErr').textContent = e.code === 'cfg' ? e.message : 'No hay conexión con el servidor. Revisa tu señal e intenta de nuevo.';
  }
}
$('lGo').onclick = async () => {
  const name = $('lName').value, pin = $('lPin').value.trim();
  if (!name || !pin) { $('lErr').textContent = 'Selecciona tu nombre y escribe tu PIN.'; return; }
  $('lGo').disabled = true; $('lErr').textContent = '';
  try {
    const j = await api('login', { name, pin });
    S.token = j.token; S.user = j.user;
    localStorage.setItem('mv_token', j.token); localStorage.setItem('mv_user', JSON.stringify(j.user)); localStorage.setItem('mv_last', name);
    $('lPin').value = '';
    start();
  } catch (e) { $('lErr').textContent = e.message; }
  finally { $('lGo').disabled = false; }
};
$('lPin').addEventListener('keydown', e => { if (e.key === 'Enter') $('lGo').click(); });
function logout(msg) {
  S.token = null; S.user = null; S.loaded = false; S.rev = null;
  ['mv_token', 'mv_user', 'mv_cache'].forEach(k => localStorage.removeItem(k));
  try { navigator.clearAppBadge && navigator.clearAppBadge(); } catch (e) { }
  showLogin(typeof msg === 'string' ? msg : '');
}
$('bOut').onclick = () => { if (confirm('¿Cerrar sesión en este dispositivo?')) logout(); };

/* ===================== Navegación ===================== */
function views() {
  if (isOp()) return [['reportar', 'Reportar', 'camera', 1], ['mis', 'Mis reportes', 'list']];
  if (isTech()) return [['servicios', 'Mis servicios', 'wrench'], ['reportar', 'Reportar', 'camera', 1], ['maquinas', 'Máquinas', 'machine']];
  return [['tablero', 'Tablero', 'grid'], ['priorizar', 'Priorizar', 'flag'], ['reportar', 'Reportar', 'camera', 1], ['novedades', 'Novedades', 'list'], ['maquinas', 'Máquinas', 'machine']];
}
function buildNav() {
  const V = views();
  $('navTop').innerHTML = V.filter(v => !(isMgr() && v[0] === 'reportar')).map(([v, l, i]) => `<a href="#${v}" data-v="${v}">${ico(i, 16)}${l}${v === 'priorizar' ? ' <span class="pill p-b nPri" hidden></span>' : ''}</a>`).join('');
  $('navBot').innerHTML = V.map(([v, l, i, main]) => `<a href="#${v}" data-v="${v}" class="${main ? 'main' : ''}">${ico(i, main ? 24 : 20)}<span>${l}</span>${v === 'priorizar' ? '<span class="pill p-b nPri" hidden></span>' : ''}</a>`).join('');
  $('uName').textContent = S.user.name; $('uRole').textContent = ROLE[S.user.role] || '';
  $('bOut').innerHTML = ico('out', 18);
  $('bNew').innerHTML = ico('plus', 16) + ' Reportar novedad';
  $('bNew').hidden = !isMgr();
  $('bImp').hidden = role() !== 'admin';
  updateBell();
}
function curView() {
  const h = (location.hash || '').slice(1), V = views().map(v => v[0]);
  return V.includes(h) ? h : V[0];
}
window.addEventListener('hashchange', () => {
  const m = location.hash.match(/^#inc=(.+)$/);
  if (m) { const id = decodeURIComponent(m[1]); history.replaceState(null, '', '#' + curViewDefault()); render(); setTimeout(() => openInc(id), 50); return; }
  render();
});
function curViewDefault() { return views()[0][0]; }

/* ===================== Datos ===================== */
function applyData(j) {
  S.machines = j.machines || []; S.inc = j.inc || []; S.techs = j.techs || []; S.rev = j.rev;
  if (j.me) { S.user = { ...S.user, ...j.me }; localStorage.setItem('mv_user', JSON.stringify(S.user)); }
  S.snapMs = Math.max(0, ...S.machines.map(m => m.lastCommMs || 0)) || null;
  S.loaded = true;
}
async function refresh(force) {
  if (S.busy || !S.token) return;
  S.busy = true;
  try {
    const j = await api('data', { rev: force ? null : S.rev });
    setOnline(true);
    if (!j.same) {
      applyData(j);
      try { localStorage.setItem('mv_cache', JSON.stringify({ machines: j.machines, inc: j.inc, techs: j.techs, rev: j.rev, at: Date.now() })); } catch (e) { }
      fillFilters(); detectNew(); render();
    }
  } catch (e) {
    if (e.code === 'net') setOnline(false);
    else if (e.code !== 'auth') console.warn(e);
  } finally { S.busy = false; }
  flushQueue();
}
function setOnline(on) { S.online = on; $('net').classList.toggle('on', !on); }
window.addEventListener('online', () => { refresh(true); });
window.addEventListener('offline', () => setOnline(false));
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });

// Detección de reportes nuevos (alerta en pantalla + sonido + notificación del sistema)
function detectNew() {
  const me = S.user.name;
  if (isMgr()) {
    const key = 'mv_seen_' + me, seen = +localStorage.getItem(key) || 0;
    const mx = Math.max(0, ...S.inc.map(i => i.createdMs || 0));
    if (seen) {
      const nw = S.inc.filter(i => i.createdMs > seen && i.reportedBy !== me).sort((a, b) => a.createdMs - b.createdMs);
      if (nw.length > 3) { alertMsg(`${nw.length} reportes nuevos`, 'Revisa la pestaña Priorizar', nw[nw.length - 1].id); }
      else nw.forEach(i => alertMsg(`${i.impact === 'parcial' ? '🟠 Opera con falla' : '🔴 Fuera de servicio'} · ${i.machine}`, `${i.category} — ${i.description || ''} (${i.reportedBy})`, i.id));
    }
    localStorage.setItem(key, Math.max(seen, mx));
  }
  if (isTech()) {
    const key = 'mv_seenA_' + me, seen = +localStorage.getItem(key) || 0;
    const mine = S.inc.filter(i => i.assignedTo === me && i.status !== 'Cerrada');
    const mx = Math.max(0, ...mine.map(i => i.assignedMs || 0));
    if (seen) mine.filter(i => i.assignedMs > seen).forEach(i => alertMsg(`Servicio asignado · ${i.machine}`, `${i.priority ? 'Prioridad ' + i.priority + ' · ' : ''}${i.category}`, i.id));
    localStorage.setItem(key, Math.max(seen, mx || 1));
  }
  const pend = isMgr() ? S.inc.filter(i => i.status !== 'Cerrada' && !i.assignedTo).length : isTech() ? S.inc.filter(i => i.assignedTo === me && i.status !== 'Cerrada').length : 0;
  try { pend ? navigator.setAppBadge?.(pend) : navigator.clearAppBadge?.(); } catch (e) { }
}
function alertMsg(title, body, id) {
  toast(`<b>${esc(title)}</b><br>${esc(body)}`, { alert: true, ms: 9000, onclick: () => openInc(id) });
  beep();
  if (document.hidden || !document.hasFocus()) sysNotify(title, body, id);
}

/* ===================== Cola sin conexión (IndexedDB) ===================== */
const Q = {
  db: null,
  open() { return this.db || (this.db = new Promise((res, rej) => { const r = indexedDB.open('mv', 1); r.onupgradeneeded = () => r.result.createObjectStore('q', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); })); },
  async run(mode, fn) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('q', mode), rq = fn(t.objectStore('q')); t.oncomplete = () => res(rq && rq.result); t.onerror = () => rej(t.error); }); },
  add(x) { return this.run('readwrite', s => s.put(x)); },
  all() { return this.run('readonly', s => s.getAll()); },
  del(id) { return this.run('readwrite', s => s.delete(id)); }
};
let flushing = false;
async function flushQueue() {
  if (flushing || !S.token || !navigator.onLine) return;
  flushing = true;
  try {
    const items = await Q.all();
    for (const it of items) {
      try {
        await sendItem(it);
        await Q.del(it.id);
        toast(`Reporte pendiente enviado: <b>${esc(it.label || '')}</b>`);
        S.rev = null;
      } catch (e) { if (e.code === 'net') break; if (e.code === 'val') { await Q.del(it.id); toast('Un reporte pendiente no se pudo enviar: ' + esc(e.message), { alert: true }); } }
    }
    updateQueueInfo();
    if (items.length) refresh(true);
  } catch (e) { } finally { flushing = false; }
}
async function sendItem(it, progress) {
  it.uploaded = it.uploaded || [];
  for (let k = 0; k < it.media.length; k++) {
    if (it.uploaded[k]) continue;
    progress && progress(k + 1, it.media.length);
    const m = it.media[k];
    const r = await api('upload', { b64: await blobToB64(m.blob), mime: m.mime, kind: m.kind, asset: it.rep.asset }, 240000);
    it.uploaded[k] = { id: r.id, kind: m.kind };
    try { await Q.run('readonly', s => s.get(it.id)) && await Q.add(it); } catch (e) { }
  }
  return api(it.op || 'report', { ...it.rep, media: it.uploaded });
}
function blobToB64(blob) {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });
}
async function updateQueueInfo() {
  const el = $('qInfo'); if (!el) return;
  let n = 0; try { n = (await Q.all()).length; } catch (e) { }
  el.innerHTML = n ? `<div class="banner">${n === 1 ? 'Hay 1 reporte guardado' : `Hay ${n} reportes guardados`} sin enviar. Se enviarán solos cuando haya señal. <button class="lnk" id="qRetry">Reintentar ahora</button></div>` : '';
  $('qRetry') && ($('qRetry').onclick = () => flushQueue());
}

/* ===================== Cámara (solo captura en vivo) ===================== */
const Cam = { stream: null, facing: 'environment', mode: 'photo', rec: null, chunks: [], t0: 0, timer: null, result: null, resolve: null, label: '' };
function openCamera(mode, label) {
  return new Promise(resolve => {
    Cam.mode = mode; Cam.label = label || ''; Cam.resolve = resolve; Cam.result = null;
    if (!navigator.mediaDevices?.getUserMedia) return fallbackCapture(mode, resolve);
    $('cam').hidden = false; $('camPrev').hidden = true;
    $('camShot').className = 'shot' + (mode === 'video' ? ' vid' : '');
    $('camT').textContent = mode === 'video' ? `Video · máx. ${MAX_VIDEO_S} s` : 'Foto';
    $('camT').classList.remove('rec');
    $('camHint').textContent = mode === 'video' ? 'Toca el botón rojo para grabar' : 'Enfoca la falla y toca el botón';
    $('camFlip').innerHTML = ico('flip', 22); $('camX').innerHTML = ico('x', 22);
    startStream();
  });
}
async function startStream() {
  stopStream();
  const v = Cam.mode === 'video';
  const video = { facingMode: { ideal: Cam.facing }, width: { ideal: v ? 1280 : 1920 }, height: { ideal: v ? 720 : 1080 } };
  try {
    try { Cam.stream = await navigator.mediaDevices.getUserMedia({ video, audio: v }); }
    catch (e) { if (v && e.name !== 'NotAllowedError') Cam.stream = await navigator.mediaDevices.getUserMedia({ video, audio: false }); else throw e; }
    $('camV').srcObject = Cam.stream;
    $('camV').style.transform = Cam.facing === 'user' ? 'scaleX(-1)' : '';
  } catch (e) {
    closeCamera();
    if (e.name === 'NotAllowedError') toast('Debes permitir el acceso a la cámara para tomar la evidencia. Revisa los permisos del navegador.', { alert: true, ms: 8000 });
    else if (e.name === 'NotFoundError' || e.name === 'OverconstrainedError') toast('No se encontró una cámara en este dispositivo.', { alert: true });
    else fallbackCapture(Cam.mode, Cam.resolve);
  }
}
function stopStream() { if (Cam.stream) { Cam.stream.getTracks().forEach(t => t.stop()); Cam.stream = null; } }
function closeCamera(result) {
  clearInterval(Cam.timer);
  try { Cam.rec && Cam.rec.state !== 'inactive' && Cam.rec.stop(); } catch (e) { }
  Cam.rec = null;
  stopStream(); $('cam').hidden = true; $('camMedia').innerHTML = '';
  const r = Cam.resolve; Cam.resolve = null; r && r(result || null);
}
$('camX').onclick = () => closeCamera();
$('camFlip').onclick = () => { if (Cam.rec) return; Cam.facing = Cam.facing === 'environment' ? 'user' : 'environment'; startStream(); };
$('camShot').onclick = () => Cam.mode === 'photo' ? takePhoto() : toggleRec();
$('camRetry').onclick = () => { if (Cam.result?.url) URL.revokeObjectURL(Cam.result.url); Cam.result = null; $('camPrev').hidden = true; $('camMedia').innerHTML = ''; };
$('camUse').onclick = () => closeCamera(Cam.result);

function stampText() {
  return [new Date().toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }), Cam.label, S.user?.name].filter(Boolean).join(' · ');
}
function drawToCanvas(src, w, h, mirror) {
  const max = 1600, sc = Math.min(1, max / Math.max(w, h)), cw = Math.round(w * sc), ch = Math.round(h * sc);
  const cv = $('camCv'); cv.width = cw; cv.height = ch;
  const g = cv.getContext('2d');
  if (mirror) { g.translate(cw, 0); g.scale(-1, 1); }
  g.drawImage(src, 0, 0, cw, ch);
  g.setTransform(1, 0, 0, 1, 0, 0);
  const fs = Math.max(14, Math.round(cw / 48)), pad = Math.round(fs * .6);
  g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, ch - fs * 2.6, cw, fs * 2.6);
  g.fillStyle = '#fff'; g.font = `600 ${fs}px system-ui, sans-serif`; g.textBaseline = 'middle';
  g.fillText('Mundo Vending · Reporte de novedad', pad, ch - fs * 1.85);
  g.font = `${Math.round(fs * .85)}px system-ui, sans-serif`;
  g.fillText(stampText(), pad, ch - fs * .75);
  return cv;
}
function takePhoto() {
  const v = $('camV'); if (!v.videoWidth) return;
  const cv = drawToCanvas(v, v.videoWidth, v.videoHeight, Cam.facing === 'user');
  cv.toBlob(b => {
    if (!b) return;
    Cam.result = { kind: 'photo', blob: b, mime: 'image/jpeg', url: URL.createObjectURL(b) };
    $('camMedia').innerHTML = `<img src="${Cam.result.url}" alt="Foto tomada">`;
    $('camPrev').hidden = false;
  }, 'image/jpeg', .82);
}
function pickVideoMime() {
  const opts = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp8,opus', 'video/webm'];
  return (window.MediaRecorder && opts.find(t => MediaRecorder.isTypeSupported(t))) || '';
}
function toggleRec() {
  if (Cam.rec && Cam.rec.state === 'recording') { Cam.rec.stop(); return; }
  if (!window.MediaRecorder || !Cam.stream) { toast('Este dispositivo no permite grabar video desde la app. Toma fotos.', { alert: true }); return; }
  const mime = pickVideoMime();
  Cam.chunks = [];
  try { Cam.rec = new MediaRecorder(Cam.stream, { mimeType: mime || undefined, videoBitsPerSecond: 1500000, audioBitsPerSecond: 64000 }); }
  catch (e) { Cam.rec = new MediaRecorder(Cam.stream); }
  Cam.rec.ondataavailable = e => e.data.size && Cam.chunks.push(e.data);
  Cam.rec.onstop = () => {
    clearInterval(Cam.timer);
    $('camShot').className = 'shot vid'; $('camT').classList.remove('rec'); $('camFlip').disabled = false;
    if (!Cam.resolve) return;
    const type = (Cam.rec?.mimeType || mime || 'video/webm').split(';')[0];
    const b = new Blob(Cam.chunks, { type });
    if (b.size < 1000) { toast('El video quedó vacío, intenta de nuevo.'); return; }
    Cam.result = { kind: 'video', blob: b, mime: type, url: URL.createObjectURL(b), secs: Math.round((Date.now() - Cam.t0) / 1000) };
    $('camMedia').innerHTML = `<video src="${Cam.result.url}" controls playsinline autoplay></video>`;
    $('camPrev').hidden = false;
    Cam.rec = null;
  };
  Cam.rec.start(1000); Cam.t0 = Date.now();
  $('camShot').className = 'shot recording'; $('camT').classList.add('rec'); $('camFlip').disabled = true; $('camHint').textContent = '';
  const tick = () => {
    const s = Math.floor((Date.now() - Cam.t0) / 1000);
    $('camT').textContent = `● 0:${String(s).padStart(2, '0')} / 0:${MAX_VIDEO_S}`;
    if (s >= MAX_VIDEO_S && Cam.rec?.state === 'recording') Cam.rec.stop();
  };
  tick(); Cam.timer = setInterval(tick, 250);
}
// Respaldo para navegadores sin acceso directo a la cámara: abre la cámara del sistema (no la galería).
function fallbackCapture(mode, resolve) {
  const inp = $('camFallback');
  inp.value = ''; inp.accept = mode === 'video' ? 'video/*' : 'image/*'; inp.setAttribute('capture', 'environment');
  inp.onchange = async () => {
    const f = inp.files[0]; if (!f) return resolve(null);
    if (Date.now() - f.lastModified > 5 * 60 * 1000) { toast('Solo se permiten fotos o videos tomados en este momento.', { alert: true }); return resolve(null); }
    if (mode === 'photo') {
      const img = new Image(); img.src = URL.createObjectURL(f); await img.decode().catch(() => { });
      const cv = drawToCanvas(img, img.naturalWidth, img.naturalHeight, false);
      cv.toBlob(b => resolve({ kind: 'photo', blob: b, mime: 'image/jpeg', url: URL.createObjectURL(b) }), 'image/jpeg', .82);
    } else {
      if (f.size > 25 * 1024 * 1024) { toast('El video es muy pesado. Graba uno más corto (máx. 20 s).', { alert: true }); return resolve(null); }
      resolve({ kind: 'video', blob: f, mime: f.type || 'video/mp4', url: URL.createObjectURL(f) });
    }
  };
  inp.click();
}

/* ===================== Reportar novedad ===================== */
const R = { asset: '', cat: '', impact: '', when: 'now', media: [], q: '' };
const WHEN = [['now', 'Ahora'], ['1h', 'Hace 1 hora'], ['3h', 'Hace 3 horas'], ['am', 'Desde esta mañana'], ['x', 'Otra hora']];
function whenMs() {
  const now = Date.now();
  if (R.when === '1h') return now - H; if (R.when === '3h') return now - 3 * H;
  if (R.when === 'am') { const d = new Date(); d.setHours(6, 0, 0, 0); return Math.min(d.getTime(), now); }
  if (R.when === 'x') return fromLocalInput($('rWhenX').value) || now;
  return now;
}
function machineById(id) { return S.machines.find(m => m.id === id); }
function recentIds() { return jparse(localStorage.getItem('mv_recent')) || []; }
function renderReport() {
  const el = $('v-reportar');
  if (el.dataset.ok) return;
  if (!el.dataset.ready) {
    el.dataset.ready = 1;
    el.innerHTML = `<div class="rep">
      <div id="qInfo"></div>
      <h2 class="rt">Reportar novedad</h2><p class="mut" style="margin:0 0 4px">Completa los pasos. La evidencia solo se puede tomar con la cámara en este momento.</p>
      <div class="step" id="st1"><div class="sl"><b>1</b> Máquina</div><div id="rMach"></div></div>
      <div class="step" id="st2"><div class="sl"><b>2</b> ¿Qué pasa?</div><div class="chips" id="rCats">${CATS.map(c => `<button class="chip" data-v="${esc(c)}">${ico((CATSTY[c] || CATSTY.Otro)[0], 16)}${esc(c)}</button>`).join('')}</div></div>
      <div class="step" id="st3"><div class="sl"><b>3</b> ¿La máquina está vendiendo?</div><div class="seg" id="rImp">
        <button class="segb bad" data-v="total">${ico('x', 22)}No vende<small>Fuera de servicio</small></button>
        <button class="segb warn" data-v="parcial">${ico('alert', 22)}Vende con falla<small>Funciona a medias</small></button></div></div>
      <div class="step" id="st4"><div class="sl"><b>4</b> ¿Desde cuándo?</div><div class="chips" id="rWhen">${WHEN.map(([v, l]) => `<button class="chip" data-v="${v}">${l}</button>`).join('')}</div>
        <input type="datetime-local" id="rWhenX" class="inp" style="margin-top:10px" hidden></div>
      <div class="step" id="st5"><div class="sl"><b>5</b> Evidencia de la falla</div>
        <div class="ev" id="rEv"></div>
        <div class="evb"><button class="bigb" id="rPhoto">${ico('camera', 22)} Tomar foto</button><button class="bigb" id="rVideo">${ico('video', 22)} Grabar video</button></div>
        <p class="note">Hasta ${MAX_PHOTOS} fotos y 1 video de máximo ${MAX_VIDEO_S} segundos. No se pueden adjuntar archivos de la galería.</p></div>
      <div class="step" id="st6"><div class="sl"><b>6</b> Describe la falla</div><textarea id="rDesc" maxlength="1000" placeholder="Ej.: no recibe billetes, monedero atascado, pantalla apagada…"></textarea></div>
      <button class="pri send" id="rSend">Enviar reporte</button>
      <p class="err" id="rErr"></p>
    </div>`;
    $('rCats').onclick = e => { const b = e.target.closest('button'); if (b) { R.cat = b.dataset.v; drawReport(); } };
    $('rImp').onclick = e => { const b = e.target.closest('button'); if (b) { R.impact = b.dataset.v; drawReport(); } };
    $('rWhen').onclick = e => { const b = e.target.closest('button'); if (b) { R.when = b.dataset.v; if (R.when === 'x' && !$('rWhenX').value) $('rWhenX').value = toLocalInput(Date.now() - H); drawReport(); } };
    $('rPhoto').onclick = async () => {
      if (R.media.filter(m => m.kind === 'photo').length >= MAX_PHOTOS) { toast(`Máximo ${MAX_PHOTOS} fotos.`); return; }
      const r = await openCamera('photo', machineById(R.asset)?.name); if (r) { R.media.push(r); drawReport(); }
    };
    $('rVideo').onclick = async () => {
      if (R.media.some(m => m.kind === 'video')) { toast('Solo se permite 1 video. Elimina el actual para grabar otro.'); return; }
      const r = await openCamera('video', machineById(R.asset)?.name); if (r) { R.media.push(r); drawReport(); }
    };
    $('rDesc').oninput = () => drawReport(true);
    $('rSend').onclick = sendReport;
  }
  drawReport();
  updateQueueInfo();
}
function drawReport(light) {
  const m = machineById(R.asset);
  if (!light) {
    if (m) {
      $('rMach').innerHTML = `<div class="msel">${ico('machine', 22)}<div><b>${esc(m.name)}</b><small>${esc(m.route)} · ${esc(m.location)}</small></div><button id="rChg">Cambiar</button></div>`;
      $('rChg').onclick = () => { R.asset = ''; drawReport(); setTimeout(() => $('rMq')?.focus(), 30); };
    } else {
      $('rMach').innerHTML = `<input id="rMq" class="inp" placeholder="Buscar por número, nombre o lugar" autocomplete="off" value="${esc(R.q)}"><div class="mlist" id="rML"></div>`;
      $('rMq').oninput = () => { R.q = $('rMq').value; drawMachineList(); };
      drawMachineList();
    }
    document.querySelectorAll('#rCats .chip').forEach(b => b.classList.toggle('on', b.dataset.v === R.cat));
    document.querySelectorAll('#rImp .segb').forEach(b => b.classList.toggle('on', b.dataset.v === R.impact));
    document.querySelectorAll('#rWhen .chip').forEach(b => b.classList.toggle('on', b.dataset.v === R.when));
    $('rWhenX').hidden = R.when !== 'x';
    $('rEv').innerHTML = R.media.map((x, k) => `<div class="evi">${x.kind === 'video' ? `<video src="${x.url}" muted playsinline></video><span class="tag">Video</span>` : `<img src="${x.url}" alt="">`}<button data-k="${k}" aria-label="Quitar">${ico('x', 16)}</button></div>`).join('');
    $('rEv').querySelectorAll('button').forEach(b => b.onclick = () => { const x = R.media.splice(+b.dataset.k, 1)[0]; URL.revokeObjectURL(x.url); drawReport(); });
  }
  const needMedia = isOp();
  const done = [!!m, !!R.cat, !!R.impact, true, R.media.length > 0 || !needMedia, $('rDesc').value.trim().length >= 5];
  done.forEach((d, k) => $('st' + (k + 1)).classList.toggle('done', d));
}
function drawMachineList() {
  const q = R.q.trim().toLowerCase(), el = $('rML');
  let L;
  if (!q) {
    const rec = recentIds().map(machineById).filter(Boolean);
    L = rec.length ? rec : [];
    el.innerHTML = (L.length ? '<div class="note" style="margin:0 0 4px">Usadas recientemente</div>' : `<div class="note">${S.machines.length ? `Escribe para buscar entre ${S.machines.length} máquinas` : 'Cargando máquinas…'}</div>`);
  } else {
    const words = q.split(/\s+/);
    L = S.machines.filter(m => { const t = [m.name, m.location, m.route, m.asset].join(' ').toLowerCase(); return words.every(w => t.includes(w)); })
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true })).slice(0, 40);
    el.innerHTML = L.length ? '' : '<div class="note">No se encontró ninguna máquina.</div>';
  }
  el.insertAdjacentHTML('beforeend', L.map(m => `<button class="mitem" data-id="${esc(m.id)}">${esc(m.name)}<small>${esc(m.route)} · ${esc(m.location)}</small></button>`).join(''));
  el.querySelectorAll('.mitem').forEach(b => b.onclick = () => { R.asset = b.dataset.id; R.q = ''; drawReport(); });
}
async function sendReport() {
  const m = machineById(R.asset), desc = $('rDesc').value.trim(), err = t => { $('rErr').textContent = t; };
  if (!m) return err('Selecciona la máquina.');
  if (!R.cat) return err('Selecciona qué pasa con la máquina.');
  if (!R.impact) return err('Indica si la máquina está vendiendo o no.');
  if (isOp() && !R.media.length) return err('Toma al menos una foto o un video de la falla.');
  if (desc.length < 5) return err('Describe brevemente la falla.');
  const st = whenMs();
  if (st > Date.now() + 6e4) return err('La hora de inicio no puede estar en el futuro.');
  err('');
  const item = {
    id: uid(), op: 'report', label: m.name, createdAt: Date.now(),
    rep: { clientId: null, asset: m.id, category: R.cat, impact: R.impact, startMs: st, description: desc },
    media: R.media.map(x => ({ kind: x.kind, mime: x.mime, blob: x.blob }))
  };
  item.rep.clientId = item.id;
  const b = $('rSend'); b.disabled = true; b.textContent = 'Enviando…';
  try {
    await sendItem(item, (k, n) => { b.textContent = `Subiendo evidencia ${k} de ${n}…`; });
    finishReport(m, false);
    S.rev = null; refresh(true);
  } catch (e) {
    if (e.code === 'net') {
      try { await Q.add(item); finishReport(m, true); } catch (x) { err('No hay señal y no se pudo guardar el reporte en el teléfono. Intenta de nuevo.'); }
    } else err(e.message);
  } finally { b.disabled = false; b.textContent = 'Enviar reporte'; }
}
function finishReport(m, queued) {
  const rec = [m.id, ...recentIds().filter(x => x !== m.id)].slice(0, 6);
  localStorage.setItem('mv_recent', JSON.stringify(rec));
  R.media.forEach(x => URL.revokeObjectURL(x.url));
  Object.assign(R, { asset: '', cat: '', impact: '', when: 'now', media: [], q: '' });
  const el = $('v-reportar'); el.dataset.ready = ''; el.dataset.ok = '1';
  el.innerHTML = `<div class="rep"><div class="ok-screen"><div class="okc">${ico(queued ? 'clock' : 'check', 44)}</div>
    <h2 style="font-size:20px">${queued ? 'Reporte guardado' : 'Reporte enviado'}</h2>
    <p class="mut">${queued ? 'No hay señal en este momento. El reporte quedó guardado en el teléfono y se enviará solo cuando vuelva la conexión.' : 'Gracias. El equipo de operaciones ya recibió la alerta de <b>' + esc(m.name) + '</b>.'}</p>
    <div class="act" style="justify-content:center"><button class="pri" id="okNew">Reportar otra novedad</button>${isOp() ? '<button id="okMine">Ver mis reportes</button>' : ''}</div></div></div>`;
  $('okNew').onclick = () => { el.innerHTML = ''; el.dataset.ok = ''; renderReport(); window.scrollTo(0, 0); };
  $('okMine') && ($('okMine').onclick = () => { location.hash = '#mis'; });
  window.scrollTo(0, 0);
}
$('bNew').onclick = () => { location.hash = '#reportar'; };

/* ===================== Cálculos de disponibilidad ===================== */
function period() {
  const v = $("per").value, now = Date.now(), d = new Date();
  if (v === "m0") return { a: new Date(d.getFullYear(), d.getMonth(), 1).getTime(), b: now };
  if (v === "m1") return { a: new Date(d.getFullYear(), d.getMonth() - 1, 1).getTime(), b: new Date(d.getFullYear(), d.getMonth(), 1).getTime() };
  const n = +v.slice(1); return { a: now - n * 24 * H, b: now };
}
function overlap(i, p) { const s = Math.max(i.startMs, p.a), e = Math.min(i.closedMs || Date.now(), p.b); return Math.max(0, e - s); }
function merged(list, p) {
  const iv = list.map(i => [Math.max(i.startMs, p.a), Math.min(i.closedMs || Date.now(), p.b)]).filter(x => x[1] > x[0]).sort((x, y) => x[0] - y[0]);
  let t = 0, cs = null, ce = null;
  for (const [s, e] of iv) { if (cs === null) { cs = s; ce = e; } else if (s <= ce) ce = Math.max(ce, e); else { t += ce - cs; cs = s; ce = e; } }
  if (cs !== null) t += ce - cs; return t;
}
const routeFilter = () => $("fRoute").value;
const machinesInScope = () => { const r = routeFilter(); return S.machines.filter(m => !r || m.route === r); };
const incInPeriod = p => { const r = routeFilter(); return S.inc.filter(i => (!r || i.route === r) && i.startMs < p.b && (!i.closedMs || i.closedMs > p.a)); };
function machineStats(p) {
  const by = {}; for (const i of incInPeriod(p)) (by[i.asset] || (by[i.asset] = [])).push(i);
  const span = p.b - p.a;
  return machinesInScope().map(m => {
    const L = by[m.id] || [];
    const down = merged(L.filter(i => i.impact !== "parcial"), p), deg = merged(L.filter(i => i.impact === "parcial"), p);
    const open = S.inc.filter(i => i.asset === m.id && i.status !== "Cerrada");
    const st = open.some(i => i.impact !== "parcial") ? "down" : open.length ? "deg" : "ok";
    return { m, n: L.length, down, deg, av: 1 - down / span, st, open };
  });
}
const noCom = m => m.lastCommMs && S.snapMs && S.snapMs - m.lastCommMs > 24 * H;

/* ===================== Render principal ===================== */
function setMsg(h) { $("msg").innerHTML = h; }
function render() {
  if (!S.user) return;
  const v = curView();
  if (v !== S.lastView && v === 'reportar' && $('v-reportar').dataset.ok) { $('v-reportar').dataset.ok = ''; $('v-reportar').innerHTML = ''; }
  S.lastView = v;
  document.querySelectorAll('nav a').forEach(a => a.classList.toggle('on', a.dataset.v === v));
  ['tablero', 'priorizar', 'novedades', 'maquinas', 'reportar', 'mis', 'servicios'].forEach(x => $('v-' + x).hidden = x !== v);
  $('filters').hidden = !['tablero', 'priorizar', 'novedades', 'maquinas'].includes(v);
  const np = S.inc.filter(i => i.status !== 'Cerrada' && !i.assignedTo).length;
  document.querySelectorAll('.nPri').forEach(x => { x.hidden = !np || !isMgr(); x.textContent = np; });
  if (v === 'reportar') { setMsg(''); renderReport(); return; }
  if (!S.loaded) { setMsg('<div class="empty">Cargando información…</div>'); return; }
  setMsg(!S.machines.length ? `<div class="banner">Aún no hay máquinas cargadas. ${role() === 'admin' ? 'Usa “Actualizar máquinas (CSV Parlevel)” en la pestaña Máquinas.' : 'Pide al administrador que cargue el listado de máquinas.'}</div>` : '');
  if (v === 'tablero') renderDash(); else if (v === 'priorizar') renderPri(); else if (v === 'novedades') renderInc();
  else if (v === 'maquinas') renderMq(); else if (v === 'mis') renderMine(); else if (v === 'servicios') renderServ();
}

/* ---------- Tablero ---------- */
function bars(el, rows, max, fmt, color) {
  if (!rows.length) { el.innerHTML = `<div class="empty">${ico("check", 28)}<div>Sin novedades en este periodo.</div></div>`; return; }
  el.innerHTML = rows.map(r => `<div class="hb ${r.icon ? '' : 'noi'}" ${r.click ? `data-a="${esc(r.click)}" style="cursor:pointer"` : ""} title="${esc(r.l)}: ${esc(fmt(r))}">${r.icon ? `<span class="ci" style="color:${r.col};background:color-mix(in srgb,${r.col} 14%,transparent)">${ico(r.icon, 15)}</span>` : ""}<span class="t">${esc(r.l)}</span><span class="tr"><span class="f" style="width:${max ? Math.max(2, r.v / max * 100) : 0}%;background:${r.col || (color ? color(r) : "var(--acc)")}"></span></span><span class="n">${fmt(r)}</span></div>`).join("");
  el.querySelectorAll("[data-a]").forEach(x => x.onclick = () => openMachine(x.dataset.a));
}
function ring(v, size, stroke, col, label, sub) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, o = c * (1 - Math.max(0, Math.min(1, v)));
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="${esc(label)}"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--line)" stroke-width="${stroke}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${o}" transform="rotate(-90 ${size / 2} ${size / 2})"/><text x="50%" y="${sub ? 47 : 52}%" text-anchor="middle" dominant-baseline="middle" font-size="${size / 6}" font-weight="750" fill="var(--ink)">${esc(label)}</text>${sub ? `<text x="50%" y="64%" text-anchor="middle" font-size="${size / 14}" fill="var(--mut)">${esc(sub)}</text>` : ""}</svg>`;
}
function donut(parts, size) {
  const tot = parts.reduce((a, p) => a + p.v, 0) || 1, r = size / 2 - 12, c = 2 * Math.PI * r; let acc = 0;
  const segs = parts.filter(p => p.v > 0).map(p => { const len = c * p.v / tot, s = `<circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${p.col}" stroke-width="16" stroke-dasharray="${Math.max(0, len - 2)} ${c}" stroke-dashoffset="${-acc}" transform="rotate(-90 ${size / 2} ${size / 2})"><title>${esc(p.l)}: ${p.v}</title></circle>`; acc += len; return s; }).join("");
  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" role="img" aria-label="Estado actual de las máquinas"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="var(--line)" stroke-width="16"/>${segs}<text x="50%" y="47%" text-anchor="middle" dominant-baseline="middle" font-size="${size / 6}" font-weight="750" fill="var(--ink)">${parts.reduce((a, p) => a + p.v, 0)}</text><text x="50%" y="63%" text-anchor="middle" font-size="${size / 14}" fill="var(--mut)">máquinas</text></svg>`;
}
function trend(p) {
  const day = 24 * H, N = machinesInScope().length || 1, out = [];
  const start = new Date(p.a); start.setHours(0, 0, 0, 0);
  const r = routeFilter(), L = S.inc.filter(i => i.impact !== "parcial" && (!r || i.route === r));
  const by = {}; for (const i of L) (by[i.asset] || (by[i.asset] = [])).push(i);
  for (let t = start.getTime(); t < p.b; t += day) {
    const q = { a: Math.max(t, p.a), b: Math.min(t + day, p.b) }; if (q.b <= q.a) continue;
    let d = 0; for (const a in by) d += merged(by[a], q);
    out.push({ t, v: 1 - d / (N * (q.b - q.a)), h: d / H });
  }
  return out;
}
function trendSvg(pts) {
  if (!pts.length) return '<div class="empty">Sin datos.</div>';
  const W = 1000, Hh = 190, pl = 40, pb = 24, pt = 10, lo = Math.min(.9, ...pts.map(x => x.v)), y = v => pt + (1 - (v - lo) / (1 - lo)) * (Hh - pt - pb), bw = Math.min(46, (W - pl - 6) / pts.length);
  const ticks = [lo, lo + (1 - lo) / 2, 1].map(v => `<line x1="${pl}" x2="${W - 4}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)"/><text x="${pl - 6}" y="${y(v)}" text-anchor="end" dominant-baseline="middle" font-size="10" fill="var(--mut)">${Math.round(v * 100)}%</text>`).join("");
  const meta = .98 >= lo ? `<line x1="${pl}" x2="${W - 4}" y1="${y(.98)}" y2="${y(.98)}" stroke="var(--ok)" stroke-dasharray="4 4"/>` : "";
  const step = Math.ceil(pts.length / 12);
  const bs = pts.map((x, k) => { const X = pl + k * bw + 2, Y = y(x.v), dd = new Date(x.t); return `<rect x="${X}" y="${Y}" width="${Math.max(2, bw - 4)}" height="${Math.max(0, Hh - pb - Y)}" rx="3" fill="${stCol(x.v)}" opacity=".85"><title>${dd.toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })}: ${pct(x.v)} · ${fmtH(x.h)} fuera</title></rect>${k % step === 0 ? `<text x="${X + bw / 2 - 2}" y="${Hh - 8}" text-anchor="middle" font-size="10" fill="var(--mut)">${dd.getDate()}/${dd.getMonth() + 1}</text>` : ""}`; }).join("");
  return `<div style="overflow-x:auto"><svg viewBox="0 0 ${W} ${Hh}" width="100%" style="min-width:560px" role="img" aria-label="Disponibilidad diaria">${ticks}${bs}${meta}</svg></div>`;
}
function renderDash() {
  const p = period(), ms = machineStats(p), span = p.b - p.a;
  const tot = ms.length, downH = ms.reduce((a, x) => a + x.down, 0) / H;
  const av = tot ? 1 - ms.reduce((a, x) => a + x.down, 0) / (tot * span) : 1;
  const inc = incInPeriod(p), closed = inc.filter(i => i.closedMs && i.closedMs >= p.a && i.closedMs <= p.b);
  const mttr = closed.length ? closed.reduce((a, i) => a + (i.closedMs - i.startMs), 0) / closed.length / H : null;
  const resp = inc.filter(i => i.assignedMs); const mtta = resp.length ? resp.reduce((a, i) => a + (i.assignedMs - i.startMs), 0) / resp.length / H : null;
  const open = S.inc.filter(i => i.status !== "Cerrada" && (!routeFilter() || i.route === routeFilter()));
  const unassigned = open.filter(i => !i.assignedTo).length;
  const nDown = ms.filter(x => x.st === "down").length, nDeg = ms.filter(x => x.st === "deg").length, nOk = tot - nDown - nDeg;
  const nocom = machinesInScope().filter(noCom).length;
  $("hero").innerHTML = `
    <div class="card hcard"><div class="ring">${ring(av, 150, 14, stCol(av), pct(av), "disponibilidad")}</div>
      <div><h2>Disponibilidad del periodo</h2><p class="big" style="color:${stCol(av)}">${av >= .98 ? "En meta" : av >= .95 ? "Cerca de la meta" : "Por debajo de la meta"}</p>
      <p class="mut" style="margin:0">${fmtH(downH)} fuera de servicio en ${tot} máquinas · meta 98 %</p></div></div>
    <div class="card hcard"><div class="ring">${donut([{ v: nOk, col: "var(--ok)", l: "Operativas" }, { v: nDeg, col: "var(--warn)", l: "Opera con falla" }, { v: nDown, col: "var(--bad)", l: "Fuera de servicio" }], 150)}</div>
      <div><h2>Estado ahora</h2>
        <div class="lg"><i style="background:var(--ok)"></i>Operativas <b>${nOk}</b></div>
        <div class="lg"><i style="background:var(--warn)"></i>Opera con falla <b>${nDeg}</b></div>
        <div class="lg"><i style="background:var(--bad)"></i>Fuera de servicio <b>${nDown}</b></div>
        ${nDown ? `<button class="lnk" id="hDown">Ver fuera de servicio →</button>` : ""}</div></div>
    <div class="qa">
      <button class="tile t1" data-go="#reportar">${ico("plus", 22)}<span>Reportar novedad</span><small>Con foto o video</small></button>
      <button class="tile t2" data-go="#priorizar">${ico("flag", 22)}<span>Priorizar</span><small>${unassigned} pendiente${unassigned === 1 ? "" : "s"}</small></button>
      <button class="tile t3" data-go="#novedades">${ico("list", 22)}<span>Novedades</span><small>${open.length} abierta${open.length === 1 ? "" : "s"}</small></button>
      <button class="tile t4" data-go="#maquinas">${ico("search", 22)}<span>Buscar máquina</span><small>Historial</small></button>
    </div>`;
  $("hero").querySelectorAll("[data-go]").forEach(b => b.onclick = () => location.hash = b.dataset.go);
  $("hDown") && ($("hDown").onclick = () => { $("fState").value = "down"; location.hash = "#maquinas"; });
  const K = (ic, l, v, s, cls) => `<div class="card k"><span class="ki" style="color:var(${cls || "--acc"});background:color-mix(in srgb,var(${cls || "--acc"}) 13%,transparent)">${ico(ic, 20)}</span><div><div class="l">${l}</div><div class="v">${v}</div><div class="s">${s}</div></div></div>`;
  $("kpis").innerHTML =
    K("down", "Tiempo fuera de servicio", fmtH(downH), `${inc.length} novedades en el periodo`, "--acc") +
    K("flag", "Por priorizar", unassigned, "reportes sin técnico", unassigned ? "--warn" : "--ok") +
    K("user", "Tiempo promedio de asignación", mtta == null ? "—" : fmtH(mtta), "del reporte al técnico", "--c4") +
    K("clock", "Tiempo promedio de solución", mttr == null ? "—" : fmtH(mttr), `${closed.length} cerradas en el periodo`, "--c8") +
    K("wifi", "Sin comunicación >24 h", nocom, "según último reporte Parlevel", nocom ? "--warn" : "--ok");
  $("trend").innerHTML = trendSvg(trend(p));
  const cat = {}; for (const i of inc.filter(i => i.impact !== "parcial")) cat[i.category] = (cat[i.category] || 0) + overlap(i, p);
  const cr = Object.entries(cat).map(([l, v]) => { const s = CATSTY[l] || CATSTY.Otro; return { l, v: v / H, icon: s[0], col: `var(${s[1]})` }; }).sort((a, b) => b.v - a.v);
  const ctot = cr.reduce((a, r) => a + r.v, 0);
  bars($("byCat"), cr, cr[0]?.v || 0, r => fmtH(r.v) + " · " + Math.round(r.v / ctot * 100) + "%");
  const rt = {}; for (const x of ms) { const r = x.m.route || "Sin ruta"; (rt[r] || (rt[r] = { d: 0, n: 0 })).d += x.down; rt[r].n++; }
  const rr = Object.entries(rt).map(([l, o]) => ({ l, v: 1 - o.d / (o.n * span) })).sort((a, b) => a.v - b.v);
  bars($("byRoute"), S.allRoutes ? rr : rr.slice(0, 8), 1, r => pct(r.v), r => stCol(r.v));
  if (rr.length > 8) { $("byRoute").insertAdjacentHTML("beforeend", `<button class="lnk" id="rAll">${S.allRoutes ? "Ver solo las 8 más bajas" : "Ver las " + rr.length + " rutas"} →</button>`); $("rAll").onclick = () => { S.allRoutes = !S.allRoutes; renderDash(); }; }
  const tm = ms.filter(x => x.down > 0).sort((a, b) => b.down - a.down).slice(0, 10).map(x => ({ l: x.m.name, v: x.down / H, click: x.m.id }));
  bars($("topDown"), tm, tm[0]?.v || 0, r => fmtH(r.v), () => "var(--bad)");
  const tc = {}; for (const i of open) { const t = i.assignedTo || "Por priorizar"; tc[t] = (tc[t] || 0) + 1; }
  const tr = Object.entries(tc).map(([l, v]) => ({ l, v })).sort((a, b) => b.v - a.v);
  bars($("byTech"), tr, tr[0]?.v || 0, r => r.v + (r.v === 1 ? " servicio" : " servicios"), r => r.l === "Por priorizar" ? "var(--warn)" : "var(--acc)");
  const op = {}; for (const i of S.inc.filter(i => i.createdMs >= p.a && i.createdMs <= p.b && (!routeFilter() || i.route === routeFilter()))) { const k = i.reportedBy || "—"; op[k] = (op[k] || 0) + 1; }
  const orr = Object.entries(op).map(([l, v]) => ({ l, v })).sort((a, b) => b.v - a.v).slice(0, 10);
  bars($("byOp"), orr, orr[0]?.v || 0, r => r.v + (r.v === 1 ? " reporte" : " reportes"), () => "var(--c2)");
  const last = S.inc.slice().sort((a, b) => b.createdMs - a.createdMs).slice(0, 6);
  $("lastRep").innerHTML = last.length ? last.map(i => `<div class="hb noi" data-i="${esc(i.id)}" style="cursor:pointer;grid-template-columns:1fr auto"><span class="t">${impactDot(i)} <b>${esc(i.machine)}</b> <span class="mut">· ${esc(i.category)} · ${esc(i.reportedBy || '')}</span></span><span class="n">${fmtH((Date.now() - i.createdMs) / H)}</span></div>`).join("") : `<div class="empty">Aún no hay reportes.</div>`;
  $("lastRep").querySelectorAll("[data-i]").forEach(x => x.onclick = () => openInc(x.dataset.i));
}
const impactDot = i => `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:var(${i.status === 'Cerrada' ? '--ok' : i.impact === 'parcial' ? '--warn' : '--bad'})"></span>`;

/* ---------- Priorización ---------- */
const PRI = { Alta: 0, Media: 1, Baja: 2 };
const priPill = p => p ? `<span class="pill ${p === "Alta" ? "p-b" : p === "Media" ? "p-w" : "p-n"}">${esc(p)}</span>` : '<span class="mut">Sin priorizar</span>';
const techList = () => [...new Set([...S.techs, ...S.inc.map(i => i.assignedTo).filter(Boolean)])].sort();
function renderPri() {
  if ($('dlg').open || $("tPri").contains(document.activeElement)) return;
  const r = routeFilter(), open = S.inc.filter(i => i.status !== "Cerrada" && (!r || i.route === r)), now = Date.now();
  const pend = open.filter(i => !i.assignedTo).sort((a, b) => (a.impact === "parcial") - (b.impact === "parcial") || a.startMs - b.startMs);
  const rep = a => S.inc.filter(x => x.asset === a && x.startMs > now - 30 * 24 * H).length;
  const keep = {}; $("tPri").querySelectorAll("tr[data-i]").forEach(tr => { keep[tr.dataset.i] = {}; tr.querySelectorAll("[data-f]").forEach(x => { if ("value" in x && x.tagName !== "BUTTON") keep[tr.dataset.i][x.dataset.f] = x.value; }); });
  const opts = techList().map(t => `<option value="${esc(t)}">`).join("");
  $("tPri").innerHTML = pend.length ? pend.map(i => { const n = rep(i.asset); return `<tr data-i="${esc(i.id)}" style="cursor:default">
    <td>${fmtH((now - i.startMs) / H)}<div class="mut" style="font-size:11px">${fmtD(i.startMs)}</div></td>
    <td class="wrap">${esc(i.machine)}<div class="mut" style="font-size:11px">${esc(i.route)}</div></td>
    <td>${esc(i.category)}<div>${impactPill(i)}</div></td>
    <td class="wrap">${esc(i.description)}<div class="mut" style="font-size:11px">${esc(i.reportedBy || i.source || "")}</div></td>
    <td>${mediaCount(i)}</td>
    <td class="num">${n > 1 ? `<span class="pill p-w">${n}</span>` : n}</td>
    <td><select data-f="p"><option value="">—</option><option>Alta</option><option>Media</option><option>Baja</option></select></td>
    <td><input data-f="t" list="techsP" placeholder="Técnico" style="width:140px"></td>
    <td><input data-f="s" type="datetime-local" style="width:170px"></td>
    <td><button class="pri" data-f="go">Asignar</button> <button data-f="v">Ver</button></td></tr>`; }).join("") + `<datalist id="techsP">${opts}</datalist>`
    : `<tr><td colspan="10" class="empty">No hay reportes pendientes por priorizar.</td></tr>`;
  $("tPri").querySelectorAll("tr[data-i]").forEach(tr => {
    const id = tr.dataset.i, q = f => tr.querySelector(`[data-f="${f}"]`);
    for (const [f, v] of Object.entries(keep[id] || {})) if (q(f)) q(f).value = v;
    q("v").onclick = () => openInc(id);
    q("go").onclick = async () => {
      const p = q("p").value, t = q("t").value.trim(), s = fromLocalInput(q("s").value);
      if (!p || !t) { const f = !p ? "p" : "t"; q(f).focus(); q(f).style.borderColor = "var(--bad)"; return; }
      q("go").disabled = true;
      try { await api('update', { id, op: 'assign', priority: p, tech: t, scheduledMs: s }); toast(`Asignada a <b>${esc(t)}</b>`); await refresh(true); }
      catch (e) { q("go").disabled = false; toast(esc(e.code === 'net' ? 'Sin conexión. Intenta de nuevo.' : e.message), { alert: true }); }
    };
  });
  const asg = open.filter(i => i.assignedTo).sort((a, b) => (PRI[a.priority] ?? 3) - (PRI[b.priority] ?? 3) || (a.scheduledMs || a.assignedMs) - (b.scheduledMs || b.assignedMs));
  $("tAsg").innerHTML = asg.length ? asg.map(i => `<tr data-i="${esc(i.id)}"><td>${priPill(i.priority)}</td><td>${esc(i.assignedTo)}</td><td>${i.scheduledMs ? (i.scheduledMs < now ? `<span class="pill p-b">${fmtD(i.scheduledMs)}</span>` : fmtD(i.scheduledMs)) : "—"}</td><td class="wrap">${esc(i.machine)}</td><td>${esc(i.category)}</td><td class="num">${fmtH((now - i.startMs) / H)}</td><td class="num">${i.assignedMs ? fmtH((i.assignedMs - i.startMs) / H) : "—"}</td></tr>`).join("") : `<tr><td colspan="7" class="empty">No hay servicios en atención.</td></tr>`;
  $("tAsg").querySelectorAll("tr[data-i]").forEach(t => t.onclick = () => openInc(t.dataset.i));
}
const mediaCount = i => { const m = i.media || [], f = m.filter(x => x.kind === 'photo').length, v = m.length - f; return m.length ? `<span class="pill p-n">${f ? ico('camera', 12) + ' ' + f : ''}${f && v ? ' · ' : ''}${v ? ico('video', 12) + ' ' + v : ''}</span>` : '<span class="mut">—</span>'; };

/* ---------- Novedades ---------- */
function statusPill(s) { return `<span class="pill ${s === "Cerrada" ? "p-ok" : s === "En atención" ? "p-n" : "p-b"}">${s === "Abierta" ? "Reportada" : esc(s)}</span>`; }
function impactPill(i) { return i.impact === "parcial" ? '<span class="pill p-w">Opera con falla</span>' : '<span class="pill p-b">Fuera de servicio</span>'; }
function filteredInc() {
  const p = period(), st = $("fSt").value, c = $("fCat").value, q = $("fQ").value.trim().toLowerCase(), r = routeFilter();
  return S.inc.filter(i => (i.status !== "Cerrada" || (i.startMs < p.b && (i.closedMs || 0) > p.a)) && (!st || i.status === st) && (!c || i.category === c) && (!r || i.route === r) && (!q || [i.machine, i.assignedTo, i.description, i.solution, i.asset, i.reportedBy].join(" ").toLowerCase().includes(q)));
}
function renderInc() {
  const L = filteredInc().sort((a, b) => (a.status === "Cerrada") - (b.status === "Cerrada") || b.startMs - a.startMs);
  $("tInc").innerHTML = L.length ? L.map(i => `<tr data-i="${esc(i.id)}"><td>${statusPill(i.status)}</td><td class="wrap">${esc(i.machine)}</td><td>${esc(i.route)}</td><td>${esc(i.category)}</td><td>${impactPill(i)}</td><td>${fmtD(i.startMs)}</td><td class="num">${fmtH(((i.closedMs || Date.now()) - i.startMs) / H)}</td><td>${esc(i.reportedBy || '')}</td><td>${i.assignedTo ? esc(i.assignedTo) + (i.priority ? " " + priPill(i.priority) : "") : '<span class="pill p-w">Por priorizar</span>'}</td></tr>`).join("") : `<tr><td colspan="9" class="empty">No hay novedades con estos filtros.</td></tr>`;
  $("tInc").querySelectorAll("tr[data-i]").forEach(t => t.onclick = () => openInc(t.dataset.i));
}
$("bExp").onclick = () => {
  const L = filteredInc(), q = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["Máquina", "Activo", "Ruta", "Causa", "Impacto", "Estado", "Inicio", "Cierre", "Horas fuera", "Reportó", "Técnico", "Prioridad", "Descripción", "Solución", "Causa raíz", "Evidencias"];
  const iso = ms => ms ? new Date(ms - new Date(ms).getTimezoneOffset() * 6e4).toISOString().slice(0, 16).replace("T", " ") : "";
  const csv = "﻿" + [head, ...L.map(i => [i.machine, i.asset, i.route, i.category, i.impact === "parcial" ? "Opera con falla" : "Fuera de servicio", i.status, iso(i.startMs), iso(i.closedMs), (((i.closedMs || Date.now()) - i.startMs) / H).toFixed(2).replace('.', ','), i.reportedBy, i.assignedTo, i.priority, i.description, i.solution, i.rootCause, (i.media || []).map(m => 'https://drive.google.com/file/d/' + m.id + '/view').join(' ')])].map(r => r.map(q).join(";")).join("\r\n");
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `novedades_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};

/* ---------- Máquinas ---------- */
const MCOLS = [["name", "Máquina"], ["route", "Ruta"], ["type", "Tipo"], ["st", "Estado"], ["av", "Disponibilidad", 1], ["down", "Tiempo fuera", 1], ["n", "Novedades", 1], ["lc", "Última comunicación"]];
function renderMq() {
  const p = period(), ty = $("fType").value, fs = $("fState").value, q = $("fMq").value.trim().toLowerCase();
  let L = machineStats(p).filter(x => (!ty || x.m.type === ty) && (!q || [x.m.name, x.m.location, x.m.id].join(" ").toLowerCase().includes(q)) && (!fs || (fs === "nocom" ? noCom(x.m) : x.st === fs)));
  const k = S.sort.k, d = S.sort.d;
  const val = x => k === "name" ? x.m.name : k === "route" ? x.m.route : k === "type" ? x.m.type : k === "lc" ? (x.m.lastCommMs || 0) : k === "st" ? x.st : x[k];
  L.sort((a, b) => { const A = val(a), B = val(b); return (typeof A === "string" ? A.localeCompare(B, "es", { numeric: true }) : A - B) * d; });
  $("mh").innerHTML = MCOLS.map(([kk, l, n]) => `<th data-k="${kk}" class="${n ? "num" : ""}">${l}${kk === k ? (d > 0 ? " ▲" : " ▼") : ""}</th>`).join("");
  $("mh").querySelectorAll("th").forEach(th => th.onclick = () => { S.sort = { k: th.dataset.k, d: S.sort.k === th.dataset.k ? -S.sort.d : 1 }; renderMq(); });
  const SP = { down: '<span class="pill p-b">Fuera de servicio</span>', deg: '<span class="pill p-w">Opera con falla</span>', ok: '<span class="pill p-ok">Operativa</span>' };
  $("tMq").innerHTML = L.length ? L.map(x => `<tr data-a="${esc(x.m.id)}"><td class="wrap">${esc(x.m.name)}</td><td>${esc(x.m.route)}</td><td>${esc(x.m.type)}</td><td>${SP[x.st]}</td><td class="num" style="color:var(${x.av >= .98 ? "--ok" : x.av >= .95 ? "--warn" : "--bad"})">${pct(x.av)}</td><td class="num">${x.down ? fmtH(x.down / H) : "—"}</td><td class="num">${x.n || "—"}</td><td>${noCom(x.m) ? '<span class="pill p-w">' + fmtD(x.m.lastCommMs) + "</span>" : fmtD(x.m.lastCommMs)}</td></tr>`).join("") : `<tr><td colspan="8" class="empty">No hay máquinas con estos filtros.</td></tr>`;
  $("tMq").querySelectorAll("tr[data-a]").forEach(t => t.onclick = () => openMachine(t.dataset.a));
  $("mNote").textContent = `${L.length} máquinas. Disponibilidad = 1 − (horas fuera de servicio ÷ horas del periodo). “Opera con falla” se registra pero no descuenta disponibilidad.` + (S.snapMs ? ` Última comunicación según el listado de Parlevel del ${fmtD(S.snapMs)}.` : "");
}

/* ---------- Mis reportes (operador) / Mis servicios (técnico) ---------- */
function icard(i) {
  const now = Date.now();
  return `<div class="icard" data-i="${esc(i.id)}"><div class="top">${statusPill(i.status)} ${impactPill(i)} ${i.priority ? priPill(i.priority) : ''}</div>
    <b>${esc(i.machine)}</b><div class="d">${esc(i.category)} — ${esc(i.description)}</div>
    <div class="d">${ico('clock', 13)} ${fmtD(i.createdMs || i.startMs)} · ${i.status === 'Cerrada' ? 'resuelta en ' + fmtH((i.closedMs - i.startMs) / H) : fmtH((now - i.startMs) / H) + ' fuera'}${i.assignedTo ? ' · Técnico: ' + esc(i.assignedTo) : ''}${i.scheduledMs && i.status !== 'Cerrada' ? ' · Programada: ' + fmtD(i.scheduledMs) : ''}</div></div>`;
}
function bindCards(el) { el.querySelectorAll('[data-i]').forEach(c => c.onclick = () => openInc(c.dataset.i)); }
function renderMine() {
  const el = $('v-mis');
  const L = S.inc.filter(i => i.reportedBy === S.user.name).sort((a, b) => (a.status === 'Cerrada') - (b.status === 'Cerrada') || b.createdMs - a.createdMs);
  el.innerHTML = `<div id="qInfo"></div><div class="bar"><h2 style="margin:0;font-size:18px">Mis reportes</h2><span class="sp"></span><button class="pri ib" onclick="location.hash='#reportar'">${ico('plus', 16)} Nuevo reporte</button></div>
    ${L.length ? `<div class="cards">${L.map(icard).join('')}</div>` : `<div class="card empty">${ico('check', 32)}<div>Aún no has enviado reportes.</div></div>`}`;
  bindCards(el); updateQueueInfo();
}
function renderServ() {
  const el = $('v-servicios'), me = S.user.name;
  const mine = S.inc.filter(i => i.assignedTo === me && i.status !== 'Cerrada').sort((a, b) => (PRI[a.priority] ?? 3) - (PRI[b.priority] ?? 3) || (a.scheduledMs || a.assignedMs) - (b.scheduledMs || b.assignedMs));
  const done = S.inc.filter(i => i.assignedTo === me && i.status === 'Cerrada').sort((a, b) => b.closedMs - a.closedMs).slice(0, 12);
  el.innerHTML = `<div class="bar"><h2 style="margin:0;font-size:18px">Mis servicios</h2><span class="pill p-n">${mine.length} abierto${mine.length === 1 ? '' : 's'}</span></div>
    ${mine.length ? `<div class="cards">${mine.map(icard).join('')}</div>` : `<div class="card empty">${ico('check', 32)}<div>No tienes servicios pendientes.</div></div>`}
    ${done.length ? `<h2 style="margin:20px 0 10px">Cerrados recientemente</h2><div class="cards">${done.map(icard).join('')}</div>` : ''}`;
  bindCards(el);
}

/* ===================== Diálogos ===================== */
const dlg = $("dlg"); $("dX").onclick = () => dlg.close(); dlg.addEventListener("close", () => render());
function openDlg(t, s, html) { $("dT").textContent = t; $("dS").textContent = s || ""; $("dB").innerHTML = html; if (!dlg.open) dlg.showModal(); $("dB").scrollTop = 0; }
function alertBox(t) { const el = document.createElement("div"); el.className = "banner"; el.textContent = t; $("dB").prepend(el); el.scrollIntoView({ block: 'nearest' }); setTimeout(() => el.remove(), 6000); }
function gallery(list) {
  if (!list || !list.length) return '';
  return `<div class="gal">${list.map(m => m.kind === 'video'
    ? `<div class="vid"><iframe src="https://drive.google.com/file/d/${esc(m.id)}/preview" allow="autoplay; fullscreen" loading="lazy" title="Video de evidencia"></iframe></div>`
    : `<a href="https://drive.google.com/file/d/${esc(m.id)}/view" target="_blank" rel="noopener"><img src="https://drive.google.com/thumbnail?id=${esc(m.id)}&sz=w800" loading="lazy" alt="Evidencia" onerror="this.outerHTML='<span class=evf>${ico('camera', 22).replace(/"/g, '&quot;')}Ver foto en Drive</span>'"></a>`).join('')}</div>`;
}
function openMachine(id) {
  const m = S.machines.find(x => x.id === id); if (!m) return;
  const L = S.inc.filter(i => i.asset === id).sort((a, b) => b.startMs - a.startMs);
  const p = period(), span = p.b - p.a, inP = L.filter(i => i.startMs < p.b && (!i.closedMs || i.closedMs > p.a));
  const down = merged(inP.filter(i => i.impact !== "parcial"), p);
  const all = { a: Math.min(...L.map(i => i.startMs), Date.now()), b: Date.now() };
  const downAll = merged(L.filter(i => i.impact !== "parcial"), all);
  const cat = {}; for (const i of L) cat[i.category] = (cat[i.category] || 0) + 1;
  const topCat = Object.entries(cat).sort((a, b) => b[1] - a[1])[0];
  openDlg(m.name, `${m.route} · ${m.location} · ${m.type} · ${m.model}`, `
    <div class="meta">
      <div>Disponibilidad del periodo<b>${pct(1 - down / span)}</b></div>
      <div>Fuera de servicio (periodo)<b>${down ? fmtH(down / H) : "0"}</b></div>
      <div>Fuera de servicio (histórico)<b>${downAll ? fmtH(downAll / H) : "0"}</b></div>
      <div>Novedades (histórico)<b>${L.length}</b></div>
      <div>Causa más frecuente<b>${topCat ? esc(topCat[0]) : "—"}</b></div>
      <div>Último servicio Parlevel<b>${fmtD(m.lastServiceMs)}</b></div>
    </div>
    <div class="act" style="margin:0 0 10px;justify-content:flex-start"><button class="pri" id="mNew">${ico('camera', 16)} Reportar novedad en esta máquina</button></div>
    <h2>Historial de novedades</h2>
    ${L.length ? `<div class="tl">${L.map(i => `<div class="it ${i.status === "Cerrada" ? "cl" : "op"}" data-i="${esc(i.id)}" style="cursor:pointer">
      <div>${statusPill(i.status)} ${impactPill(i)} <b>${esc(i.category)}</b></div>
      <div class="mut" style="font-size:12px">${fmtD(i.startMs)} → ${i.closedMs ? fmtD(i.closedMs) : "sigue abierta"} · ${fmtH(((i.closedMs || Date.now()) - i.startMs) / H)} · Técnico: ${esc(i.assignedTo || "sin asignar")}</div>
      <div>${esc(i.description)}</div>${i.solution ? `<div class="mut">Solución: ${esc(i.solution)}</div>` : ""}</div>`).join("")}</div>` : '<div class="empty">Esta máquina no tiene novedades registradas.</div>'}
    <p class="note">Equipo: ${esc(m.deviceId || "—")} · Activo ${esc(m.asset || m.id)}</p>`);
  $("mNew").onclick = () => { dlg.close(); R.asset = id; location.hash = '#reportar'; render(); };
  $("dB").querySelectorAll(".it[data-i]").forEach(x => x.onclick = () => openInc(x.dataset.i));
}
async function upd(payload, btn) {
  if (btn) btn.disabled = true;
  try { await api('update', payload); dlg.close(); toast('Cambios guardados'); await refresh(true); }
  catch (e) { if (btn) btn.disabled = false; alertBox(e.code === 'net' ? 'Sin conexión. Intenta de nuevo cuando tengas señal.' : e.message); }
}
function openInc(id, st) {
  st = st || { cm: [], vals: null };
  const i = S.inc.find(x => x.id === id);
  if (!i) { toast('No se encontró la novedad (puede que aún se esté cargando).'); refresh(true); return; }
  const dur = ((i.closedMs || Date.now()) - i.startMs) / H, closed = i.status === "Cerrada";
  const act = canAct(i);
  openDlg(i.machine, `${i.route} · ${i.location || ""}`, `
    <div class="meta">
      <div>Estado<b>${statusPill(i.status)}</b></div><div>Impacto<b>${impactPill(i)}</b></div>
      <div>Tiempo ${closed ? "total fuera" : "transcurrido"}<b>${fmtH(dur)}</b></div><div>Causa<b>${esc(i.category)}</b></div>
      <div>Inicio<b>${fmtD(i.startMs)}</b></div><div>Cierre<b>${fmtD(i.closedMs)}</b></div>
      <div>Reportó<b>${esc(i.reportedBy || i.source || "—")}</b></div><div>Técnico<b>${esc(i.assignedTo || "Sin asignar")}</b></div>
      <div>Prioridad<b>${esc(i.priority || "—")}</b></div><div>Programada<b>${fmtD(i.scheduledMs)}</b></div>
    </div>
    <p><b>Novedad:</b> ${esc(i.description)}</p>
    ${(i.media || []).length ? `<h2>Evidencia del reporte</h2>${gallery(i.media)}` : ''}
    ${i.solution ? `<p><b>Solución:</b> ${esc(i.solution)}${i.rootCause ? `<br><b>Causa raíz:</b> ${esc(i.rootCause)}` : ""}</p>` : ""}
    ${(i.closeMedia || []).length ? `<h2>Evidencia de la solución</h2>${gallery(i.closeMedia)}` : ''}
    <h2>Seguimiento</h2><div class="tl">${(i.log || []).slice().reverse().map(l => `<div class="it"><div class="mut" style="font-size:12px">${fmtD(l.ms)} · ${esc(l.by || '')}</div><div>${esc(l.t)}</div></div>`).join("")}</div>
    ${closed ? (isMgr() ? `<div class="act"><button id="iRe">Reabrir</button></div>` : '') : `
    ${isMgr() ? `<form id="fA" class="fg" style="margin-top:8px;border-top:1px solid var(--line);padding-top:14px">
      <label>Prioridad<select name="pri"><option value="">—</option>${["Alta", "Media", "Baja"].map(p => `<option ${p === i.priority ? "selected" : ""}>${p}</option>`).join("")}</select></label>
      <label>Técnico asignado<input name="tech" list="techs2" value="${esc(i.assignedTo)}"><datalist id="techs2">${techList().map(t => `<option value="${esc(t)}">`).join("")}</datalist></label>
      <label>Programada para<input type="datetime-local" name="sch" value="${i.scheduledMs ? toLocalInput(i.scheduledMs) : ""}"></label>
      <label>Nota de seguimiento<input name="note" placeholder="Ej.: se pidió repuesto"></label>
      <div class="full act"><button type="submit">Guardar seguimiento</button></div>
    </form>` : act ? `<form id="fN" class="fg" style="margin-top:8px;border-top:1px solid var(--line);padding-top:14px">
      <label class="full">Nota de seguimiento<input name="note" required placeholder="Ej.: voy en camino, se pidió repuesto…"></label>
      <div class="full act"><button type="submit">Agregar nota</button></div></form>` : ''}
    ${act ? `<form id="fC" class="fg" style="margin-top:14px;border-top:1px solid var(--line);padding-top:14px">
      <h2 class="full" style="margin:0">Cerrar novedad</h2>
      <label>Disponible de nuevo desde<input type="datetime-local" name="end" required value="${toLocalInput(Date.now())}"></label>
      <label>Causa raíz<input name="root" placeholder="Ej.: billetero desgastado"></label>
      <label class="full">Solución aplicada<textarea name="sol" required placeholder="Qué se hizo para dejarla disponible"></textarea></label>
      <div class="full"><div class="ev" id="cEv"></div><button type="button" id="cPhoto" class="ib">${ico('camera', 16)} Foto de la máquina reparada (opcional)</button></div>
      <div class="full act"><button class="pri" type="submit">Cerrar novedad</button></div>
    </form>` : ''}`}`);
  $("fA") && ($("fA").onsubmit = e => {
    e.preventDefault(); const f = new FormData(e.target);
    if (f.get("tech").trim() && !f.get("pri")) { alertBox("Define la prioridad antes de asignar el técnico."); return; }
    upd({ id, op: 'assign', priority: f.get("pri"), tech: f.get("tech").trim(), scheduledMs: fromLocalInput(f.get("sch")), note: f.get("note").trim() }, e.submitter);
  });
  $("fN") && ($("fN").onsubmit = e => { e.preventDefault(); upd({ id, op: 'note', text: new FormData(e.target).get('note') }, e.submitter); });
  $("iRe") && ($("iRe").onclick = e => upd({ id, op: 'reopen' }, e.target));
  if ($("fC")) setupClose(id, i, st);
}
// Cierre de la novedad, con fotos opcionales de la máquina reparada (solo cámara).
function setupClose(id, i, st) {
  const form = $("fC"), cm = st.cm;
  if (st.vals) for (const [k, v] of Object.entries(st.vals)) { const el = form.elements[k]; if (el) el.value = v; }
  $("cEv").innerHTML = cm.map(x => `<div class="evi"><img src="${x.url}" alt=""></div>`).join('');
  if (st.vals) form.scrollIntoView({ block: 'end' });
  $("cPhoto").onclick = async () => {
    if (cm.length >= 3) { toast('Máximo 3 fotos.'); return; }
    const vals = Object.fromEntries(new FormData(form));
    dlg.close();
    const r = await openCamera('photo', i.machine);
    if (r) cm.push(r);
    openInc(id, { cm, vals });
  };
  form.onsubmit = async e => {
    e.preventDefault(); const f = new FormData(form), end = fromLocalInput(f.get("end")), btn = e.submitter || form.querySelector('[type=submit]');
    if (end < i.startMs) { alertBox("La fecha de cierre no puede ser anterior al inicio."); return; }
    if (end > Date.now() + 6e4) { alertBox("La fecha de cierre no puede estar en el futuro."); return; }
    btn.disabled = true;
    try {
      const media = [];
      for (let k = 0; k < cm.length; k++) { btn.textContent = `Subiendo foto ${k + 1} de ${cm.length}…`; const r = await api('upload', { b64: await blobToB64(cm[k].blob), mime: cm[k].mime, kind: 'photo', asset: i.asset }, 240000); media.push({ id: r.id, kind: 'photo' }); }
      btn.textContent = 'Cerrando…';
      await api('update', { id, op: 'close', endMs: end, solution: f.get("sol").trim(), rootCause: f.get("root").trim(), media });
      dlg.close(); toast('Novedad cerrada. La máquina queda disponible.'); await refresh(true);
    } catch (x) { btn.disabled = false; btn.textContent = 'Cerrar novedad'; alertBox(x.code === 'net' ? 'Sin conexión. Intenta de nuevo cuando tengas señal.' : x.message); }
  };
}

/* ===================== Importar máquinas (CSV Parlevel) ===================== */
function parseCSV(t) { const R = []; let r = [], f = "", q = false; for (let k = 0; k < t.length; k++) { const c = t[k]; if (q) { if (c === '"') { if (t[k + 1] === '"') { f += '"'; k++; } else q = false; } else f += c; } else if (c === '"') q = true; else if (c === "," || c === ";") { r.push(f); f = ""; } else if (c === "\n" || c === "\r") { if (c === "\r" && t[k + 1] === "\n") k++; r.push(f); R.push(r); r = []; f = ""; } else f += c; } if (f || r.length) { r.push(f); R.push(r); } return R.filter(x => x.length > 1); }
const tsMs = s => { if (!s) return null; const d = new Date(s.replace(" ", "T")); return isNaN(d) ? null : d.getTime(); };
const safeId = s => String(s).trim().replace(/[^A-Za-z0-9_\-.~:@+]/g, "-").slice(0, 120);
$("bImp").onclick = () => $("fileImp").click();
$("fileImp").onchange = async e => {
  const file = e.target.files[0]; if (!file) return;
  const rows = parseCSV((await file.text()).replace(/^﻿/, '')), h = rows.shift().map(x => x.trim());
  const ix = n => h.indexOf(n);
  e.target.value = "";
  if (ix("Machine") < 0) { openDlg("Archivo no válido", "", "<p>El archivo no tiene la columna “Machine”. Usa la exportación de máquinas de Parlevel.</p>"); return; }
  const ms = rows.map(r => { const g = n => (r[ix(n)] || "").trim(); const asset = g("Asset"); return { id: safeId(asset || ("S" + g("System ID"))), asset, name: g("Machine"), location: g("Location"), type: g("Type"), model: g("Make/Model"), deviceId: g("Device ID"), route: g("Route"), lastCommMs: tsMs(g("Last Communication")), lastServiceMs: tsMs(g("Last Service")) }; }).filter(m => m.name);
  openDlg("Actualizar máquinas", file.name, `<p>Se actualizarán <b>${ms.length}</b> máquinas. Las existentes se actualizan con los datos nuevos; el historial de novedades no se toca.</p><div class="act"><button onclick="dlg.close()">Cancelar</button><button class="pri" id="goImp">Actualizar</button></div>`);
  $("goImp").onclick = async () => {
    $("goImp").disabled = true; $("goImp").textContent = 'Actualizando…';
    try { const j = await api('import', { rows: ms }, 120000); dlg.close(); toast(`${j.count} máquinas actualizadas (${j.total} en total).`); await refresh(true); }
    catch (x) { $("goImp").disabled = false; $("goImp").textContent = 'Actualizar'; alertBox(x.message); }
  };
};

/* ===================== Filtros ===================== */
["per", "fRoute", "fSt", "fCat", "fType", "fState"].forEach(id => $(id).onchange = render);
["fQ", "fMq"].forEach(id => $(id).oninput = render);
CATS.forEach(c => $("fCat").insertAdjacentHTML("beforeend", `<option>${c}</option>`));
function fillFilters() {
  const keep = (sel, vals, first) => { const v = $(sel).value; $(sel).innerHTML = `<option value="">${first}</option>` + vals.map(x => `<option ${x === v ? "selected" : ""}>${esc(x)}</option>`).join(""); };
  keep("fRoute", [...new Set(S.machines.map(m => m.route).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es", { numeric: true })), "Todas las rutas");
  keep("fType", [...new Set(S.machines.map(m => m.type).filter(Boolean))].sort(), "Todos los tipos");
}

/* ===================== Arranque ===================== */
let pollT = null;
function start() {
  $('login').hidden = true; $('app').hidden = false;
  buildNav();
  const c = jparse(localStorage.getItem('mv_cache'));
  if (c && !S.loaded) { applyData(c); S.rev = null; fillFilters(); }
  const m = location.hash.match(/^#inc=(.+)$/);
  if (m) history.replaceState(null, '', '#' + curViewDefault());
  render();
  refresh(true).then(() => { if (m) openInc(decodeURIComponent(m[1])); });
  clearInterval(pollT);
  pollT = setInterval(() => { if (!document.hidden) refresh(); }, POLL_MS);
}
if (S.token && S.user) start(); else showLogin();
