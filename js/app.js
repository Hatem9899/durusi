'use strict';

/* ———————————————————————————————————————————
   دروسي — منطق التطبيق (بلا مكتبات)
   البيانات تُحمَّل مشفّرة من content/data.enc.json
   وتُفك في المتصفح بمفتاح مشتق من رمز الدخول.
   ——————————————————————————————————————————— */

const ENC_URL = 'content/data.enc.json';
const STORE_KEY = 'lessons.key.v1';
const TZ = 'Asia/Riyadh';

const $ = (sel, root = document) => root.querySelector(sel);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ——— أيقونات ——— */
const svg = (body, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${body}</svg>`;
const ICON = {
  back: svg('<path d="M9 5l7 7-7 7"/>'),
  chev: svg('<path d="M15 5l-7 7 7 7"/>'),
  open: svg('<path d="M10 6H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-3"/><path d="M13 5h6v6"/><path d="M19 5l-8 8"/>'),
  logout: svg('<path d="M14 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 8l-4 4 4 4"/><path d="M6 12h9"/>'),
  help: svg('<circle cx="12" cy="12" r="9"/><path d="M9.6 9.3a2.5 2.5 0 1 1 3.6 2.3c-.8.5-1.2 1-1.2 1.9"/><path d="M12 16.8v.2"/>'),
  close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
  eye: svg('<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="2.8"/>'),
  eyeOff: svg('<path d="M4 4l16 16"/><path d="M9.9 5.8A9 9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.8 3.5M6.2 7.3A16 16 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 3.6-.8"/><path d="M9.9 10a2.8 2.8 0 0 0 4 4"/>'),
  bulb: svg('<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2.2h5c.1-1 .5-1.7 1.1-2.2A6 6 0 0 0 12 3z"/>'),
  // أنواع البطاقات
  opener: svg('<path d="M12 3.5l2.2 5.1 5.5.5-4.2 3.6 1.3 5.4L12 15.2l-4.8 2.9 1.3-5.4-4.2-3.6 5.5-.5z"/>'),
  test: svg('<rect x="5" y="4.5" width="14" height="16" rx="2.5"/><path d="M9 3.5h6v3H9z"/><path d="M8.8 13l2.2 2.2 4.2-4.4"/>'),
  review: svg('<path d="M4.5 12a7.5 7.5 0 0 1 12.8-5.3L19.5 9"/><path d="M19.5 4.5V9H15"/><path d="M19.5 12a7.5 7.5 0 0 1-12.8 5.3L4.5 15"/><path d="M4.5 19.5V15H9"/>'),
  game: svg('<rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="8.8" cy="8.8" r=".6" fill="currentColor"/><circle cx="15.2" cy="8.8" r=".6" fill="currentColor"/><circle cx="12" cy="12" r=".6" fill="currentColor"/><circle cx="8.8" cy="15.2" r=".6" fill="currentColor"/><circle cx="15.2" cy="15.2" r=".6" fill="currentColor"/>'),
  lesson: svg('<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5z"/><path d="M5 20.5A2.5 2.5 0 0 0 7.5 21H19v-3"/>'),
  full: svg('<path d="M12 3.5l8.5 4.5-8.5 4.5L3.5 8z"/><path d="M3.5 12l8.5 4.5 8.5-4.5"/><path d="M3.5 16l8.5 4.5 8.5-4.5"/>'),
  // مواد
  math: svg('<path d="M12 5v14M5 12h14"/>'),
  book: svg('<path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5z"/><path d="M5 20.5A2.5 2.5 0 0 0 7.5 21H19v-3"/>'),
};

const KIND = { opener: 'تهيئة', lesson: 'درس', test: 'اختبار', review: 'مراجعة', game: 'لعبة' };

/* ——— رسومات المساعدة ——— */
const ART = {
  share: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="6" y="40" width="52" height="16" rx="8" opacity=".25"/>
    <circle cx="32" cy="48" r="13" fill="currentColor" stroke="none" opacity=".14"/>
    <path d="M26 24v-2a3 3 0 0 1 3-3h0M38 19h0a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H26a3 3 0 0 1-3-3V22a3 3 0 0 1 3-3" transform="translate(0 8)"/>
    <path d="M32 34V10M25 16l7-7 7 7"/>
  </svg>`,
  add: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="5" y="8" width="54" height="12" rx="6" opacity=".2"/>
    <rect x="5" y="26" width="54" height="14" rx="7" fill="currentColor" stroke="none" opacity=".14"/>
    <rect x="5" y="46" width="54" height="12" rx="6" opacity=".2"/>
    <rect x="10" y="27.5" width="11" height="11" rx="3"/>
    <path d="M15.5 30.5v5M13 33h5"/>
    <path d="M28 33h24" opacity=".7"/>
  </svg>`,
  home: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="8" y="8" width="20" height="20" rx="6" opacity=".2"/>
    <rect x="8" y="36" width="20" height="20" rx="6" opacity=".2"/>
    <rect x="36" y="36" width="20" height="20" rx="6" opacity=".2"/>
    <rect x="36" y="8" width="20" height="20" rx="6" fill="currentColor" stroke="none"/>
    <path d="M46 13v10M41 18h10" stroke="#fff"/>
  </svg>`,
};

