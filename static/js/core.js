/* MC-ECII dashboard · core utilities (namespace window.MC) */
(function () {
  'use strict';
  const MC = (window.MC = { pages: {}, rendered: {}, charts: {}, status: null, current: null, mlDependents: ['overview'], pageData: {} });

  MC.CLASSES = ['Low', 'Medium', 'High'];
  MC.COL = { Low: '#22a06b', Medium: '#e6a23c', High: '#e0483f', brand: '#4f46e5', violet: '#7c3aed', cyan: '#06b6d4', grey: '#cbd5e1', ink: '#0f172a' };
  MC.$ = (s, r = document) => r.querySelector(s);
  MC.$$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  MC.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  MC.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  MC.f = (n, d = 3) => (n == null || isNaN(n) ? '–' : Number(n).toFixed(d));
  MC.n = (n) => (n == null ? '–' : Number(n).toLocaleString('en-IN'));
  MC.pretty = (s) => String(s).replace(/_/g, ' ');
  MC.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  /* ---------- icons ---------- */
  MC.icons = {
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    map: '<path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>',
    sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
    graph: '<circle cx="12" cy="5" r="2.5"/><circle cx="5" cy="19" r="2.5"/><circle cx="19" cy="19" r="2.5"/><path d="M12 7.5v4M12 11.5l-5.5 5.5M12 11.5l5.5 5.5"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    bulb: '<path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.3 1 2.1V17h6v-.2c0-.8.4-1.6 1-2.1A7 7 0 0 0 12 2z"/>',
    shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/><path d="M9 12l2 2 4-4"/>',
    dl: '<path d="M12 3v12M7 10l5 5 5-5M4 21h16"/>',
    bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',
    dice: '<rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1"/><circle cx="15.5" cy="15.5" r="1"/><circle cx="12" cy="12" r="1"/>',
    flask: '<path d="M9 3h6M10 3v6L4 20a1 1 0 0 0 .9 1.5h14.2A1 1 0 0 0 20 20l-6-11V3"/>',
    check: '<path d="M20 6L9 17l-5-5"/>',
    spark: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  };
  MC.icon = (n) => `<svg viewBox="0 0 24 24">${MC.icons[n] || ''}</svg>`;

  /* ---------- API ---------- */
  MC.api = async function (path, opts = {}) {
    const init = { headers: { 'Content-Type': 'application/json' }, ...opts };
    if (init.body && typeof init.body !== 'string') init.body = JSON.stringify(init.body);
    const bucket = MC.current ? (MC.pageData[MC.current] = MC.pageData[MC.current] || {}) : null;
    let res, j = null;
    try { res = await fetch('/api' + path, init); } catch (e) { const er = new Error('Cannot reach the server — is app.py running?'); er.status = 0; throw er; }
    try { j = await res.json(); } catch (e) { /* non-JSON */ }
    if (!res.ok || !j || !j.ok) {
      const er = new Error((j && j.error && j.error.message) || `HTTP ${res.status}`);
      er.status = res.status; er.code = j && j.error && j.error.code; er.fields = j && j.error && j.error.fields; er.payload = j && j.error;
      throw er;
    }
    if (bucket && !/^\/(status|settings|explain|health|docs)/.test(path)) bucket[path.split('?')[0]] = j.data;   // feeds the “Explain simply” button
    return j;
  };
  /** GET that transparently waits while the engine stage is still computing (HTTP 503). */
  MC.apiWait = async function (path, opts, onWait) {
    for (let i = 0; i < 400; i++) {
      try { return await MC.api(path, opts); }
      catch (e) {
        if (e.status === 503 && e.code === 'computing') { onWait && onWait(e.payload || {}); await MC.sleep(1500); continue; }
        throw e;
      }
    }
    throw new Error('Timed out while waiting for the engine');
  };

  /* ---------- toast ---------- */
  MC.toast = function (msg, err) {
    const t = MC.$('#toast'); t.textContent = msg; t.className = 'toast show' + (err ? ' err' : '');
    clearTimeout(MC.toast._t); MC.toast._t = setTimeout(() => (t.className = 'toast'), 3600);
  };

  /* ---------- Chart.js defaults (HD) ---------- */
  if (window.Chart) {
    const C = Chart.defaults;
    C.font.family = "'Plus Jakarta Sans','Inter','Segoe UI',system-ui,sans-serif"; C.font.weight = 600; C.font.size = 12.5; C.color = '#475569';
    C.devicePixelRatio = Math.max(2, window.devicePixelRatio || 1);
    C.responsive = true; C.maintainAspectRatio = false;
    C.animation.duration = 1300; C.animation.easing = 'easeOutQuart';
    C.plugins.legend.labels.usePointStyle = true; C.plugins.legend.labels.boxWidth = 8; C.plugins.legend.labels.padding = 16;
    Object.assign(C.plugins.tooltip, { backgroundColor: '#0f172a', padding: 12, cornerRadius: 10, boxPadding: 5, titleFont: { weight: 700, size: 13 }, bodyFont: { weight: 600 }, displayColors: true });
    C.scale.grid.color = '#eef0f7'; C.scale.grid.drawBorder = false; C.scale.border = { display: false };
    C.elements.bar.borderRadius = 8; C.elements.bar.borderSkipped = false;
    C.elements.line.tension = 0.35; C.elements.line.borderWidth = 3; C.elements.point.radius = 4; C.elements.point.hoverRadius = 7;
  }
  MC.chart = function (id, cfg) {
    const el = document.getElementById(id);
    if (!el) return null;
    if (MC.charts[id]) MC.charts[id].destroy();
    MC.charts[id] = new Chart(el.getContext('2d'), cfg);
    return MC.charts[id];
  };
  MC.destroyCharts = function (prefix) {
    Object.keys(MC.charts).forEach((k) => { if (k.startsWith(prefix)) { MC.charts[k].destroy(); delete MC.charts[k]; } });
  };
  MC.rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
  /** vertical gradient fill for canvas charts */
  MC.grad = (id, c1, c2) => { const el = document.getElementById(id); const g = el.getContext('2d').createLinearGradient(0, 0, 0, el.clientHeight || 300); g.addColorStop(0, c1); g.addColorStop(1, c2); return g; };

  /* ---------- UI helpers ---------- */
  MC.countUp = function (el) {
    const to = parseFloat(el.dataset.count), dec = parseInt(el.dataset.dec || '0', 10), t0 = performance.now(), dur = 1500;
    if (isNaN(to)) return;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 4);
      el.textContent = (to * e).toLocaleString('en-IN', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => {
    es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.08 }) : null;

  /** Triggers every entrance animation inside `root`. */
  MC.animateIn = function (root) {
    MC.$$('.reveal', root).forEach((el, i) => { if (!el.style.getPropertyValue('--d')) el.style.setProperty('--d', Math.min(i, 8) * 0.06 + 's'); io ? io.observe(el) : el.classList.add('in'); });
    requestAnimationFrame(() => requestAnimationFrame(() => {
      MC.$$('[data-count]', root).forEach(MC.countUp);
      MC.$$('[data-w]', root).forEach((el) => (el.style.width = el.dataset.w + '%'));
      MC.$$('.heat', root).forEach((el) => el.classList.add('in'));
      MC.$$('.ring .fg', root).forEach((el) => (el.style.strokeDashoffset = 408 * (1 - parseFloat(el.dataset.pct) / 100)));
      MC.$$('.vbar span', root).forEach((el) => (el.style.width = el.dataset.w + '%'));
    }));
  };
  MC.kpi = ({ icon, label, value, dec = 0, note = '', cls = '', text = null }) =>
    `<div class="card kpi hover reveal ${cls}"><div class="ico">${MC.icon(icon)}</div>
     <div class="v">${text != null ? MC.esc(text) : `<span data-count="${value}" data-dec="${dec}">0</span>`}</div>
     <div class="l">${MC.esc(label)}</div>${note ? `<div class="n">${MC.esc(note)}</div>` : ''}</div>`;
  MC.head = (title, sub) => `<div class="page-head reveal"><h1>${title}</h1><p>${sub}</p></div>`;
  MC.loading = (el, msg = 'Loading…') => { el.innerHTML = `<div class="loading-box"><div class="spinner"></div>${MC.esc(msg)}</div>`; };
  MC.waitUI = (el, what) => (p) => {
    el.innerHTML = `<div class="card reveal in loading-box" style="max-width:560px;margin:60px auto"><div class="spinner"></div>
      <b style="color:var(--ink)">Computing ${MC.esc(what)}…</b><div style="margin:6px 0 16px">${MC.esc(p.message || 'Working')}</div>
      <div class="bar"><span style="width:${p.progress || 5}%"></span></div><div style="font-size:12px;margin-top:8px">${p.progress || 0}%</div></div>`;
  };
  MC.error = (el, e) => { el.innerHTML = `<div class="callout warn reveal in"><div class="ic">⚠️</div><div><b>Could not load this section.</b><br>${MC.esc(e.message)}</div></div>`; };
  MC.tag = (k, extra = '') => `<span class="tag ${MC.esc(k)}">${MC.esc(k)}${extra}</span>`;
  MC.heatColor = (t) => { // 0..1  pale yellow → amber → red
    const stops = [[255, 247, 214], [253, 186, 60], [226, 72, 63]];
    t = Math.max(0, Math.min(1, t)); const s = t < 0.5 ? 0 : 1, u = t < 0.5 ? t * 2 : (t - 0.5) * 2;
    const c = stops[s].map((v, i) => Math.round(v + (stops[s + 1][i] - v) * u));
    return { bg: `rgb(${c})`, fg: t > 0.62 ? '#fff' : '#3b2a0a' };
  };
  MC.blueColor = (t) => { t = Math.max(0, Math.min(1, t)); return { bg: `rgba(79,70,229,${0.06 + t * 0.86})`, fg: t > 0.5 ? '#fff' : '#312e81' }; };

  /** Confusion-matrix HTML; rows = actual, cols = predicted */
  MC.confusion = (matrix, rows, cols) => {
    const tot = matrix.map((r) => r.reduce((a, b) => a + b, 0));
    let h = `<div class="cm" style="grid-template-columns:78px repeat(${cols.length},1fr)"><div class="h"></div>`;
    cols.forEach((c) => (h += `<div class="h">Pred ${MC.esc(c)}</div>`));
    matrix.forEach((r, i) => {
      h += `<div class="h">Actual ${MC.esc(rows[i])}</div>`;
      r.forEach((v) => { const t = tot[i] ? v / tot[i] : 0, c = MC.blueColor(t); h += `<div class="c" style="background:${c.bg};color:${c.fg}" title="${(t * 100).toFixed(0)}% of actual">${v}</div>`; });
    });
    return h + '</div>';
  };

  /** Reusable explanation block (concepts + ontology predicates) */
  MC.explainHTML = (ex, predictedClass) => {
    const cls = predictedClass || (ex.prediction || 'High');
    const list = (ex.matched[cls] || []);
    let h = `<h3 style="font-size:14px;margin:4px 0 10px">Matched ${MC.tag(cls)} concepts <span class="tag brand" style="margin-left:auto">${ex.matched_counts[cls]} of ${ex.repository_sizes[cls]}</span></h3>`;
    h += list.length ? `<div style="display:grid;gap:9px">${list.slice(0, 5).map((c) => MC.conceptCard(c, cls, true)).join('')}</div>`
      : '<div style="color:var(--muted);font-size:13px">No concept of this class matched.</div>';
    h += `<h3 style="font-size:14px;margin:20px 0 8px">Ontology predicates that hold</h3><div>${ex.predicates.map((p) => `<span class="pill ${p.true ? 'on' : 'off'}" title="${MC.esc(p.dl)}">${p.true ? '●' : '○'} ${MC.esc(p.name)}</span>`).join('')}</div>`;
    return h;
  };
  MC.conceptCard = (c, cls, compact) => {
    const v = c.V; const tot = (v.Low + v.Medium + v.High) || 1;
    return `<div class="concept ${cls}" onclick="this.classList.toggle('open')" title="Click to show the Description-Logic expression">
      <div class="t">${MC.esc(c.readable || c.text)}</div>
      <div style="font-size:11.5px;color:var(--muted);margin-top:3px" class="mono">${MC.esc(c.text)}</div>
      <div class="vbar">${MC.CLASSES.map((k) => `<span class="${k}" data-w="${(v[k] / tot * 100).toFixed(1)}"></span>`).join('')}</div>
      <div class="vleg"><span>V(c) = [L ${MC.f(v.Low, 2)} · M ${MC.f(v.Medium, 2)} · H ${MC.f(v.High, 2)}]</span><span>margin <b style="color:var(--ink)">${MC.f(c.margin, 2)}</b></span></div>
      <div class="dl">${MC.esc(c.dl)}</div></div>`;
  };

  /* ---------- student drawer ---------- */
  MC.closeDrawer = () => { MC.$('#drawer').classList.remove('open'); MC.$('#drawerBg').classList.remove('open'); };
  MC.openStudent = async function (id) {
    const d = MC.$('#drawer'); d.classList.add('open'); MC.$('#drawerBg').classList.add('open'); MC.loading(d, 'Loading student…');
    try {
      const r = (await MC.api('/students/' + encodeURIComponent(id))).data, rec = r.record, ex = r.mc_ecii;
      const pred = ex.prediction, ml = r.ml;
      const keys = ['Age', 'Gender', 'State', 'Study_Hours', 'Class_Attendance', 'Sleep_Hours', 'Social_Media_Use', 'Screen_Time', 'Anxiety_Level', 'Exam_Frequency', 'Assignment_Load', 'Physical_Exercise', 'Peer_Pressure', 'Family_Support', 'Family_Income_Level', 'Tuition', 'University_Type'];
      d.innerHTML = `<div class="row" style="justify-content:space-between"><div><div class="mono" style="color:var(--muted);font-size:12px">STUDENT</div><h2 style="font-size:26px;letter-spacing:-.02em">${MC.esc(rec.Student_ID)}</h2></div><button class="x" onclick="MC.closeDrawer()" aria-label="Close">×</button></div>
        <div class="row" style="margin:12px 0 4px"><span class="tag">Survey label</span>${MC.tag(rec.Stress_Level)}<span class="tag">MC-ECII</span>${pred ? MC.tag(pred) : '<span class="tag">Abstain</span>'}${ml ? `<span class="tag">LR</span>${MC.tag(ml.prediction)}` : ''}<span class="tag brand">${MC.esc(rec.Split)}</span></div>
        <div class="row" style="margin:8px 0 2px"><button class="btn sm primary" id="stuExplain">${MC.icon('spark')} Explain this student simply</button></div>
        <div class="kv">${keys.map((k) => `<div><span>${MC.pretty(k)}</span><b>${MC.esc(rec[k])}</b></div>`).join('')}</div>
        <div class="card" style="padding:16px;margin:10px 0 18px"><div style="font-weight:800;margin-bottom:8px">MC-ECII class scores</div>${['Low', 'Medium', 'High'].map((k) => `<div class="sbar"><span>${k}</span><div class="t"><span class="${k}" data-w="${(ex.scores[k] * 100).toFixed(1)}"></span></div><em>${MC.f(ex.scores[k], 2)}</em></div>`).join('')}
        <div style="font-size:12px;color:var(--muted)">Stress score ${rec.Stress_Score} (14–60) · derived from 12 Likert items — never used as a model input.</div></div>
        ${MC.explainHTML(ex, pred || rec.Stress_Level)}`;
      MC.$('#stuExplain').onclick = () => MC.explain.open({ title: 'Student ' + rec.Student_ID, context: 'One anonymised student from the survey: raw inputs, the survey stress label, the MC-ECII verdict with matched rules, and the Logistic Regression cross-check.',
        data: { student: Object.fromEntries(keys.concat(['Stress_Level', 'Stress_Score']).map((k) => [k, rec[k]])), ...MC.exSummary(ex, ml) } });
      MC.animateIn(d);
    } catch (e) { MC.error(d, e); }
  };
})();
