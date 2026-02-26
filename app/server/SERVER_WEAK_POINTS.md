# Server Audit: Weak Spots (Performance, Code Quality, Architecture)

Дата аудита: 2026-02-26
Область: `app/server/src`

## Кратко

Ниже перечислены наиболее значимые слабые места backend-части. Приоритизация: `High` -> `Medium` -> `Low`.

## Findings

| Severity | Category | Weak spot | Evidence |
|---|---|---|---|
| Low | Code Quality | Слишком крупный сервис (God object): `IdeasWorkerRunner` (~613 строк) | `src/ideas/ideas.worker-runner.ts:45` |
| Low | Quality Assurance | Покрытие пока ограничено smoke/integration тестами для auth, enqueue и worker; нет e2e сценариев с реальными Postgres/Redis и нет расширенного покрытия модулей модерации/настроек AI | `src/auth/auth.service.spec.ts`, `src/ideas/ideas.service.spec.ts`, `src/ideas/ideas.worker-runner.spec.ts` |

## Рекомендации (приоритетный порядок)

1. Продолжить декомпозицию `IdeasWorkerRunner` на use-case/handler классы и покрыть критические флоу тестами.
2. Расширить тест-контур e2e сценариями с реальными Postgres/Redis для проверки end-to-end интеграций.

## Быстрые wins (1-2 дня)

Все quick wins из этого списка выполнены.