/* ——— التشفير ——— */
const b64d = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64e = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));

// يجب أن تطابق الدالة نفسها في scripts/encrypt.mjs
function normalizePasscode(s) {
  return s
    .normalize('NFKC')
    .trim()
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
}

async function fetchEnvelope() {
  const res = await fetch(ENC_URL, { cache: 'no-store' });
  if (!res.ok) throw new Error('network');
  return res.json();
}

async function keyFromPasscode(passcode, env) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(passcode), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: b64d(env.salt), iterations: env.iter },
    base,
    { name: 'AES-GCM', length: 256 },
    true,
    ['decrypt'],
  );
}

async function decryptWith(key, env) {
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(env.iv) }, key, b64d(env.ct));
  return JSON.parse(new TextDecoder().decode(plain));
}

const store = {
  get() { try { return JSON.parse(localStorage.getItem(STORE_KEY)); } catch { return null; } },
  set(v) { try { localStorage.setItem(STORE_KEY, JSON.stringify(v)); } catch { /* وضع خاص */ } },
  clear() { try { localStorage.removeItem(STORE_KEY); } catch { /* تجاهل */ } },
};

/* ——— الحالة ——— */
let DATA = null;
let clockTimer = null;

const loginEl = $('#login');
const appEl = $('#app');
const form = $('#login-form');
const passInput = $('#passcode');
const msgEl = $('#login-msg');
const loginBtn = $('#login-btn');
const fieldEl = passInput.closest('.field');
const toggleBtn = $('#toggle-pass');

/* ——— الدخول ——— */
function showLogin(message = '') {
  stopClock();
  DATA = null;
  appEl.hidden = true;
  appEl.innerHTML = '';
  loginEl.hidden = false;
  passInput.value = '';
  msgEl.textContent = message;
  document.title = 'دروسي';
}

function setBusy(on) {
  loginBtn.disabled = on;
  loginBtn.classList.toggle('is-busy', on);
}

function wrong(message) {
  msgEl.textContent = message;
  fieldEl.classList.remove('is-wrong');
  void fieldEl.offsetWidth;
  fieldEl.classList.add('is-wrong');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const passcode = normalizePasscode(passInput.value);
  if (!passcode) return wrong('اكتبي رمز الدخول أولاً.');
  if (!window.crypto?.subtle) return wrong('هذا المتصفح لا يدعم فتح الموقع. جرّبي Safari محدّثاً.');

  setBusy(true);
  msgEl.textContent = '';
  fieldEl.classList.remove('is-wrong');

  let env;
  try {
    env = await fetchEnvelope();
  } catch {
    setBusy(false);
    return wrong('تعذّر الاتصال. تأكدي من الإنترنت ثم حاولي مرة أخرى.');
  }

  try {
    const key = await keyFromPasscode(passcode, env);
    const data = await decryptWith(key, env);
    if ($('#remember').checked) {
      store.set({ salt: env.salt, key: b64e(await crypto.subtle.exportKey('raw', key)) });
    } else {
      store.clear();
    }
    enter(data);
  } catch {
    wrong('رمز الدخول غير صحيح. تأكدي منه وحاولي مرة أخرى.');
    passInput.select();
  } finally {
    setBusy(false);
  }
});

passInput.addEventListener('input', () => {
  fieldEl.classList.remove('is-wrong');
  msgEl.textContent = '';
});

toggleBtn.innerHTML = ICON.eye;
toggleBtn.addEventListener('click', () => {
  const show = passInput.type === 'password';
  passInput.type = show ? 'text' : 'password';
  toggleBtn.innerHTML = show ? ICON.eyeOff : ICON.eye;
  toggleBtn.setAttribute('aria-pressed', String(show));
  toggleBtn.setAttribute('aria-label', show ? 'إخفاء الرمز' : 'إظهار الرمز');
});

function logout() {
  store.clear();
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  showLogin();
}

function enter(data) {
  DATA = data;
  loginEl.hidden = true;
  appEl.hidden = false;
  route();
}

