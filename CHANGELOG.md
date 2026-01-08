# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

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
