/* ===================== وضعیت و ذخیره‌سازی ===================== */
const KEY_SEEN = 'cw-seen';
const KEY_POS  = 'cw-pos';
let seen = safeGet(KEY_SEEN, {});
let pos  = safeGet(KEY_POS, {l:0, s:0});
let quizStat = {ok:0, total:0};

function safeGet(k, d){ try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch(e){ return d; } }
function safeSet(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }

const FA = n => n.toLocaleString('fa-IR');

function lessonSeenCount(li){ return (seen[LESSONS[li].id] || []).length; }
function lessonPct(li){
  const total = LESSONS[li].slides.length;
  return Math.round(lessonSeenCount(li) / total * 100);
}
function totalPct(){
  let s = 0, t = 0;
  LESSONS.forEach((L, i) => { s += lessonSeenCount(i); t += L.slides.length; });
  return Math.round(s / t * 100);
}

/* ===================== رندر بلوک‌ها ===================== */
function cell(c){
  return /[\\_^{}]/.test(c) ? `<span class="tex" data-tex="${c}" data-d="0"></span>` : c;
}

function blk(x, i){
  const d = `style="--d:${i}"`;
  switch (x.t){
    case 'p':   return `<p class="para" ${d}>${x.x}</p>`;
    case 'h':   return `<h3 class="sub" ${d}>${x.x}</h3>`;
    case 'box': return `<div class="box ${x.k}" ${d}><div class="tag">${x.tag}</div><div>${x.x}</div></div>`;
    case 'f':   return `<div class="formula" ${d}><div class="tag">${x.cap ? x.cap : 'فرمول'}</div><div class="tex" data-tex="${x.tex}"></div></div>`;
    case 'm':   return `<div class="tex" ${d} data-tex="${x.tex}"></div>`;
    case 'res': return `<div class="result" ${d}><span class="rtag">پاسخ</span><div class="tex" data-tex="${x.tex}"></div></div>`;
    case 'ex':  return `<div class="example" ${d}><div class="ex-head">${x.title}</div>${x.b.map((y, k) => blk(y, k)).join('')}</div>`;
    case 'ana': return '';
    case 'tbl': {
      const head = x.h.map(h => `<th>${cell(h)}</th>`).join('');
      const rows = x.r.map(r => `<tr>${r.map(c => `<td>${cell(c)}</td>`).join('')}</tr>`).join('');
      return `<div class="tbl-wrap" ${d}><table><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>`;
    }
    case 'ul':  return `<ul class="item-list">${x.items.map((s, k) => `<li style="--d:${k}">${s}</li>`).join('')}</ul>`;
    case 'img': return `<figure class="fig" ${d}><img src="${x.src}" alt="${x.cap}" loading="lazy" onerror="this.closest('.fig').classList.add('img-missing')"><figcaption>${x.cap}</figcaption></figure>`;
    case 'quiz': {
      const opts = x.o.map(o => `<button class="opt" onclick="answerQuiz(this, ${x.a})">${o}</button>`).join('');
      return `<div class="quiz" ${d}><div class="q">${x.q}</div>${opts}<div class="feedback"></div></div>`;
    }
    default: return '';
  }
}

/* ===================== پاسخ به آزمون ===================== */
function answerQuiz(btn, correct){
  const wrap = btn.closest('.quiz');
  if (wrap.dataset.done) return;
  wrap.dataset.done = '1';
  const opts = [...wrap.querySelectorAll('.opt')];
  const idx = opts.indexOf(btn);
  opts.forEach((o, k) => { o.disabled = true; if (k === correct) o.classList.add('correct'); });
  const ok = idx === correct;
  if (!ok) btn.classList.add('wrong');
  wrap.querySelector('.feedback').textContent = ok ? '✔ پاسخ درست است!' : '✘ پاسخ درست: ' + opts[correct].textContent;
  quizStat.total++; if (ok) quizStat.ok++;
  const badge = document.getElementById('scoreBadge');
  if (badge) badge.textContent = `امتیاز: ${FA(quizStat.ok)} از ${FA(quizStat.total)}`;
}

/* ===================== ناوبری ===================== */
function buildNav(){
  const nav = document.getElementById('nav');
  let html = '', lastUnit = '';
  LESSONS.forEach((L, i) => {
    if (L.unit !== lastUnit){ html += `<div class="nav-unit">${L.unit}</div>`; lastUnit = L.unit; }
    const p = lessonPct(i);
    html += `<div class="nav-item ${p === 100 ? 'done' : ''}" data-i="${i}">
      <div class="nav-num">${p === 100 ? '✓' : FA(i + 1)}</div>
      <div class="nav-text">${L.title}<div class="nav-pct">${FA(p)}٪ تکمیل</div></div></div>`;
  });
  nav.innerHTML = html;
  nav.querySelectorAll('.nav-item').forEach(el => el.addEventListener('click', () => {
    goTo(+el.dataset.i, 0);
    document.getElementById('sidebar').classList.remove('open');
  }));
}

