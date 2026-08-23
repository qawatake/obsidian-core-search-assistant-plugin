# Changelog

## [0.9.8](https://github.com/qawatake/obsidian-core-search-assistant-plugin/compare/0.9.7...0.9.8) - 2026-08-23

### Changes
- ci: declare least-privilege GITHUB_TOKEN permissions by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/89
- ci: build release with pnpm --frozen-lockfile by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/90
- e2e: download the newest Obsidian release that ships a dmg by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/92
- ci: pin GitHub Actions to commit SHAs with pinact by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/93
- ci: run on pull_request/push and weekly schedule by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/94
- e2e: survive a confirmation modal at startup; disable auto-update in CI by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/95
- build: harden pnpm settings (minimum-release-age, exact pins, pinned pnpm) by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/96
- ci: add Dependabot version updates with a 7-day cooldown by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/97
- build: move to Node 24 (current Active LTS) by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/103
- ci: bump pinned mise to 2026.8.3 by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/104
- Bump actions/checkout from 4.4.0 to 7.0.1 by @dependabot[bot] in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/100
- Bump softprops/action-gh-release from 2.6.2 to 3.0.2 by @dependabot[bot] in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/99
- Bump jdx/mise-action from 2.4.4 to 4.2.5 by @dependabot[bot] in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/98
- Bump the npm-minor-patch group with 3 updates by @dependabot[bot] in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/101
- build: upgrade Biome 1.9 -> 2.5 and clear new lint findings by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/105
- deps: update build-time dependencies to current majors by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/107
- ci: stop Dependabot proposing majors we pin on purpose by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/108
- ci: run lint in CI (and build on every PR) by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/109
- ci: generate GitHub release notes on release by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/110

## [0.9.7](https://github.com/qawatake/obsidian-core-search-assistant-plugin/compare/0.9.6...0.9.7) - 2026-08-16

- Reinstate Svelte 5 migration by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/87

## [0.9.6](https://github.com/qawatake/obsidian-core-search-assistant-plugin/compare/0.9.5...0.9.6) - 2026-08-16

- Wait for the app:open-vault command to be registered by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/83
- Revert Svelte 5 migration (broken rendering in card-view-switcher; same migration here) by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/85

## [0.9.5](https://github.com/qawatake/obsidian-core-search-assistant-plugin/compare/0.9.4...0.9.5) - 2026-08-16

- Run e2e tests in CI by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/73
- cron CI by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/75
- Update CI workflow to use workflow_dispatch only by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/77
- Bump dev dependencies to resolve Dependabot alerts by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/78
- Migrate to Svelte 5 (compatibility component API) by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/79
- Fix e2e cleanup against current Obsidian (refs #81) by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/82

## [0.9.4](https://github.com/qawatake/obsidian-core-search-assistant-plugin/compare/0.9.3...0.9.4) - 2025-04-27
- Dev environment update (tests, Biome, pnpm) by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/69

## [0.9.3](https://github.com/qawatake/obsidian-core-search-assistant-plugin/compare/0.9.2...0.9.3) - 2025-04-27
- tagpr by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/70

## [0.9.2](https://github.com/qawatake/obsidian-core-search-assistant-plugin/compare/0.9.1...0.9.2) - 2023-05-03
- Patch for esc key by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/57
- Support Obsidian 1.2.7 by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/63

## [0.9.1](https://github.com/qawatake/obsidian-core-search-assistant-plugin/compare/0.9.0...0.9.1) - 2022-07-16
- Support Obsidian Release v0.15.6 by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/56

## [0.9.0](https://github.com/qawatake/obsidian-core-search-assistant-plugin/compare/0.8.4...0.9.0) - 2022-07-16
- Fix #51 by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/52

## [0.8.4](https://github.com/qawatake/obsidian-core-search-assistant-plugin/compare/0.8.3...0.8.4) - 2022-05-03
- Trim white spaces in generated wiki links by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/49

## [0.8.3](https://github.com/qawatake/obsidian-core-search-assistant-plugin/compare/0.8.2...0.8.3) - 2022-03-17
- Fix: ugly rendering of webp and pdf by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/48

## [0.8.2](https://github.com/qawatake/obsidian-core-search-assistant-plugin/compare/0.8.1...0.8.2) - 2022-03-13
- Fix: card view reloads on initial navigating by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/43

## [0.8.1](https://github.com/qawatake/obsidian-core-search-assistant-plugin/compare/0.8.0...0.8.1) - 2022-02-25
- Use svelte components by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/42

## [0.8.0](https://github.com/qawatake/obsidian-core-search-assistant-plugin/compare/0.7.0...0.8.0) - 2022-02-24
- Command for copying wiki links by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/40

## [0.7.0](https://github.com/qawatake/obsidian-core-search-assistant-plugin/compare/0.6.2...0.7.0) - 2022-02-17
- Support Excalidraw and Kanban plugins by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/39

## [0.6.2](https://github.com/qawatake/obsidian-core-search-assistant-plugin/compare/0.6.1...0.6.2) - 2022-02-17

## [0.6.1](https://github.com/qawatake/obsidian-core-search-assistant-plugin/compare/0.6.0...0.6.1) - 2022-02-16
- Customizable hotkeys by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/36

## [0.6.0](https://github.com/qawatake/obsidian-core-search-assistant-plugin/compare/0.5.2...0.6.0) - 2022-02-15
- Patch #22 (open unsupported files in default app) by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/33

## [0.5.2](https://github.com/qawatake/obsidian-core-search-assistant-plugin/compare/0.5.1...0.5.2) - 2022-02-13
- can move pages by hotkeys by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/28
- Fix: fail to open files on clicking items on the sidebar by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/32

## [0.5.1](https://github.com/qawatake/obsidian-core-search-assistant-plugin/compare/0.5.0...0.5.1) - 2022-02-13

## [0.5.0](https://github.com/qawatake/obsidian-core-search-assistant-plugin/compare/0.4.2...0.5.0) - 2022-02-11
- Use safer api by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/26

## [0.4.2](https://github.com/qawatake/obsidian-core-search-assistant-plugin/compare/0.4.1...0.4.2) - 2022-02-08
- toggle sidebars automatically by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/23

## [0.4.1](https://github.com/qawatake/obsidian-core-search-assistant-plugin/compare/0.4.0...0.4.1) - 2022-02-02

## [0.4.0](https://github.com/qawatake/obsidian-core-search-assistant-plugin/compare/0.3.7...0.4.0) - 2022-02-01

## [0.3.7](https://github.com/qawatake/obsidian-core-search-assistant-plugin/compare/0.3.6...0.3.7) - 2022-01-29

## [0.3.6](https://github.com/qawatake/obsidian-core-search-assistant-plugin/compare/0.3.5...0.3.6) - 2022-01-29

## [0.3.5](https://github.com/qawatake/obsidian-core-search-assistant-plugin/compare/0.3.3...0.3.5) - 2022-01-28
- Use openFile by @qawatake in https://github.com/qawatake/obsidian-core-search-assistant-plugin/pull/18
