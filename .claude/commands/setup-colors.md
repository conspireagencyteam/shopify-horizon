# Setup Color Schemes

Set up color schemes for a new client project. You can either provide a Figma URL for automatic extraction, or supply color values directly.

## Step 1 — Get color data

**If a Figma URL was provided:** call `mcp__figma__get_design_context` with the file key and node ID extracted from the URL. Extract all unique colors used across backgrounds, text, headings, accents, buttons, and interactive states.

**If colors were provided directly:** use those values as-is.

## Step 2 — Propose a scheme mapping

Count the distinct surface/background colors in the design. Propose as many schemes as makes sense — **minimum 6, no maximum**. Always include these anchor schemes:

| Role | Purpose | Typical background |
|------|---------|-------------------|
| Primary / light | Main brand feel | Lightest brand color or white |
| Neutral | Secondary surface | Secondary surface color |
| Dark / inverted | High contrast | Darkest brand color |
| Transparent | Overlay / no background | `rgba(0,0,0,0)` |
| + one scheme per additional accent color | Accent backgrounds | Each distinct accent |

Assign scheme numbers sequentially starting from `scheme-1`. For example, a palette with 2 accent colors yields 6 schemes; a palette with 4 accent colors yields 8 schemes.

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

**Pause and show the user the proposed mapping as a table. State the total number of schemes. Wait for the user to confirm the count and mapping before making any file changes.**

## Step 3 — Update config/settings_data.json

Once the user approves, update the `color_schemes` object inside the `"current"` section:

- Replace **all existing `scheme-N` numbered keys** (scheme-1, scheme-2, etc.) with the approved set
- For projects needing more than 6: add additional `scheme-7`, `scheme-8`, etc. entries as needed
- For projects needing fewer than the existing numbered schemes: remove the extra numbered keys
- **Never touch UUID-keyed schemes** (e.g. `scheme-58084d4c-...`) — these are Shopify-generated and used for template-specific overrides

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

After saving, confirm all schemes were updated and remind the user to:
1. Open the Shopify theme editor to visually verify each scheme
2. Apply each scheme to a test section and preview the result
3. Run `npm run check` to ensure no Theme Check errors
