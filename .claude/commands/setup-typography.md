# Setup Typography

Set up typography for a new client project. You can either provide a Figma URL for automatic extraction, or supply font details directly.

## Step 1 — Get font data

**If a Figma URL was provided:** call `mcp__figma__get_design_context` with the file key and node ID extracted from the URL. Extract all unique font families, weights, and type size scales used across the design.

**If font details were provided directly:** use those details as-is.

## Step 2 — Identify font source

Check whether the font family is available in Shopify's font library. Common Shopify fonts include: Inter, Helvetica Neue, Arial, Georgia, Playfair Display, DM Sans, Roboto, Lato, Open Sans, Nunito, Josefin Sans, Work Sans, Cormorant Garamond, EB Garamond.

**Custom font (not in Shopify library):**
- Inform the user they must upload font files (`.woff2` preferred, `.woff` fallback) to `assets/` using the naming convention `1-FontName-Weight.woff2`
- Add `@font-face` declarations to `snippets/1-client-styles-variables.liquid` by uncommenting and updating the template block
- Add CSS variable overrides inside `:root {}` in that same file:
  ```css
  --font-body--family: "Font Name", {{ settings.type_body_font.fallback_families }};
  --font-subheading--family: "Font Name", {{ settings.type_subheading_font.fallback_families }};
  --font-heading--family: "Font Name", {{ settings.type_heading_font.fallback_families }};
  --font-accent--family: "Font Name", {{ settings.type_accent_font.fallback_families }};
  ```

**Shopify library font:**
- No `@font-face` or CSS variable overrides needed
- Set the exact Shopify font handle in `config/settings_data.json` (format: `fontname_n4` for regular, `fontname_n7` for bold, etc.)

## Step 3 — Update config/settings_data.json

Update the `"current"` section with the following values extracted from the Figma type scale (or provided details):

**Font family handles** — used to generate correct fallback families:
- Custom font: set closest matching Shopify handle (e.g. `inter_n4` for sans-serif body, `inter_n7` for bold headings)
- Shopify font: set exact handle

| Key | Description |
|-----|-------------|
| `type_body_font` | Body/paragraph font handle |
| `type_subheading_font` | Subheading font handle |
| `type_heading_font` | Primary heading font handle |
| `type_accent_font` | Accent font handle |

**Heading sizes** — map Figma px values to nearest available option:
`10, 12, 14, 16, 18, 20, 24, 32, 40, 48, 56, 72, 88, 120, 152, 184`

| Key | Maps to |
|-----|---------|
| `type_size_h1` | Largest heading size |
| `type_size_h2` | Second heading size |
| `type_size_h3` | Third heading size |
| `type_size_h4` | Fourth heading size |
| `type_size_h5` | Fifth heading size |
| `type_size_h6` | Smallest heading size |
| `type_size_paragraph` | Body text size (options: `10, 12, 14, 16, 18`) |

**Line heights:**
- Headings: `display-tight` (≈1.0), `display-normal` (≈1.1), `display-loose` (≈1.2)
- Paragraph: `body-tight` (1.2), `body-normal` (1.4), `body-loose` (1.6)

| Key | Note |
|-----|------|
| `type_line_height_h1` – `type_line_height_h6` | Choose from display-* options |
| `type_line_height_paragraph` | Choose from body-* options |

**Letter spacing:**
- `heading-tight` → negative tracking (use for large display headings ≥40px)
- `heading-normal` → zero tracking
- `heading-loose` → positive tracking

| Key | Note |
|-----|------|
| `type_letter_spacing_h1` – `type_letter_spacing_h6` | Map from Figma tracking values |

**Font assignments per heading level:**
- Options: `heading`, `subheading`, `body`, `accent`

| Key | Typical mapping |
|-----|----------------|
| `type_font_h1` – `type_font_h4` | Usually `heading` |
| `type_font_h5` – `type_font_h6` | Usually `subheading` |

**Text case:**
- Options: `none`, `uppercase`

| Key |
|-----|
| `type_case_h1` – `type_case_h6` |

## Step 4 — Report typography scale

After making all changes, output a summary table:

| Heading | Font | Size | Line Height | Letter Spacing | Case |
|---------|------|------|-------------|----------------|------|
| H1 | ... | ...px | ... | ... | ... |
| ... | | | | | |

Also note whether font files still need to be uploaded to `assets/`.
