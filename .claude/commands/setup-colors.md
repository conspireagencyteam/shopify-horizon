# Setup Color Schemes

Set up the 6 color schemes for a new client project. You can either provide a Figma URL for automatic extraction, or supply color values directly.

## Step 1 — Get color data

**If a Figma URL was provided:** call `mcp__figma__get_design_context` with the file key and node ID extracted from the URL. Extract all unique colors used across backgrounds, text, headings, accents, buttons, and interactive states.

**If colors were provided directly:** use those values as-is.

## Step 2 — Propose a 6-scheme mapping

Analyze the design intent and propose the following scheme structure. Present this to the user for approval **before making any file changes**.

| Scheme | Purpose | Typical background |
|--------|---------|-------------------|
| scheme-1 | Primary / main brand feel | Lightest brand color or white |
| scheme-2 | Secondary / neutral variant | Secondary surface color |
| scheme-3 | Accent color 1 | First accent (e.g. yellow, warm tone) |
| scheme-4 | Accent color 2 | Second accent (e.g. purple, cool tone) |
| scheme-5 | Dark / inverted | Darkest brand color |
| scheme-6 | Transparent / overlay | `rgba(0,0,0,0)` |

For each scheme propose:
- `background`
- `foreground` (body text)
- `foreground_heading`
- `primary` (accent/interactive color)
- `primary_hover`
- `border`
- `shadow`
- Primary button: background, text, border (+ hover variants)
- Secondary button: background, text, border (+ hover variants)
- Input: background, text color, border color, hover background
- Variant swatches: all 6 variant color states

**Pause and show the user the proposed mapping. Wait for approval.**

## Step 3 — Update config/settings_data.json

Once the user approves, update the `color_schemes` object inside the `"current"` section. Replace all 6 named schemes (`scheme-1` through `scheme-6`). Do NOT modify any UUID-keyed schemes.

Each scheme has this structure:
```json
"scheme-N": {
  "settings": {
    "background": "#hex",
    "foreground_heading": "#hex",
    "foreground": "#hex",
    "primary": "#hex",
    "primary_hover": "#hex",
    "border": "#hex",
    "shadow": "#hex",
    "primary_button_background": "#hex",
    "primary_button_text": "#hex",
    "primary_button_border": "#hex",
    "primary_button_hover_background": "#hex",
    "primary_button_hover_text": "#hex",
    "primary_button_hover_border": "#hex",
    "secondary_button_background": "#hex or rgba()",
    "secondary_button_text": "#hex",
    "secondary_button_border": "#hex",
    "secondary_button_hover_background": "#hex",
    "secondary_button_hover_text": "#hex",
    "secondary_button_hover_border": "#hex",
    "input_background": "#hex or rgba()",
    "input_text_color": "#hex",
    "input_border_color": "#hex",
    "input_hover_background": "#hex",
    "variant_background_color": "#hex",
    "variant_text_color": "#hex",
    "variant_border_color": "#hex",
    "variant_hover_background_color": "#hex",
    "variant_hover_text_color": "#hex",
    "variant_hover_border_color": "#hex",
    "selected_variant_background_color": "#hex",
    "selected_variant_text_color": "#hex",
    "selected_variant_border_color": "#hex",
    "selected_variant_hover_background_color": "#hex",
    "selected_variant_hover_text_color": "#hex",
    "selected_variant_hover_border_color": "#hex"
  }
}
```

## Step 4 — Verify

After saving, confirm the 6 schemes were updated and remind the user to:
1. Open the Shopify theme editor to visually verify each scheme
2. Apply each scheme to a test section and preview the result
3. Run `npm run check` to ensure no Theme Check errors
