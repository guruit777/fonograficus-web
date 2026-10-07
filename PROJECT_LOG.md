# Project Log

## 2026-10-07 09:30 -04:00 — Antigravity (Gemini 3.8 Flash) — Внедрение AI Project Standard v1.0
- Task: Привести репозиторий `fonograficus-web` в соответствие с AI Project Standard (PROJECT_UPGRADE_PROMPT.md).
- Done: Внедрён стандарт v1.0: оформлен корневой `AGENTS.md` (76 строк), `CLAUDE.md` как указатель `@AGENTS.md`, обновлён `README.md` с указателями, созданы `PROJECT_STATE.md` (холодный старт 11 строк), `docs/TASKS.md` (T-001..T-004), `docs/DECISIONS.md` (D-001..D-004), `docs/QUESTIONS.md`, `docs/TEMPLATES.md` и `docs/AI_MODEL_ROUTING.md`.
- Files: AGENTS.md, CLAUDE.md, README.md, PROJECT_STATE.md, docs/TEMPLATES.md, docs/TASKS.md, docs/DECISIONS.md, docs/QUESTIONS.md, docs/AI_MODEL_ROUTING.md.
- Decisions: D-001 (Архитектура PWA на Next.js/Vercel), D-002 (Serverless ручка /api/search), D-003 (Оригинальный океанский дизайн), D-004 (Sticky bottom bar с Safe Area).
- Questions: none asked / none open.
- Checks:
  - `(Get-Content AGENTS.md).Count` — passed (76 lines ≤ 200).
  - `(Get-Content PROJECT_STATE.md).Count` — passed (43 lines ≤ 150; cold start 11 lines ≤ 25).
  - `npm run build` — passed (Next.js build clean).
  - `git status` — passed (branch master).
- Result: DONE
- Next: T-001 (Подключение базы данных Supabase для учетных записей и синхронизации избранного).

## 2026-10-07 12:15 -04:00 — Antigravity — Обновление брендинга (Диско-Винил) и исправление Apple CarPlay
- Task: Замена старой иконки на логотип Диско-Винил, исправление отображения обложки и дока в Apple CarPlay, устранение HTML-сущностей в названиях треков.
- Done:
  - Сгенерирован и внедрён новый логотип Диско-Винил (`public/icon.png`, `public/apple-touch-icon.png`).
  - Исправлен `manifest.json` и `public/index.html` (apple-touch-icon 180x180, title, meta-теги).
  - Устранена проблема `&nbsp;` и `&ndash;` в `src/app/api/search/route.js` и `public/renderer.js` через функцию `cleanHtmlEntities` / `decodeHtmlEntities`.
  - Обновлён `MediaSession API`: теперь в CarPlay передаётся реальная обложка трека (`track.avatar`), а при её отсутствии — высококачественный логотип Диско-Винила.
- Files: public/icon.png, public/apple-touch-icon.png, public/index.html, public/manifest.json, public/renderer.js, src/app/api/search/route.js.
- Result: DONE

## 2026-10-07 12:45 -04:00 — Antigravity — Фаза 2: Таймкоды треков, Always on Top, Web Audio визуализатор
- Task: Добавление живого отображения времени треков (elapsed/total), закрепление окна (Always on Top) и реактивный Web Audio визуализатор.
- Done:
  - Добавлена плашка времени `.time-display-pill` (`01:23 / 05:40` и `🔴 ЭФИР` для радио) в `fonograficus-web` и `FONOGRAFICUS`.
  - В десктопное приложение внедрена кнопка-булавка 📌 «Поверх всех окон» (`toggle-always-on-top`) в основном окне и в мини-баре.
  - Подключен Web Audio API `AudioContext` + `AnalyserNode` для анализа частот: полосы в мини-баре и свечение обложки теперь физически реагируют на реальный бас и ритм.
  - В `fonograficus-web` изменения закоммичены и отправлены в GitHub (`master`), автодеплой Vercel запущен.
- Files: fonograficus-web (index.html, styles.css, renderer.js), FONOGRAFICUS (main.js, preload.js, index.html, styles.css, renderer.js).
- Checks: `npm run build` (Next.js) — passed; `node -c` (Electron) — passed.
- Result: DONE

## 2026-10-07 13:30 -04:00 — Antigravity — Dual-Deck Crossfade Engine (плавное сведение треков 0..8с)
- Task: Разработка и запуск механизма плавного сведения треков (Crossfade) на двух деках без щелчков и задержек, деплой в продакшн Vercel.
- Done:
  - Реализована двухдековая архитектура воспроизведения (`audioPlayer` + `audioPlayerB`).
  - Добавлена интерполяция громкости по равномощной кривой (Equal-power curve) для сохранения постоянной громкости в точке сведения.
  - Настроен автокроссфейд в конце трека (`remaining <= appData.crossfade`) для обычных треков (PromoDJ, BananaStreet).
  - Исключены онлайн-радиостанции и прямые эфиры из кроссфейда во избежание разрывов ICY-потоков.
  - Добавлен селектор длительности кроссфейда в карточку настроек (Выкл, 2с, 3с, 5с, 8с) с активным бейджем.
  - Интегрирован MediaSession API для корректного управления на экране блокировки iOS, Android и Apple CarPlay.
  - Архитектура полностью синхронизирована между Windows Electron (`FONOGRAFICUS`) и Web/PWA (`fonograficus-web`).
- Files: FONOGRAFICUS (renderer.js), fonograficus-web (public/index.html, public/styles.css, public/renderer.js, docs/TASKS.md, PROJECT_STATE.md, PROJECT_LOG.md).
- Checks: `npm run build` (Next.js) — passed (clean); `node -c` (both renderers) — passed.
- Result: DONE
- Next: T-001 (Подключение базы данных Supabase для учетных записей и синхронизации избранного).



## 2026-10-07 14:50 -04:00 - Antigravity - UI Polish (Disco-Vinyl Logo & CarPlay Metadata Fix)
- Task: Apply newly generated AI logo (Disco-Vinyl) to Web and Electron apps, and fix HTML entity decoding (e.g. &nbsp;, &ndash;) displaying raw on Apple CarPlay.
- Done:
  - Converted new disco-vinyl JPG logo to PNG via PowerShell System.Drawing.
  - Overwrote \public/icon.png\, \public/apple-touch-icon.png\ in PWA, and \icon.png\, \icon.ico\ in Electron.
  - Refactored \cleanHtmlEntities\ in both \enderer.js\ to use a perfect DOM-based decoding method (\	extarea.innerHTML\) instead of regex.
  - Deployed to Vercel production.
- Files: public/icon.png, public/apple-touch-icon.png, public/renderer.js, FONOGRAFICUS/icon.png, FONOGRAFICUS/icon.ico, FONOGRAFICUS/renderer.js.
- Result: DONE
- Next: T-001 (User Accounts via Supabase).

## 2026-10-07 15:43 -04:00 - Antigravity - User Accounts (T-001)
- Task: Implement Supabase Authentication UI for Web and Electron.
- Done:
  - Added 'Profile' tab to \index.html\ in both projects with Email/Password and Google OAuth UI.
  - Injected Supabase JS SDK via CDN and hardcoded \ENV\ with user's URL and Anon Key.
  - Added authentication handlers to \enderer.js\ (signIn, signUp, signOut, session listener).
- Next: T-003 (Cloud Sync for Favorites) once auth is tested by user.
- Result: DONE
