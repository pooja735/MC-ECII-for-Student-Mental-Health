/* MC-ECII dashboard · Explainable AI (Groq) — settings page, "Explain AI" page, explain side-panel */
(function () {
  'use strict';
  const MC = window.MC, esc = MC.esc;

  const LEVELS = [['simple', 'Simple'], ['eli5', 'Like I’m 12'], ['detailed', 'More detail']];
  const LANGS = ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Malayalam', 'Marathi', 'Bengali', 'Gujarati', 'Urdu', 'Spanish', 'French', 'German', 'Arabic'];
  const MAX_CLIENT_CHARS = 120000;           // keeps the request far below the server's 1 MB body limit

  /* what each page is about — passed to the AI as background so it explains the numbers correctly */
  const HINTS = {
    overview: 'Project overview: dataset size, class distribution of Low/Medium/High stress, demographics and implementation progress.',
    dataset: 'Exploratory analysis of the student survey: histograms per stress class, category-vs-class counts, correlations, and a page of the student table.',
    ontology: 'The ontology: 14 Description-Logic predicates (named yes/no properties of a student) with thresholds learned from the training split and how common each is.',
    coverage: 'Class-wise coverage of concepts: Cov(c,k), size-normalised V(c), the class each concept votes for, and margins.',
    ml: 'Benchmark of 6 standard ML models on a held-out test set plus repeated 5x3 cross-validation: accuracy, macro-F1, AUC, per-class F1, confusion matrices and feature drivers.',
    compare: 'Comparison of ECII, One-vs-Rest ECII and MC-ECII: number of concept evaluations, how often predictions conflict, per-class F1 and the abstention trade-off.',
    concepts: 'The concept repository MC-ECII learned, grouped by class, each with V(c) values and a Description-Logic expression.',
    predict: 'One student profile classified by MC-ECII with a Logistic Regression cross-check and the matched symbolic concepts.',
    lab: 'Tuning lab: MC-ECII retrained with custom delta, epsilon, beam, length, support and K, compared with the reference results.',
    project: 'Method, preprocessing, panel review Q&A, roadmap and limitations of the project.',
  };
  MC.hints = HINTS;
  MC.pageExplain = {};                       // page name -> () => {title, context, data}   (optional override)

  /* ---------- markdown-lite (escape first, then format → safe) ---------- */
  MC.md = function (src) {
    const lines = esc(src).split(/\r?\n/);
    let html = '', list = null, para = [];
    const inl = (t) => t.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>');
    const flushP = () => { if (para.length) { html += `<p>${inl(para.join(' '))}</p>`; para = []; } };
    const flushL = () => { if (list) { html += `</${list}>`; list = null; } };
    for (const raw of lines) {
      const l = raw.trim(); let m;
      if (!l) { flushP(); flushL(); continue; }
      if ((m = l.match(/^#{1,4}\s+(.*)$/))) { flushP(); flushL(); html += `<h4>${inl(m[1])}</h4>`; continue; }
      if ((m = l.match(/^[-*•]\s+(.*)$/))) { flushP(); if (list !== 'ul') { flushL(); html += '<ul>'; list = 'ul'; } html += `<li>${inl(m[1])}</li>`; continue; }
      if ((m = l.match(/^\d+[.)]\s+(.*)$/))) { flushP(); if (list !== 'ol') { flushL(); html += '<ol>'; list = 'ol'; } html += `<li>${inl(m[1])}</li>`; continue; }
      flushL(); para.push(l);
    }
    flushP(); flushL();
    return html;
  };

  /* ---------- settings cache ---------- */
  const X = (MC.xai = { cache: null });
  X.get = async (force) => { if (!X.cache || force) X.cache = (await MC.api('/settings')).data; return X.cache; };

  /* compact, readable summary of one MC-ECII explanation (used by Live Prediction + student drawer) */
  MC.exSummary = function (ex, ml) {
    const top = MC.CLASSES.reduce((a, k) => (ex.scores[k] > ex.scores[a] ? k : a), 'Low');
    const cls = ex.prediction || top;
    return {
      mc_ecii_verdict: ex.abstained ? 'Abstained — the evidence for the top two classes is too close' : ex.prediction + ' risk',
      class_scores: ex.scores, score_gap_to_runner_up: ex.gap, matched_concept_counts: ex.matched_counts, concepts_in_repository: ex.repository_sizes,
      strongest_matched_concepts: ((ex.matched || {})[cls] || []).slice(0, 5).map((c) => ({ rule: c.readable || c.text, margin: c.margin, V: c.V })),
      ontology_predicates_that_hold: (ex.predicates || []).filter((p) => p.true).map((p) => p.name),
      logistic_regression_reference: ml ? { prediction: ml.prediction, probabilities: ml.probabilities } : null,
    };
  };

  /* ---------- the reusable explain view ---------- */
  /** Renders controls + output into `el`. getReq() → {title, context, data, question?}. */
  MC.explain = {};
  MC.explain.view = function (el, getReq, opts = {}) {
    const S = { level: null, busy: false, text: '' };
    el.innerHTML = `
      <div class="xctl"><span class="xlbl">Style</span><div class="seg xlevel">${LEVELS.map(([k, l]) => `<button data-l="${k}">${l}</button>`).join('')}</div></div>
      <div class="xout"></div>
      <div class="xask"><input class="inp" maxlength="500" placeholder="Ask a follow-up, e.g. “Which result should I worry about?”"><button class="btn sm primary" data-a="ask">Ask</button></div>
      <div class="row xact"><button class="btn sm" data-a="regen">${MC.icon('bolt')} ${opts.runLabel || 'Regenerate'}</button><button class="btn sm" data-a="copy">Copy</button></div>`;
    const out = MC.$('.xout', el), ask = MC.$('.xask input', el), regen = MC.$('[data-a=regen]', el), copyB = MC.$('[data-a=copy]', el), askB = MC.$('[data-a=ask]', el);
    const setLevel = (l) => { S.level = l; MC.$$('.xlevel button', el).forEach((b) => b.classList.toggle('on', b.dataset.l === l)); };
    const noKey = () => `<div class="callout warn"><div class="ic">🔑</div><div><b>Add your Groq API key to use Explainable AI.</b><br>It takes a minute and the key stays on this computer.<div style="margin-top:10px"><a class="btn sm primary" href="#settings" onclick="MC.explain.close()">Open Settings</a></div></div></div>`;
    const skeleton = () => `<div class="xskel"><div class="xthink"><span class="spinner" style="width:18px;height:18px;border-width:3px"></span> Explaining in simple terms…</div><i style="width:55%"></i><i></i><i style="width:92%"></i><i style="width:78%"></i><i style="width:40%"></i></div>`;
    const fail = (e) => {
      const key = ['no_key', 'invalid_key'].includes(e.code);
      out.innerHTML = `<div class="callout warn"><div class="ic">⚠️</div><div><b>${key ? 'API key problem' : 'Could not generate the explanation'}</b><br>${esc(e.message)}${key ? '<div style="margin-top:10px"><a class="btn sm primary" href="#settings" onclick="MC.explain.close()">Open Settings</a></div>' : ''}</div></div>`;
    };
    async function run(question) {
      if (S.busy) return;
      S.busy = true; [regen, askB].forEach((b) => (b.disabled = true));
      try {
        const s = await X.get(true);
        if (!S.level) setLevel(s.level);
        if (!s.configured) { out.innerHTML = noKey(); return; }
        const r = getReq();
        if (!r || r.data == null || r.data === '' || (typeof r.data === 'object' && !Object.keys(r.data).length)) {
          out.innerHTML = '<div class="callout"><div class="ic">ℹ️</div><div>There is nothing to explain yet — add some data first.</div></div>'; return;
        }
        out.innerHTML = skeleton();
        let data = r.data;
        if (typeof data === 'string') data = data.slice(0, MAX_CLIENT_CHARS);
        else if (JSON.stringify(data).length > 700000) data = JSON.stringify(data).slice(0, MAX_CLIENT_CHARS);
        const j = await MC.api('/explain', { method: 'POST', body: { title: r.title || '', context: r.context || '', data, question: question || r.question || '', level: S.level } });
        S.text = j.data.explanation;
        out.innerHTML = `<div class="xout-body">${MC.md(S.text)}</div>
          <div class="xmeta">✨ AI-generated by Groq · ${esc(j.meta.model)} · ${esc(j.meta.level)}${j.data.trimmed ? ' · long data was shortened' : ''}<br>AI can make mistakes — check it against the numbers on screen. Educational use only, not a diagnosis.</div>`;
        MC.animateIn(out);
      } catch (e) { fail(e); }
      finally { S.busy = false; [regen, askB].forEach((b) => (b.disabled = false)); }
    }
    MC.$$('.xlevel button', el).forEach((b) => (b.onclick = () => { setLevel(b.dataset.l); run(ask.value.trim()); }));
    regen.onclick = () => run(ask.value.trim());
    askB.onclick = () => run(ask.value.trim());
    ask.onkeydown = (e) => { if (e.key === 'Enter') run(ask.value.trim()); };
    copyB.onclick = async () => { if (!S.text) return MC.toast('Nothing to copy yet', true); try { await navigator.clipboard.writeText(S.text.replace(/\*\*/g, '')); MC.toast('Explanation copied'); } catch (e) { MC.toast('Copy failed — select the text manually', true); } };
    X.get().then((s) => setLevel(s.level)).catch(() => setLevel('simple'));
    if (opts.auto) run(); else out.innerHTML = `<div class="xempty">${opts.empty || 'Your explanation will appear here.'}</div>`;
    return { run };
  };

  /* ---------- side panel ---------- */
  MC.explain.close = () => { MC.$('#xdrawer').classList.remove('open'); MC.$('#xBg').classList.remove('open'); };
  MC.explain.open = function (req) {
    const d = MC.$('#xdrawer');
    d.innerHTML = `<div class="row" style="justify-content:space-between;align-items:flex-start"><div><div class="mono" style="color:var(--brand);font-size:12px;font-weight:700">✨ EXPLAINABLE AI</div><h2 style="font-size:22px;letter-spacing:-.02em;margin-top:2px">${esc(req.title || 'Explain this')}</h2></div><button class="x" aria-label="Close" onclick="MC.explain.close()">×</button></div><div id="xbody" style="margin-top:14px"></div>`;
    d.classList.add('open'); MC.$('#xBg').classList.add('open'); d.scrollTop = 0;
    MC.explain.view(MC.$('#xbody', d), () => req, { auto: true });
  };
  /** Top-bar button: explain whatever the current page is showing */
  MC.explain.page = function () {
    const name = MC.current, custom = MC.pageExplain[name], data = MC.pageData[name];
    let req = custom && custom();
    if (!req) {
      if (!data || !Object.keys(data).length) return MC.toast('This page has no data to explain yet — wait for it to finish loading.', true);
      req = { title: `${(MC.TITLES || {})[name] || name} page`, context: HINTS[name] || '', data };
    }
    MC.explain.open(req);
  };
  MC.$('#xBg').onclick = MC.explain.close;
  MC.$('#explainBtn').onclick = MC.explain.page;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') MC.explain.close(); });

  /* ═══════════════════════ EXPLAIN AI PAGE ═══════════════════════ */
  MC.pages.explain = async function (root) {
    const PRESETS = [
      ['Dataset overview', '/overview', 'overview'], ['ML benchmark', '/ml', 'ml'], ['ECII vs MC-ECII', '/compare', 'compare'],
      ['Class coverage', '/coverage', 'coverage'], ['Ontology', '/ontology', 'ontology'], ['Learned concepts', '/concepts', 'concepts'],
    ];
    const S = { preset: null };
    root.innerHTML = MC.head('Explain <span class="grad">any data</span> in simple terms', 'Paste numbers, a table (CSV), JSON or your own notes — or load a dashboard dataset — and the AI explains it in plain language. Powered by your Groq key.') + `
      <div class="grid g-split">
        <div class="card reveal"><h3>Your data</h3><div class="sub">Load a dashboard dataset, upload a file, or paste anything.</div>
          <div class="tabs" id="xp-presets">${PRESETS.map(([l], i) => `<button data-i="${i}">${l}</button>`).join('')}</div>
          <textarea class="inp" id="xp-data" spellcheck="false" placeholder="Paste data here…&#10;&#10;Example:&#10;Model, Accuracy, F1&#10;Logistic Regression, 0.68, 0.69&#10;Random Forest, 0.62, 0.59"></textarea>
          <div class="row" style="margin-top:10px"><label class="btn sm" style="cursor:pointer">Upload file<input type="file" id="xp-file" accept=".csv,.tsv,.json,.txt,.md" hidden></label><button class="btn sm" id="xp-clear">Clear</button><span id="xp-info" style="font-size:12.5px;color:var(--muted)"></span></div>
          <div class="field" style="margin:16px 0 0"><label>Question (optional)</label><input class="inp" id="xp-q" maxlength="500" placeholder="e.g. Which model is best and why?"></div>
          <button class="btn primary" id="xp-go" style="margin-top:16px;width:100%;justify-content:center">${MC.icon('bolt')} Explain in simple terms</button></div>
        <div class="card reveal" style="position:sticky;top:90px"><h3>Explanation</h3><div class="sub">Plain-language summary of what the data says</div><div id="xp-view"></div></div>
      </div>`;
    const ta = MC.$('#xp-data'), info = MC.$('#xp-info');
    const view = MC.explain.view(MC.$('#xp-view'), () => {
      const text = ta.value.trim(); let data = text, title = 'Data pasted by the user', ctx = '';
      if (S.preset && text === S.preset.preview) { data = S.preset.data; title = S.preset.title; ctx = S.preset.ctx; }
      else if (/^[[{]/.test(text)) { try { data = JSON.parse(text); title = 'JSON data pasted by the user'; } catch (e) { /* keep as text */ } }
      return { title, context: ctx, data, question: MC.$('#xp-q').value.trim() };
    }, { runLabel: 'Explain again', empty: 'Load or paste some data, then press <b>Explain in simple terms</b>.' });
    MC.$('#xp-go').onclick = () => { if (!ta.value.trim()) return MC.toast('Paste or load some data first', true); view.run(MC.$('#xp-q').value.trim()); };
    MC.$('#xp-clear').onclick = () => { ta.value = ''; S.preset = null; info.textContent = ''; MC.$$('#xp-presets button').forEach((b) => b.classList.remove('on')); };
    MC.$$('#xp-presets button').forEach((b) => (b.onclick = async () => {
      const [label, path, page] = PRESETS[+b.dataset.i];
      MC.$$('#xp-presets button').forEach((x) => x.classList.toggle('on', x === b)); info.textContent = 'Loading…';
      try {
        const data = (await MC.apiWait(path)).data, pretty = JSON.stringify(data, null, 1), preview = pretty.length > 6000 ? pretty.slice(0, 6000) + '\n…(preview shortened — the full dataset is still used)' : pretty;
        ta.value = preview; S.preset = { title: label, ctx: HINTS[page] || '', data, preview: preview.trim() }; info.textContent = `Loaded “${label}”`;
      } catch (e) { info.textContent = ''; MC.toast(e.message, true); }
    }));
    MC.$('#xp-file').onchange = (e) => {
      const f = e.target.files[0]; if (!f) return;
      if (f.size > 500 * 1024) { MC.toast('File is larger than 500 KB — please upload a smaller sample', true); e.target.value = ''; return; }
      const rd = new FileReader();
      rd.onload = () => { ta.value = String(rd.result).slice(0, MAX_CLIENT_CHARS); S.preset = null; info.textContent = `${f.name} · ${(f.size / 1024).toFixed(1)} KB`; MC.$$('#xp-presets button').forEach((x) => x.classList.remove('on')); };
      rd.onerror = () => MC.toast('Could not read that file', true);
      rd.readAsText(f); e.target.value = '';
    };
    ta.oninput = () => { if (S.preset && ta.value.trim() !== S.preset.preview) S.preset = null; };
  };

  /* ═══════════════════════ SETTINGS PAGE ═══════════════════════ */
  MC.pages.settings = async function (root) {
    const s = await X.get(true);
    const src = s.key_source === 'environment' ? 'the GROQ_API_KEY environment variable' : 'Settings (saved on this computer)';
    root.innerHTML = MC.head('Settings <span class="grad">· Explainable AI</span>', 'Connect your own Groq API key so the dashboard can explain any data in simple words. The key is stored only on the computer running this app.') + `
      <div class="grid g2">
        <div class="card reveal"><div class="row" style="justify-content:space-between"><h3>Groq API key</h3>
            <span class="tag ${s.configured ? 'ok' : 'High'}" id="st-badge">${s.configured ? '● Connected' : '○ Not set'}</span></div>
          <div class="sub">${s.configured ? `Key <b class="mono">${esc(s.key_hint)}</b> in use from ${src}.` : 'Paste a key from console.groq.com/keys (it starts with gsk_).'}</div>
          <div class="field"><label>${s.configured ? 'Replace key' : 'API key'}</label>
            <div class="keyrow"><input class="inp mono" id="st-key" type="password" autocomplete="off" spellcheck="false" placeholder="gsk_…" style="padding-right:76px"><button class="btn sm eye" id="st-eye" type="button">Show</button></div></div>
          <div class="row"><button class="btn primary" id="st-save">${MC.icon('check')} Save &amp; test</button>${s.configured && s.key_source === 'settings' ? '<button class="btn" id="st-del">Remove key</button>' : ''}<a class="btn" href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">Get a free key ↗</a></div>
          <div id="st-msg" style="margin-top:14px"></div>
          <div class="callout mt"><div class="ic">🔒</div><div style="font-size:13px"><b>How your key is handled.</b> It is saved in <span class="mono">cache/settings.json</span> on this machine, never shown again (only <span class="mono">gsk_…abcd</span>), and sent only to api.groq.com. Using “Explain” sends the data on screen to Groq to be summarised, so avoid pasting personal information.</div></div></div>
        <div class="card reveal"><h3>Explanation preferences</h3><div class="sub">Defaults used by every Explain button</div>
          <div class="field"><label>Model <span style="font-weight:600;color:var(--muted)" id="st-mnote"></span></label><input class="inp mono" id="st-model" list="st-models" value="${esc(s.model)}" spellcheck="false"><datalist id="st-models">${s.fallback_models.map((m) => `<option value="${esc(m)}">`).join('')}</datalist>
            <div class="row" style="margin-top:8px"><button class="btn sm" id="st-load">Load models from my key</button><button class="btn sm" id="st-defm">Use default</button></div></div>
          <div class="field"><label>Explanation style</label><div class="seg" id="st-level">${LEVELS.map(([k, l]) => `<button data-l="${k}" class="${k === s.level ? 'on' : ''}">${l}</button>`).join('')}</div></div>
          <div class="field"><label>Language</label><input class="inp" id="st-lang" list="st-langs" value="${esc(s.language)}" maxlength="40"><datalist id="st-langs">${LANGS.map((l) => `<option value="${l}">`).join('')}</datalist></div>
          <button class="btn primary" id="st-prefs">Save preferences</button><div id="st-pmsg" style="margin-top:12px"></div></div>
      </div>
      <div class="card reveal mt"><h3>Where to find Explain</h3><div class="sub">Once a key is connected</div>
        <div class="grid g3" style="gap:14px">
          <div class="concept Low"><div class="t">✨ Top bar button</div><div style="font-size:13px;color:var(--ink-2);margin-top:4px">“Explain simply” on any page explains the charts and tables you are looking at.</div></div>
          <div class="concept Medium"><div class="t">⚡ Live Prediction &amp; students</div><div style="font-size:13px;color:var(--ink-2);margin-top:4px">Explains one verdict — why the score came out that way — in everyday words.</div></div>
          <div class="concept High"><div class="t">🧠 Explain AI page</div><div style="font-size:13px;color:var(--ink-2);margin-top:4px">Paste or upload any data and ask your own question about it.</div></div>
        </div></div>`;
    const msg = (id, html, kind) => (MC.$(id).innerHTML = html ? `<div class="callout ${kind === 'err' ? 'warn' : ''}"><div class="ic">${kind === 'err' ? '⚠️' : '✅'}</div><div>${html}</div></div>` : '');
    const reload = async () => { X.cache = null; await MC.pages.settings(root); MC.animateIn(root); };
    const keyEl = MC.$('#st-key');
    MC.$('#st-eye').onclick = (e) => { const show = keyEl.type === 'password'; keyEl.type = show ? 'text' : 'password'; e.target.textContent = show ? 'Hide' : 'Show'; };
    MC.$('#st-save').onclick = async (ev) => {
      const key = keyEl.value.trim(), model = MC.$('#st-model').value.trim(), b = ev.currentTarget;
      if (!key && !s.configured) return msg('#st-msg', 'Paste your Groq API key first.', 'err');
      b.disabled = true; msg('#st-msg', '');
      try {
        const t = (await MC.api('/settings/test', { method: 'POST', body: { api_key: key || undefined, model } })).data;       // test BEFORE saving
        if (key) await MC.api('/settings', { method: 'POST', body: { api_key: key } });
        MC.toast(`Groq connected ✓ (${t.latency_ms} ms)`);
        await reload(); msg('#st-msg', `Connected — <b>${esc(t.model)}</b> answered in ${t.latency_ms} ms. You can now use <b>Explain</b> anywhere.`);
      } catch (e) { msg('#st-msg', esc(e.fields ? Object.values(e.fields).join(' ') : e.message), 'err'); b.disabled = false; }
    };
    const del = MC.$('#st-del');
    if (del) del.onclick = async () => { if (!confirm('Remove the saved Groq API key from this computer?')) return; try { await MC.api('/settings/clear', { method: 'POST', body: {} }); MC.toast('API key removed'); await reload(); } catch (e) { MC.toast(e.message, true); } };
    let level = s.level;
    MC.$$('#st-level button').forEach((b) => (b.onclick = () => { level = b.dataset.l; MC.$$('#st-level button').forEach((x) => x.classList.toggle('on', x === b)); }));
    MC.$('#st-defm').onclick = () => (MC.$('#st-model').value = s.default_model);
    MC.$('#st-load').onclick = async (ev) => {
      if (!s.configured) return msg('#st-pmsg', 'Save your API key first, then load the models available to it.', 'err');
      ev.currentTarget.disabled = true;
      try {
        const r = (await MC.api('/settings/models')).data;
        MC.$('#st-models').innerHTML = r.models.map((m) => `<option value="${esc(m)}">`).join('');
        MC.$('#st-mnote').textContent = r.live ? `· ${r.models.length} models found` : '· showing built-in list';
        msg('#st-pmsg', r.live ? `Found ${r.models.length} models. Click the model box to choose one.` : esc(r.warning || 'Could not load the live list — showing the built-in one.'), r.live ? '' : 'err');
      } catch (e) { msg('#st-pmsg', esc(e.message), 'err'); }
      ev.currentTarget.disabled = false;
    };
    MC.$('#st-prefs').onclick = async () => {
      try {
        await MC.api('/settings', { method: 'POST', body: { model: MC.$('#st-model').value.trim(), level, language: MC.$('#st-lang').value.trim() } });
        X.cache = null; msg('#st-pmsg', 'Preferences saved.'); MC.toast('Preferences saved');
      } catch (e) { msg('#st-pmsg', esc(e.fields ? Object.values(e.fields).join(' ') : e.message), 'err'); }
    };
  };
})();
