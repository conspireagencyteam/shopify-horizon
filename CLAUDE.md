# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## About This Theme

Nature's Answer theme built on Shopify's Horizon framework. Key feature: **nested blocks architecture** - blocks can be nested inside other blocks for flexible layouts.

## Theme Customization Rules

**IMPORTANT:** This theme is based on Shopify's Horizon framework. To preserve the ability to pull upstream updates, follow these rules strictly.

### Files You Can Edit Directly
- `locales/en.default.json` - Translations
- `locales/en.default.schema.json` - Schema translations
- `templates/*.json` - Template JSON files
- `config/settings_data.json` - Theme settings data

### Files Requiring 1- Prefix
**All custom work must use the `1-` prefix.** This includes:
- Duplicates of existing Horizon files you need to modify
- Brand new sections, blocks, snippets, or assets you create

| Folder | Duplicating | Creating new |
|--------|-------------|--------------|
| `sections/` | `header.liquid` → `1-header.liquid` | `1-custom-hero.liquid` |
| `blocks/` | `text.liquid` → `1-text.liquid` | `1-feature-card.liquid` |
| `snippets/` | `card.liquid` → `1-card.liquid` | `1-price-display.liquid` |
| `assets/` (CSS) | `base.css` → `1-base.css` | `1-custom-styles.css` |
| `assets/` (JS) | `product.js` → `1-product.js` | `1-custom-component.js` |

**Child blocks use `_1-` prefix:** Blocks that are only used as children of other blocks (not standalone) use the `_1-` prefix (underscore-1-hyphen). Example: `_1-list-item.liquid` is a child block used inside `1-list.liquid`.

**Never modify original Horizon files directly.**

After creating/duplicating, update any references (template JSON, `{% section %}`, `{% render %}`, asset includes) to point to the `1-` prefixed file.

### Files With Limited Edits
- `layout/` - Keep changes minimal for easier merge conflict resolution
- `config/settings_schema.json` - Minor non-breaking changes only (e.g., adding font sizes for typography)

### Why This Matters
- Keeps original Horizon files untouched for clean upstream merges
- `1-` prefix makes custom files easy to identify
- Reduces merge conflicts when pulling Horizon updates

## Development Commands

```bash
# Local development
npm run dev              # Start dev server with hot reload
npm run dev:host         # Dev server with host flag

# Theme management
npm run push             # Push to development theme
npm run push:live        # Push to live theme (caution)
npm run pull             # Pull from development theme
npm run pull:live        # Pull from live theme

# Linting
npm run check            # Run Theme Check
npm run check:auto       # Run Theme Check with auto-correct

# Other
npm run open:editor      # Open theme editor
npm run list             # List all themes
npm run package          # Package theme for distribution
```

## Coding Standards

**Check `.cursor/rules/` before making changes.** These are living documents maintained by the team:

| File | When to check |
|------|---------------|
| `blocks.mdc` | Creating/editing theme blocks |
| `sections.mdc` | Creating/editing sections |
| `snippets.mdc` | Creating/editing snippets |
| `schemas.mdc` | Writing schema JSON |
| `css-standards.mdc` | Writing CSS (BEM, variables, specificity) |
| `javascript-standards.mdc` | Writing JS (Component framework, Web Components) |
| `liquid.mdc` | Liquid syntax and patterns |
| `html-standards.mdc` | HTML structure, native elements, accessibility |
| `localization.mdc` | Adding user-facing text |
| `locales.mdc` | Editing locale JSON files |
| `templates.mdc` | Editing JSON templates |
| `assets.mdc` | Managing static assets |
| `theme-settings.mdc` | Global theme settings |

**Accessibility rules** (check when building UI components):
- `accordion-accessibility.mdc`
- `carousel-accessibility.mdc`
- `modal-accessibility.mdc`
- `dropdown-navigation-accessibility.mdc`
- And others in `.cursor/rules/`

**Examples:** `.cursor/rules/examples/` contains reference implementations.

## Key Architecture Concepts

### Component Framework
JavaScript uses a custom Component framework (`assets/component.js`). Components:
- Extend `Component` base class
- Use `ref` attributes for element references
- Use `on:event` attributes for declarative event handling

```html
<my-component>
  <button ref="submitButton" on:click="/handleSubmit">Submit</button>
</my-component>
```

### Nested Blocks
Sections accept `@theme` blocks which can contain other blocks:
```liquid
{% content_for 'blocks' %}  <!-- Renders nested blocks -->
```

## Git Configuration

- **origin**: https://github.com/conspireagencyteam/naturesanswer-theme.git
- **upstream**: https://github.com/Shopify/horizon.git (for pulling Horizon updates)

```bash
git pull upstream main    # Pull Horizon updates
```

## CI/CD

GitHub Actions runs Theme Check on pushes/PRs to `main`. See `.github/workflows/theme-check.yml`.