function markNav(){
  document.querySelectorAll('.nav-item').forEach(el => {
    const i = +el.dataset.i, p = lessonPct(i);
    el.classList.toggle('active', i === pos.l);
    el.classList.toggle('done', p === 100);
    el.querySelector('.nav-num').textContent = p === 100 ? '✓' : FA(i + 1);
    el.querySelector('.nav-pct').textContent = FA(p) + '٪ تکمیل';
  });
}

function goTo(l, s){
  pos = {l, s};
  safeSet(KEY_POS, pos);
  render();
}

function render(){
  const L = LESSONS[pos.l];
  const S = L.slides[pos.s];
  const sl = document.getElementById('slide');

  document.getElementById('unitName').textContent = L.unit;
  document.getElementById('lessonTitle').textContent = S.title;
  document.getElementById('slideCounter').innerHTML =
    `${FA(pos.s + 1)} / ${FA(L.slides.length)}` + (L.id === 'quiz' ? ` &nbsp;|&nbsp; <span id="scoreBadge">امتیاز: ${FA(quizStat.ok)} از ${FA(quizStat.total)}</span>` : '');

  sl.classList.remove('fade'); void sl.offsetWidth; sl.classList.add('fade');
  sl.innerHTML = `<div class="slide-title">${S.title}</div>` + S.b.map((x, i) => blk(x, i)).join('');

  renderMath(sl);

  // ثبت دیدن اسلاید
  seen[L.id] = Array.from(new Set([...(seen[L.id] || []), pos.s]));
  safeSet(KEY_SEEN, seen);

  // دکمه‌ها و نقطه‌ها
  document.getElementById('prevBtn').disabled = (pos.l === 0 && pos.s === 0);
  document.getElementById('nextBtn').disabled = (pos.l === LESSONS.length - 1 && pos.s === L.slides.length - 1);
  document.getElementById('dots').innerHTML = L.slides.map((_, k) =>
    `<button class="dot ${k === pos.s ? 'on' : (seen[L.id] || []).includes(k) ? 'seen' : ''}" data-k="${k}" aria-label="اسلاید ${k + 1}"></button>`
  ).join('');
  document.querySelectorAll('.dot').forEach(d => d.addEventListener('click', () => goTo(pos.l, +d.dataset.k)));

  // نوار پیشرفت
  document.getElementById('lessonName').textContent = L.title;
  const lp = lessonPct(pos.l), tp = totalPct();
  document.getElementById('lessonPct').textContent = FA(lp) + '٪';
  document.getElementById('totalPct').textContent = FA(tp) + '٪';
  document.getElementById('lessonBar').style.width = lp + '%';
  document.getElementById('totalBar').style.width = tp + '%';

  markNav();
  window.scrollTo({top: 0, behavior: 'smooth'});
}

function renderMath(root){
  if (!window.katex) return;
  root.querySelectorAll('[data-tex]').forEach(el => {
    try {
      katex.render(el.dataset.tex, el, {
        displayMode: el.dataset.d !== '0',
        throwOnError: false,
        output: 'htmlAndMathml'
      });
    } catch (e) { el.textContent = el.dataset.tex; }
  });
}

/* ===================== کنترل‌ها ===================== */
function next(){
  const L = LESSONS[pos.l];
  if (pos.s < L.slides.length - 1) goTo(pos.l, pos.s + 1);
  else if (pos.l < LESSONS.length - 1) goTo(pos.l + 1, 0);
}
function prev(){
  if (pos.s > 0) goTo(pos.l, pos.s - 1);
  else if (pos.l > 0) goTo(pos.l - 1, LESSONS[pos.l - 1].slides.length - 1);
}

document.getElementById('nextBtn').addEventListener('click', next);
document.getElementById('prevBtn').addEventListener('click', prev);
document.getElementById('menuBtn').addEventListener('click', () =>
  document.getElementById('sidebar').classList.toggle('open'));
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (e.key === 'ArrowLeft') next();
  if (e.key === 'ArrowRight') prev();
});

// پشتیبانی از کشیدن انگشت در موبایل
let tx = null;
document.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, {passive:true});
document.addEventListener('touchend', e => {
  if (tx === null) return;
  const dx = e.changedTouches[0].clientX - tx;
  if (Math.abs(dx) > 70 && !e.target.closest('.tbl-wrap')) (dx < 0 ? next() : prev());
  tx = null;
}, {passive:true});

/* ===================== شروع ===================== */
if (!LESSONS[pos.l]) pos = {l:0, s:0};
if (!LESSONS[pos.l].slides[pos.s]) pos.s = 0;
buildNav();
render();
