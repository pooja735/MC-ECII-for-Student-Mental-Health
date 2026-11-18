/* MC-ECII dashboard · router, engine-status polling, boot */
(function () {
  'use strict';
  const MC = window.MC;
  const TITLES = { overview: 'Overview', dataset: 'Dataset & EDA', ontology: 'Ontology', coverage: 'Class Coverage', ml: 'ML Benchmark', compare: 'ECII vs MC-ECII', concepts: 'Explanations', predict: 'Live Prediction', lab: 'Tuning Lab', project: 'Method & Review', explain: 'Explain AI', settings: 'Settings' };
  MC.TITLES = TITLES;
  const NEEDS_ML = ['ml', 'compare', 'predict'];
  let mlWasReady = false, splashGone = false;

  /* ---------- router ---------- */
  async function show(name, force) {
    if (!MC.pages[name]) name = 'overview';
    MC.current = name;
    MC.$$('.page').forEach((p) => p.classList.toggle('show', p.id === 'page-' + name));
    MC.$$('#nav a').forEach((a) => a.classList.toggle('active', a.dataset.page === name));
    MC.$('#pageTitle').textContent = TITLES[name];
    document.title = `${TITLES[name]} · MC-ECII`;
    MC.$('#side').classList.remove('open');
    window.scrollTo({ top: 0 });
    const root = MC.$('#page-' + name);
    MC.$('#explainBtn').style.display = ['explain', 'settings'].includes(name) ? 'none' : '';
    if (MC.rendered[name] && !force) { MC.animateIn(root); return; }
    MC.rendered[name] = true;
    MC.pageData[name] = {};
    MC.loading(root, 'Loading…');
    try {
      await MC.pages[name](root);
      if (MC.current === name) MC.animateIn(root);
    } catch (e) {
      MC.rendered[name] = false;
      if (e.status === 503) { MC.waitUI(root, TITLES[name])(e.payload || {}); await MC.sleep(2000); if (MC.current === name) show(name, true); }
      else MC.error(root, e);
    }
  }
  const route = () => show((location.hash || '#overview').slice(1));
  window.addEventListener('hashchange', route);

  /* ---------- status polling ---------- */
  function paint(st) {
    const chip = MC.$('#statusChip'), txt = MC.$('#statusText'), bar = MC.$('#topProg');
    const ready = st.core === 'ready' && st.ml === 'ready';
    chip.classList.toggle('ready', ready); chip.classList.toggle('err', !!st.error && !ready);
    txt.textContent = st.error && !ready ? 'Engine error' : ready ? 'Engine ready' : `Building… ${st.progress}%`;
    bar.style.width = (ready ? 100 : st.progress) + '%'; if (ready) setTimeout(() => (bar.style.opacity = 0), 900);
    MC.$('#splashBar').style.width = Math.max(4, st.progress) + '%'; MC.$('#splashMsg').textContent = st.error ? 'Error: ' + st.error : st.message;
  }
  async function poll() {
    try {
      const st = (await MC.api('/status')).data; MC.status = st; paint(st);
      if (st.core === 'ready' && !splashGone) { splashGone = true; setTimeout(() => MC.$('#splash').classList.add('hide'), 350); route(); }
      if (st.ml === 'ready' && !mlWasReady) {
        mlWasReady = true;
        MC.mlDependents.forEach((k) => { MC.rendered[k] = false; });
        if (MC.mlDependents.includes(MC.current)) show(MC.current, true);
      }
      if (st.error && st.core !== 'ready') return;                     // fatal: stop polling, splash shows the error
      if (!(st.core === 'ready' && st.ml === 'ready')) setTimeout(poll, st.core === 'ready' ? 1800 : 900);
    } catch (e) { MC.$('#splashMsg').textContent = e.message; MC.$('#statusText').textContent = 'Offline'; setTimeout(poll, 3000); }
  }

  /* ---------- chrome ---------- */
  MC.$('#burger').onclick = () => MC.$('#side').classList.toggle('open');
  MC.$('#drawerBg').onclick = MC.closeDrawer;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') MC.closeDrawer(); });
  document.addEventListener('click', (e) => { if (window.innerWidth <= 1020 && !e.target.closest('#side') && !e.target.closest('#burger')) MC.$('#side').classList.remove('open'); });

  poll();
})();
