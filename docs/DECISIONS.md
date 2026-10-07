# Decisions

## D-001 — Архитектура мобильного приложения как Web App (PWA) — ACCEPTED (2026-10-06)
- Context: Необходимость запуска FONOGRAFICUS на iPhone и шеринга среди друзей без необходимости платного Apple Developer аккаунта и Mac для сборки.
- Decision: Разработка в формате PWA (Progressive Web App) на Next.js с деплоем на Vercel (`fonograficus-web.vercel.app`).
- Alternatives and why not: Нативный Capacitor / React Native (требует Mac, сертификаты разработчика Apple и установку через TestFlight/AppStore).
- Consequences: Быстрый запуск по прямой ссылке, установка в 1 клик через Safari «На экран 'Домой'», поддержка фонового аудио через MediaSession API.
- Revisit if: Потребуются специфические нативные функции iOS (фоновый фоновый сервис без активной вкладки при перезагрузке).
- Evidence: Коммиты репозитория `guruit777/fonograficus-web`.

## D-002 — Проксирование поисковых потоков через серверную ручку /api/search — ACCEPTED (2026-10-06)
- Context: Блокировки CORS браузером при прямых запросах к PromoDJ, Radio-Browser, BananaStreet и Cloudflare-защита Radio Garden.
- Decision: Вся поисковая и резолв-логика 6 сервисов вынесена в serverless API route `src/app/api/search/route.js`.
- Alternatives and why not: Прямые запросы из браузера (падают с ошибкой CORS) или отдельный VPS сервер.
- Consequences: Надежный поиск и резолвинг стримов силами Vercel edge/serverless без дополнительных серверов.
- Revisit if: Лимиты Vercel Serverless по времени выполнения или числу запросов.
- Evidence: `src/app/api/search/route.js`.

## D-003 — Сохранение аутентичного океанского дизайна десктопного плеера — ACCEPTED (2026-10-06)
- Context: Первоначальный драфт на Tailwind потерял визуальную привлекательность и идентичность Windows-версии.
- Decision: Полный перенос проверенного оригинального HTML/CSS (`styles.css`, тема Ocean Sand, glassmorphism) с адаптацией к мобильному вьюпорту (`100dvh`).
- Alternatives and why not: Новая минималистичная верстка на Tailwind (не устроила владельца по стилю).
- Consequences: 100% визуальная преемственность с оригиналом, эстетичный матовый интерфейс.
- Revisit if: Потребуется глобальный редизайн продукта.
- Evidence: `public/index.html`, `public/styles.css`.

## D-004 — Фиксированная нижняя панель плеера (Sticky Bar) с поддержкой Safe Area — ACCEPTED (2026-10-06)
- Context: На мобильных устройствах нижний плеер уезжал за пределы экрана из-за длинного списка треков и перекрывался системной панелью Safari.
- Decision: Плеер закреплен внизу экрана (`position: sticky; bottom: 0; z-index: 999`), список треков скроллится внутри экрана (`overflow-y: auto`), добавлен отступ `env(safe-area-inset-bottom)`.
- Alternatives and why not: Стандартный статический футер (теряется при прокрутке).
- Consequences: Элементы управления (Play, Pause, Prev, Next, Like, Shuffle) всегда доступны перед глазами.
- Revisit if: Изменение формата плеера на полноэкранный модальный режим.
- Evidence: `public/styles.css`, коммит `e32acb8`.

## D-005 — Фирменный брендинг «Диско-Винил» и иконки Apple CarPlay — ACCEPTED (2026-10-07)
- Context: Прежняя заглушка приложения (черно-белый кружок с точками) выглядела неэстетично на домашнем экране iOS и мониторе Apple CarPlay.
- Decision: Внедрение утвержденного логотипа «Диско-Винил» (зеркальные грани, золотой шпиндель, неоновые лазерные лучи) в `public/icon.png` и `public/apple-touch-icon.png` (180x180).
- Alternatives and why not: Минималистичный плоский логотип без клубной эстетики.
- Consequences: Премиальный вид в доке CarPlay и на экране блокировки iOS.
- Evidence: `public/icon.png`, `public/apple-touch-icon.png`, коммит `351676c`.

## D-006 — Динамический Artwork в MediaSession и декодирование HTML-сущностей — ACCEPTED (2026-10-07)
- Context: В Apple CarPlay отображалась жестко зашитая заглушка вместо обложки трека, а в названиях миксов PromoDJ отображались служебные теги `&nbsp;` и `&ndash;`.
- Decision: Передача реального `track.avatar` в MediaSession с запасным фолбэком на Диско-Винил; сквозная фильтрация HTML-сущностей через `cleanHtmlEntities` / `decodeHtmlEntities`.
- Consequences: Чистый текст названий и живые обложки треков в Apple CarPlay и Control Center.
- Evidence: `src/app/api/search/route.js`, `public/renderer.js`, коммит `351676c`.