/* ——— الوقت والتاريخ ——— */
const fmtTime = new Intl.DateTimeFormat('ar-SA-u-nu-arab', { timeZone: TZ, hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true });
const fmtHour = new Intl.DateTimeFormat('en-US-u-nu-latn', { timeZone: TZ, hour: 'numeric', hourCycle: 'h23' });
const fmtHijri = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-arab', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const fmtGreg = new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-arab', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' });

function greetingFor(hour) {
  if (hour >= 4 && hour < 12) return { hello: 'صباح الخير', line: 'يومٌ مبارك، وحصصٌ مليئة بالنشاط والبهجة.' };
  if (hour >= 12 && hour < 17) return { hello: 'مساء الخير', line: 'بارك الله في جهدكِ وعطائكِ اليوم.' };
  return { hello: 'مساء الخير', line: 'وقتٌ هادئ لتحضير درس الغد على مهل.' };
}

function tick() {
  const now = new Date();
  const timeEl = $('#clock-time');
  if (!timeEl) return stopClock();

  const parts = fmtTime.formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t)?.value ?? '';
  timeEl.textContent = `${get('hour')}:${get('minute')}:${get('second')}`;
  $('#clock-period').textContent = get('dayPeriod');

  const hour = Number(fmtHour.format(now)) % 24;
  const g = greetingFor(hour);
  const hello = `${g.hello} يا ${DATA.teacher.greetingName || DATA.teacher.name}`;
  const greetEl = $('#greeting');
  if (greetEl.textContent !== hello) {
    greetEl.textContent = hello;
    $('#greeting-line').textContent = g.line;
  }

  const hijri = fmtHijri.format(now);
  const hijriEl = $('#date-hijri');
  if (hijriEl.textContent !== hijri) {
    hijriEl.textContent = hijri;
    $('#date-greg').textContent = `الموافق ${fmtGreg.format(now)} م`;
  }
}

function startClock() {
  stopClock();
  tick();
  const loop = () => {
    clockTimer = setTimeout(() => { tick(); loop(); }, 1000 - (Date.now() % 1000) + 5);
  };
  loop();
}
function stopClock() {
  clearTimeout(clockTimer);
  clockTimer = null;
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && $('#clock-time')) startClock();
});

/* ——— الصفحات ——— */
function renderHome() {
  const t = DATA.teacher;
  document.title = 'دروسي';
  appEl.innerHTML = `
    <div class="screen">
      <header class="topbar">
        <button type="button" class="pill-btn" id="logout-btn">${ICON.logout}<span>تسجيل خروج</span></button>
        <button type="button" class="icon-btn" id="help-btn" aria-label="طريقة إضافة الموقع إلى الشاشة الرئيسية">${ICON.help}</button>
      </header>

      <section class="identity">
        <img src="moe-logo.png" alt="وزارة التعليم" width="807" height="613">
        <h1>${esc(t.name)}</h1>
        <p>${esc(t.school)}</p>
      </section>

      <section class="today" aria-label="اليوم">
        <h2 class="greeting" id="greeting"></h2>
        <p class="greeting-line" id="greeting-line"></p>
        <div class="clock" role="timer" aria-label="الساعة الآن بتوقيت الرياض">
          <span class="clock-time" id="clock-time"></span>
          <span class="clock-period" id="clock-period"></span>
        </div>
        <div class="dates">
          <span class="date-hijri" id="date-hijri"></span>
          <span class="date-greg" id="date-greg"></span>
        </div>
      </section>

      <section>
        <h2 class="section-title">المواد الدراسية</h2>
        <div class="subjects">
          ${DATA.subjects.map((s) => `
            <a class="subject-card" href="#/s/${encodeURIComponent(s.id)}">
              <span class="subject-mark">${ICON[s.icon] || ICON.book}</span>
              <span class="subject-text">
                <strong>${esc(s.title)}</strong>
                <span>(${esc(s.grade)})</span>
              </span>
              <span class="chev">${ICON.chev}</span>
            </a>`).join('')}
        </div>
      </section>

      ${isStandalone() ? '' : `<button type="button" class="pill-btn foot-link" id="help-link">طريقة إضافة الموقع إلى الشاشة الرئيسية</button>`}
    </div>`;

  $('#logout-btn').addEventListener('click', logout);
  $('#help-btn').addEventListener('click', openHelp);
  $('#help-link')?.addEventListener('click', openHelp);
  startClock();
}

function lessonNumber(title) {
  const m = /الدرس\s+([٠-٩0-9]+)/.exec(title);
  return m ? m[1] : null;
}

