# MC-ECII Studio — Explainable Student Stress-Risk Dashboard

Flask backend + animated white-theme dashboard for the project
**"Explainable Classification of Student Academic Stress and Mental Well-Being Risk Using an Ontology-Guided MC-ECII Framework"**
(Project Phase 1 · Panel Review 2). It re-implements, on your data, everything shown in the review deck:
the survey dataset, the 14-predicate OWL/DL ontology, class-wise coverage, the 6-model ML benchmark,
ECII vs One-vs-Rest ECII vs **MC-ECII**, abstention, symbolic explanations, live prediction and a tuning lab.

> Educational decision support only — **not** a diagnostic tool.

## Quick start

```bash
# Windows:      run.bat
# Linux / Mac:  ./run.sh
# or manually:
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
python app.py                                          # → http://127.0.0.1:5000
```

Python 3.9+ recommended. No Java, no database and no internet are needed (Chart.js is bundled; only the
optional Google Fonts link needs internet and falls back to system fonts).

First start: the core modules are ready in ~2 s; the ML benchmark in ~30 s. The repeated 5×3 CV is cached in
`cache/cv_scores.json` (shipped), so later starts are fast. Delete the cache or change the CSV to recompute
(takes a couple of minutes on one core).

## Project structure

```
mc_ecii_dashboard/
├── app.py                   ← the ENTIRE backend (data, ontology, ECII/OvR/MC-ECII, ML, REST API)
├── requirements.txt
├── run.sh / run.bat
├── data/Processed_Student_Stress_Data.csv
├── cache/cv_scores.json     ← cached repeated-CV scores
├── templates/index.html     ← single-page shell
└── static/
    ├── css/styles.css       ← design system (white, animated, responsive)
    ├── js/core.js           ← API client, Chart.js defaults, shared components
    ├── js/pages_data.js     ← Overview · Dataset & EDA · Ontology · Coverage
    ├── js/pages_models.js   ← ML · Compare · Explanations · Predict · Lab · Method
    ├── js/explain.js        ← Explainable AI: Settings page, Explain AI page, explain side-panel (Groq)
    ├── js/app.js            ← router + engine-status polling
    └── vendor/chart.umd.js  ← Chart.js 4.4.1 (bundled)
```

## Dashboard pages

| Page | What it shows |
|---|---|
| Overview | KPIs, class distribution, implementation progress, architecture, data quality |
| Dataset & EDA | Histograms by class, category-vs-class, correlations, searchable student table + per-student explanation drawer |
| Ontology | 14 DL predicates with thresholds & prevalence, 42 atoms, HermiT note, OWL / CSV downloads |
| Class Coverage | Cov(c,k) / V(c) heatmap, Class(c), margins, two-predicate candidates |
| ML Benchmark | 6 models: test metrics, repeated-CV stability, per-class F1, confusion matrices, RF / LR drivers |
| ECII vs MC-ECII | Aspect table, prediction status, per-class F1, evaluations, abstention trade-off |
| Explanations | The learned concept repository by class with V(c) and DL expressions |
| Live Prediction | Interactive form → MC-ECII verdict, class scores, LR cross-check, matched concepts |
| Tuning Lab | Retrain MC-ECII with custom δ, ε, beam, length, support, K and compare with the deck |
| Explain AI | Paste / upload any data (or load a dashboard dataset) and get a plain-language explanation from Groq |
| Settings | Enter your Groq API key, choose model, explanation style and language |
| Method & Review | Mechanism, preprocessing, panel Q&A, roadmap, limitations, API explorer, references |

## Explainable AI (Groq) — explain any data in simple terms

