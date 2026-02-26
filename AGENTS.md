# Local Agent Rules

## Editing policy
- Use minimal, targeted diff patches only.
- Do not rewrite entire files unless explicitly requested.
- Do not make unrelated formatting changes.
- After each edit, report changed file paths with line references and a brief summary.

## IDE file paths in responses
- When referencing files in chat, use the single-line format `file.ext:line` (for example, `auth.service.ts:12`).
- Do not use split format like `file.ext` on one line and `строка N` on another line.
- Do not use markdown/web hyperlinks for local files.
- If clickable navigation is unreliable, provide a fallback command: `code -g path/to/file.ext:line`.

## Encoding safety (mandatory)
- All text/source files must be saved in UTF-8.
- Never use shell writes that may change encoding implicitly. If writing through PowerShell, always set explicit encoding: `-Encoding utf8`.
- Do not run encoding checks on every request by default. Run them only when there are encoding risk signals (mojibake, массовые shell-записи, подозрительные символы, нестабильная кодировка файла/инструмента).
- If mojibake appears (for example: `Гђ`, `Г‘`, `ГЇВ»Вї`, `РїС—Р…`, `пїЅпїЅпїЅпїЅ`), stop normal work and do a fast recovery first:
  1) identify affected files,
  2) convert/rewrite them to valid UTF-8,
  3) verify UI text and build again.

## Verification scope
- Do not run full project build after every small request.
- Run build checks after global/structural refactors, risky cross-file edits, or when confidence is low.
- For small localized changes, use targeted checks or skip build at your discretion.
