/* Mi Entreno — todo se guarda localmente en este dispositivo (localStorage). */
'use strict';

// ---------------------------------------------------------------- Estado
const KEY = 'mientreno.v1';
const defaults = () => ({
  logs: {},          // "YYYY-MM-DD|dayId" -> { date, dayId, ex: { exId: [ {kg, reps, sec, done} ] } }
  cardio: [],        // { id, date, presetId, name, seconds, full }
  weights: [],       // { date, kg, waist }
  goalKg: null,
  custom: { name: 'Personalizado', desc: 'Tu propio intervalo.', warmup: 180, cooldown: 120, sets: 1, rounds: 10, work: 40, rest: 20, setRest: 60, moves: ['Trabajo'] },
  settings: { sound: true, voice: true, vibrate: true },
});
let S = load();
function load() {
  try { return Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY)) || {}); }
  catch { return defaults(); }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch { toast('No se pudo guardar (almacenamiento lleno)'); }
}

// ---------------------------------------------------------------- Utilidades
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const num = (v) => { const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };
const fmtNum = (n, d = 1) => n == null ? '–' : (Math.round(n * 10 ** d) / 10 ** d).toLocaleString('es-CL');
const mmss = (s) => { s = Math.max(0, Math.ceil(s)); return `${Math.floor(s / 60)}:${pad(s % 60)}`; };
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const fmtDate = (s) => { const d = parseYmd(s); return `${d.getDate()} ${MESES[d.getMonth()]}`; };
const fmtDateLong = (d) => `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2200);
}

// ---------------------------------------------------------------- Sonido / voz / vibración
let actx = null;
function audio() {
  if (!actx) { try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch { actx = null; } }
  if (actx && actx.state === 'suspended') actx.resume();
  return actx;
}
function beep(freq = 880, ms = 150, vol = 0.25) {
  if (!S.settings.sound) return;
  const a = audio(); if (!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, a.currentTime);
  g.gain.exponentialRampToValueAtTime(vol, a.currentTime + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + ms / 1000);
  o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + ms / 1000 + 0.02);
}
function speak(text) {
  if (!S.settings.voice || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'es-CL'; u.rate = 1.05;
    const v = speechSynthesis.getVoices().find((x) => x.lang && x.lang.toLowerCase().startsWith('es'));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch {}
}
function vibrate(p) { if (S.settings.vibrate && navigator.vibrate) navigator.vibrate(p); }

let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch {}
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && T.running) keepAwake(true);
});

// ---------------------------------------------------------------- Navegación
const TITLES = { hoy: 'Hoy', cardio: 'Cardio', progreso: 'Progreso', peso: 'Peso', mas: 'Rutina' };
let tab = 'hoy';
const ui = { day: null, open: new Set(), exSel: null, metric: 'max' };

function go(t) {
  tab = t;
  $$('.tabbar button').forEach((b) => b.classList.toggle('active', b.dataset.tab === t));
  $('#viewTitle').textContent = TITLES[t];
  document.body.className = '';
  ({ hoy: renderHoy, cardio: renderCardio, progreso: renderProgreso, peso: renderPeso, mas: renderMas })[t]();
  window.scrollTo(0, 0);
  updateTopDate();
}
$$('.tabbar button').forEach((b) => b.addEventListener('click', () => go(b.dataset.tab)));

function updateTopDate() {
  const el = $('#topDate');
  if (T.phases && tab !== 'cardio') { el.textContent = `⏱ ${mmss(T.remaining())} · ${phaseLabel(T.cur())}`; el.style.color = 'var(--accent)'; }
  else { const d = new Date(); el.textContent = `${d.getDate()} ${MESES[d.getMonth()]}`; el.style.color = ''; }
}

// ---------------------------------------------------------------- Datos de rutina
const dayById = (id) => ROUTINE.find((d) => d.id === id);
function defaultDayId() {
  const wd = new Date().getDay(); // 0 dom
  return wd >= 1 && wd <= 5 ? ROUTINE[wd - 1].id : null;
}
const logKey = (date, dayId) => `${date}|${dayId}`;
function getLog(date, dayId, create) {
  const k = logKey(date, dayId);
  if (!S.logs[k] && create) S.logs[k] = { date, dayId, ex: {} };
  return S.logs[k];
}
function setsDone(log) {
  if (!log) return 0;
  return Object.values(log.ex).reduce((a, arr) => a + arr.filter((s) => s.done).length, 0);
}
// Historial por ejercicio: [{date, sets:[done sets]}] ordenado por fecha asc
function exHistory(exId, excludeKey) {
  const out = [];
  for (const [k, log] of Object.entries(S.logs)) {
    if (k === excludeKey) continue;
    const sets = (log.ex[exId] || []).filter((s) => s.done);
    if (sets.length) out.push({ date: log.date, sets });
  }
  return out.sort((a, b) => a.date.localeCompare(b.date));
}
function lastPerf(exId, excludeKey) {
  const h = exHistory(exId, excludeKey); return h.length ? h[h.length - 1] : null;
}
function fmtSet(type, s) {
  if (type === 'time') return `${s.sec ?? '–'} s`;
  if (type === 'bw') return `${s.reps ?? '–'}`;
  return `${fmtNum(s.kg)} kg × ${s.reps ?? '–'}`;
}
function maxKg(sets) { return Math.max(...sets.map((s) => s.kg ?? 0)); }

// ---------------------------------------------------------------- HOY
function renderHoy() {
  if (ui.day === null) ui.day = defaultDayId();
  const today = ymd();
  const d = new Date();
  const v = $('#view');
  const week = weekStrip();
  const chips = ROUTINE.map((r) => `<button class="chip ${ui.day === r.id ? 'on' : ''}" data-day="${r.id}">${r.name}</button>`).join('');

  if (!ui.day) {
    v.innerHTML = `${week}
      <div class="daypick">${chips}</div>
      <div class="card"><h2>Hoy es ${DIAS[d.getDay()]}: descanso 🧘</h2>
      <p>${d.getDay() === 6 ? 'Sábado: sal a caminar 30–60 min o haz una sesión liviana de movilidad.' : 'Domingo: descanso total. Recupera para la semana.'}</p>
      <p class="small muted">¿Te saltaste un día? Elige cualquier día arriba para hacerlo hoy.</p></div>`;
    bindDayChips(); return;
  }

  const day = dayById(ui.day);
  const preset = CARDIO_PRESETS[day.cardio];
  const cardioToday = S.cardio.filter((c) => c.date === today);
  const key = logKey(today, day.id);
  const log = getLog(today, day.id, false);
  const total = day.items.reduce((a, it) => a + it.sets, 0);
  const done = setsDone(log);

  // abre por defecto el primer ejercicio sin terminar
  if (ui.open.size === 0) {
    const first = day.items.find((it) => ((log?.ex[it.ex]) || []).filter((s) => s.done).length < it.sets);
    if (first) ui.open.add(first.ex);
  }

  v.innerHTML = `${week}
    <div class="daypick">${chips}</div>
    <div class="card">
      <div class="row between"><h2>${esc(day.title)}</h2><span class="badge">${esc(day.name)}</span></div>
      <p>${esc(day.focus)}</p>
    </div>

    <div class="card">
      <div class="row between"><h3>1 · Cardio 30 min</h3>${cardioToday.length ? '<span class="badge done">✓ Hecho</span>' : ''}</div>
      <p><b>${esc(preset.name)}</b> — ${esc(preset.desc)}</p>
      <div class="row" style="margin-top:10px">
        <button class="btn primary grow" id="startCardio">▶ Iniciar timer</button>
        ${cardioToday.length ? '' : '<button class="btn" id="markCardio">Marcar hecho</button>'}
      </div>
    </div>

    <div class="card">
      <div class="row between"><h3>2 · Fuerza</h3><span class="badge ${done >= total ? 'done' : ''} tnum">${done}/${total} series</span></div>
      <p class="small">${esc(day.format)}</p>
      <div id="exList">${day.items.map((it, i) => exBlock(it, i, log, key)).join('')}</div>
    </div>
    <p class="small muted" style="text-align:center">Se guarda solo mientras escribes. Toca ✓ al terminar cada serie para iniciar el descanso.</p>`;

  bindDayChips();
  $('#startCardio').onclick = () => { selectPreset(day.cardio); go('cardio'); };
  const mc = $('#markCardio');
  if (mc) mc.onclick = () => {
    S.cardio.push({ id: uid(), date: today, presetId: day.cardio, name: preset.name, seconds: totalOf(preset), full: true, manual: true });
    save(); toast('Cardio registrado'); renderHoy();
  };
  bindExList(day, key);
}

function bindDayChips() {
  $$('[data-day]').forEach((b) => b.onclick = () => { ui.day = b.dataset.day; ui.open.clear(); renderHoy(); });
}

function weekStrip() {
  const now = new Date();
  const mon = new Date(now); mon.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const letters = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  let html = '<div class="card"><div class="week">';
  for (let i = 0; i < 7; i++) {
    const dt = new Date(mon); dt.setDate(mon.getDate() + i);
    const ds = ymd(dt);
    const c = S.cardio.some((x) => x.date === ds);
    const f = Object.values(S.logs).some((l) => l.date === ds && setsDone(l) > 0);
    html += `<div class="d ${ds === ymd(now) ? 'today' : ''}"><b>${letters[i]}</b><span class="small muted">${dt.getDate()}</span>
      <div class="dots">${c ? '<i class="dot c" title="Cardio"></i>' : ''}${f ? '<i class="dot f" title="Fuerza"></i>' : ''}</div></div>`;
  }
  return html + '</div><div class="row small muted" style="margin-top:8px;gap:14px"><span><i class="dot c" style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--accent)"></i> Cardio</span><span><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--rest)"></i> Fuerza</span></div></div>';
}

function exBlock(it, i, log, key) {
  const ex = EXERCISES[it.ex];
  const sets = (log?.ex[it.ex]) || [];
  const nDone = sets.filter((s) => s.done).length;
  const open = ui.open.has(it.ex);
  const last = lastPerf(it.ex, key);
  const single = ex.type !== 'kg';
  const lastTxt = last ? `Última vez (${fmtDate(last.date)}): ${last.sets.map((s) => fmtSet(ex.type, s)).join(' · ')}` : 'Primera vez: elige un peso cómodo y anótalo.';
  const rows = [];
  for (let s = 0; s < it.sets; s++) {
    const cur = sets[s] || {};
    const ph = last?.sets[s] || last?.sets[last.sets.length - 1] || {};
    rows.push(setRow(ex.type, s, cur, ph));
  }
  const unit = ex.type === 'time' ? 'Segundos' : 'Reps';
  return `<div class="ex" data-ex="${it.ex}" data-rest="${it.rest}">
    <button class="ex-head" data-toggle>
      <span class="ex-num ${nDone >= it.sets ? 'ok' : ''}">${nDone >= it.sets ? '✓' : i + 1}</span>
      <span class="grow"><span class="ex-title">${esc(ex.name)}</span><br>
      <span class="ex-meta">${it.sets} × ${esc(it.reps)}${it.rest ? ` · descanso ${it.rest} s` : ''} · <span class="tnum" data-count>${nDone}/${it.sets}</span></span></span>
      <span class="muted">${open ? '▴' : '▾'}</span>
    </button>
    <div class="ex-body ${open ? '' : 'hidden'}">
      <div class="ex-tip">${esc(ex.tip)}</div>
      <div class="last">${esc(lastTxt)}</div>
      <div class="set-labels ${single ? 'single' : ''}"><span>#</span>${single ? `<span>${unit}</span>` : '<span>Kg</span><span>Reps</span>'}<span></span></div>
      <div class="sets">${rows.join('')}</div>
    </div>
  </div>`;
}

function setRow(type, s, cur, ph) {
  const ok = cur.done ? 'ok' : '';
  if (type === 'kg') {
    return `<div class="set ${ok}" data-set="${s}"><span class="n">${s + 1}</span>
      <input inputmode="decimal" data-f="kg" value="${cur.kg ?? ''}" placeholder="${ph.kg ?? 'kg'}" aria-label="Kg serie ${s + 1}">
      <input inputmode="numeric" data-f="reps" value="${cur.reps ?? ''}" placeholder="${ph.reps ?? 'reps'}" aria-label="Reps serie ${s + 1}">
      <button class="chk" data-chk aria-label="Serie hecha">✓</button></div>`;
  }
  const f = type === 'time' ? 'sec' : 'reps';
  return `<div class="set single ${ok}" data-set="${s}"><span class="n">${s + 1}</span>
    <input inputmode="numeric" data-f="${f}" value="${cur[f] ?? ''}" placeholder="${ph[f] ?? (f === 'sec' ? 'seg' : 'reps')}" aria-label="Serie ${s + 1}">
    <button class="chk" data-chk aria-label="Serie hecha">✓</button></div>`;
}

function bindExList(day, key) {
  const today = ymd();
  $$('#exList .ex').forEach((el) => {
    const exId = el.dataset.ex;
    const it = day.items.find((x) => x.ex === exId);
    const ex = EXERCISES[exId];
    $('[data-toggle]', el).onclick = () => {
      ui.open.has(exId) ? ui.open.delete(exId) : ui.open.add(exId);
      if (!ui.open.size) ui.open.add('__none__');
      $('.ex-body', el).classList.toggle('hidden');
      $('[data-toggle] > .muted', el).textContent = $('.ex-body', el).classList.contains('hidden') ? '▾' : '▴';
    };
    const getSet = (i) => {
      const log = getLog(today, day.id, true);
      log.ex[exId] = log.ex[exId] || [];
      while (log.ex[exId].length <= i) log.ex[exId].push({});
      return log.ex[exId][i];
    };
    $$('.set', el).forEach((row) => {
      const i = +row.dataset.set;
      $$('input', row).forEach((inp) => inp.addEventListener('input', () => {
        getSet(i)[inp.dataset.f] = num(inp.value); save();
      }));
      $('[data-chk]', row).onclick = () => {
        const st = getSet(i);
        // si está vacío usa lo de la última vez (placeholder)
        $$('input', row).forEach((inp) => {
          if (inp.value === '' && num(inp.placeholder) != null) { inp.value = inp.placeholder; st[inp.dataset.f] = num(inp.placeholder); }
        });
        st.done = !st.done;
        if (st.done && ex.type === 'kg' && st.kg != null) {
          const prev = exHistory(exId, logKey(today, day.id));
          if (prev.length && st.kg > Math.max(...prev.map((p) => maxKg(p.sets)))) toast(`🏆 ¡Récord de peso en ${ex.name}!`);
        }
        save();
        row.classList.toggle('ok', st.done);
        refreshExHeader(el, day, exId, it);
        if (st.done) {
          vibrate(30);
          const isLastOfCircuit = day.id === 'jueves';
          if (it.rest > 0) startRest(it.rest);
          else if (isLastOfCircuit) {/* circuito: sin descanso hasta el final */}
        }
      };
    });
  });
}

function refreshExHeader(el, day, exId, it) {
  const log = getLog(ymd(), day.id, false);
  const n = ((log?.ex[exId]) || []).filter((s) => s.done).length;
  const numEl = $('.ex-num', el);
  numEl.classList.toggle('ok', n >= it.sets);
  numEl.textContent = n >= it.sets ? '✓' : day.items.indexOf(it) + 1;
  $('[data-count]', el).textContent = `${n}/${it.sets}`;
  const total = day.items.reduce((a, x) => a + x.sets, 0);
  const done = setsDone(log);
  $$('#view .badge.tnum').forEach((b) => { b.textContent = `${done}/${total} series`; b.classList.toggle('done', done >= total); });
  if (done >= total && total > 0) toast('💪 ¡Rutina de fuerza completa!');
}

// ---------------------------------------------------------------- Descanso entre series
const R = { end: 0, total: 0, iv: null };
function startRest(sec) {
  R.total = sec; R.end = Date.now() + sec * 1000;
  $('#restBar').classList.remove('hidden');
  clearInterval(R.iv); R.iv = setInterval(tickRest, 250); tickRest();
}
function tickRest() {
  const rem = (R.end - Date.now()) / 1000;
  if (rem <= 0) { stopRest(); beep(1046, 350); vibrate([200, 100, 200]); toast('¡A la siguiente serie!'); return; }
  $('#restText').textContent = `Descanso ${mmss(rem)}`;
  $('#restFill').style.width = `${(rem / R.total) * 100}%`;
}
function stopRest() { clearInterval(R.iv); $('#restBar').classList.add('hidden'); }
$('#restSkip').onclick = stopRest;
$('#restAdd').onclick = () => { R.end += 15000; R.total += 15; tickRest(); };

// ---------------------------------------------------------------- INTERVAL TIMER
let selPreset = null;
function presetById(id) { return id === 'custom' ? S.custom : CARDIO_PRESETS[id]; }
function selectPreset(id) { if (!T.phases) selPreset = id; }
function totalOf(p) { return buildPhases(p).reduce((a, x) => a + x.dur, 0); }

function buildPhases(p) {
  const ph = [];
  const moves = p.moves && p.moves.length ? p.moves : ['Trabajo'];
  if (p.warmup > 0) ph.push({ type: 'warmup', dur: p.warmup, move: 'Marcha suave, círculos de brazos y cadera' });
  let k = 0;
  for (let s = 0; s < p.sets; s++) {
    for (let r = 0; r < p.rounds; r++) {
      const move = p.movePerSet ? moves[s % moves.length] : moves[k % moves.length];
      ph.push({ type: 'work', dur: p.work, move, set: s + 1, round: r + 1 });
      k++;
      const lastRound = r === p.rounds - 1, lastSet = s === p.sets - 1;
      if (!lastRound && p.rest > 0) ph.push({ type: 'rest', dur: p.rest, set: s + 1, round: r + 1 });
      else if (lastRound && !lastSet) {
        if (p.setRest > 0) ph.push({ type: 'setrest', dur: p.setRest, set: s + 1 });
        else if (p.rest > 0) ph.push({ type: 'rest', dur: p.rest, set: s + 1, round: r + 1 });
      }
    }
  }
  if (p.cooldown > 0) ph.push({ type: 'cooldown', dur: p.cooldown, move: 'Camina suave y respira profundo' });
  return ph;
}
const PHASE_NAME = { warmup: 'Calentamiento', work: 'Trabajo', rest: 'Descanso', setrest: 'Pausa larga', cooldown: 'Vuelta a la calma' };
const phaseLabel = (p) => p ? PHASE_NAME[p.type] : '';

const T = {
  phases: null, idx: 0, end: 0, pausedRem: null, running: false, iv: null, preset: null, lastBeep: null, presetId: null, startDate: null,
  cur() { return this.phases ? this.phases[this.idx] : null; },
  remaining() {
    if (!this.phases) return 0;
    return this.pausedRem != null ? this.pausedRem : Math.max(0, (this.end - Date.now()) / 1000);
  },
  elapsed() {
    if (!this.phases) return 0;
    let e = 0; for (let i = 0; i < this.idx; i++) e += this.phases[i].dur;
    return e + (this.cur().dur - this.remaining());
  },
};

function startTimer() {
  audio(); // desbloquea audio con el toque
  if ('speechSynthesis' in window) speechSynthesis.getVoices();
  const p = presetById(selPreset);
  T.phases = buildPhases(p); T.preset = p; T.presetId = selPreset; T.idx = 0; T.pausedRem = null; T.startDate = ymd();
  T.running = true; T.end = Date.now() + T.phases[0].dur * 1000;
  onPhaseStart();
  clearInterval(T.iv); T.iv = setInterval(tick, 200);
  keepAwake(true);
  renderCardio();
}
function tick() {
  if (!T.running) return;
  let rem = (T.end - Date.now()) / 1000;
  while (rem <= 0) {
    if (T.idx >= T.phases.length - 1) { finishTimer(true); return; }
    T.idx++; T.end += T.phases[T.idx].dur * 1000; rem = (T.end - Date.now()) / 1000;
    onPhaseStart();
  }
  const sec = Math.ceil(rem);
  if (sec <= 3 && sec >= 1 && T.lastBeep !== `${T.idx}-${sec}`) { T.lastBeep = `${T.idx}-${sec}`; beep(660, 120); }
  updateTimerUI();
}
function onPhaseStart() {
  const p = T.cur(); const next = T.phases[T.idx + 1];
  if (p.type === 'work') { beep(1046, 400, 0.3); vibrate([250]); speak(p.move); }
  else if (p.type === 'rest' || p.type === 'setrest') {
    beep(523, 400, 0.3); vibrate([120, 80, 120]);
    speak(p.type === 'setrest' ? `Pausa larga. Sigue ${next?.move || ''}` : `Descanso. Sigue ${next?.move || ''}`);
  } else if (p.type === 'warmup') speak('Calentamiento');
  else if (p.type === 'cooldown') { beep(784, 500); speak('Muy bien. Vuelta a la calma'); }
  updateTimerUI();
}
function pauseTimer() {
  if (!T.phases) return;
  if (T.running) { T.pausedRem = T.remaining(); T.running = false; keepAwake(false); }
  else { audio(); T.end = Date.now() + T.pausedRem * 1000; T.pausedRem = null; T.running = true; keepAwake(true); }
  updateTimerUI();
}
function skipPhase(dir) {
  if (!T.phases) return;
  const ni = T.idx + dir;
  if (ni < 0) { jumpTo(0); return; }
  if (ni >= T.phases.length) { finishTimer(true); return; }
  jumpTo(ni);
}
function jumpTo(i) {
  T.idx = i; const d = T.phases[i].dur;
  if (T.running) T.end = Date.now() + d * 1000; else T.pausedRem = d;
  onPhaseStart();
}
function finishTimer(completed) {
  const secs = Math.round(T.elapsed());
  const p = T.preset, id = T.presetId, date = T.startDate;
  clearInterval(T.iv); T.phases = null; T.running = false; T.pausedRem = null;
  keepAwake(false);
  if (completed || secs >= 300) {
    S.cardio.push({ id: uid(), date, presetId: id, name: p.name, seconds: completed ? totalOf(p) : secs, full: !!completed });
    save();
  }
  if (completed) { beep(1046, 200); setTimeout(() => beep(1318, 200), 220); setTimeout(() => beep(1568, 500), 440); vibrate([300, 100, 300]); speak('¡Cardio terminado! Ahora a la fuerza'); }
  T.justDone = completed ? { name: p.name, secs: totalOf(p) } : (secs >= 300 ? { name: p.name, secs, partial: true } : null);
  if (tab === 'cardio') renderCardio(); else updateTopDate();
}

function renderCardio() {
  const v = $('#view');
  if (!selPreset) selPreset = (dayById(defaultDayId() || '') || ROUTINE[0]).cardio;
  if (T.phases) {
    v.innerHTML = `
      <div class="timer-wrap">
        <div class="ring">
          <svg viewBox="0 0 120 120"><circle class="bg" cx="60" cy="60" r="52"/><circle class="fg" id="ringFg" cx="60" cy="60" r="52" stroke-dasharray="326.73" stroke-dashoffset="0"/></svg>
          <div class="ring-center"><div class="ring-phase" id="tPhase"></div><div class="ring-time" id="tTime"></div><div class="ring-move" id="tMove"></div></div>
        </div>
        <div class="timer-stats">
          <div><b id="tRound">–</b><span>Ronda</span></div>
          <div><b id="tElapsed">0:00</b><span>Transcurrido</span></div>
          <div><b id="tLeft">0:00</b><span>Restante</span></div>
        </div>
        <div class="timer-ctrl">
          <button class="btn" id="tPrev">⏮</button>
          <button class="btn primary" id="tPause">⏸ Pausa</button>
          <button class="btn" id="tNext">⏭</button>
        </div>
        <div class="next-up" id="tNextUp"></div>
        <button class="btn block danger" id="tStop" style="margin-top:14px">Terminar</button>
        <p class="small muted" style="text-align:center">${esc(T.preset.name)} · La pantalla se mantiene encendida mientras corre el timer.</p>
      </div>`;
    $('#tPause').onclick = pauseTimer;
    $('#tPrev').onclick = () => skipPhase(-1);
    $('#tNext').onclick = () => skipPhase(1);
    $('#tStop').onclick = () => {
      const e = T.elapsed();
      if (confirm(e >= 300 ? `¿Terminar? Se guardarán ${Math.round(e / 60)} min de cardio.` : '¿Terminar el timer? (menos de 5 min no se guarda)')) finishTimer(false);
    };
    updateTimerUI(); return;
  }

  const all = { ...CARDIO_PRESETS, custom: S.custom };
  const todayPreset = dayById(defaultDayId() || '')?.cardio;
  const done = T.justDone; T.justDone = null;
  const c = S.custom;
  v.innerHTML = `
    ${done ? `<div class="card done-banner"><div class="big">🔥</div><h2>${done.partial ? 'Cardio guardado' : '¡Cardio completo!'}</h2><p>${esc(done.name)} · ${Math.round(done.secs / 60)} min</p><button class="btn primary" id="toStrength">Ir a la fuerza →</button></div>` : ''}
    <div class="card">
      <div class="row between"><h2>${esc(presetById(selPreset).name)}</h2><span class="badge tnum">${mmss(totalOf(presetById(selPreset)))}</span></div>
      <p>${esc(presetById(selPreset).desc)}</p>
      <button class="btn primary block" id="tStart" style="margin-top:8px">▶ Comenzar</button>
    </div>
    <div class="presets">
      ${Object.entries(all).map(([id, p]) => {
        const day = ROUTINE.find((r) => r.cardio === id);
        return `<button class="preset ${id === selPreset ? 'sel' : ''}" data-preset="${id}">
          <div class="row between"><b>${esc(p.name)}</b><span class="small muted tnum">${mmss(totalOf(p))}</span></div>
          <span class="small muted">${day ? day.name + (id === todayPreset ? ' · hoy' : '') : 'Configurable'} · ${p.sets > 1 ? p.sets + ' × ' : ''}${p.rounds} rondas ${p.work}/${p.rest} s</span>
        </button>`;
      }).join('')}
    </div>
    <div class="card ${selPreset === 'custom' ? '' : 'hidden'}" id="customCard" style="margin-top:12px">
      <h3>Timer personalizado</h3>
      <div class="form-grid">
        ${field('Calentamiento (min)', 'warmup', c.warmup / 60)}
        ${field('Vuelta a la calma (min)', 'cooldown', c.cooldown / 60)}
        ${field('Trabajo (s)', 'work', c.work)}
        ${field('Descanso (s)', 'rest', c.rest)}
        ${field('Rondas por serie', 'rounds', c.rounds)}
        ${field('Series', 'sets', c.sets)}
        ${field('Pausa entre series (s)', 'setRest', c.setRest)}
      </div>
    </div>
    <div class="card" style="margin-top:12px">
      <h3>Cómo funciona</h3>
      <p class="small">Pitidos en los últimos 3 segundos de cada fase, pitido agudo al empezar el trabajo y grave al descansar. La voz dice el ejercicio que toca. Si sales de la app el tiempo sigue corriendo, pero el sonido puede pausarse: mejor deja la app abierta.</p>
    </div>`;
  $('#tStart').onclick = startTimer;
  const ts = $('#toStrength'); if (ts) ts.onclick = () => go('hoy');
  $$('[data-preset]').forEach((b) => b.onclick = () => { selPreset = b.dataset.preset; renderCardio(); });
  $$('#customCard input').forEach((inp) => inp.addEventListener('change', () => {
    let val = Math.max(0, num(inp.value) ?? 0);
    const k = inp.dataset.k;
    if (k === 'warmup' || k === 'cooldown') val = Math.round(val * 60);
    if (k === 'rounds' || k === 'sets') val = Math.max(1, Math.round(val));
    if (k === 'work') val = Math.max(5, Math.round(val));
    S.custom[k] = val; save(); renderCardio();
  }));
}
function field(label, k, val) {
  return `<label class="field">${label}<input inputmode="decimal" data-k="${k}" value="${fmtNum(val, 1).replace(/\./g, '')}"></label>`;
}

function updateTimerUI() {
  updateTopDate();
  if (tab !== 'cardio' || !T.phases || !$('#tTime')) return;
  const p = T.cur(); const rem = T.remaining();
  document.body.className = `phase-${p.type}`;
  $('#tPhase').textContent = T.running ? PHASE_NAME[p.type] : 'En pausa';
  $('#tTime').textContent = mmss(rem);
  $('#tMove').textContent = p.type === 'rest' || p.type === 'setrest' ? `Sigue: ${T.phases[T.idx + 1]?.move || ''}` : (p.move || '');
  $('#ringFg').setAttribute('stroke-dashoffset', String(326.73 * (1 - rem / p.dur)));
  const workTotal = T.phases.filter((x) => x.type === 'work').length;
  const workDone = T.phases.slice(0, T.idx + 1).filter((x) => x.type === 'work').length;
  $('#tRound').textContent = workDone ? `${workDone}/${workTotal}` : '–';
  const total = T.phases.reduce((a, x) => a + x.dur, 0);
  $('#tElapsed').textContent = mmss(T.elapsed());
  $('#tLeft').textContent = mmss(total - T.elapsed());
  $('#tPause').textContent = T.running ? '⏸ Pausa' : '▶ Seguir';
  const nx = T.phases[T.idx + 1];
  $('#tNextUp').textContent = nx ? `Después: ${PHASE_NAME[nx.type]}${nx.move && nx.type === 'work' ? ' · ' + nx.move : ''} (${nx.dur} s)` : 'Última fase';
}

// ---------------------------------------------------------------- Gráfico (una serie)
function lineChart(el, pts, { unit = '', goal = null, decimals = 1 } = {}) {
  if (!pts.length) { el.innerHTML = '<div class="empty">Aún no hay datos. ¡Registra tu primera sesión!</div>'; return; }
  const W = Math.max(260, Math.round(el.clientWidth || 320)), H = 200, m = { l: 40, r: 12, t: 14, b: 26 };
  const xs = pts.map((p) => parseYmd(p.date).getTime());
  let x0 = Math.min(...xs), x1 = Math.max(...xs);
  if (x0 === x1) { x0 -= 864e5 * 3; x1 += 864e5 * 3; }
  const ysAll = pts.map((p) => p.y).concat(goal != null ? [goal] : []);
  let y0 = Math.min(...ysAll), y1 = Math.max(...ysAll);
  const span = y1 - y0 || Math.max(1, Math.abs(y1) * 0.1);
  y0 -= span * 0.15; y1 += span * 0.15;
  if (Math.min(...ysAll) >= 0 && y0 < 0) y0 = 0;
  const X = (t) => m.l + ((t - x0) / (x1 - x0)) * (W - m.l - m.r);
  const Y = (v) => H - m.b - ((v - y0) / (y1 - y0)) * (H - m.t - m.b);
  const ticks = [0, 1, 2, 3].map((i) => y0 + ((y1 - y0) * i) / 3);
  const path = pts.map((p, i) => `${i ? 'L' : 'M'}${X(xs[i]).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
  const xl = pts.length === 1 ? [0] : [0, pts.length - 1];
  el.innerHTML = `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de progreso">
    <g class="grid">${ticks.map((t) => `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(t)}" y2="${Y(t)}"/>`).join('')}</g>
    <g class="axis">${ticks.map((t) => `<text x="${m.l - 6}" y="${Y(t) + 4}" text-anchor="end">${fmtNum(t, Math.abs(y1 - y0) < 10 ? 1 : 0)}</text>`).join('')}
      ${xl.map((i) => `<text x="${X(xs[i])}" y="${H - 6}" text-anchor="${pts.length === 1 ? 'middle' : i === 0 ? 'start' : 'end'}">${fmtDate(pts[i].date)}</text>`).join('')}</g>
    ${goal != null ? `<line class="goal" x1="${m.l}" x2="${W - m.r}" y1="${Y(goal)}" y2="${Y(goal)}"/><text class="goal-label" x="${W - m.r}" y="${Y(goal) - 5}" text-anchor="end">Meta ${fmtNum(goal)} ${unit}</text>` : ''}
    <path class="series" d="${path}"/>
    ${pts.map((p, i) => `<circle class="pt" cx="${X(xs[i])}" cy="${Y(p.y)}" r="5"/>`).join('')}
    <line class="cross hidden" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}"/>
  </svg><div class="tip hidden"></div></div>`;
  const box = $('.chart', el), svg = $('svg', el), tip = $('.tip', el), cross = $('.cross', el);
  const show = (clientX) => {
    const r = svg.getBoundingClientRect();
    const vx = ((clientX - r.left) / r.width) * W;
    let bi = 0, bd = Infinity;
    xs.forEach((x, i) => { const d = Math.abs(X(x) - vx); if (d < bd) { bd = d; bi = i; } });
    const px = (X(xs[bi]) / W) * r.width;
    cross.setAttribute('x1', X(xs[bi])); cross.setAttribute('x2', X(xs[bi])); cross.classList.remove('hidden');
    tip.classList.remove('hidden');
    tip.style.left = `${Math.min(Math.max(px, 50), r.width - 50)}px`; tip.style.top = `${Y(pts[bi].y)}px`;
    tip.textContent = `${fmtDate(pts[bi].date)} · ${pts[bi].label ?? fmtNum(pts[bi].y, decimals) + ' ' + unit}`;
  };
  const hide = () => { tip.classList.add('hidden'); cross.classList.add('hidden'); };
  box.addEventListener('pointermove', (e) => show(e.clientX));
  box.addEventListener('pointerdown', (e) => show(e.clientX));
  box.addEventListener('pointerleave', hide);
}

// ---------------------------------------------------------------- PROGRESO
function renderProgreso() {
  const v = $('#view');
  const now = new Date(); const month = ymd(now).slice(0, 7);
  const strengthDays = new Set(Object.values(S.logs).filter((l) => l.date.startsWith(month) && setsDone(l) > 0).map((l) => l.date));
  const cardioMin = Math.round(S.cardio.filter((c) => c.date.startsWith(month)).reduce((a, c) => a + c.seconds, 0) / 60);
  const allDays = new Set([...Object.values(S.logs).filter((l) => setsDone(l) > 0).map((l) => l.date), ...S.cardio.map((c) => c.date)]);

  // lista de ejercicios agrupados por día (sin repetir)
  const seen = new Set();
  const groups = ROUTINE.map((d) => {
    const opts = d.items.filter((it) => !seen.has(it.ex) && seen.add(it.ex)).map((it) => `<option value="${it.ex}" ${ui.exSel === it.ex ? 'selected' : ''}>${esc(EXERCISES[it.ex].name)}${exHistory(it.ex).length ? '' : ' (sin datos)'}</option>`);
    return opts.length ? `<optgroup label="${d.name} · ${esc(d.title)}">${opts.join('')}</optgroup>` : '';
  }).join('');
  if (!ui.exSel) {
    // por defecto el ejercicio con más datos
    let best = ROUTINE[0].items[0].ex, bn = -1;
    seen.forEach((id) => { const n = exHistory(id).length; if (n > bn) { bn = n; best = id; } });
    ui.exSel = best;
  }

  v.innerHTML = `
    <div class="stats3">
      <div class="stat"><b>${strengthDays.size}</b><span>días de fuerza este mes</span></div>
      <div class="stat"><b>${cardioMin}</b><span>min de cardio este mes</span></div>
      <div class="stat"><b>${allDays.size}</b><span>días entrenados en total</span></div>
    </div>
    <div class="card">
      <h3>Progreso por ejercicio</h3>
      <select class="big" id="exSel">${groups}</select>
      <div class="row wrap" id="metricChips" style="margin:10px 0"></div>
      <div id="exChart"></div>
      <div id="exTable" style="margin-top:8px"></div>
    </div>
    <div class="card">
      <h3>Historial de cardio</h3>
      <div id="cardioHist"></div>
    </div>`;
  $('#exSel').value = ui.exSel;
  $('#exSel').onchange = (e) => { ui.exSel = e.target.value; ui.metric = 'max'; renderExProgress(); };
  renderExProgress();

  const ch = S.cardio.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);
  $('#cardioHist').innerHTML = ch.length ? `<table class="hist"><tr><th>Fecha</th><th>Sesión</th><th class="r">Min</th><th></th></tr>
    ${ch.map((c) => `<tr><td>${fmtDate(c.date)}</td><td>${esc(c.name)}${c.full ? '' : ' <span class="muted small">(parcial)</span>'}</td><td class="r">${Math.round(c.seconds / 60)}</td><td class="r"><button class="del" data-delc="${c.id}" aria-label="Borrar">×</button></td></tr>`).join('')}</table>`
    : '<div class="empty">Sin sesiones de cardio todavía.</div>';
  $$('[data-delc]').forEach((b) => b.onclick = () => {
    if (!confirm('¿Borrar esta sesión de cardio?')) return;
    S.cardio = S.cardio.filter((c) => c.id !== b.dataset.delc); save(); renderProgreso();
  });
}

function renderExProgress() {
  const id = ui.exSel, ex = EXERCISES[id];
  const h = exHistory(id);
  const metrics = ex.type === 'kg' ? [['max', 'Peso máx.'], ['vol', 'Volumen'], ['reps', 'Reps totales']]
    : ex.type === 'time' ? [['max', 'Mejor tiempo'], ['tot', 'Tiempo total']] : [['max', 'Mejor serie'], ['tot', 'Reps totales']];
  if (!metrics.find((m) => m[0] === ui.metric)) ui.metric = 'max';
  $('#metricChips').innerHTML = metrics.map(([k, l]) => `<button class="chip ${ui.metric === k ? 'on' : ''}" data-m="${k}">${l}</button>`).join('');
  $$('[data-m]').forEach((b) => b.onclick = () => { ui.metric = b.dataset.m; renderExProgress(); });

  const f = ex.type === 'time' ? 'sec' : 'reps';
  const pts = h.map((s) => {
    let y, label;
    if (ex.type === 'kg') {
      if (ui.metric === 'max') { y = maxKg(s.sets); const top = s.sets.filter((x) => (x.kg ?? 0) === y); label = `${fmtNum(y)} kg × ${Math.max(...top.map((x) => x.reps ?? 0))}`; }
      else if (ui.metric === 'vol') { y = s.sets.reduce((a, x) => a + (x.kg ?? 0) * (x.reps ?? 0), 0); label = `${fmtNum(y, 0)} kg movidos`; }
      else { y = s.sets.reduce((a, x) => a + (x.reps ?? 0), 0); label = `${y} reps`; }
    } else {
      y = ui.metric === 'max' ? Math.max(...s.sets.map((x) => x[f] ?? 0)) : s.sets.reduce((a, x) => a + (x[f] ?? 0), 0);
      label = `${y} ${ex.type === 'time' ? 's' : 'reps'}`;
    }
    return { date: s.date, y, label };
  });
  const unit = ex.type === 'kg' ? (ui.metric === 'reps' ? 'reps' : 'kg') : ex.type === 'time' ? 's' : 'reps';
  lineChart($('#exChart'), pts, { unit, decimals: ex.type === 'kg' && ui.metric === 'max' ? 1 : 0 });

  $('#exTable').innerHTML = h.length ? `<table class="hist"><tr><th>Fecha</th><th>Series</th></tr>
    ${h.slice().reverse().slice(0, 15).map((s) => `<tr><td>${fmtDate(s.date)}</td><td class="small">${s.sets.map((x) => fmtSet(ex.type, x)).join(' · ')}</td></tr>`).join('')}</table>` : '';
}

// ---------------------------------------------------------------- PESO
function renderPeso() {
  const v = $('#view');
  const w = S.weights.slice().sort((a, b) => a.date.localeCompare(b.date));
  const last = w[w.length - 1], first = w[0];
  const diff = last && first ? last.kg - first.kg : null;
  const toGoal = last && S.goalKg != null ? last.kg - S.goalKg : null;
  v.innerHTML = `
    <div class="card">
      <h3>Registrar</h3>
      <div class="form-grid">
        <label class="field">Fecha<input type="date" id="wDate" value="${ymd()}"></label>
        <label class="field">Peso (kg)<input inputmode="decimal" id="wKg" placeholder="${last ? fmtNum(last.kg) : 'ej. 82,5'}"></label>
        <label class="field">Cintura (cm, opcional)<input inputmode="decimal" id="wWaist" placeholder="${last?.waist ? fmtNum(last.waist) : 'ej. 92'}"></label>
        <label class="field">Meta (kg)<input inputmode="decimal" id="wGoal" value="${S.goalKg != null ? fmtNum(S.goalKg) : ''}" placeholder="opcional"></label>
      </div>
      <button class="btn primary block" id="wSave" style="margin-top:10px">Guardar</button>
    </div>
    <div class="stats3">
      <div class="stat"><b>${last ? fmtNum(last.kg) : '–'}</b><span>kg actual</span></div>
      <div class="stat"><b>${diff != null ? (diff > 0 ? '+' : '') + fmtNum(diff) : '–'}</b><span>kg desde el inicio</span></div>
      <div class="stat"><b>${toGoal != null ? (toGoal > 0 ? fmtNum(toGoal) : '✓') : '–'}</b><span>${toGoal != null && toGoal <= 0 ? '¡meta lograda!' : 'kg para la meta'}</span></div>
    </div>
    <div class="card"><h3>Peso corporal</h3><div id="wChart"></div></div>
    ${w.some((x) => x.waist) ? '<div class="card"><h3>Cintura</h3><div id="waistChart"></div></div>' : ''}
    <div class="card"><h3>Registros</h3><div id="wList"></div>
    <p class="small muted">Consejo: pésate en ayunas, después de ir al baño, 2–3 veces por semana. Fíjate en la tendencia de varias semanas.</p></div>`;

  lineChart($('#wChart'), w.map((x) => ({ date: x.date, y: x.kg })), { unit: 'kg', goal: S.goalKg });
  if ($('#waistChart')) lineChart($('#waistChart'), w.filter((x) => x.waist).map((x) => ({ date: x.date, y: x.waist })), { unit: 'cm' });
  $('#wList').innerHTML = w.length ? `<table class="hist"><tr><th>Fecha</th><th class="r">Kg</th><th class="r">Cintura</th><th></th></tr>
    ${w.slice().reverse().map((x) => `<tr><td>${fmtDate(x.date)}</td><td class="r">${fmtNum(x.kg)}</td><td class="r">${x.waist ? fmtNum(x.waist) : '–'}</td><td class="r"><button class="del" data-delw="${x.date}" aria-label="Borrar">×</button></td></tr>`).join('')}</table>`
    : '<div class="empty">Registra tu peso de hoy para empezar.</div>';

  $('#wSave').onclick = () => {
    const date = $('#wDate').value || ymd(), kg = num($('#wKg').value), waist = num($('#wWaist').value), goal = num($('#wGoal').value);
    S.goalKg = goal;
    if (kg != null) {
      if (kg < 25 || kg > 350) { toast('Revisa el peso ingresado'); return; }
      S.weights = S.weights.filter((x) => x.date !== date);
      S.weights.push({ date, kg, waist });
      toast('Peso guardado');
    } else toast(goal != null ? 'Meta guardada' : 'Ingresa tu peso');
    save(); renderPeso();
  };
  $$('[data-delw]').forEach((b) => b.onclick = () => {
    if (!confirm('¿Borrar este registro?')) return;
    S.weights = S.weights.filter((x) => x.date !== b.dataset.delw); save(); renderPeso();
  });
}

// ---------------------------------------------------------------- RUTINA / AJUSTES
function renderMas() {
  const v = $('#view');
  v.innerHTML = `
    <div class="card">
      <h2>Tu semana</h2>
      <p>5 días · 30 min de cardio por intervalos + ~30 min de fuerza. Enfoque: bajar grasa manteniendo y ganando algo de músculo.</p>
      <p class="small muted">Equipo: set de mancuernas ajustables 20 kg (con barra), colchoneta y tabla de flexiones.</p>
    </div>
    ${ROUTINE.map((d) => `<details class="guide">
      <summary>${d.name} · ${esc(d.title)}</summary>
      <p class="small" style="margin:8px 0 4px"><b>Cardio:</b> ${esc(CARDIO_PRESETS[d.cardio].name)} — ${esc(CARDIO_PRESETS[d.cardio].desc)}</p>
      <p class="small muted" style="margin:4px 0">${esc(d.format)}</p>
      <ul>${d.items.map((it) => `<li><b>${esc(EXERCISES[it.ex].name)}</b> — ${it.sets} × ${esc(it.reps)}<br><span class="small muted">${esc(EXERCISES[it.ex].tip)}</span></li>`).join('')}</ul>
    </details>`).join('')}
    <h3 style="margin:18px 4px 8px">Guía</h3>
    ${GUIDE.map((g) => `<details class="guide"><summary>${esc(g.t)}</summary><ul>${g.p.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></details>`).join('')}

    <h3 style="margin:18px 4px 8px">Ajustes</h3>
    <div class="card">
      ${toggle('sound', 'Sonidos del timer')}
      ${toggle('voice', 'Voz que anuncia el ejercicio')}
      ${toggle('vibrate', 'Vibración')}
    </div>
    <div class="card stack">
      <h3>Respaldo de datos</h3>
      <p class="small">Tus datos viven solo en este teléfono y navegador. Exporta un respaldo de vez en cuando (o antes de cambiar de teléfono).</p>
      <button class="btn block" id="exp">⬇ Exportar respaldo</button>
      <label class="btn block" style="text-align:center">⬆ Importar respaldo<input type="file" id="imp" accept="application/json,.json" hidden></label>
      <button class="btn block danger" id="reset">Borrar todos los datos</button>
    </div>
    <p class="small muted" style="text-align:center">Mi Entreno · funciona sin internet una vez instalada</p>`;
  $$('[data-set-k]').forEach((inp) => inp.onchange = () => { S.settings[inp.dataset.setK] = inp.checked; save(); if (inp.checked && inp.dataset.setK === 'sound') beep(); });
  $('#exp').onclick = () => {
    const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `mi-entreno-respaldo-${ymd()}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  $('#imp').onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const data = JSON.parse(await file.text());
      if (!data || typeof data !== 'object' || !('logs' in data)) throw new Error();
      if (!confirm('Esto reemplazará los datos actuales por los del respaldo. ¿Continuar?')) return;
      S = Object.assign(defaults(), data); save(); toast('Respaldo importado'); renderMas();
    } catch { toast('Archivo no válido'); }
  };
  $('#reset').onclick = () => {
    if (confirm('¿Borrar TODO (sesiones, cardio y peso)? No se puede deshacer.') && confirm('¿Seguro? Te recomiendo exportar un respaldo antes.')) {
      S = defaults(); save(); toast('Datos borrados'); renderMas();
    }
  };
}
function toggle(k, label) {
  return `<label class="toggle"><span>${label}</span><span class="switch"><input type="checkbox" data-set-k="${k}" ${S.settings[k] ? 'checked' : ''}><span></span></span></label>`;
}

// ---------------------------------------------------------------- Inicio
setInterval(() => { if (T.phases && tab !== 'cardio') updateTopDate(); }, 1000);
go('hoy');
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
