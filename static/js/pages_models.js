/* MC-ECII dashboard · model pages: ml, compare, concepts, predict, lab, project */
(function () {
  'use strict';
  const MC = window.MC, { esc, f, n, CLASSES, COL } = MC;

  /* ═══════════════════════ ML BENCHMARK ═══════════════════════ */
  MC.pages.ml = async function (root) {
    const m = (await MC.apiWait('/ml', {}, MC.waitUI(root, 'the 6-model benchmark'))).data, R = m.results, best = R[0];
    const MET = [['accuracy', 'Accuracy'], ['macro_f1', 'Macro-F1'], ['weighted_f1', 'Weighted-F1'], ['roc_auc', 'ROC-AUC (OvR)']];
    const mdColors = ['#4f46e5', '#7c3aed', '#06b6d4', '#22a06b'];
    root.innerHTML = MC.head('ML baselines <span class="grad">on the held-out test set</span>', `Six standard classifiers trained on the same stratified split (${m.split.train.toLocaleString()} train / ${m.split.test} test, random_state = ${m.split.random_state}) and the same preprocessing. ${m.features.count} inputs; 13 target-defining columns never used.`) + `
    <div class="grid g3" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
      ${MC.kpi({ icon: 'chart', label: `Best · ${best.model}`, value: best.macro_f1, dec: 3, note: 'test Macro-F1' })}
      ${MC.kpi({ icon: 'bolt', label: 'Best accuracy', value: best.accuracy, dec: 3, cls: 'c2', note: `majority baseline ${f(m.majority.accuracy)}` })}
      ${MC.kpi({ icon: 'shield', label: 'Best ROC-AUC (OvR)', value: best.roc_auc, dec: 3, cls: 'c3', note: 'threshold-free ranking' })}
      ${MC.kpi({ icon: 'flask', label: 'CV stability (sd)', value: best.cv_std, dec: 3, cls: 'c4', note: `repeated ${m.cv.folds}×${m.cv.repeats} stratified CV` })}</div>
    <div class="card reveal mt"><h3>Test-set leaderboard <a class="btn sm" style="margin-left:auto" href="/api/export/model_comparison" download>${MC.icon('dl')} CSV</a></h3><div class="sub">Sorted by Macro-F1 · Medium is the hardest class for every model</div>
      <div class="tw"><table><thead><tr><th>#</th><th>Model</th><th class="num">Accuracy</th><th class="num">Precision</th><th class="num">Recall</th><th class="num">Macro-F1</th><th class="num">Weighted-F1</th><th class="num">ROC-AUC</th><th class="num">CV Macro-F1</th></tr></thead><tbody>
      ${R.map((r, i) => `<tr class="${i === 0 ? 'best' : ''}"><td>${i + 1}</td><td><b>${esc(r.model)}</b> ${i === 0 ? '<span class="tag ok">best</span>' : ''}</td><td class="num">${f(r.accuracy)}</td><td class="num">${f(r.precision)}</td><td class="num">${f(r.recall)}</td>
        <td class="num"><div class="cell-bar"><span class="mini"><i data-w="${(r.macro_f1 * 100).toFixed(1)}"></i></span><b>${f(r.macro_f1)}</b></div></td><td class="num">${f(r.weighted_f1)}</td><td class="num">${f(r.roc_auc)}</td><td class="num">${f(r.cv_mean)} ± ${f(r.cv_std)}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="grid g-32 mt">
      <div class="card reveal"><h3>Model comparison</h3><div class="sub">Grouped metrics on 414 test students</div><div class="chartbox" style="height:340px"><canvas id="ml-bar"></canvas></div></div>
      <div class="card reveal"><h3>Cross-validation stability</h3><div class="sub">Macro-F1 range (bar) and mean (◆) over ${m.cv.folds * m.cv.repeats} folds</div><div class="chartbox" style="height:340px"><canvas id="ml-cv"></canvas></div></div></div>
    <div class="grid g2 mt">
      <div class="card reveal"><h3>Per-class F1</h3><div class="sub">Where each model makes its errors</div><div id="ml-pc"></div></div>
      <div class="card reveal"><h3>Confusion matrix</h3><div class="sub">Rows = actual, columns = predicted</div><div class="tabs" id="ml-cm-tabs">${R.map((r, i) => `<button class="${i === 0 ? 'on' : ''}" data-m="${esc(r.model)}">${esc(r.model)}</button>`).join('')}</div><div id="ml-cm"></div>
        <div style="font-size:12.5px;color:var(--muted);margin-top:10px">Most errors are Low↔Medium and Medium↔High; Low↔High confusion is rare.</div></div></div>
    <div class="grid g2 mt">
      <div class="card reveal"><h3>Random-forest importance</h3><div class="sub">Top 12 drivers (Gini)</div><div class="chartbox" style="height:360px"><canvas id="ml-rf"></canvas></div></div>
      <div class="card reveal"><h3>Logistic-regression drivers</h3><div class="sub">Mean |coefficient| across the 3 classes, top 12</div><div class="chartbox" style="height:360px"><canvas id="ml-lr"></canvas></div></div></div>
    <div class="callout mt reveal"><div class="ic">🧭</div><div><b>Reading the results.</b> Linear models lead, so the stress signal is largely additive. Both forests and regression agree that workload (assignments, exams), attendance and anxiety are the main signals — consistent with the ontology predicates MC-ECII selects. This benchmark is non-diagnostic and leakage-controlled.</div></div>`;

    MC.chart('ml-bar', { type: 'bar', data: { labels: R.map((r) => r.model), datasets: MET.map(([k, l], i) => ({ label: l, data: R.map((r) => +r[k].toFixed(3)), backgroundColor: mdColors[i], maxBarThickness: 26 })) },
      options: { scales: { y: { min: 0.3, max: 1, title: { display: true, text: 'score' } }, x: { grid: { display: false }, ticks: { font: { size: 11 } } } }, plugins: { legend: { position: 'bottom' } } } });
    const cvO = Object.entries(m.cv.box).sort((a, b) => b[1].mean - a[1].mean);
    MC.chart('ml-cv', { type: 'bar', data: { labels: cvO.map((x) => x[0]), datasets: [
      { type: 'bar', label: 'min – max', data: cvO.map((x) => [x[1].min, x[1].max]), backgroundColor: 'rgba(79,70,229,.22)', borderColor: '#4f46e5', borderWidth: 1.5, maxBarThickness: 34 },
      { type: 'line', label: 'mean', data: cvO.map((x) => x[1].mean), showLine: false, pointStyle: 'rectRot', pointRadius: 7, pointBackgroundColor: '#e0483f', pointBorderColor: '#fff', pointBorderWidth: 2 }] },
      options: { scales: { y: { min: 0.4, max: 0.75, title: { display: true, text: 'Macro-F1 (train CV)' } }, x: { grid: { display: false }, ticks: { font: { size: 11 } } } }, plugins: { legend: { position: 'bottom' } } } });
    /* per-class heat */
    MC.$('#ml-pc').innerHTML = `<div class="heat" style="grid-template-columns:150px repeat(3,1fr)"><div></div>${CLASSES.map((c) => `<div class="h">F1 ${c}</div>`).join('')}${R.map((r, ri) => `<div class="lbl">${esc(r.model)}</div>${CLASSES.map((c, ci) => { const v = m.per_class_f1[r.model][c], col = MC.blueColor((v - 0.3) / 0.5); return `<div class="c" style="background:${col.bg};color:${col.fg};--d:${(ri * 3 + ci) * .03}s">${f(v, 2)}</div>`; }).join('')}`).join('')}</div>`;
    const cm = (name) => { MC.$('#ml-cm').innerHTML = MC.confusion(m.confusion[name], CLASSES, CLASSES); };
    cm(best.model); MC.$$('#ml-cm-tabs button').forEach((b) => (b.onclick = () => { MC.$$('#ml-cm-tabs button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); cm(b.dataset.m); }));
    const hbar = (id, obj, c1, c2) => MC.chart(id, { type: 'bar', data: { labels: Object.keys(obj).map(MC.pretty), datasets: [{ data: Object.values(obj), backgroundColor: (c) => { const g = c.chart.ctx.createLinearGradient(0, 0, c.chart.width, 0); g.addColorStop(0, c1); g.addColorStop(1, c2); return g; }, maxBarThickness: 22 }] }, options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { y: { grid: { display: false }, ticks: { font: { size: 11 } } } } } });
    hbar('ml-rf', m.rf_importance, '#99f6e4', '#0d9488'); hbar('ml-lr', m.lr_importance, '#fed7aa', '#ea580c');
  };

  /* ═══════════════════════ COMPARE ═══════════════════════ */
  MC.pages.compare = async function (root) {
    const wait = MC.waitUI(root, 'the ECII comparison');
    const [cr, ab] = await Promise.all([MC.apiWait('/compare', {}, wait), MC.api('/abstention')]);
    const c = cr.data, rows = c.rows, mc = rows[0], ov = rows[2], lr = rows[5], ec = rows[4];
    const curve = ab.data.curve;
    root.innerHTML = MC.head('ECII <span class="grad">vs one-vs-rest vs MC-ECII</span>', 'Same split, same leakage control, same ontology atoms — only the way the learner treats the 3-class target differs.') + `
    <div class="card reveal"><h3>Aspect-by-aspect</h3><div class="sub">Live numbers from the notebooks' code</div>
      <div class="tw"><table><thead><tr><th>Aspect</th><th>ECII</th><th>One-vs-rest ECII</th><th style="color:var(--brand)">MC-ECII</th></tr></thead><tbody>
      ${c.summary.map((s) => `<tr><td><b>${esc(s.aspect)}</b></td><td>${esc(s.ecii)}</td><td>${esc(s.ovr)}</td><td style="background:#f6f5ff;font-weight:700">${esc(s.mc)}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="grid g4 mt" style="grid-template-columns:repeat(auto-fit,minmax(210px,1fr))">
      ${MC.kpi({ icon: 'bulb', label: 'MC-ECII Macro-F1', value: mc.macro_f1, dec: 3, note: `accuracy ${f(mc.accuracy)}` })}
      ${MC.kpi({ icon: 'shield', label: 'Students with one class', text: `${f(c.status_pct['Single class'], 0)}% → 100%`, cls: 'c4', note: 'one-vs-rest → MC-ECII' })}
      ${MC.kpi({ icon: 'bolt', label: 'Fewer evaluations', text: `${f(c.eval_ratio, 1)}×`, cls: 'c3', note: 'vs one-vs-rest (proxy for reasoner calls)' })}
      ${MC.kpi({ icon: 'chart', label: 'Medium-class F1', text: `${f(ov.f1.Medium, 2)} → ${f(mc.f1.Medium, 2)}`, cls: 'c5', note: 'one-vs-rest → MC-ECII' })}</div>
    <div class="grid g2 mt">
      <div class="card reveal"><h3>(a) Performance on the 3-class test set</h3><div class="chartbox" style="height:300px"><canvas id="cp-a"></canvas></div></div>
      <div class="card reveal"><h3>(b) Prediction status of every test student</h3><div class="chartbox" style="height:300px"><canvas id="cp-b"></canvas></div></div>
      <div class="card reveal"><h3>(c) Per-class F1</h3><div class="chartbox" style="height:300px"><canvas id="cp-c"></canvas></div></div>
      <div class="card reveal"><h3>(d) Coverage evaluations</h3><div class="sub">Proxy for DL-reasoner calls · lower is cheaper</div><div class="chartbox" style="height:285px"><canvas id="cp-d"></canvas></div></div></div>
    <div class="grid g-21 mt">
      <div class="card reveal"><h3>Abstention trade-off</h3><div class="sub">Raise ε → MC-ECII refers borderline students to a counsellor and becomes more accurate on those it answers</div><div class="chartbox" style="height:320px"><canvas id="cp-ab"></canvas></div></div>
      <div class="card reveal"><h3>ε table</h3><div class="sub">Test split</div><div class="tw"><table><thead><tr><th>ε</th><th class="num">Answered</th><th class="num">Acc. answered</th></tr></thead><tbody>${curve.map((r) => `<tr><td>${r.eps}</td><td class="num">${f(r.answered_pct, 1)}%</td><td class="num"><b>${f(r.accuracy_answered)}</b></td></tr>`).join('')}</tbody></table></div></div></div>
    <div class="grid g2 mt">
      <div class="card reveal"><h3>How each method sees the target</h3><div class="sub">Preprocessing that differs</div><div class="tw"><table><thead><tr><th>Method</th><th>Target given to learner</th><th class="num">Runs</th><th class="num">Rows used</th><th class="num">Dropped</th></tr></thead><tbody>${c.preprocessing.map((p) => `<tr><td><b>${esc(p.method)}</b></td><td>${esc(p.target)}</td><td class="num">${p.runs}</td><td class="num">${p.rows_used}</td><td class="num">${p.rows_dropped}</td></tr>`).join('')}</tbody></table></div></div>
      <div class="card reveal"><h3>One-vs-rest: separate concept sets</h3><div class="sub">No shared coverage vector, no margin to other classes</div>${CLASSES.map((k) => `<div style="margin-bottom:10px">${MC.tag(k, ' vs rest')}${(c.ovr_concepts[k] || []).map((x) => `<div class="mono" style="font-size:11.5px;color:var(--ink-2);margin-top:5px">${esc(x.text)} <span style="color:var(--muted)">· q=${f(x.quality, 2)}</span></div>`).join('')}</div>`).join('')}</div></div>
    <div class="callout warn mt reveal"><div class="ic">🔎</div><div><b>Honest finding.</b> The MC-ECII prototype's accuracy (${f(mc.accuracy, 2)}) is below Logistic Regression (${f(lr.accuracy, 2)}) — the price of ≤3-atom readable concepts and untuned parameters. In exchange it classifies every student in one run, removes the ${f(c.status_pct.Conflict, 0)}% one-vs-rest conflicts, supports abstention and explains each decision symbolically. Binary ECII answers only ${f(ec.answered_pct, 0)}% of students (High vs Low).</div></div>`;

    const six = [mc, rows[1], ov, rows[3], lr];
    MC.chart('cp-a', { type: 'bar', data: { labels: six.map((r) => r.model.replace(' (reference)', '').replace(' (+tie-break)', ' +tb')), datasets: [{ label: 'Accuracy', data: six.map((r) => +r.accuracy.toFixed(3)), backgroundColor: '#4f46e5' }, { label: 'Macro-F1', data: six.map((r) => +r.macro_f1.toFixed(3)), backgroundColor: '#f59e0b' }] },
      options: { indexAxis: 'y', scales: { x: { min: 0, max: 1 }, y: { grid: { display: false }, ticks: { font: { size: 10.5 } } } }, plugins: { legend: { position: 'bottom' } } } });
    const sp = c.status_pct;
    MC.chart('cp-b', { type: 'bar', data: { labels: ['One-vs-rest ECII', 'MC-ECII'], datasets: [{ label: 'Single class', data: [sp['Single class'], 100], backgroundColor: '#22a06b' }, { label: 'Conflict', data: [sp.Conflict, 0], backgroundColor: '#e0483f' }, { label: 'No class', data: [sp['No class'], 0], backgroundColor: '#94a3b8' }] },
      options: { indexAxis: 'y', scales: { x: { stacked: true, max: 100, title: { display: true, text: '% of test students' } }, y: { stacked: true, grid: { display: false } } }, plugins: { legend: { position: 'bottom' } } } });
    MC.chart('cp-c', { type: 'bar', data: { labels: CLASSES, datasets: [[mc, 'MC-ECII', '#4f46e5'], [ov, 'One-vs-rest ECII', '#e0483f'], [lr, 'Logistic Regression', '#06b6d4']].map(([r, l, col]) => ({ label: l, data: CLASSES.map((k) => +r.f1[k].toFixed(3)), backgroundColor: col, maxBarThickness: 34 })) },
      options: { scales: { y: { min: 0, max: 1, title: { display: true, text: 'F1' } }, x: { grid: { display: false } } }, plugins: { legend: { position: 'bottom' } } } });
    const ev = Object.entries(c.evaluations);
    MC.chart('cp-d', { type: 'bar', data: { labels: ev.map((e) => e[0]), datasets: [{ data: ev.map((e) => e[1]), backgroundColor: ['#cbd5e1', '#e0483f', '#22a06b'], maxBarThickness: 90 }] },
      options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: (x) => ` ${n(x.raw)} evaluations` } } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true } } } });
    MC.chart('cp-ab', { type: 'scatter', data: { datasets: [{ label: 'MC-ECII', data: curve.map((r) => ({ x: r.answered_pct, y: r.accuracy_answered, eps: r.eps })), showLine: true, borderColor: '#4f46e5', backgroundColor: '#fff', pointBorderColor: '#4f46e5', pointBorderWidth: 3, pointRadius: 6, fill: false }] },
      options: { scales: { x: { reverse: true, title: { display: true, text: '% of students answered' } }, y: { title: { display: true, text: 'accuracy on answered' } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (x) => ` ε=${x.raw.eps}: ${f(x.raw.y)} accuracy at ${f(x.raw.x, 1)}% answered` } } } } });
  };

  /* ═══════════════════════ EXPLANATIONS ═══════════════════════ */
  MC.pages.concepts = async function (root) {
    const d = (await MC.api('/concepts')).data;
    root.innerHTML = MC.head('Symbolic <span class="grad">explanations</span>', 'The concept repository learned by MC-ECII. Each concept is a conjunction of ontology atoms linked to ONE class with a margin ≥ δ. Click a concept to reveal its Description-Logic expression.') + `
    <div class="row reveal" style="justify-content:space-between"><div class="tabs" id="cn-tabs" style="margin:0"><button class="on" data-k="All">All classes</button>${CLASSES.map((k) => `<button data-k="${k}">${k} · ${d.counts[k]}</button>`).join('')}</div>
      <div class="row"><input class="inp" id="cn-q" placeholder="Filter concepts, e.g. Assignment" style="width:240px"><a class="btn sm" href="/api/export/mcecii_concepts" download>${MC.icon('dl')} CSV</a></div></div>
    <div class="callout mt reveal"><div class="ic">📚</div><div>Parameters: support ≥ <b>${d.params.min_support}</b> · beam <b>${d.params.beam}</b> · length ≤ <b>${d.params.max_len}</b> · K = <b>${d.params.K}</b> per class · δ = <b>${d.params.delta}</b> · ${n(d.evaluations)} coverage evaluations. Medium has weak margins because it sits between Low and High.</div></div>
    <div class="grid mt" id="cn-board"></div>`;
    let tab = 'All', q = '';
    const draw = () => {
      const ks = tab === 'All' ? CLASSES : [tab];
      const board = MC.$('#cn-board'); board.style.gridTemplateColumns = tab === 'All' ? 'repeat(auto-fit,minmax(320px,1fr))' : 'repeat(auto-fit,minmax(380px,1fr))';
      board.innerHTML = ks.map((k) => {
        const list = d.concepts[k].filter((c) => !q || (c.text + c.readable).toLowerCase().includes(q));
        return `<div class="card reveal in"><h3>${MC.tag(k, ' risk')}<span class="tag brand">${list.length} concept${list.length === 1 ? '' : 's'}</span></h3><div class="sub">sorted by margin</div>
          <div class="clist" style="${tab === 'All' ? '' : 'max-height:none;grid-template-columns:repeat(auto-fit,minmax(340px,1fr))'}">${list.map((c) => MC.conceptCard(c, k)).join('') || '<div style="color:var(--muted)">No match.</div>'}</div></div>`;
      }).join('');
      MC.animateIn(board);
    };
    MC.$$('#cn-tabs button').forEach((b) => (b.onclick = () => { MC.$$('#cn-tabs button').forEach((x) => x.classList.remove('on')); b.classList.add('on'); tab = b.dataset.k; draw(); }));
    MC.$('#cn-q').oninput = MC.debounce((e) => { q = e.target.value.trim().toLowerCase(); draw(); }, 200);
    draw();
  };

  /* ═══════════════════════ LIVE PREDICTION ═══════════════════════ */
  MC.pages.predict = async function (root) {
    const sch = (await MC.api('/schema')).data;
    const S = { vals: {}, eps: 0, actual: null, sid: null };
    sch.numeric.forEach((x) => (S.vals[x.name] = x.median)); sch.categorical.forEach((x) => (S.vals[x.name] = x.mode));
    const numField = (x) => `<div class="field"><label>${esc(x.label)}<b id="pv-${x.name}">${S.vals[x.name]}</b></label><input type="range" data-n="${x.name}" min="${x.min}" max="${x.max}" step="1" value="${S.vals[x.name]}"></div>`;
    const catField = (x) => `<div class="field"><label>${esc(x.label)}</label>${x.options.length <= 3 ? `<div class="seg" data-c="${x.name}">${x.options.map((o) => `<button class="${o === S.vals[x.name] ? 'on ' : ''}${CLASSES.includes(o) ? o : ''}" data-v="${esc(o)}">${esc(o)}</button>`).join('')}</div>`
      : `<select class="inp" data-s="${x.name}">${x.options.map((o) => `<option ${o === S.vals[x.name] ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`}</div>`;
    root.innerHTML = MC.head('Live <span class="grad">prediction</span>', 'Describe a student and get a Low / Medium / High risk classification with the matched symbolic concepts. Predictions update as you move the controls. Educational decision support — not a diagnosis.') + `
    <div class="grid g-split" id="pd-grid">
      <div class="card reveal"><h3>Student profile</h3><div class="sub">Survey inputs (the 12 Likert items are never used)</div>
        <div class="row" style="margin-bottom:16px"><button class="btn sm primary" id="pd-rand">${MC.icon('dice')} Random test student</button>
          <div class="seg" id="pd-lvl" style="flex:1"><button class="on" data-l="">any</button>${CLASSES.map((k) => `<button data-l="${k}">${k}</button>`).join('')}</div></div>
        <div id="pd-sid" style="font-size:12.5px;color:var(--muted);margin:-6px 0 12px"></div>
        <div class="grid g2" style="gap:0 22px"><div>${sch.numeric.map(numField).join('')}</div><div>${sch.categorical.map(catField).join('')}</div></div>
        <div class="field" style="border-top:1px dashed var(--line);padding-top:16px"><label>Abstain threshold ε<b id="pv-eps">0.00</b></label><input type="range" id="pd-eps" min="0" max="0.3" step="0.01" value="0"></div></div>
      <div id="pd-out" style="position:sticky;top:90px"><div class="card loading-box"><div class="spinner"></div>Classifying…</div></div></div>`;
    const setP = (el) => el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min)) * 100 + '%');
    MC.$$('input[type=range]').forEach(setP);

    const arc = (a0, a1, r = 100) => { const p = (a) => [115 + r * Math.cos(Math.PI - a), 115 - r * Math.sin(Math.PI - a)]; const [x0, y0] = p(a0), [x1, y1] = p(a1); return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`; };
    const render = (r) => {
      const ex = r.mc_ecii, ml = r.ml, cls = ex.abstained ? 'Abstain' : ex.prediction, sc = ex.scores, tot = sc.Low + sc.Medium + sc.High;
      const pos = tot > 0 ? (0.5 * sc.Medium + sc.High) / tot : 0.5, deg = (pos - 0.5) * 180;
      MC.$('#pd-out').innerHTML = `
      <div class="verdict ${cls}"><div style="font-size:12px;font-weight:800;letter-spacing:.1em;color:var(--muted)">MC-ECII VERDICT</div>
        <div class="gauge"><svg viewBox="0 0 230 130"><path d="${arc(0, Math.PI / 3)}" stroke="${COL.Low}"/><path d="${arc(Math.PI / 3 + .03, 2 * Math.PI / 3 - .03)}" stroke="${COL.Medium}"/><path d="${arc(2 * Math.PI / 3, Math.PI)}" stroke="${COL.High}"/>
          <g class="needle" style="transform:rotate(${deg}deg)"><line x1="115" y1="115" x2="115" y2="38" stroke="#0f172a" stroke-width="4" stroke-linecap="round"/></g><circle cx="115" cy="115" r="9" fill="#0f172a"/><circle cx="115" cy="115" r="3.5" fill="#fff"/></svg></div>
        <div style="font-size:11.5px;color:var(--muted);margin-top:-2px">evidence balance · Low ← → High</div>
        <div class="big" style="margin-top:8px">${ex.abstained ? 'Abstain' : cls + ' risk'}</div>
        <div style="color:var(--ink-2);margin-top:4px;font-size:14px">${ex.abstained ? 'Evidence too close (gap ' + f(ex.gap, 2) + ' &lt; ε ' + f(r.eps, 2) + ') — refer to a counsellor.' : 'Score gap to runner-up: <b>' + f(ex.gap, 2) + '</b>'}</div>
        ${S.actual ? `<div class="row" style="justify-content:center;margin-top:12px"><span class="tag">Survey label</span>${MC.tag(S.actual)}${!ex.abstained ? `<span class="tag ${ex.prediction === S.actual ? 'ok' : ''}">${ex.prediction === S.actual ? '✓ match' : '✗ differs'}</span>` : ''}</div>` : ''}
        <button class="btn sm primary" id="pd-explain" style="margin-top:16px">${MC.icon('spark')} Explain this result simply</button>
      </div>
      <div class="card mt"><h3>Class scores <span style="font-weight:600;font-size:12px;color:var(--muted)">matched concepts / repository</span></h3><div style="margin-top:12px">${CLASSES.map((k) => `<div class="sbar"><span>${k}</span><div class="t"><span class="${k}" data-w="${(sc[k] * 100).toFixed(1)}"></span></div><em>${ex.matched_counts[k]}/${ex.repository_sizes[k]}</em></div>`).join('')}</div></div>
      <div class="card mt"><h3>Reference · Logistic Regression ${r.agree ? '<span class="tag ok">agrees</span>' : '<span class="tag High">differs</span>'}</h3><div class="row" style="margin:10px 0 4px">${MC.tag(ml.prediction)}<span style="font-size:13px;color:var(--muted)">black-box probabilities</span></div>
        ${CLASSES.map((k) => `<div class="sbar"><span>${k}</span><div class="t"><span class="${k}" data-w="${(ml.probabilities[k] * 100).toFixed(1)}"></span></div><em>${f(ml.probabilities[k], 2)}</em></div>`).join('')}</div>
      <div class="card mt"><h3>Why? <span style="font-weight:600;font-size:12px;color:var(--muted)">symbolic explanation</span></h3><div style="margin-top:12px">${MC.explainHTML(ex, ex.abstained ? CLASSES.reduce((a, k) => (sc[k] > sc[a] ? k : a), 'Low') : ex.prediction)}</div>
        ${r.screen_flag ? '<div class="callout warn mt"><div class="ic">⚠️</div><div>Social-media hours exceed total screen time — this record would be flagged in the survey data.</div></div>' : ''}
        <div style="font-size:12px;color:var(--muted);margin-top:14px">${esc(r.disclaimer)}</div></div>`;
      const req = () => ({ title: 'Live prediction', context: MC.hints.predict, data: { student_inputs: { ...S.vals }, abstain_threshold_epsilon: r.eps, models_agree: r.agree, social_media_exceeds_screen_time: r.screen_flag, ...MC.exSummary(ex, ml) } });
      MC.pageExplain.predict = req; MC.$('#pd-explain').onclick = () => MC.explain.open(req());
      MC.animateIn(MC.$('#pd-out'));
    };
    let seq = 0;
    const run = async () => {
      const my = ++seq;
      try { const r = await MC.api('/predict', { method: 'POST', body: { ...S.vals, eps: S.eps } }); if (my === seq) render(r.data); }
      catch (e) { if (my === seq) { MC.toast(e.fields ? 'Invalid input: ' + Object.entries(e.fields).map(([k, v]) => `${k} ${v}`).join('; ') : e.message, true); } }
    };
    const runD = MC.debounce(run, 280);
    const fillUI = () => {
      MC.$$('input[data-n]').forEach((el) => { el.value = S.vals[el.dataset.n]; setP(el); MC.$('#pv-' + el.dataset.n).textContent = el.value; });
      MC.$$('.seg[data-c]').forEach((sg) => MC.$$('button', sg).forEach((b) => b.classList.toggle('on', b.dataset.v === String(S.vals[sg.dataset.c]))));
      MC.$$('select[data-s]').forEach((s) => (s.value = S.vals[s.dataset.s]));
    };
    MC.$$('input[data-n]').forEach((el) => (el.oninput = () => { S.vals[el.dataset.n] = +el.value; MC.$('#pv-' + el.dataset.n).textContent = el.value; setP(el); S.actual = null; MC.$('#pd-sid').textContent = ''; runD(); }));
    MC.$$('.seg[data-c]').forEach((sg) => MC.$$('button', sg).forEach((b) => (b.onclick = () => { S.vals[sg.dataset.c] = b.dataset.v; fillUI(); S.actual = null; runD(); })));
    MC.$$('select[data-s]').forEach((s) => (s.onchange = () => { S.vals[s.dataset.s] = s.value; S.actual = null; runD(); }));
    MC.$('#pd-eps').oninput = (e) => { S.eps = +e.target.value; MC.$('#pv-eps').textContent = S.eps.toFixed(2); setP(e.target); runD(); };
    let lvl = '';
    MC.$$('#pd-lvl button').forEach((b) => (b.onclick = () => { MC.$$('#pd-lvl button').forEach((x) => x.classList.remove('on', 'Low', 'Medium', 'High')); b.classList.add('on'); if (b.dataset.l) b.classList.add(b.dataset.l); lvl = b.dataset.l; }));
    MC.$('#pd-rand').onclick = async () => {
      try { const r = (await MC.api('/predict/sample' + (lvl ? '?level=' + lvl : ''))).data; Object.assign(S.vals, r.values); S.actual = r.actual; S.sid = r.student_id; fillUI();
        MC.$('#pd-sid').innerHTML = `Loaded held-out student <b class="mono">${esc(r.student_id)}</b> (test split) — survey label hidden until classified.`; run(); } catch (e) { MC.toast(e.message, true); }
    };
    run();
  };

  /* ═══════════════════════ TUNING LAB ═══════════════════════ */
  MC.pages.lab = async function (root) {
    const base = (await MC.api('/concepts')).data.params;
    const defs = [
      { k: 'delta', l: 'Margin δ', min: 0, max: 0.15, step: 0.005, dec: 3, tip: 'minimum margin (top1 − top2) for Class(c)' },
      { k: 'eps', l: 'Abstain ε', min: 0, max: 0.3, step: 0.01, dec: 2, tip: 'score gap below which MC-ECII abstains' },
      { k: 'beam', l: 'Beam width', min: 10, max: 200, step: 10, dec: 0, tip: 'candidates kept per refinement level' },
      { k: 'max_len', l: 'Max concept length', min: 1, max: 3, step: 1, dec: 0, tip: 'atoms per conjunction' },
      { k: 'min_support', l: 'Min support', min: 5, max: 60, step: 1, dec: 0, tip: 'students a concept must cover' },
      { k: 'K', l: 'Concepts per class (K)', min: 5, max: 50, step: 1, dec: 0, tip: 'repository size per class' }];
    const P = { ...base }, presets = { 'Deck default': { delta: 0.02, eps: 0, beam: 80, max_len: 3, min_support: 15, K: 25 }, 'Stricter margin': { delta: 0.06, eps: 0, beam: 80, max_len: 3, min_support: 15, K: 25 }, 'Wide beam': { delta: 0.02, eps: 0, beam: 160, max_len: 3, min_support: 15, K: 40 }, 'Short & abstain': { delta: 0.02, eps: 0.15, beam: 80, max_len: 2, min_support: 20, K: 25 } };
    root.innerHTML = MC.head('Tuning <span class="grad">lab</span>', 'Re-train MC-ECII live with different δ, ε, beam, length, support and K — the “Tune MC-ECII” item on the Review-3 roadmap. Results are compared with the deck configuration.') + `
    <div class="grid g-lab">
      <div class="card reveal"><h3>Hyper-parameters</h3><div class="sub">Presets</div><div class="tabs">${Object.keys(presets).map((p) => `<button data-p="${esc(p)}">${esc(p)}</button>`).join('')}</div>
        ${defs.map((d) => `<div class="field"><label title="${esc(d.tip)}">${esc(d.l)}<b id="lv-${d.k}">${(+P[d.k]).toFixed(d.dec)}</b></label><input type="range" id="lr-${d.k}" min="${d.min}" max="${d.max}" step="${d.step}" value="${P[d.k]}"></div>`).join('')}
        <div class="row"><button class="btn primary" id="lab-run">${MC.icon('flask')} Train &amp; evaluate</button><button class="btn" id="lab-apply" disabled>Use in Live Prediction</button><button class="btn" id="lab-reset">Reset model</button></div>
        <div class="callout warn" style="margin-top:16px;font-size:13px"><div class="ic">⚠️</div><div>Scores here are on the held-out test split, so heavy tuning would over-fit it. Final tuning should use repeated CV (ablations A–F on the roadmap).</div></div></div>
      <div id="lab-out"><div class="card loading-box" style="color:var(--muted)">Press <b>Train &amp; evaluate</b> to fit MC-ECII with these settings.</div></div></div>`;
    const sync = () => defs.forEach((d) => { const el = MC.$('#lr-' + d.k); el.value = P[d.k]; el.style.setProperty('--p', ((el.value - d.min) / (d.max - d.min)) * 100 + '%'); MC.$('#lv-' + d.k).textContent = (+P[d.k]).toFixed(d.dec); });
    defs.forEach((d) => { const el = MC.$('#lr-' + d.k); el.oninput = () => { P[d.k] = +el.value; sync(); MC.$('#lab-apply').disabled = true; }; });
    MC.$$('.tabs button[data-p]').forEach((b) => (b.onclick = () => { Object.assign(P, presets[b.dataset.p]); sync(); MC.$('#lab-apply').disabled = true; }));
    sync();
    const delta = (a, b, better = 'up', dec = 3) => { const d = a - b; if (Math.abs(d) < 0.0005) return '<span class="delta eq">±0</span>'; const good = better === 'up' ? d > 0 : d < 0; return `<span class="delta ${good ? 'up' : 'down'}">${d > 0 ? '+' : ''}${d.toFixed(dec)}</span>`; };
    const exec = async (apply) => {
      const out = MC.$('#lab-out'), btn = MC.$('#lab-run'); btn.disabled = true; MC.loading(out, 'Refining concepts…');
      try {
        const r = (await MC.api('/tune', { method: 'POST', body: { ...P, apply } })).data, m = r.metrics, b = r.baseline.metrics;
        const cc = r.concept_counts, bc = r.baseline.concept_counts;
        out.innerHTML = `<div class="grid g3" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
          <div class="card kpi reveal"><div class="v">${f(m.macro_f1)}${delta(m.macro_f1, b.macro_f1)}</div><div class="l">Macro-F1</div><div class="n">deck: ${f(b.macro_f1)}</div></div>
          <div class="card kpi reveal"><div class="v">${f(m.accuracy)}${delta(m.accuracy, b.accuracy)}</div><div class="l">Accuracy</div><div class="n">deck: ${f(b.accuracy)}</div></div>
          <div class="card kpi reveal"><div class="v">${f(m.answered_pct, 0)}%</div><div class="l">Answered</div><div class="n">accuracy on answered ${f(m.accuracy_answered)}</div></div>
          <div class="card kpi reveal"><div class="v">${n(r.evaluations)}${delta(r.evaluations, r.baseline.evaluations, 'down', 0)}</div><div class="l">Coverage evaluations</div><div class="n">${r.seconds}s training</div></div></div>
        <div class="grid g2 mt"><div class="card reveal"><h3>Concepts per class</h3><div class="chartbox" style="height:220px"><canvas id="lab-cc"></canvas></div></div>
          <div class="card reveal"><h3>Confusion matrix</h3><div class="sub">Rows = actual · ABSTAIN shown if ε &gt; 0</div>${MC.confusion(r.confusion.matrix, r.confusion.labels_true, r.confusion.labels_pred)}</div></div>
        <div class="card reveal mt"><h3>Abstention curve vs deck</h3><div class="chartbox" style="height:260px"><canvas id="lab-ab"></canvas></div></div>
        <div class="card reveal mt"><h3>Top concepts per class</h3><div class="grid g3">${CLASSES.map((k) => `<div>${MC.tag(k)}<div style="display:grid;gap:9px;margin-top:10px">${(r.concepts[k] || []).slice(0, 4).map((c) => MC.conceptCard(c, k)).join('') || '<span style="color:var(--muted)">none</span>'}</div></div>`).join('')}</div></div>`;
        MC.animateIn(out);
        MC.chart('lab-cc', { type: 'bar', data: { labels: CLASSES, datasets: [{ label: 'Deck', data: CLASSES.map((k) => bc[k]), backgroundColor: '#cbd5e1' }, { label: 'This run', data: CLASSES.map((k) => cc[k]), backgroundColor: CLASSES.map((k) => COL[k]) }] }, options: { plugins: { legend: { position: 'bottom' } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true } } } });
        const base0 = (await MC.api('/abstention')).data.curve;
        MC.chart('lab-ab', { type: 'scatter', data: { datasets: [{ label: 'Deck config', data: base0.map((x) => ({ x: x.answered_pct, y: x.accuracy_answered, eps: x.eps })), showLine: true, borderColor: '#cbd5e1', pointBackgroundColor: '#cbd5e1', borderDash: [6, 5] }, { label: 'This run', data: r.abstention.map((x) => ({ x: x.answered_pct, y: x.accuracy_answered, eps: x.eps })), showLine: true, borderColor: '#4f46e5', pointBackgroundColor: '#4f46e5' }] },
          options: { scales: { x: { reverse: true, title: { display: true, text: '% answered' } }, y: { title: { display: true, text: 'accuracy on answered' } } }, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (x) => ` ε=${x.raw.eps}: ${f(x.raw.y)} @ ${f(x.raw.x, 1)}%` } } } } });
        MC.$('#lab-apply').disabled = false; if (apply) MC.toast('Applied — Live Prediction now uses this model');
      } catch (e) { MC.toast(e.fields ? Object.entries(e.fields).map(([k, v]) => `${k} ${v}`).join('; ') : e.message, true); out.innerHTML = '<div class="callout warn"><div class="ic">⚠️</div><div>Training failed. Check the parameters and try again.</div></div>'; }
      btn.disabled = false;
    };
    MC.$('#lab-run').onclick = () => exec(false);
    MC.$('#lab-apply').onclick = async () => { try { await MC.api('/tune', { method: 'POST', body: { ...P, apply: true } }); MC.toast('Applied — Live Prediction now uses this model'); } catch (e) { MC.toast(e.message, true); } };
    MC.$('#lab-reset').onclick = async () => { try { await MC.api('/tune/reset', { method: 'POST' }); Object.assign(P, presets['Deck default']); sync(); MC.toast('Restored the deck MC-ECII model'); } catch (e) { MC.toast(e.message, true); } };
  };

  /* ═══════════════════════ METHOD & REVIEW ═══════════════════════ */
  MC.pages.project = async function (root) {
    const [pj, dc] = await Promise.all([MC.api('/project'), MC.api('/docs')]);
    const p = pj.data;
    root.innerHTML = MC.head('Method <span class="grad">&amp; panel review</span>', esc(p.problem)) + `
    <div class="grid g4 reveal" style="grid-template-columns:repeat(auto-fit,minmax(230px,1fr))">${p.objectives.map((o) => `<div class="card hover"><div class="tag brand">Objective ${o.n}</div><div style="font-weight:700;margin-top:10px">${esc(o.text)}</div></div>`).join('')}</div>
    <div class="grid g-12 mt">
      <div class="card reveal"><h3>MC-ECII mechanism</h3><div class="sub">Seven steps, one run</div><div class="steps">${p.mechanism.map((s) => `<div class="step"><div class="n">${s.step}</div><div><b>${esc(s.name)}</b><code>${esc(s.definition)}</code><p>${esc(s.purpose)}</p></div></div>`).join('')}</div></div>
      <div class="grid" style="align-content:start">
        <div class="card reveal"><h3>Worked illustration</h3><div class="sub">From the deck</div><div class="callout"><div class="ic">💡</div><div><b>Assignment_Load = High</b> has V = (0.10, 0.27, 0.49) → Class = <b>High</b>, margin 0.22 ≥ δ → stored in the High repository and later used to explain High-risk predictions.</div></div></div>
        <div class="card reveal"><h3>Preprocessing &amp; leakage control</h3><div class="sub">Identical for every model</div><div style="display:grid;gap:9px">${p.preprocessing.map((x) => `<div style="display:flex;gap:10px;font-size:13.5px"><span style="color:var(--ok)">✔</span>${esc(x)}</div>`).join('')}</div></div>
        <div class="card reveal"><h3>Dataset</h3><div class="kv" style="grid-template-columns:1fr">${Object.entries(p.collection).map(([k, v]) => `<div><span>${esc(k)}</span><b style="text-align:right">${esc(v)}</b></div>`).join('')}</div></div>
        <div class="card reveal"><h3>Tools</h3><div class="tw"><table><tbody>${p.tools.map((t) => `<tr><td><b>${esc(t.tool)}</b></td><td>${esc(t.use)}</td></tr>`).join('')}</tbody></table></div></div>
      </div></div>
    <div class="grid g2 mt">
      <div class="card reveal"><h3>Anticipated panel questions</h3><div class="sub">Click to reveal the answer</div>${p.panel_qa.map((x) => `<div class="acc"><button>${esc(x.q)}</button><div class="ans">${esc(x.a)}</div></div>`).join('')}</div>
      <div class="grid" style="align-content:start">
        <div class="card reveal"><h3>Plan for Review 3</h3><div class="sub">Remaining work</div><div class="tl">${p.roadmap.map((r) => `<div class="it"><span class="when">${esc(r.when)}</span><span style="font-weight:600">${esc(r.task)}</span><span class="tag ${r.status === 'in-progress' ? 'brand' : ''}">${esc(r.status)}</span></div>`).join('')}</div></div>
        <div class="card reveal"><h3>Verification &amp; limitations</h3><div style="display:grid;gap:9px;margin-top:10px">${p.limitations.map((x) => `<div style="display:flex;gap:10px;font-size:13.5px"><span style="color:var(--warn)">◆</span>${esc(x)}</div>`).join('')}</div></div></div></div>
    <div class="grid g2 mt">
      <div class="card reveal"><h3>REST API explorer <span class="tag brand">${dc.data.length} endpoints</span></h3><div class="sub">Everything on this dashboard is served by these Flask routes</div>${dc.data.map((r) => `<div class="ep"><b class="m ${r.methods[0]}">${r.methods[0]}</b><div>${r.methods.includes('GET') && !r.path.includes('<') ? `<a href="${r.path}" target="_blank" rel="noopener">${esc(r.path)}</a>` : `<a style="pointer-events:none">${esc(r.path)}</a>`}<small>${esc(r.summary)}</small></div></div>`).join('')}</div>
      <div class="card reveal"><h3>References</h3><ol style="padding-left:20px;display:grid;gap:9px;font-size:13px;color:var(--ink-2)">${p.references.map((x) => `<li>${esc(x)}</li>`).join('')}</ol></div></div>`;
    MC.$$('.acc button').forEach((b) => (b.onclick = () => b.parentElement.classList.toggle('open')));
  };
})();