1. Open **Settings** in the sidebar → paste your Groq API key (get one at https://console.groq.com/keys) → **Save & test**.
   The key is tested *before* it is saved, stored only in `cache/settings.json` on the machine running the app (git-ignored),
   never sent back to the browser (only `gsk_…abcd`), and sent only to `api.groq.com`.
   Alternative: set the `GROQ_API_KEY` environment variable (a key saved in Settings takes priority).
2. Use it anywhere:
   * **✨ Explain simply** button in the top bar — explains the charts/tables on the current page.
   * **Explain this result simply** on *Live Prediction*, and **Explain this student simply** in the student drawer.
   * **Explain AI** page — paste text / CSV / JSON, upload a file (≤ 500 KB) or load a dashboard dataset, optionally ask your own question.
3. In the panel you can switch the style (*Simple · Like I'm 12 · More detail*), ask follow-up questions, regenerate and copy the answer.
   Default model is `llama-3.3-70b-versatile`; **Load models from my key** lists what your account can use. Language is free text (English, Hindi, Telugu …).

Notes: no new Python dependency (standard-library HTTP). Data is shortened to ~14 000 characters before sending so it fits Groq's token limits.
Settings/explain endpoints are same-origin only (no CORS) so other websites cannot use your key. AI output can be wrong — it is shown with a reminder to check the numbers.
If you deploy this for several people, add authentication first: the key is shared by everyone who can open the app.

## REST API (all JSON: `{"ok": true, "data": …, "meta": …}`)

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` · `/api/status` · `/api/docs` | liveness, build progress, auto-generated route list |
| GET | `/api/project` | deck content (objectives, mechanism, Q&A, roadmap, references) |
| GET | `/api/overview` · `/api/schema` | KPIs & distributions · input-form schema |
| GET | `/api/dataset?page&per_page&level&state&gender&university&split&q&sort&order` | paginated student table |
| GET | `/api/students/<id>` | one student + MC-ECII explanation |
| GET | `/api/eda` | histograms, category counts, class means, correlations |
| GET | `/api/ontology` · `/api/ontology/owl[?individuals=1]` | predicates / atoms · OWL RDF-XML download |
| GET | `/api/coverage` | Cov(c,k), V(c), Class(c), margins, pair candidates |
| GET | `/api/ml` | 6-model benchmark |
| GET | `/api/compare` · `/api/abstention` · `/api/concepts` | ECII family results |
| GET | `/api/predict/sample?level=` | random held-out student |
| POST | `/api/predict` | classify one student (`eps` optional) |
| GET · POST | `/api/settings` · `/api/settings/clear` · `/api/settings/test` · `/api/settings/models` | Groq key (masked), model, style, language — same-origin only |
| POST | `/api/explain` | `{data, title?, context?, question?, level?, language?}` → plain-language explanation |
| POST | `/api/tune` · `/api/tune/reset` | retrain / restore MC-ECII (`apply: true` makes it active) |
| GET | `/api/export/<predicate_matrix\|predicate_thresholds\|coverage\|mcecii_concepts\|model_comparison>` | CSV downloads |

Errors use `{"ok": false, "error": {"code", "message", "fields"?}}` with proper status codes (400/404/405/422/429/503).

Example:
```bash
curl -X POST localhost:5000/api/predict -H "Content-Type: application/json" -d '{
 "Age":21,"Gender":"Female","Study_Hours":7,"Class_Attendance":72,"Sleep_Hours":5,"Social_Media_Use":5,"Screen_Time":8,
 "Anxiety_Level":8,"Exam_Frequency":"High","Assignment_Load":"High","Physical_Exercise":"Low","Peer_Pressure":"High",
 "Family_Support":"Low","Family_Income_Level":"Medium","Tuition":"High","University_Type":"Private","eps":0.1}'
```

## Fidelity to the deck (verified on the shipped CSV)

| Item | Deck | This app |
|---|---|---|
| Split | 1,652 / 414 | 1,652 / 414 |
| Logistic Regression | Acc 0.681 · Macro-F1 0.687 · AUC 0.837 | identical |
| CV Macro-F1 (LR / SVM / GB / RF / DT / KNN) | 0.632 / 0.601 / 0.589 / 0.590 / 0.520 / 0.516 | identical |
| Evaluations ECII / OvR / MC-ECII | 1,951 / 5,683 / 1,973 | identical |
| OvR single class / conflict | 23 % / 77 % | identical |
| F1 Medium OvR → MC-ECII | 0.062 → 0.432 | identical |
| MC-ECII Macro-F1 · accuracy | 0.507 · 0.50 | identical |
| Concepts per class (L / M / H) | 25 / 6 / 25 | identical |
| Abstention ε = 0.20 | 77 % answered · 0.545 | identical |

Note: the deck's pipeline slide says "17 inputs"; the code (and the notebooks) actually yield **16** model input
features (33 columns − ID, State, Screen_Flag, 12 items, score, target). The dashboard reports the computed value (16).

## Notes

* **HermiT** needs Java and Owlready2, so the app does not run it; the OWL export is generated in pure Python and opens in Protégé,
  where you can run HermiT yourself. The "300/300 identical" figure is reported from your ontology notebook.
* The Tuning Lab scores on the held-out test split — heavy tuning would over-fit it; use repeated CV for final tuning (roadmap).
* Production: `gunicorn -w 1 --threads 8 app:app` (keep **one** worker: the engine lives in memory).
* Env vars: `PORT`, `HOST`, `GROQ_API_KEY` (optional), `MCECII_DATA` (path to another processed CSV with the same columns).
