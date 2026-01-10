# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [0.6.24](https://github.com/blueraai/claude-code-anywhere/compare/v0.6.23...v0.6.24) (2026-01-10)


### Bug Fixes

* **logger:** use canonical log location ~/.claude/claude-code-anywhere/logs ([ab54dc9](https://github.com/blueraai/claude-code-anywhere/commit/ab54dc9a4e1944465c5eb81b27c391b0477a0773))

## [0.6.23](https://github.com/blueraai/claude-code-anywhere/compare/v0.6.22...v0.6.23) (2026-01-10)


### Bug Fixes

* **server-status:** use canonical port path instead of plugin root ([c3147cb](https://github.com/blueraai/claude-code-anywhere/commit/c3147cbcf54ddb246886f14289587ed1de5a0ba6))

## [0.6.22](https://github.com/blueraai/claude-code-anywhere/compare/v0.6.21...v0.6.22) (2026-01-10)


### Bug Fixes

* **routes:** respect session-enabled state in /api/session endpoint ([b2f4529](https://github.com/blueraai/claude-code-anywhere/commit/b2f452911319432beebccbaf215dda9faae662f6))

## [0.6.21](https://github.com/blueraai/claude-code-anywhere/compare/v0.6.20...v0.6.21) (2026-01-10)


### Features

* **hooks:** auto-restart server on version mismatch after plugin update ([7d4b8ee](https://github.com/blueraai/claude-code-anywhere/commit/7d4b8ee9c7d9434d9c62e0167c7fa7a278897ab4))

## [0.6.20](https://github.com/blueraai/claude-code-anywhere/compare/v0.6.19...v0.6.20) (2026-01-10)


### Bug Fixes

* **hooks:** use /api/active for PreToolUse to match statusline behavior ([9c360d9](https://github.com/blueraai/claude-code-anywhere/commit/9c360d9114de4f3b099ae3f0c1fb391d235f0281))

## [0.6.19](https://github.com/blueraai/claude-code-anywhere/compare/v0.6.18...v0.6.19) (2026-01-10)


### Bug Fixes

* **hooks:** discard stale responses in PreToolUse approval polling ([749d9a6](https://github.com/blueraai/claude-code-anywhere/commit/749d9a649f6f3507375f93a96aac0b96364d3058))

## [0.6.18](https://github.com/blueraai/claude-code-anywhere/compare/v0.6.17...v0.6.18) (2026-01-10)


### Bug Fixes

* **hooks:** flexible approval pattern matching for PreToolUse ([0808530](https://github.com/blueraai/claude-code-anywhere/commit/0808530430a7173e1509588bc5a86a10c630df4f))

## [0.6.17](https://github.com/blueraai/claude-code-anywhere/compare/v0.6.16...v0.6.17) (2026-01-10)


### Bug Fixes

* **hooks:** use canonical port path for cross-context compatibility ([d22117a](https://github.com/blueraai/claude-code-anywhere/commit/d22117ac610b81167d48f04061f8b95dada1b01b))

## [0.6.16](https://github.com/blueraai/claude-code-anywhere/compare/v0.6.15...v0.6.16) (2026-01-10)


### Bug Fixes

* **statusline:** use session_id from JSON input for per-session isolation (v4) ([e172536](https://github.com/blueraai/claude-code-anywhere/commit/e172536850e0c446f16db3c0ad1e6ad9a18b30a4))
* **statusline:** write port to canonical config path for statusline v3 ([bf955a7](https://github.com/blueraai/claude-code-anywhere/commit/bf955a77a2b92dc7a00f8228741389335e532265))

## [0.6.15](https://github.com/blueraai/claude-code-anywhere/compare/v0.6.14...v0.6.15) (2026-01-10)


### Bug Fixes

* **hooks:** run session auto-registration synchronously ([84844d6](https://github.com/blueraai/claude-code-anywhere/commit/84844d652ba549e6b4c7ee7961756e1c7d6183b3))

## [0.6.14](https://github.com/blueraai/claude-code-anywhere/compare/v0.6.13...v0.6.14) (2026-01-10)


### Features

* **release:** add skill bypass and pre-flight checks ([e3acf92](https://github.com/blueraai/claude-code-anywhere/commit/e3acf92094b1070de56b0427a650f17fa31991b1))

## [0.6.13](https://github.com/blueraai/claude-code-anywhere/compare/v0.6.12...v0.6.13) (2026-01-10)


### Bug Fixes

* **commands:** remove inline backticks accessing files outside project ([50c5137](https://github.com/blueraai/claude-code-anywhere/commit/50c5137a200f9cd7fd89c6f7b7d4e81a05b956fd))

## [0.6.12](https://github.com/blueraai/claude-code-anywhere/compare/v0.6.10...v0.6.12) (2026-01-10)


### Features

* **hooks:** add PreToolUse hook to block manual releases ([23e6b8b](https://github.com/blueraai/claude-code-anywhere/commit/23e6b8b49b5789a1eaa2160036097ae8e084f81e))

## [0.6.11](https://github.com/blueraai/claude-code-anywhere/compare/v0.6.10...v0.6.11) (2026-01-10)

## [0.6.10](https://github.com/blueraai/claude-code-anywhere/compare/v0.6.9...v0.6.10) (2026-01-10)

## [0.6.9](https://github.com/blueraai/claude-code-anywhere/compare/v0.6.8...v0.6.9) (2026-01-10)


### Features

* **telegram:** add quick response buttons to Notification/Stop events ([d07b58d](https://github.com/blueraai/claude-code-anywhere/commit/d07b58deb5b9c8025295ebeaeb5890fa335c974a))

## [0.6.8](https://github.com/blueraai/claude-code-anywhere/compare/v0.6.7...v0.6.8) (2026-01-10)


### Bug Fixes

* **routes:** remove hasSession check from enable endpoint ([a2db1dd](https://github.com/blueraai/claude-code-anywhere/commit/a2db1ddad24260ca8940589d8130141decbff71c))

## [0.6.7](https://github.com/blueraai/claude-code-anywhere/compare/v0.6.6...v0.6.7) (2026-01-10)


### Bug Fixes

* **routing:** support UUID session IDs with dashes in URL patterns ([e92c1c8](https://github.com/blueraai/claude-code-anywhere/commit/e92c1c8e9531068fcf573dd525e3766d27fbff1a))

## [0.6.6](https://github.com/blueraai/claude-code-anywhere/compare/v0.6.5...v0.6.6) (2026-01-10)


### Features

* **sessions:** auto-register sessions on enable and at session start ([22cc9bd](https://github.com/blueraai/claude-code-anywhere/commit/22cc9bdaf93df5ab53cc18a92d5448d9c96d4aaf))

## [0.6.5](https://github.com/blueraai/claude-code-anywhere/compare/v0.6.4...v0.6.5) (2026-01-10)


### Bug Fixes

* **hooks:** read session_id from stdin JSON instead of env var ([2d096ce](https://github.com/blueraai/claude-code-anywhere/commit/2d096ce69db449e87319c6e951e45f5479924edc))

## [0.6.4](https://github.com/blueraai/claude-code-anywhere/compare/v0.6.3...v0.6.4) (2026-01-10)

## [0.6.3](https://github.com/blueraai/claude-code-anywhere/compare/v0.6.2...v0.6.3) (2026-01-10)

## [0.6.2](https://github.com/blueraai/claude-code-anywhere/compare/v0.6.1...v0.6.2) (2026-01-10)


### Bug Fixes

* **statusline:** use visible gray color for inactive indicator ([dad3ef3](https://github.com/blueraai/claude-code-anywhere/commit/dad3ef307de43b2a0aef04c0450d42f0abd1081d))

## [0.6.1](https://github.com/blueraai/claude-code-anywhere/compare/v0.6.0...v0.6.1) (2026-01-10)

## [0.6.0](https://github.com/blueraai/claude-code-anywhere/compare/v0.4.9...v0.6.0) (2026-01-10)


### ⚠ BREAKING CHANGES

* **release:** Rename all /notify commands to /cca

- /notify → /cca
- /notify-test → /cca-test
- /notify-doctor → /cca-doctor
- /notify install → /cca install
- CLAUDE_NOTIFY_AUTO → CLAUDE_CCA_AUTO
- $NOTIFY_STATUS → $CCA_STATUS

Also includes statusline feature from previous commits.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>

* **release:** 0.5.0 ([469f49c](https://github.com/blueraai/claude-code-anywhere/commit/469f49c519b7efda5a450753cf7d1793d9bd295b))


### Features

* **commands:** add /release command for cutting releases ([b06fa57](https://github.com/blueraai/claude-code-anywhere/commit/b06fa575c93b1cb415fafca6c01fb3d79e73d7d1))
* **release:** auto-detect version bump from conventional commits ([ef983c9](https://github.com/blueraai/claude-code-anywhere/commit/ef983c9126c4e3a1468613669abff69c0dba32e2))


### Bug Fixes

* **commands:** move /release to .claude/commands ([a2f23f5](https://github.com/blueraai/claude-code-anywhere/commit/a2f23f5d978a6b3fb398e028b59f5f45ad02066c))

## [0.5.1](https://github.com/blueraai/claude-code-anywhere/compare/v0.4.9...v0.5.1) (2026-01-09)


### ⚠ BREAKING CHANGES

* **release:** Rename all /notify commands to /cca

- /notify → /cca
- /notify-test → /cca-test
- /notify-doctor → /cca-doctor
- /notify install → /cca install
- CLAUDE_NOTIFY_AUTO → CLAUDE_CCA_AUTO
- $NOTIFY_STATUS → $CCA_STATUS

Also includes statusline feature from previous commits.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>

* **release:** 0.5.0 ([469f49c](https://github.com/blueraai/claude-code-anywhere/commit/469f49c519b7efda5a450753cf7d1793d9bd295b))


### Features

* **commands:** add /release command for cutting releases ([b06fa57](https://github.com/blueraai/claude-code-anywhere/commit/b06fa575c93b1cb415fafca6c01fb3d79e73d7d1))

## [0.5.0](https://github.com/blueraai/claude-code-anywhere/compare/v0.4.9...v0.5.0) (2026-01-09)

## [0.4.10](https://github.com/blueraai/claude-code-anywhere/compare/v0.4.9...v0.4.10) (2026-01-09)

## [0.4.9](https://github.com/blueraai/claude-code-anywhere/compare/v0.4.8...v0.4.9) (2026-01-09)

## [0.4.8](https://github.com/blueraai/claude-code-anywhere/compare/v0.4.7...v0.4.8) (2026-01-09)

## [0.4.7](https://github.com/blueraai/claude-code-anywhere/compare/v0.4.6...v0.4.7) (2026-01-09)

## [0.4.6](https://github.com/blueraai/claude-code-anywhere/compare/v0.4.5...v0.4.6) (2026-01-09)


### Features

* **notify:** add 'all' argument for per-session vs global control ([3a717cf](https://github.com/blueraai/claude-code-anywhere/commit/3a717cfa48a39e99e49636b43852e44eb979db3c))
* **telegram:** add inline keyboard buttons for PreToolUse approvals ([6766ce4](https://github.com/blueraai/claude-code-anywhere/commit/6766ce434852807eed8f593826a30139144e47d2))

## [0.4.5](https://github.com/blueraai/claude-code-anywhere/compare/v0.4.4...v0.4.5) (2026-01-09)

## [0.4.4](https://github.com/blueraai/claude-code-anywhere/compare/v0.4.3...v0.4.4) (2026-01-09)


### Bug Fixes

* **plugin:** use string format for repository field ([24316c3](https://github.com/blueraai/claude-code-anywhere/commit/24316c3dd26cc1ca9a7bf2f700f4cdc93bbfb479))

## [0.4.3](https://github.com/blueraai/claude-code-anywhere/compare/v0.4.2...v0.4.3) (2026-01-09)

## [0.4.2](https://github.com/blueraai/claude-code-anywhere/compare/v0.4.1...v0.4.2) (2026-01-09)

## [0.4.1](https://github.com/blueraai/claude-code-anywhere/compare/v0.4.0...v0.4.1) (2026-01-09)


### Bug Fixes

* **plugin:** move plugin.json to canonical .claude-plugin/ location ([e42b90e](https://github.com/blueraai/claude-code-anywhere/commit/e42b90e974aceeca4bb758feaf274b9626a30be2))

## [0.4.0](https://github.com/blueraai/claude-code-anywhere/compare/v0.3.4...v0.4.0) (2026-01-08)


### ⚠ BREAKING CHANGES

* Installation directory changed from ~/.claude-notify
to ~/.claude-code-anywhere. Existing global installations must uninstall
and reinstall.

Changes:
- Rename all paths: ~/.claude-notify → ~/.claude-code-anywhere
- Rename service: claude-notify.service → claude-code-anywhere.service
- Rename launchd: com.claude.notify → com.claude.code-anywhere
- Scope all wildcard permissions to specific paths/commands:
  - curl: localhost API only
  - rm: ~/.config/claude-code-anywhere/ only
  - kill → pkill -f "bun run server" (process name, not port)
  - launchctl/systemctl: specific service files only
  - Remove unused test -d *
- Add dynamic port support via port file
- Update skills to use PORT variable from port file

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>

* rename claude-notify to claude-code-anywhere + scope permissions ([bc39635](https://github.com/blueraai/claude-code-anywhere/commit/bc396352c749e2e0cacc94e27962c567bf610aaf))


### Features

* add SessionStart hook for mode guidance + install/uninstall commands ([8c1cd6a](https://github.com/blueraai/claude-code-anywhere/commit/8c1cd6afa3b7e3479cf5b435b6a5112688572774))
* **commands:** add /notify-doctor diagnostic command ([e52e70f](https://github.com/blueraai/claude-code-anywhere/commit/e52e70f2b64c2574ff21d201e227b300856b6b44))
* **logger:** add YY-MM-DD format + size-based rotation ([4a600f9](https://github.com/blueraai/claude-code-anywhere/commit/4a600f9b4e6a4da899ee216d531a6bca879f9fbd))
* **scripts:** add global installer and uninstaller ([16014d0](https://github.com/blueraai/claude-code-anywhere/commit/16014d0506840eb363cb856d7cad5df634d9c3a9))
* **server:** add dynamic port file for hook discovery ([fb15ea9](https://github.com/blueraai/claude-code-anywhere/commit/fb15ea95820226f19ac08d2e11ac2fd1b411968a))


### Bug Fixes

* **commands:** add test to allowed-tools for mode detection ([55a0c89](https://github.com/blueraai/claude-code-anywhere/commit/55a0c89eaeb3814e543e47ed5319f84fc58d4fda))
* **commands:** make notify-doctor mode-aware ([5579200](https://github.com/blueraai/claude-code-anywhere/commit/55792003f8ab062a4b607e91af2971be560ad4eb))
* **commands:** scope curl permission to localhost API only ([5a7c15b](https://github.com/blueraai/claude-code-anywhere/commit/5a7c15b329bfd02f30c298186e70635aa14bced7))
* **commands:** scope test permission to ~/.claude-notify/ ([c313893](https://github.com/blueraai/claude-code-anywhere/commit/c313893140170a44c2edd4c593d07739a63698f1))
* **hooks:** read session_id from JSON stdin instead of env vars ([7828100](https://github.com/blueraai/claude-code-anywhere/commit/7828100a42baff9160c553637bdbac80425f402f))
* **install:** add official claude binary paths ([a818678](https://github.com/blueraai/claude-code-anywhere/commit/a81867879077f33628312fe4a5070a74afec4ff1))
* **install:** remove static daemon logs, use logger's YY-MM-DD format ([53f1dc1](https://github.com/blueraai/claude-code-anywhere/commit/53f1dc152806435c187b0c3cc18a6405251f1ee3))
* **sessions:** remove dangerous single-session guess logic ([2069602](https://github.com/blueraai/claude-code-anywhere/commit/20696028dc0a2aead8e7c6b033391fe47a69c71e))

## [0.3.4](https://github.com/blueraai/claude-code-anywhere/compare/v0.3.3...v0.3.4) (2026-01-08)

## [0.3.3](https://github.com/blueraai/claude-code-anywhere/compare/v0.3.2...v0.3.3) (2026-01-08)

## [0.3.2](https://github.com/blueraai/claude-code-anywhere/compare/v0.3.1...v0.3.2) (2026-01-08)


### Features

* **api:** add channel config info to status endpoint ([fd14b80](https://github.com/blueraai/claude-code-anywhere/commit/fd14b8080ce4998e01a6fcfb97e75759125181aa))

## [0.3.1](https://github.com/blueraai/claude-code-anywhere/compare/v0.3.0...v0.3.1) (2026-01-08)


### Bug Fixes

* add ResponseSync to VALID_HOOK_EVENTS in routes ([f40ca13](https://github.com/blueraai/claude-code-anywhere/commit/f40ca13869ab6e3dcb0e9480066348e0948e26d5))
* auto-migrate v0.2.x state files missing ResponseSync ([4778dd1](https://github.com/blueraai/claude-code-anywhere/commit/4778dd1b653aae3dde5e2ee9288f3eb3f4dce834))

## [0.3.0](https://github.com/blueraai/claude-code-anywhere/compare/v0.2.4...v0.3.0) (2026-01-08)


### Features

* sync user responses across all channels ([e085b88](https://github.com/blueraai/claude-code-anywhere/commit/e085b88bb568ba10a2608445e54d96eb4eba5194))

## [0.2.4](https://github.com/blueraai/claude-code-anywhere/compare/v0.2.3...v0.2.4) (2026-01-08)


### Features

* **commands:** add frontmatter with argument-hint and description ([f0af904](https://github.com/blueraai/claude-code-anywhere/commit/f0af904e3925fbe4a0f4055593045bba8c0666a8))

## [0.2.3](https://github.com/blueraai/claude-code-anywhere/compare/v0.2.2...v0.2.3) (2026-01-08)


### Bug Fixes

* **ci:** use PAT to trigger Release workflow from Auto Release ([09d5b4c](https://github.com/blueraai/claude-code-anywhere/commit/09d5b4c3a44efd19111d90ae5bb1844d10520468))

## [0.2.2](https://github.com/blueraai/claude-code-anywhere/compare/v0.2.1...v0.2.2) (2026-01-08)


### Bug Fixes

* address code review issues - fail fast, bounded collections, no fallbacks ([952b3d3](https://github.com/blueraai/claude-code-anywhere/commit/952b3d30e69834356cd527782619264d49ce30d7))
* strip [CC-xxx] prefix from Telegram responses and fail fast on no channels ([adfc2ac](https://github.com/blueraai/claude-code-anywhere/commit/adfc2acc9fc58a791361f63e52a94bb320421aff))

## [0.2.1](https://github.com/blueraai/claude-code-anywhere/compare/v0.2.0...v0.2.1) (2026-01-08)

### Features

* **telegram:** add Telegram notification channel ([51f6771](https://github.com/blueraai/claude-code-anywhere/commit/51f6771b0ace464baa3e3683767c39fac4ded19b))
* **channels:** add multi-channel notification architecture ([104354c](https://github.com/blueraai/claude-code-anywhere/commit/104354cdf77574cbd597de5270a64144471561d9))
* **email:** use In-Reply-To header for reply matching (RFC 2822) ([faa7a08](https://github.com/blueraai/claude-code-anywhere/commit/faa7a08400aabb410918f452d30c5b17bcc1dfa2))
* **logging:** add application logging with file output ([8fef967](https://github.com/blueraai/claude-code-anywhere/commit/8fef967f4a852ac2054f60311d8675114d270759))
* /notify on starts server, /notify off stops it ([ca2e31e](https://github.com/blueraai/claude-code-anywhere/commit/ca2e31e8c686f2de94836e4be7e2f88ee7525845))


### Bug Fixes

* **commands:** add dynamic plugin root detection ([e01a08e](https://github.com/blueraai/claude-code-anywhere/commit/e01a08e4f889d36f1a5d07e1d828f185cddbb9d6)), closes [#9354](https://github.com/blueraai/claude-code-anywhere/issues/9354) [#12541](https://github.com/blueraai/claude-code-anywhere/issues/12541)
* delete processed emails to prevent re-processing ([a96855a](https://github.com/blueraai/claude-code-anywhere/commit/a96855adc580af7aebf0b6f9e877b20b0ef2f477))
* **hooks:** add fast server check for safe dogfooding ([6d32570](https://github.com/blueraai/claude-code-anywhere/commit/6d32570aa1c1130418f67b887850c5507439523e))
* improve README readability and remove gmail preference ([328b460](https://github.com/blueraai/claude-code-anywhere/commit/328b4604b74860048c6d048b11409d3935725126))
* **plugin:** move plugin.json to repo root per official docs ([fcefb96](https://github.com/blueraai/claude-code-anywhere/commit/fcefb960a17aefa6bdfb5182a548465a4b8b0028))
* **telegram:** complete channel integration with sequential reply support ([0c17e06](https://github.com/blueraai/claude-code-anywhere/commit/0c17e06a6060573969fb0a52367da07d765beb04))

## [0.2.0](https://github.com/blueraai/claude-code-anywhere/compare/v0.1.6...v0.2.0) (2026-01-08)

### Features

* Email backend with SMTP/IMAP support
* Configurable poll interval and improved MIME parsing

### Bug Fixes

* delete processed emails to prevent re-processing ([a96855a](https://github.com/blueraai/claude-code-anywhere/commit/a96855adc580af7aebf0b6f9e877b20b0ef2f477))

## [0.1.6](https://github.com/blueraai/claude-code-anywhere/compare/v0.1.5...v0.1.6) (2026-01-07)

## [0.1.5](https://github.com/blueraai/claude-code-anywhere/compare/v0.1.4...v0.1.5) (2026-01-07)

## [0.1.4](https://github.com/blueraai/claude-code-anywhere/compare/v0.1.2...v0.1.4) (2026-01-06)

## [0.1.3](https://github.com/blueraai/claude-code-anywhere/compare/v0.1.2...v0.1.3) (2026-01-06)

## [0.1.2](https://github.com/blueraai/claude-code-anywhere/compare/v0.1.1...v0.1.2) (2026-01-06)


### Bug Fixes

* **config:** throw on missing home directory instead of fallback ([db44e7c](https://github.com/blueraai/claude-code-anywhere/commit/db44e7ca37b9b803b03f45a1613a9b45818ef6d9))
* **config:** use dynamic port in default bridge URL ([2ac5076](https://github.com/blueraai/claude-code-anywhere/commit/2ac507680a89fc5db5cae3383d1034cfc3c000fa))
* enforce fail-fast error handling per CLAUDE.md ([8c27bda](https://github.com/blueraai/claude-code-anywhere/commit/8c27bda12de5968d78bbc4b4e9dbbecc9b70eb90))
* **routes:** cleanup request listeners after settling ([7bd63ab](https://github.com/blueraai/claude-code-anywhere/commit/7bd63abe51b8f37cb7a3b1a5ccf0a80945a4169a))
* **server:** move URL parsing inside try-catch block ([b3f67f8](https://github.com/blueraai/claude-code-anywhere/commit/b3f67f8c546d2948a90428c1cab729c0df897c2f))
* **sessions:** storeResponse throws on missing session ([88d758b](https://github.com/blueraai/claude-code-anywhere/commit/88d758b04468398f76407e46540bb55bb1d7ac46))
* **state:** strict validation and reload-before-modify ([690c19e](https://github.com/blueraai/claude-code-anywhere/commit/690c19ed5bc2cd8d4908974d99781007d1fc1c63))

## [0.1.1](https://github.com/blueraai/claude-code-anywhere/compare/v0.1.0...v0.1.1) (2026-01-06)


### Features

* **code-review:** add local codebase review command ([c83000f](https://github.com/blueraai/claude-code-anywhere/commit/c83000f5087abdbae49b5eaa633fd393335a3426))


### Bug Fixes

* **code-review:** simplify context command to avoid permission error ([f358fec](https://github.com/blueraai/claude-code-anywhere/commit/f358fec6079e8433b9c70744dacbfd0c164f238d))
* **server:** enforce fail-fast error handling per CLAUDE.md ([6d83bba](https://github.com/blueraai/claude-code-anywhere/commit/6d83bbafdeca786dd0380c35e27f2ec6179c38c4))
