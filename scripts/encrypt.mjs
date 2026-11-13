// يشفّر content/data.json إلى content/data.enc.json
// AES-256-GCM بمفتاح مشتق من رمز الدخول عبر PBKDF2-SHA256.
// الرمز لا يُكتب في أي ملف: يُطلب في الطرفية، أو يُقرأ من المتغيّر LESSONS_PASSCODE.

import { readFile, writeFile } from 'node:fs/promises';
import { webcrypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const { subtle } = webcrypto;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(root, 'content', 'data.json');
const OUT = path.join(root, 'content', 'data.enc.json');
const ITERATIONS = 600_000;

// يجب أن تطابق الدالة نفسها في js/app.js
function normalizePasscode(s) {
  return s
    .normalize('NFKC')
    .trim()
    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d))
    .replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
}

const b64 = (buf) => Buffer.from(buf).toString('base64');
const unb64 = (s) => new Uint8Array(Buffer.from(s, 'base64'));

async function deriveKey(passcode, salt, iterations) {
  const base = await subtle.importKey('raw', new TextEncoder().encode(passcode), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

function askHidden(question) {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    if (!stdin.isTTY) return reject(new Error('لا توجد طرفية تفاعلية. استخدم المتغيّر LESSONS_PASSCODE.'));
    stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');
    let value = '';
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === '\r' || ch === '\n') {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', onData);
          stdout.write('\n');
          return resolve(value);
        }
        if (ch === '\u0003') { stdout.write('\n'); process.exit(1); }
        if (ch === '\u007f' || ch === '\b') { value = value.slice(0, -1); continue; }
        value += ch;
      }
    };
    stdin.on('data', onData);
  });
}

function validate(data) {
  const problems = [];
  let total = 0, missing = 0;
  if (!data.teacher?.name) problems.push('teacher.name مفقود');
  if (!Array.isArray(data.subjects) || !data.subjects.length) problems.push('لا توجد مواد في subjects');
  const ids = new Set();
  for (const s of data.subjects ?? []) {
    if (!s.id || !s.title) problems.push('مادة بلا id أو title');
    if (ids.has(s.id)) problems.push(`معرّف مادة مكرر: ${s.id}`);
    ids.add(s.id);
    for (const c of s.chapters ?? []) {
      if (!c.title) problems.push(`فصل بلا عنوان في ${s.title}`);
      const items = [...(c.lessons ?? []), ...(c.fullFile ? [c.fullFile] : [])];
      for (const l of items) {
        total++;
        if (!l.title) problems.push(`درس بلا عنوان في ${c.title}`);
        if (!l.link) missing++;
        else if (!/^https:\/\//.test(l.link)) problems.push(`رابط لا يبدأ بـ https:// في «${l.title}»`);
      }
    }
  }
  return { problems, total, missing };
}

async function main() {
  let raw;
  try {
    raw = await readFile(SRC, 'utf8');
  } catch {
    console.error('✗ لم أجد content/data.json — انسخ content/data.example.json إليه ثم عدّله.');
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(raw.replace(/^﻿/, ''));
  } catch (e) {
    console.error('✗ ملف data.json فيه خطأ في الصياغة (JSON):\n  ' + e.message);
    process.exit(1);
  }

  const { problems, total, missing } = validate(data);
  if (problems.length) {
    console.error('✗ مشاكل في البيانات:\n' + problems.map((p) => '  - ' + p).join('\n'));
    process.exit(1);
  }

  let passcode = process.env.LESSONS_PASSCODE;
  if (!passcode) {
    passcode = await askHidden('رمز الدخول (لن يظهر أثناء الكتابة): ');
    const again = await askHidden('أعد كتابة الرمز للتأكيد: ');
    if (passcode !== again) {
      console.error('✗ الرمزان غير متطابقين.');
      process.exit(1);
    }
  }
  passcode = normalizePasscode(passcode);
  if (!passcode) {
    console.error('✗ الرمز فارغ.');
    process.exit(1);
  }
  if (passcode.length < 8) {
    console.warn('! تنبيه: الرمز قصير. الملف المشفّر علني، فالرمز الأطول (٨ خانات فأكثر) أصعب في التخمين.');
  }

  // إن كان الرمز نفسه مستخدماً سابقاً نُبقي الـ salt كما هو،
  // حتى لا تضطر الأجهزة التي فعّلت «تذكّريني» إلى إدخال الرمز من جديد.
  let salt = webcrypto.getRandomValues(new Uint8Array(16));
  let reused = false;
  try {
    const prev = JSON.parse(await readFile(OUT, 'utf8'));
    if (prev.iter === ITERATIONS) {
      const prevSalt = unb64(prev.salt);
      const prevKey = await deriveKey(passcode, prevSalt, prev.iter);
      await subtle.decrypt({ name: 'AES-GCM', iv: unb64(prev.iv) }, prevKey, unb64(prev.ct));
      salt = prevSalt;
      reused = true;
    }
  } catch {
    // لا يوجد ملف سابق أو الرمز تغيّر: salt جديد
  }

  const iv = webcrypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passcode, salt, ITERATIONS);
  const plaintext = new TextEncoder().encode(JSON.stringify(data));
  const ct = await subtle.encrypt({ name: 'AES-GCM', iv }, key, plaintext);

  const out = { v: 1, kdf: 'PBKDF2-SHA256', iter: ITERATIONS, cipher: 'AES-256-GCM', salt: b64(salt), iv: b64(iv), ct: b64(ct) };
  await writeFile(OUT, JSON.stringify(out) + '\n');

  console.log('✓ تم التشفير: content/data.enc.json');
  console.log(`  عدد الملفات: ${total} — بلا رابط حتى الآن: ${missing}`);
  console.log(reused ? '  الرمز لم يتغيّر: الأجهزة المحفوظة ستبقى مسجّلة.' : '  رمز جديد: سيُطلب الرمز مرة واحدة على كل جهاز.');
}

main().catch((e) => {
  console.error('✗ ' + e.message);
  process.exit(1);
});