function itemHtml(item, { full = false, index = 0 } = {}) {
  const type = full ? 'full' : (KIND[item.type] ? item.type : 'lesson');
  const num = type === 'lesson' ? lessonNumber(item.title) : null;
  const mark = num ? esc(num) : ICON[type];
  const hasLink = /^https:\/\//.test(item.link || '');
  const meta = full
    ? `<span>كل دروس الفصل في عرض واحد</span>`
    : `<span class="lesson-kind">${KIND[type]}</span>${item.pages ? `<span>ص ${esc(item.pages)}</span>` : ''}`;
  const inner = `
    <span class="lesson-mark">${mark}</span>
    <span class="lesson-text">
      <span class="lesson-title">${esc(item.title)}</span>
      <span class="lesson-meta">${meta}</span>
    </span>
    ${hasLink ? `<span class="lesson-open">${ICON.open}</span>` : `<span class="lesson-soon">قريباً</span>`}`;
  const cls = full ? 'full-file' : 'lesson';
  const attrs = `class="${cls}${hasLink ? '' : ' is-empty'}" data-type="${type}"`;
  const el = hasLink
    ? `<a ${attrs} href="${esc(item.link)}" target="_blank" rel="noopener noreferrer">${inner}</a>`
    : `<button type="button" ${attrs} data-empty>${inner}</button>`;
  return full ? el : `<li style="--i:${index}">${el}</li>`;
}

function renderSubject(subject) {
  document.title = `${subject.title} — دروسي`;
  appEl.innerHTML = `
    <div class="screen">
      <header class="topbar subject-bar">
        <a class="pill-btn back-btn" href="#/">${ICON.back}<span>الرئيسية</span></a>
      </header>

      ${(subject.chapters || []).map((ch, ci) => `
        <section class="chapter">
          <div class="chapter-head">
            <span class="subject-name">${esc(subject.title)}</span>
            <h1><span class="grade">${esc(subject.grade)}</span> <span class="dash" aria-hidden="true">—</span> ${esc(ch.title)}</h1>
          </div>
          ${ci === 0 ? `
          <aside class="tip">
            ${ICON.bulb}
            <p>إذا انفتح الملف كمعاينة، اضغطي ⋮ ثم (فتح في) ثم PowerPoint ليشتغل مع الحركات والأصوات</p>
          </aside>` : ''}
          <ol class="lessons">
            ${(ch.lessons || []).map((l, i) => itemHtml(l, { index: i })).join('')}
          </ol>
          ${ch.fullFile ? itemHtml(ch.fullFile, { full: true }) : ''}
        </section>`).join('')}
    </div>`;
  window.scrollTo(0, 0);
}

appEl.addEventListener('click', (e) => {
  if (e.target.closest('[data-empty]')) toast('لم يُضَف ملف هذا الدرس بعد.');
});

function route() {
  if (!DATA) return;
  stopClock();
  const m = /^#\/s\/([^/]+)/.exec(location.hash);
  const subject = m && DATA.subjects.find((s) => s.id === decodeURIComponent(m[1]));
  if (subject) renderSubject(subject);
  else renderHome();
}
window.addEventListener('hashchange', route);

/* ——— مساعدة وتنبيهات ——— */
function isStandalone() {
  return window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;
}

const helpEl = $('#help');
helpEl.querySelectorAll('[data-art]').forEach((el) => { el.innerHTML = ART[el.dataset.art]; });
helpEl.querySelector('.icon-btn').innerHTML = ICON.close;
helpEl.addEventListener('click', (e) => {
  if (e.target === helpEl || e.target.closest('[data-close]')) helpEl.close();
});
function openHelp() {
  if (typeof helpEl.showModal === 'function') helpEl.showModal();
  else helpEl.setAttribute('open', '');
}

let toastTimer;
function toast(text) {
  const el = $('#toast');
  el.textContent = text;
  el.classList.add('is-on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('is-on'), 2600);
}

/* ——— البداية ——— */
(async function boot() {
  const saved = store.get();
  if (saved?.key && window.crypto?.subtle) {
    try {
      const env = await fetchEnvelope();
      if (env.salt !== saved.salt) throw new Error('changed');
      const key = await crypto.subtle.importKey('raw', b64d(saved.key), 'AES-GCM', true, ['decrypt']);
      return enter(await decryptWith(key, env));
    } catch (err) {
      if (err?.message === 'network' || err instanceof TypeError) {
        return showLogin('تعذّر الاتصال. تأكدي من الإنترنت ثم حاولي مرة أخرى.');
      }
      store.clear();
      return showLogin('تغيّر رمز الدخول. أدخلي الرمز الجديد.');
    }
  }
  showLogin();
})();
