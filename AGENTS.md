<!-- ai-project-standard: v1.0 -->
# Agent rules

## CONFIG
- PROJECT_NAME: fonograficus-web
- PROJECT_BRIEF: Mobile-first PWA global music and radio player (port of FONOGRAFICUS desktop) on Next.js 16 / Vercel; multi-source search, background playback on iOS, and cloud accounts for favorites.
- DOCS_LANGUAGE: Russian
- DOCS_DIR: docs/
- TASK_TRACKER: docs/TASKS.md
- DESIGN_SOURCE: FONOGRAFICUS desktop (Ocean Sand glassmorphism)
- AGENT_TOOLS: Codex, Claude Code, Antigravity
- PARALLEL_AGENTS: no
- APPROVAL_REQUIRED_FOR: push to remote, merge into main, deploy, migrations on shared or production data, paid/billable API calls except the cheap-tier exception below, sending external messages, deleting files or data outside the current task, changing credentials
- API_MAX_CALL_USD: 0.10
- API_MONTHLY_CAP_USD: 5.00
- API_BUDGET_SCOPE: project
- API_MAX_OUTPUT_TOKENS: 4096
- API_MAX_CALLS_PER_TASK: 2

Blank DOCS_LANGUAGE means Russian. Rules/prompts stay English; replies to owner are Russian; memory prose uses DOCS_LANGUAGE. Keep headings, labels, IDs, paths and commands English. Monetary defaults are design limits, not billing enforcement.

## Authority and homes
- This root file is the only project policy authority, subject to actual platform/tool instructions and explicit owner requirements.
- One home per subject: current checkpoint → PROJECT_STATE.md; history/checks/costs → PROJECT_LOG.md; rationale → docs/DECISIONS.md; questions → docs/QUESTIONS.md; tasks → configured tracker; verified setup/run commands → README.md. Record formats live in docs/TEMPLATES.md.
- Keep AGENTS ≤200 lines, STATE ≤150 and its cold start ≤25. Core registers with no records use one “None yet.” sentence in DOCS_LANGUAGE.
- Grow with content: ARCHITECTURE for 2+ components/database/service; FEATURES for first user feature; DESIGN for UI; AI_MODEL_ROUTING when configuring/using consultation; root CHANGELOG for releases.

## Session protocol
- Initial memory budget ≤500 lines: AGENTS ≤200, STATE ≤150, last 3–5 LOG entries within 150 log lines. Read oversized entries by Task/Result/Next/Checks, then only task-relevant sections.
- Inspect branch, git status and recent changes if available. Correct memory contradicted by current repository evidence and log the discrepancy.
- Start with a 2–4-line Russian state/stopping-point/action summary, then claim task, owner and branch. Latest direct request wins over old next action.
- Before asking, search QUESTIONS and DECISIONS; cite existing answers. Ask ≤3 questions total during adoption/start. Record actual questions OPEN.
- End meaningful work: append LOG; update your stream/cold start/next action, tasks, decisions, questions and affected docs. Self-check links, IDs, no secrets. Reply in Russian ≤10 lines (upgrades ≤15).

## Evidence, permissions and safety
- Code facts: executable code/config → tests → safe reproduced behavior → git history → docs → conversation → inference.
- Intent/priorities: latest explicit owner statement → recorded decisions/answers → docs → inference. Gated actions require current-session owner approval.
- Derive commands from the repository: `npm run dev`, `npm run build`, `npx vercel --prod --yes`. Never report unrun checks as passed.
- Never copy secrets, keys or personal data into memory/logs. Never commit API keys.
- During adoption/audit do not change app behavior, dependencies or production systems; do not delete/rename owner files.

## Model routing
- Read mapped `docs/AI_MODEL_ROUTING.md` when routing is relevant. Check MCP schemas or shell helper `E:/AI_BASE_DEPLOY/_AI_PROJECT_STANDARD/tools/ask-model.mjs`.
- Bounded drafts or safe-file extraction (>~1,000 lines safe text) → cheap-tier helper call. Safe inputs only (no keys, secrets, client data).
- Cheap-tier calls within limits require no extra approval. Balanced/strong calls require current-session owner approval.
- Each paid call logs: `- API: <YYYY-MM-DD> · <provider/model> · <purpose> · $<cost> (provider-reported | estimate | UNKNOWN)`.

## Tool delivery — snapshot 2026-10-06
- Codex / Cursor: root AGENTS.md.
- Claude Code: `CLAUDE.md` importing `@AGENTS.md`, plus Claude-only notes.
- Antigravity: `AGENTS.md`, rules reconciled without losing local instructions.

## Project-specific rules
- **Next.js & PWA Architecture:**
  - Проект построен на Next.js 16 (App Router) со статическим слоем в `public/` (оригинальный `index.html`, `styles.css`, `renderer.js`).
  - Поисковый бэкенд вынесен в `src/app/api/search/route.js`: агрегирует 6 сервисов (PromoDJ, Топ Радио, Зайцев.FM, Radio-Browser, BananaStreet, Radio Garden) и обходит CORS.
  - Деплой ведётся на Vercel (`fonograficus-web.vercel.app`) и синхронизируется с GitHub (`guruit777/fonograficus-web`).
- **Стиль и UX:**
  - Сохранять аутентичный океанский дизайн (Ocean Sand, glassmorphism).
  - Нижняя панель плеера обязана оставаться плавающей (`sticky bottom`) с учётом безопасной зоны мобильных устройств (`env(safe-area-inset-bottom)`).
  - Фоновое воспроизведение поддерживается через браузерный `navigator.mediaSession` (экран блокировки iOS).
- **Следующий шаг развития:**
  - Интеграция облачной базы данных (Supabase) для авторизации и хранения персонального избранного для друзей.

## Legacy and project-specific files
| File | Role | Still updated? | Canonical home |
|---|---|---|---|
| `public/index.html` | Главный интерфейс плеера | Да | `public/index.html` |
| `public/styles.css` | Стили океанского интерфейса | Да | `public/styles.css` |
| `public/renderer.js` | Клиентская логика, полифиллы API, аудио | Да | `public/renderer.js` |
| `src/app/api/search/route.js` | Serverless API прокси для 6 музыкальных источников | Да | `src/app/api/search/route.js` |
| `next.config.mjs` | Конфигурация Next.js и реврайты на index.html | Да | `next.config.mjs` |

## Version maintenance
- Record schemas: see `docs/TEMPLATES.md`.
- Marker: `<!-- ai-project-standard: v1.0 -->`. On upgrade: absent marker → adopt; older → diff-only; equal → repair actual gaps or no-op; newer → no downgrade.
