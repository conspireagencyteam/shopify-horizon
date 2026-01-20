# Conspire Agency Base Theme

[Getting started](#getting-started) |
[Agency Workflow](#agency-workflow) |
[Staying up to date with Horizon changes](#staying-up-to-date-with-horizon-changes) |
[Developer tools](#developer-tools)

This is Conspire Agency's base Shopify theme, forked from [Shopify Horizon](https://github.com/Shopify/horizon). It serves as the foundation for client theme projects, incorporating the latest Liquid Storefronts features including [theme blocks](https://shopify.dev/docs/storefronts/themes/architecture/blocks/theme-blocks/quick-start?framework=liquid).

## Core Principles (inherited from Horizon)

- **Web-native in its purest form:** Leverages the latest web browsers to their fullest, while maintaining support for older ones through progressive enhancement—not polyfills.
- **Lean, fast, and reliable:** Code ships on quality. Themes are built with purpose and don't support unnecessary features.
- **Server-rendered:** HTML is rendered by Shopify servers using Liquid. Business logic and platform primitives such as translations and money formatting don't belong on the client.
- **Functional, not pixel-perfect:** Using semantic markup, progressive enhancement, and clever design, themes remain functional regardless of the browser.

## Getting started

Install the [Shopify CLI](https://shopify.dev/docs/storefronts/themes/tools/cli) to connect your local project to a Shopify store. Learn about the [theme developer tools](https://shopify.dev/docs/storefronts/themes/tools) available, and the suggested [developer tools](#developer-tools) below.

## Agency Workflow

This theme follows a rolling base theme workflow that maintains upstream Horizon connection while accumulating reusable customizations across client projects. See **[AGENCY-WORKFLOW.md](AGENCY-WORKFLOW.md)** for detailed documentation on:

- Setting up new client projects from this base
- Syncing customizations back to the base theme
- Handling presets and locale files
- Claude Code prompts for common tasks

## Staying up to date with Horizon changes

To pull in the latest changes from the upstream Horizon repository:

1. Verify the list of remotes:

```sh
git remote -v
```

2. If you don't see an `upstream`, add one pointing to Shopify's Horizon repository:

```sh
git remote add upstream https://github.com/Shopify/horizon.git
```

3. Pull in the latest Horizon changes:

```sh
git fetch upstream
git pull upstream main
```

## Developer tools

### Shopify CLI

[Shopify CLI](https://shopify.dev/docs/storefronts/themes/tools/cli) helps you build Shopify themes faster and is used to automate and enhance your local development workflow. It comes bundled with a suite of commands for developing Shopify themes—everything from working with themes on a Shopify store (e.g. creating, publishing, deleting themes) or launching a development server for local theme development.

You can follow this [quick start guide for theme developers](https://shopify.dev/docs/themes/tools/cli) to get started.

### Theme Check

We recommend using [Theme Check](https://github.com/shopify/theme-check) as a way to validate and lint your Shopify themes.

Theme Check is included in the [VS Code extensions](/.vscode/extensions.json), so you'll be prompted to install the [Theme Check VS Code](https://marketplace.visualstudio.com/items?itemName=Shopify.theme-check-vscode) extension upon opening VS Code.

You can also run it from a terminal with the following Shopify CLI command:

```bash
shopify theme check
```

You can follow the [theme check documentation](https://shopify.dev/docs/storefronts/themes/tools/theme-check) for more details.
