# Agency Base Theme Workflow

A rolling agency base theme that maintains upstream Horizon connection while accumulating reusable customizations across projects.

## Overview

```
Shopify Horizon (upstream)
        ↓
Agency Base Theme (your-org/agency-base-theme)
        ↓
Client Projects (your-org/client-theme)
```

## Repository Structure

### Agency Base Theme Remotes
```bash
origin   → https://github.com/your-org/agency-base-theme.git
upstream → https://github.com/Shopify/horizon.git
```

### Client Project Remotes
```bash
origin   → https://github.com/your-org/client-theme.git
base     → https://github.com/your-org/agency-base-theme.git
upstream → https://github.com/Shopify/horizon.git
```

---

## Sync Behavior

| Folder/File | Sync Behavior |
|-------------|---------------|
| `sections/1-*` | Copy + **merge presets** (keeps base presets, adds new) |
| `blocks/1-*` | Copy + **merge presets** (keeps base presets, adds new) |
| `blocks/_1-*` | Copy + **merge presets** (child blocks with underscore prefix) |
| `snippets/1-*` | Copy to base (overwrites) |
| `assets/1-*` | **NEW files only** (won't overwrite existing) |
| `.cursor/rules/` | **NOT synced** (project manages own rules) |
| `templates/` | **NEVER sync** (project-specific) |
| `locales/*.json` | **Manual merge** (add new keys only) |
| `config/settings_data.json` | **NEVER sync** (project-specific) |

### Preset Merging Explained

When syncing sections/blocks that already exist in the base:
- File content is copied (overwrites)
- Presets are **merged by name**: base presets are preserved, only NEW presets from the project are added
- Requires `jq` installed (`brew install jq`)

---

## Workflows

### A. Initial Setup (One-time)

```bash
# Fork Horizon as your agency base
git clone https://github.com/Shopify/horizon.git agency-base-theme
cd agency-base-theme

# Set up remotes
git remote rename origin upstream
git remote add origin https://github.com/your-org/agency-base-theme.git
git push -u origin main

# Copy sync script and existing 1- files from first project
```

### B. Starting a New Client Project

```bash
# Clone from agency base
git clone https://github.com/your-org/agency-base-theme.git client-name-theme
cd client-name-theme

# Set up remotes
git remote rename origin base
git remote add origin https://github.com/your-org/client-name-theme.git
git remote add upstream https://github.com/Shopify/horizon.git

# Push to client repo
git push -u origin main
```

### C. Syncing Project to Base (After Project Complete)

```bash
# From client project directory
./sync-to-base.sh ../agency-base-theme

# Or if sync script is in base theme
../agency-base-theme/sync-to-base.sh
```

**Then manually merge locale keys:**
1. Compare `locales/en.default.json` files
2. Copy only NEW `1_` prefixed keys to base
3. Repeat for `locales/en.default.schema.json`

**Commit changes:**
```bash
cd ../agency-base-theme
git diff                    # Review changes
git add .
git commit -m "Sync updates from client-project"
git push origin main
```

### D. Pulling Horizon Updates

```bash
# In agency-base-theme (periodically)
git pull upstream main
# 1- files won't conflict with Horizon updates
git push origin main
```

---

## Handling Presets

Presets in `{% schema %}` are starter configurations. Rules:

1. **New layout = new preset name**
   - Don't modify existing presets with project-specific content
   - Create new ones: "Hero - Minimal", "Hero - Health", "Hero v2"

2. **Review before committing**
   - After running sync, check `git diff`
   - If preset has project-specific defaults, revert or rename first

### Example
```liquid
{% schema %}
{
  "name": "Hero",
  "presets": [
    { "name": "Hero" },              // Generic - keep as-is
    { "name": "Hero - Health" },     // New variation
    { "name": "Hero - Minimal" }     // New variation
  ]
}
{% endschema %}
```

---

## Controlling Section Visibility

Sections appear in "Add section" only if they have `presets` in schema.

**To hide unused sections for a specific project:**
Remove the `presets` array from sections you don't need. They stay in the repo but won't clutter the theme editor.

---

## Claude Code Prompts

### Prompt 1: Sync Project to Base Theme

Use after completing work on a client project to sync reusable customizations back to the base.

```
Sync this project's customizations to the agency base theme:

1. Run the sync script:
   ./sync-to-base.sh /Users/Yujan/Documents/Work/conspireAgency/shopify/themes/shopify-horizon

2. For locale files (locales/en.default.json and locales/en.default.schema.json):
   - Compare with base theme versions
   - Show me only the NEW keys (1_ prefixed) that need to be added to the base
   - DO NOT overwrite existing keys in the base
   - Add the new keys to the base theme's locale files

3. Show me git status and diff summary in the base theme so I can review before committing

Base theme path: /Users/Yujan/Documents/Work/conspireAgency/shopify/themes/shopify-horizon
```

### Prompt 2: Set Up New Client Project

Use when starting a new client project from the agency base theme.

```
Set up a new client project "[CLIENT-NAME]" from the agency base theme:

1. Create the client directory structure and clone the base theme:
   mkdir -p ../../../[CLIENT-NAME]/themes
   cd [CLIENT-NAME]/themes
   git clone git@github-conspire:conspireagencyteam/shopify-horizon.git [CLIENT-NAME]-theme

2. Navigate into the new project:
   cd [CLIENT-NAME]-theme

3. Set up the remotes (rename origin to base, add new origin for client repo):
   git remote rename origin base
   git remote add origin git@github-conspire:conspireagencyteam/[CLIENT-NAME]-theme.git
   git remote add upstream https://github.com/Shopify/horizon.git

4. Push to the new client repo:
   git push -u origin main

5. Verify remotes:
   git remote -v

Expected output:
   base     → git@github-conspire:conspireagencyteam/shopify-horizon.git
   origin   → git@github-conspire:conspireagencyteam/[CLIENT-NAME]-theme.git
   upstream → https://github.com/Shopify/horizon.git

Final path: conspireAgency/[CLIENT-NAME]/themes/[CLIENT-NAME]-theme

Replace [CLIENT-NAME] with the actual client name (e.g., "naturessunshine", "herblife").
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Sync to base | `./sync-to-base.sh ../agency-base-theme` |
| Pull Horizon updates | `git pull upstream main` |
| Pull base updates | `git pull base main` |
| Start new project | Clone from `agency-base-theme`, rename remotes |
