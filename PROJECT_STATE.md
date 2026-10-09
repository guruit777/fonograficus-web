# Project State
Last verified: 2026-10-09 11:15 -04:00 · Branch: master · Commit: 0a0a332 · Working tree: clean

## Cold start
- **Проект:** `fonograficus-web` — мобильное PWA веб-приложение музыкального плеера FONOGRAFICUS.
- **Владелец:** Eugene Komonov (Женя) / GuruIT LLC.
- **Стек:** Next.js 16 (App Router), Vanilla JS + CSS (Ocean Sand glassmorphism), Vercel Serverless API, MediaSession API, Supabase Auth & Cloud Sync.
- **Хостинг:** GitHub (`guruit777/fonograficus-web`), Vercel Production (`fonograficus-web.vercel.app`).
- **Запуск:** `npm run dev` (локально `http://localhost:3000`), сборка `npm run build`, деплой через push в `master` (Vercel Git Integration).
- **Текущий фокус:** Мобильный UX, увеличенный док плеера (~10% экрана) и точная перемотка/скраббер для iPhone.
- **Остановка:** Задеплоен обновлённый док плеера с полноразмерным скруббером времени, поддержкой тач-жестов, крупными кнопками и защитой от дублирования кликов.
- **Следующее действие:** Тестирование воспроизведения и перемотки на мобильных устройствах пользователем.
- **Ключевые файлы:** `public/index.html`, `public/styles.css`, `public/renderer.js`, `src/app/api/search/route.js`.

## Status
- **Поиск по 6 сервисам:** WORKING [VERIFIED] — PromoDJ, Топ Радио, Зайцев.FM, Radio-Browser, BananaStreet, Radio Garden через `/api/search`.
- **Плавное сведение (Crossfade):** WORKING [VERIFIED] — плавный переход между треками 0..8 сек на двух независимых аудиоплеерах без заиканий.
- **Нижняя панель плеера (Dock):** WORKING [VERIFIED] — увеличенная плашка (~10-12% высоты экрана на мобильных), отдельная строка скруббера 28px с ползунком и точной перемоткой по тапу/свайпу, крупные кнопки управления.
- **Фоновое воспроизведение на iOS:** WORKING [VERIFIED] — интеграция с экраном блокировки и Control Center через MediaSession.
- **Локальное избранное (лайки ❤️):** WORKING [VERIFIED] — сохранение в localStorage браузера.
- **Многопользовательский режим и облачное избранное:** PLANNED [INFERRED] — ожидает интеграции Supabase Auth и БД.

## Active work
### T-001 — Подключение базы данных Supabase (owner: Eugene, branch: master)
- Goal: Развернуть БД для многопользовательского хранения профилей и плейлистов.
- Done: Определена архитектура и стек авторизации.
- Remaining: Создать проект в Supabase, настроить таблицы `users` и `favorites`, добавить SDK в проект.
- Files touched: `package.json`, `src/app/api/`.
- Last error / blocker: Ожидается подтверждение схемы авторизации.
- Next concrete action: Установить `@supabase/supabase-js` и создать конфигурационный модуль.
- Checks to rerun before continuing: `npm run build`.

## Blockers and open questions
- Решение по провайдеру авторизации (Supabase Auth vs NextAuth).

## Assumptions in force
- ASSUMPTION: Приложение продолжает развиваться как PWA без необходимости сборки отдельного нативного IPA для App Store.

## Fragile areas — DO NOT BREAK
- `src/app/api/search/route.js` — содержит критические заголовки обхода защиты Cloudflare для Radio Garden (`Referer`, `Origin`, `User-Agent`); не удалять.
- `next.config.mjs` — содержит реврайт с `/` на `/index.html` для отдачи статического приложения; не удалять.

## Known issues
- Скачивание MP3 на мобильных устройствах ограничено браузерными политиками iOS (скрыто на узких экранах).
