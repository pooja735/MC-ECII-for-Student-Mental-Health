/* MC-ECII dashboard · data & knowledge pages: overview, dataset, ontology, coverage */
(function () {
  'use strict';
  const MC = window.MC, { esc, f, n, CLASSES, COL } = MC;

  /* ═══════════════════════ OVERVIEW ═══════════════════════ */
  MC.pages.overview = async function (root) {
    const [ov, pj] = await Promise.all([MC.api('/overview'), MC.api('/project')]);
    const o = ov.data, k = o.kpis, p = pj.data;
    const hasML = k.best_model != null;
    const progAvg = Math.round(p.progress.reduce((a, b) => a + b.pct, 0) / p.progress.length);
    root.innerHTML = `
    <div class="hero reveal">
      <span class="eyebrow">● ${esc(p.phase)} · ${esc(p.institution)}</span>
      <h1>${esc(p.title.split('Using')[0])}<span class="grad">Using an Ontology-Guided MC-ECII Framework</span></h1>
      <p>MC-ECII extends ECII (Sarker &amp; Hitzler, AAAI 2019) from binary to a class-aware multiclass concept-induction framework: it classifies students as Low / Medium / High stress-risk in a single run and returns compact, readable Description-Logic explanations.</p>
      <div class="row"><a class="btn primary" href="#predict">${MC.icon('bolt').replace('<svg', '<svg')} Try live prediction</a><a class="btn" href="#compare">ECII vs MC-ECII</a><a class="btn" href="#project">Method &amp; panel Q&amp;A</a></div>
    </div>

    <div class="grid g3 mt" style="grid-template-columns:repeat(auto-fit,minmax(290px,1fr))">
      ${MC.kpi({ icon: 'users', label: 'Survey responses', value: k.students, note: `${k.states} states / UTs · 0 missing` })}
      ${MC.kpi({ icon: 'sliders', label: 'Model input features', value: k.features, note: '13 leakage columns removed', cls: 'c2' })}
      ${MC.kpi({ icon: 'graph', label: 'DL ontology predicates', value: k.predicates, note: `${k.atoms} level-wise atoms`, cls: 'c3' })}
      ${hasML ? MC.kpi({ icon: 'chart', label: 'Best ML · Macro-F1', value: k.best_macro_f1, dec: 3, note: `${k.best_model} · AUC ${f(k.best_auc)}`, cls: 'c4' }) : MC.kpi({ icon: 'chart', label: 'Best ML · Macro-F1', text: '…', note: 'benchmark is computing', cls: 'c4' })}
      ${MC.kpi({ icon: 'bulb', label: 'MC-ECII · Macro-F1', value: k.mc_macro_f1, dec: 3, note: 'readable symbolic concepts', cls: 'c5' })}
      ${MC.kpi({ icon: 'shield', label: 'Cronbach α (12 items)', value: k.alpha, dec: 3, note: `majority baseline ${f(k.majority_accuracy)}`, cls: 'c6' })}
    </div>

    <div class="grid g-12 mt">
      <div class="card reveal"><h3>Stress-risk classes</h3><div class="sub">Near-balanced — no resampling needed</div>
        <div class="chartbox" style="height:270px"><canvas id="ov-class"></canvas></div>
        <div class="row" style="justify-content:center;margin-top:10px">${CLASSES.map((c) => `<span class="tag ${c}">${c} ${o.score_bands[c]}</span>`).join('')}</div></div>
      <div class="card reveal"><h3>Implementation progress <span class="tag brand">${esc(o.progress_overall)}</span></h3><div class="sub">Effort-weighted self-assessment from the review deck</div>
        <div class="grid prog-grid">
          <div class="ring"><svg viewBox="0 0 150 150"><circle class="bg" cx="75" cy="75" r="65"/><circle class="fg" cx="75" cy="75" r="65" data-pct="${progAvg}"/></svg><div class="t"><div>${progAvg}%<small>average</small></div></div></div>
          <div class="prog">${o.progress.map((x) => `<div class="it"><span>${esc(x.task)}</span><em>${x.pct}%</em><div class="b"><span class="${x.pct === 100 ? 'done' : ''}" data-w="${x.pct}"></span></div></div>`).join('')}</div>
        </div></div>
    </div>

    <div class="card reveal mt"><h3>MC-ECII system architecture</h3><div class="sub">Single run · single class per student · human oversight (PREDICT → MONITOR → CONTROL → REMEDY)</div>
      <div class="pipe">${p.architecture.map((a, i) => `${i ? '<div class="link"></div>' : ''}<div class="node"><div class="i">${i + 1}</div><b>${esc(a.title)}</b><span>${esc(a.text)}</span></div>`).join('')}</div></div>

    <div class="grid g3 mt">
      <div class="card reveal"><h3>Gender</h3><div class="sub">Self-reported</div><div class="chartbox" style="height:230px"><canvas id="ov-gender"></canvas></div></div>
      <div class="card reveal span2"><h3>Responses by state / UT</h3><div class="sub">10 regions covered</div><div class="chartbox" style="height:230px"><canvas id="ov-state"></canvas></div></div>
    </div>

    <div class="grid g2 mt">
      <div class="card reveal"><h3>Data quality &amp; leakage control</h3><div class="sub">Everything below is computed live from the CSV</div>
        <div class="kv" style="grid-template-columns:1fr">
          <div><span>Missing cells</span><b>${k.missing}</b></div><div><span>Duplicate rows</span><b>${k.duplicates}</b></div>
          <div><span>Screen-time flagged rows (social media &gt; screen time)</span><b>${k.flagged}</b></div>
          <div><span>Train / test (stratified 80:20)</span><b>${n(o.split.train.Low + o.split.train.Medium + o.split.train.High)} / ${n(o.split.test.Low + o.split.test.Medium + o.split.test.High)}</b></div>
          <div><span>Majority-class baseline (test)</span><b>${f(k.majority_accuracy)}</b></div></div></div>
      <div class="card reveal"><h3>Train / test class balance</h3><div class="sub">Stratification keeps proportions identical</div><div class="chartbox" style="height:220px"><canvas id="ov-split"></canvas></div></div>
    </div>
    <div class="callout mt reveal"><div class="ic">ℹ️</div><div><b>Non-diagnostic.</b> ${esc(p.disclaimer)}</div></div>`;

    const centre = { id: 'centre', afterDraw(c) { const { ctx, chartArea: a } = c; ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = '#0f172a'; ctx.font = '800 30px "Plus Jakarta Sans",sans-serif';
      ctx.fillText(n(k.students), (a.left + a.right) / 2, (a.top + a.bottom) / 2 + 6); ctx.fillStyle = '#64748b'; ctx.font = '600 12px "Plus Jakarta Sans",sans-serif'; ctx.fillText('students', (a.left + a.right) / 2, (a.top + a.bottom) / 2 + 26); ctx.restore(); } };
    MC.chart('ov-class', { type: 'doughnut', plugins: [centre], data: { labels: CLASSES, datasets: [{ data: CLASSES.map((c) => o.classes[c].count), backgroundColor: CLASSES.map((c) => COL[c]), borderColor: '#fff', borderWidth: 4, hoverOffset: 12 }] },
      options: { cutout: '70%', plugins: { legend: { position: 'right' }, tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.raw} (${o.classes[c.label].pct}%)` } } }, animation: { animateRotate: true, animateScale: true, duration: 1600 } } });
    MC.chart('ov-gender', { type: 'doughnut', data: { labels: Object.keys(o.gender), datasets: [{ data: Object.values(o.gender), backgroundColor: ['#7c3aed', '#06b6d4', '#cbd5e1'], borderColor: '#fff', borderWidth: 4 }] }, options: { cutout: '62%', plugins: { legend: { position: 'bottom' } } } });
    MC.chart('ov-state', { type: 'bar', data: { labels: Object.keys(o.states), datasets: [{ label: 'Responses', data: Object.values(o.states), backgroundColor: (c) => { const g = c.chart.ctx.createLinearGradient(0, 0, 0, 230); g.addColorStop(0, '#6366f1'); g.addColorStop(1, '#06b6d4'); return g; }, maxBarThickness: 40 }] }, options: { plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { maxRotation: 40, autoSkip: false, font: { size: 11 } } }, y: { beginAtZero: true } } } });
    MC.chart('ov-split', { type: 'bar', data: { labels: ['Train', 'Test'], datasets: CLASSES.map((c) => ({ label: c, data: [o.split.train[c], o.split.test[c]], backgroundColor: COL[c] })) }, options: { indexAxis: 'y', scales: { x: { stacked: true, grid: { display: true } }, y: { stacked: true, grid: { display: false } } }, plugins: { legend: { position: 'bottom' } } } });
  };

  /* ═══════════════════════ DATASET & EDA ═══════════════════════ */
  MC.pages.dataset = async function (root) {
    var eda = null;
    try { eda = (await MC.api('/eda')).data; } catch (e) { console.warn('EDA fetch failed:', e); }

    /* ── EDA charts section (only if data loaded) ── */
    var edaHTML = '';
    if (eda && eda.hist && eda.categorical && Object.keys(eda.hist).length && Object.keys(eda.categorical).length) {
      var numeric = Object.keys(eda.hist), cats = Object.keys(eda.categorical);
      edaHTML = MC.head('Dataset <span class="grad">&amp; exploratory analysis</span>', 'Primary survey of Indian university students — explore distributions by stress class, then drill down to any student and see the symbolic explanation.') + `
      <div class="grid g2">
        <div class="card reveal"><h3>Distribution by class</h3><div class="sub">Stacked histogram of any numeric variable</div>
          <select class="inp" id="eda-num" style="margin-bottom:12px">${numeric.map((c) => `<option value="${c}">${MC.pretty(c)}</option>`).join('')}</select>
          <div class="chartbox" style="height:300px"><canvas id="eda-hist"></canvas></div></div>
        <div class="card reveal"><h3>Category vs class</h3><div class="sub">Share of Low / Medium / High within each level</div>
          <select class="inp" id="eda-cat" style="margin-bottom:12px">${cats.map((c) => `<option value="${c}" ${c === 'Assignment_Load' ? 'selected' : ''}>${MC.pretty(c)}</option>`).join('')}</select>
          <div class="chartbox" style="height:300px"><canvas id="eda-cat-c"></canvas></div></div>
      </div>
      <div class="grid g2 mt">
        <div class="card reveal"><h3>Correlation with stress score</h3><div class="sub">Pearson r — exploratory only; the score is never a model input</div><div class="chartbox" style="height:290px"><canvas id="eda-corr"></canvas></div></div>
        <div class="card reveal"><h3>Class means of numeric inputs</h3><div class="sub">Darker = higher mean within the row</div><div id="eda-means"></div></div>
      </div>`;
    } else {
      edaHTML = MC.head('Dataset <span class="grad">&amp; student explorer</span>', 'Primary survey of Indian university students — drill down to any student and see the symbolic explanation.');
    }

    root.innerHTML = edaHTML + `
    <div class="card reveal mt"><h3>Student explorer <span class="tag brand" id="ds-total"></span></h3><div class="sub">Click any row for the full MC-ECII explanation</div>
      <div class="row" style="margin-bottom:14px">
        <input class="inp" id="ds-q" placeholder="Search ID e.g. S0042" style="max-width:190px">
        <select class="inp" id="ds-level" style="max-width:150px"><option value="">All classes</option>${CLASSES.map((c) => `<option>${c}</option>`).join('')}</select>
        <select class="inp" id="ds-state" style="max-width:190px"><option value="">All states</option></select>
        <select class="inp" id="ds-gender" style="max-width:170px"><option value="">All genders</option></select>
        <select class="inp" id="ds-univ" style="max-width:150px"><option value="">Any university</option></select>
        <select class="inp" id="ds-split" style="max-width:130px"><option value="">Train + test</option><option value="train">Train</option><option value="test">Test</option></select></div>
      <div class="tw" style="max-height:560px"><table><thead id="ds-head"></thead><tbody id="ds-body"></tbody></table></div><div class="pager" id="ds-pager"></div></div>`;

    /* ── draw EDA charts if we have data ── */
    if (eda && eda.hist && eda.categorical && Object.keys(eda.hist).length && Object.keys(eda.categorical).length) {
      var drawHist = function () {
        try {
          var key = MC.$('#eda-num').value, h = eda.hist[key]; if (!h) return;
          var e = h.edges;
          var labels = h.by_class.Low.map(function (_, i) { return e[i + 1] - e[i] === 1 ? String(e[i]) : Math.round(e[i]) + '–' + Math.round(e[i + 1] - 1); });
          MC.chart('eda-hist', { type: 'bar', data: { labels: labels, datasets: CLASSES.map(function (c) { return { label: c, data: h.by_class[c], backgroundColor: MC.rgba(COL[c], .88), borderRadius: 4, borderSkipped: false }; }) },
            options: { scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, title: { display: true, text: 'students' } } }, plugins: { legend: { position: 'bottom' } }, interaction: { mode: 'index' } } });
        } catch (err) { console.warn('drawHist error:', err); }
      };
      var drawCat = function () {
        try {
          var key = MC.$('#eda-cat').value, c = eda.categorical[key]; if (!c) return;
          var totals = c.levels.map(function (_, i) { return CLASSES.reduce(function (a, k) { return a + c.counts[k][i]; }, 0); });
          MC.chart('eda-cat-c', { type: 'bar', data: { labels: c.levels, datasets: CLASSES.map(function (k) { return { label: k, data: c.counts[k].map(function (v, i) { return +(100 * v / (totals[i] || 1)).toFixed(1); }), backgroundColor: COL[k] }; }) },
            options: { scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, max: 100, title: { display: true, text: '% of level' } } }, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: function (x) { return ' ' + x.dataset.label + ': ' + x.raw + '% (' + c.counts[x.dataset.label][x.dataIndex] + ' students)'; } } } } } });
        } catch (err) { console.warn('drawCat error:', err); }
      };
      MC.$('#eda-num').onchange = drawHist; MC.$('#eda-cat').onchange = drawCat; drawHist(); drawCat();

      try {
        var cr = Object.entries(eda.correlation);
        MC.chart('eda-corr', { type: 'bar', data: { labels: cr.map(function (x) { return MC.pretty(x[0]); }), datasets: [{ data: cr.map(function (x) { return x[1]; }), backgroundColor: cr.map(function (x) { return x[1] >= 0 ? MC.rgba(COL.High, .85) : MC.rgba(COL.Low, .85); }) }] },
          options: { indexAxis: 'y', plugins: { legend: { display: false } }, scales: { y: { grid: { display: false } }, x: { title: { display: true, text: 'Pearson r with Stress_Score' } } } } });
      } catch (err) { console.warn('Correlation chart error:', err); }

      try {
        var feats = Object.keys(eda.means.Low || {});
        if (feats.length) {
          var mx = {}, mn = {}; feats.forEach(function (c) { var v = CLASSES.map(function (k) { return eda.means[k][c]; }); mx[c] = Math.max.apply(null, v); mn[c] = Math.min.apply(null, v); });
          MC.$('#eda-means').innerHTML = '<div class="heat" style="grid-template-columns:150px repeat(3,1fr)"><div></div>' + CLASSES.map(function (c) { return '<div class="h">' + c + '</div>'; }).join('') + feats.map(function (c, ri) { return '<div class="lbl">' + MC.pretty(c) + '</div>' + CLASSES.map(function (k, ci) { var t = mx[c] === mn[c] ? .5 : (eda.means[k][c] - mn[c]) / (mx[c] - mn[c]); var col = MC.blueColor(t); return '<div class="c" style="background:' + col.bg + ';color:' + col.fg + ';--d:' + (ri * 3 + ci) * .03 + 's">' + f(eda.means[k][c], 1) + '</div>'; }).join(''); }).join('') + '</div>';
        }
      } catch (err) { console.warn('Means heatmap error:', err); }
    }

    /* ── student table ── */
    const st = { page: 1, sort: 'Student_ID', order: 'asc' }, show = ['Student_ID', 'Age', 'Gender', 'State', 'Study_Hours', 'Class_Attendance', 'Sleep_Hours', 'Screen_Time', 'Anxiety_Level', 'Assignment_Load', 'Exam_Frequency', 'University_Type', 'Stress_Score', 'Stress_Level'];
    MC.$('#ds-head').innerHTML = `<tr>${show.map((c) => `<th class="sort" data-c="${c}">${MC.pretty(c)} <span class="arr"></span></th>`).join('')}</tr>`;
    const load = async () => {
      const q = new URLSearchParams({ page: st.page, per_page: 12, sort: st.sort, order: st.order });
      [['q', '#ds-q'], ['level', '#ds-level'], ['state', '#ds-state'], ['gender', '#ds-gender'], ['university', '#ds-univ'], ['split', '#ds-split']].forEach(([k, s]) => { const v = MC.$(s).value; if (v) q.set(k, v); });
      try {
        const r = await MC.api('/dataset?' + q);
        const fill = (sel, arr) => { const el = MC.$(sel); if (el.options.length === 1) arr.forEach((v) => el.add(new Option(v, v))); };
        fill('#ds-state', r.meta.filters.states); fill('#ds-gender', r.meta.filters.genders); fill('#ds-univ', r.meta.filters.universities);
        MC.$('#ds-total').textContent = `${n(r.meta.total)} students`;
        MC.$('#ds-body').innerHTML = r.data.rows.map((x) => `<tr class="click" data-id="${x.Student_ID}">${show.map((c) => `<td>${c === 'Stress_Level' ? MC.tag(x[c]) : c === 'Student_ID' ? `<b class="mono">${x[c]}</b>` : esc(x[c])}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${show.length}" style="text-align:center;padding:30px;color:var(--muted)">No students match these filters.</td></tr>`;
        MC.$$('#ds-body tr.click').forEach((tr) => (tr.onclick = () => MC.openStudent(tr.dataset.id)));
        MC.$$('#ds-head th').forEach((th) => (th.querySelector('.arr').textContent = th.dataset.c === st.sort ? (st.order === 'asc' ? '▲' : '▼') : ''));
        const pg = r.meta.pages, cur = r.meta.page, btn = (l, p, dis, on) => `<button ${dis ? 'disabled' : ''} class="${on ? 'on' : ''}" data-p="${p}">${l}</button>`;
        let b = btn('‹', cur - 1, cur === 1); const lo = Math.max(1, cur - 2), hi = Math.min(pg, cur + 2);
        if (lo > 1) b += btn(1, 1) + (lo > 2 ? '<span>…</span>' : '');
        for (let i = lo; i <= hi; i++) b += btn(i, i, false, i === cur);
        if (hi < pg) b += (hi < pg - 1 ? '<span>…</span>' : '') + btn(pg, pg);
        MC.$('#ds-pager').innerHTML = b + btn('›', cur + 1, cur === pg);
        MC.$$('#ds-pager button').forEach((x) => (x.onclick = () => { st.page = +x.dataset.p; load(); }));
      } catch (e) { MC.toast(e.message, true); }
    };
    MC.$$('#ds-head th').forEach((th) => (th.onclick = () => { st.order = st.sort === th.dataset.c && st.order === 'asc' ? 'desc' : 'asc'; st.sort = th.dataset.c; st.page = 1; load(); }));
    ['#ds-level', '#ds-state', '#ds-gender', '#ds-univ', '#ds-split'].forEach((s) => (MC.$(s).onchange = () => { st.page = 1; load(); }));
    MC.$('#ds-q').oninput = MC.debounce(() => { st.page = 1; load(); }, 300);
    load();
  };

  /* ═══════════════════════ ONTOLOGY ═══════════════════════ */
  MC.pages.ontology = async function (root) {
    const o = (await MC.api('/ontology')).data;
    root.innerHTML = MC.head('Ontology <span class="grad">&amp; Description Logic</span>', 'Every predicate becomes an OWL defined class. Numeric thresholds are training-split quantiles — modelling choices, not clinical cut-offs.') + `
    <div class="grid g4" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))">
      ${MC.kpi({ icon: 'graph', label: 'OWL classes', value: o.counts.classes, note: 'Student, RiskClass, 3 risk, 14 predicates' })}
      ${MC.kpi({ icon: 'sliders', label: 'Data properties', value: o.counts.data_properties, cls: 'c2', note: 'functional, domain = Student' })}
      ${MC.kpi({ icon: 'users', label: 'Student individuals', value: o.counts.individuals, cls: 'c3' })}
      ${MC.kpi({ icon: 'shield', label: 'HermiT agreement', text: `${o.hermit.identical}/${o.hermit.sample}`, cls: 'c4', note: `stratified sample · ${o.hermit.seconds}s` })}
    </div>
    <div class="row mt reveal"><a class="btn primary" href="/api/ontology/owl" download>${MC.icon('dl').replace('<svg', '<svg')} OWL schema (.owl)</a><a class="btn" href="/api/ontology/owl?individuals=1" download>OWL + 2,066 individuals</a>
      <a class="btn" href="/api/export/predicate_matrix" download>Predicate matrix CSV</a><a class="btn" href="/api/export/predicate_thresholds" download>Thresholds CSV</a></div>
    <div class="grid mt" style="grid-template-columns:repeat(auto-fill,minmax(310px,1fr))">${o.predicates.map((p) => `
      <div class="card pcard hover reveal"><div class="nm"><span>${esc(p.name)}</span><span class="tag brand">${esc(p.operator)} ${esc(p.threshold)}</span></div>
        <div class="dl">${esc(p.dl)}</div><div class="pv"><span data-w="${p.prevalence_pct}"></span></div>
        <small><span>${esc(MC.pretty(p.column))} · <span class="mono">${esc(p.property)}</span></span><b style="color:var(--ink)">${p.prevalence_pct}% of students</b></small></div>`).join('')}</div>
    <div class="grid g2 mt">
      <div class="card reveal"><h3>Class hierarchy</h3><div class="sub">Student ⊐ RiskClass ⊐ {Low, Medium, High}RiskStudent (pairwise disjoint)</div>
        <div class="mono" style="font-size:13px;line-height:2;background:#f8f9ff;padding:16px;border-radius:12px">Thing<br>└─ <b>Student</b><br>&nbsp;&nbsp;&nbsp;├─ <b>RiskClass</b><br>&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;├─ LowRiskStudent<br>&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;├─ MediumRiskStudent<br>&nbsp;&nbsp;&nbsp;│&nbsp;&nbsp;&nbsp;└─ HighRiskStudent<br>&nbsp;&nbsp;&nbsp;└─ ${o.predicates.length} predicate classes <span style="color:var(--muted)">(HighStudyHours, LowSleep, …)</span></div></div>
      <div class="card reveal"><h3>Reasoner validation</h3><div class="sub">DL reasoning vs direct computation</div>
        <div class="callout"><div class="ic">✅</div><div><b>${o.hermit.identical} / ${o.hermit.sample} memberships identical.</b><br>${esc(o.hermit.note)}</div></div>
        <div class="callout warn mt"><div class="ic">⚠️</div><div>${esc(o.note)}</div></div></div></div>
    <div class="card reveal mt"><h3>Level-wise atoms used by MC-ECII <span class="tag brand">${o.atoms.length} atoms</span></h3><div class="sub">Numeric: Low ≤ 33rd pct · Mid · High ≥ 67th pct (training quantiles). Categorical: one atom per level.</div>
      <div class="tw" style="max-height:380px"><table><thead><tr><th>Atom</th><th>Readable</th><th>Description Logic</th></tr></thead><tbody>${o.atoms.map((a) => `<tr><td><b>${esc(a.name)}</b></td><td>${esc(a.label)}</td><td class="mono" style="font-size:12px">${esc(a.dl)}</td></tr>`).join('')}</tbody></table></div></div>`;
  };

  /* ═══════════════════════ COVERAGE ═══════════════════════ */
  MC.pages.coverage = async function (root) {
    const c = (await MC.api('/coverage')).data, rows = c.rows;
    const mx = Math.max(...rows.flatMap((r) => CLASSES.map((k) => r.norm[k])));
    const byM = (k) => rows.filter((r) => r.class === k).sort((a, b) => b.margin - a.margin)[0], high = byM('High'), low = byM('Low');
    root.innerHTML = MC.head('Class-wise <span class="grad">coverage</span>', 'Cov(c,k) counts the students of class k satisfying concept c; V(c)ₖ = Cov(c,k)/nₖ removes the size bias so the biggest class cannot dominate. Class(c) = argmax V(c), kept if margin ≥ δ.') + `
    <div class="grid g-21">
      <div class="card reveal"><h3>Normalised coverage heatmap <span class="tag">training set</span></h3><div class="sub">n = ${CLASSES.map((k) => `${k} ${c.class_n[k]}`).join(' · ')}</div>
        <div class="hscroll"><div class="heat" style="grid-template-columns:190px repeat(3,1fr) 90px 150px;min-width:640px"><div></div>${CLASSES.map((k) => `<div class="h">V(${k})</div>`).join('')}<div class="h">Class(c)</div><div class="h">Margin</div>
        ${rows.map((r, ri) => `<div class="lbl">${esc(r.concept)}</div>${CLASSES.map((k, ci) => { const col = MC.heatColor(r.norm[k] / mx); return `<div class="c" title="Cov = ${r.cov[k]}" style="background:${col.bg};color:${col.fg};--d:${(ri * 3 + ci) * .018}s">${f(r.norm[k], 2)}</div>`; }).join('')}
          <div style="display:grid;place-items:center">${MC.tag(r.class)}</div><div style="display:flex;align-items:center;gap:8px"><div class="bar" style="flex:1;height:7px"><span style="width:0;animation:none" data-w="${Math.min(100, r.margin * 220)}"></span></div><b style="font-size:12px;width:34px">${f(r.margin, 2)}</b></div>`).join('')}</div></div></div>
      <div class="grid" style="align-content:start">
        <div class="card reveal"><h3>What the coverage says</h3><div class="sub">Computed live</div>
          <div class="callout" style="margin-bottom:10px"><div class="ic">🔺</div><div><b>${esc(high.concept)}</b> is the strongest High marker: V = ${CLASSES.map((k) => f(high.norm[k], 2)).join(' → ')} (margin ${f(high.margin, 2)}).</div></div>
          <div class="callout" style="margin-bottom:10px"><div class="ic">🟢</div><div>${low && low.margin >= c.delta ? `<b>${esc(low.concept)}</b> is the strongest Low marker (margin ${f(low.margin, 2)}).` : `No single predicate is a clear <b>Low</b> marker (best: ${low ? esc(low.concept) : '–'}, margin ${low ? f(low.margin, 2) : '–'}). Low risk is described better by level-wise atoms such as <b>Assignment_Load=Low</b> — see Explanations.`}</div></div>
          <div class="callout warn"><div class="ic">⚖️</div><div>Predicates with a tiny margin (e.g. <b>${esc(rows[rows.length - 1].concept)}</b>, ${f(rows[rows.length - 1].margin, 2)}) are weak discriminators — they fall below δ = ${c.delta} and are dropped.</div></div></div>
        <div class="card reveal"><h3>Cov(c,k) raw counts</h3><div class="sub">Top 6 by margin</div><div class="tw"><table><thead><tr><th>Concept</th><th class="num">Low</th><th class="num">Med</th><th class="num">High</th></tr></thead><tbody>${rows.slice(0, 6).map((r) => `<tr><td>${esc(r.concept)}</td>${CLASSES.map((k) => `<td class="num">${r.cov[k]}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>
      </div></div>
    <div class="card reveal mt"><h3>Two-predicate candidates <span class="tag brand">length-2 conjunctions · support ≥ 20</span></h3><div class="sub">The kind of expressions ECII / MC-ECII refine and prune — best 5 per class by margin</div>
      <div class="grid g3">${CLASSES.map((k) => `<div><div style="margin-bottom:10px">${MC.tag(k, ' class')}</div><div style="display:grid;gap:9px">${(c.pairs[k] || []).map((p) => `<div class="concept ${k}"><div class="t">${esc(p.concept.replace(' ⊓ ', '  ⊓  '))}</div><div class="vleg"><span>support ${p.support}</span><span>precision ${f(p.precision, 2)}</span><span>margin <b style="color:var(--ink)">${f(p.margin, 2)}</b></span></div></div>`).join('') || '<div style="color:var(--muted)">No candidate reaches the support threshold.</div>'}</div></div>`).join('')}</div>
      <div class="row" style="margin-top:16px"><a class="btn sm" href="/api/export/coverage" download>${MC.icon('dl')} Coverage CSV</a></div></div>`;
  };
})();
