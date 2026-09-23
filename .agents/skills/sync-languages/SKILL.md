---
name: sync-languages
description: >-
  Sync i18n locale JSON files from a user-attached source file so every locale has
  the same keys, then auto-translate values (never keys). Do nothing unless the user
  passes a valid locale JSON in context. Use when adding or changing translations,
  locale files, i18n keys, or when the user asks to sincronizar idiomas, traducciones,
  or locale files.
paths: src/i18n/locales/*.json
disable-model-invocation: true
---

# Sync languages

Sync the JSON files matched by `paths` (this skill's frontmatter). Every locale ends up with the **same key tree**. Translate **values** only. **Do not translate, rename, or reorder keys** relative to the source locale.

## Source of truth

The source locale is **only** the locale JSON file the user passes in context (`@` mention or explicit attachment).

A file is valid only if all of these hold:

- It is explicitly passed in the user message (not inferred from open tabs, `DEFAULT_LOCALE`, or git status).
- Its path matches `paths`.
- It exists and parses as a JSON object.

**If no valid source file is passed, do nothing.** Do not read other locales, do not guess `es.json` / `DEFAULT_LOCALE`, do not create or edit files, do not translate. If several valid files are passed, do nothing.

- Each file's language = its filename (`en.json` → English, `fr.json` → French).
- Format: nested JSON, 2-space indent, same as the source.
- Do not modify the source file.

## Workflow

1. Resolve the source file from user context using the rules above. If invalid or missing → **stop immediately**.
2. Expand the `paths` glob and read the other JSON files (targets). If there are no targets besides the source, stop without writing.
3. Use the source file as the canonical shape (nesting and key order). Do not add keys from other locales into the source.
4. For each target locale:
   - Copy the source key tree (same names, same order, same nesting). Drop target keys that are not in the source.
   - Value already translated and different from the source → **keep it**.
   - Value missing, `""`, or identical to the source when the language is different → **translate** it into the file's language.
5. Write target files only. Do not create new locales unless the user asks.

## Translating values

- Translate visible text into the target file's language.
- Do not translate or change keys (`project.newFolder` stays `project.newFolder`).
- Preserve vue-i18n placeholders and syntax: `{name}`, `{n}`, `@:other.key`, plural `|`, HTML.
- Tone: short UI copy (buttons, labels, placeholders, empty states). Keep `...` and punctuation from the source.
- Do not transliterate technical identifiers inside a value if the source leaves them in English (`JSON`, `HTTP`, product names).

## Checklist

- [ ] Valid source file passed in context; otherwise no edits
- [ ] Source file unchanged
- [ ] Target files match the source key tree (names and order)
- [ ] Values translated to the filename's language
- [ ] vue-i18n placeholders intact
- [ ] 2-space indent; valid JSON
