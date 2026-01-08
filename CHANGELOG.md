# Changelog

All notable changes to this project will be documented in this file. See [commit-and-tag-version](https://github.com/absolute-version/commit-and-tag-version) for commit guidelines.

## [0.2.1](https://github.com/chris-bluera/claude-code-anywhere/compare/v0.1.6...v0.2.1) (2026-01-08)


### ⚠ BREAKING CHANGES

* Removes Telnyx SMS provider support in favor of native
macOS Messages.app integration via the imsg CLI tool.

## Why
- No carrier registration (10DLC/toll-free) required
- No third-party SMS costs
- Simpler architecture - direct local integration
- Works immediately without provider setup

## Changes
- Add MessagesClient using imsg CLI for send/receive
- Implement polling-based message retrieval (imsg history)
- Add hash tracking to filter SMS echoes (self-messaging dedup)
- Remove Telnyx, tunnel, and webhook signature code
- Simplify config to just SMS_USER_PHONE
- Update pre-push hook to use test:coverage:quiet
- Add comprehensive tests for hash tracking (90%+ coverage)
- Update README with Twilio/Telnyx comparison and known limitations

## Requirements
- macOS only
- brew install steipete/tap/imsg
- Full Disk Access for terminal app
- iPhone with SMS relay enabled

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>

### Features

* /notify on starts server, /notify off stops it ([ca2e31e](https://github.com/chris-bluera/claude-code-anywhere/commit/ca2e31e8c686f2de94836e4be7e2f88ee7525845))
* auto-load .env file with dotenv ([baf631c](https://github.com/chris-bluera/claude-code-anywhere/commit/baf631c9af66159cc9465d0cff5f6c373bfdb04f))
* **channels:** add multi-channel notification architecture ([104354c](https://github.com/chris-bluera/claude-code-anywhere/commit/104354cdf77574cbd597de5270a64144471561d9))
* configurable poll interval and improved MIME parsing ([478566c](https://github.com/chris-bluera/claude-code-anywhere/commit/478566c043c143708420ad4da52178bbf83b1bd2))
* **email:** use In-Reply-To header for reply matching (RFC 2822) ([faa7a08](https://github.com/chris-bluera/claude-code-anywhere/commit/faa7a08400aabb410918f452d30c5b17bcc1dfa2))
* **logging:** add application logging with file output ([8fef967](https://github.com/chris-bluera/claude-code-anywhere/commit/8fef967f4a852ac2054f60311d8675114d270759))
* replace iMessage with email (SMTP/IMAP) backend ([3a96fb8](https://github.com/chris-bluera/claude-code-anywhere/commit/3a96fb88cdd34a7b3710194403776bc497542e17))
* replace Telnyx with macOS Messages.app backend ([eea1983](https://github.com/chris-bluera/claude-code-anywhere/commit/eea1983243b085b2624ec6c13aa7729da0733050))
* switch from SMS to iMessage for duplicate-free messaging ([8e21579](https://github.com/chris-bluera/claude-code-anywhere/commit/8e21579b10e719aba02230e6631a63aad3a63511))
* **telegram:** add Telegram notification channel ([51f6771](https://github.com/chris-bluera/claude-code-anywhere/commit/51f6771b0ace464baa3e3683767c39fac4ded19b))


### Bug Fixes

* **commands:** add dynamic plugin root detection ([e01a08e](https://github.com/chris-bluera/claude-code-anywhere/commit/e01a08e4f889d36f1a5d07e1d828f185cddbb9d6)), closes [#9354](https://github.com/chris-bluera/claude-code-anywhere/issues/9354) [#12541](https://github.com/chris-bluera/claude-code-anywhere/issues/12541)
* delete processed emails to prevent re-processing ([a96855a](https://github.com/chris-bluera/claude-code-anywhere/commit/a96855adc580af7aebf0b6f9e877b20b0ef2f477))
* **hooks:** add fast server check for safe dogfooding ([6d32570](https://github.com/chris-bluera/claude-code-anywhere/commit/6d32570aa1c1130418f67b887850c5507439523e))
* improve README readability and remove gmail preference ([328b460](https://github.com/chris-bluera/claude-code-anywhere/commit/328b4604b74860048c6d048b11409d3935725126))
* **plugin:** move plugin.json to repo root per official docs ([fcefb96](https://github.com/chris-bluera/claude-code-anywhere/commit/fcefb960a17aefa6bdfb5182a548465a4b8b0028))
* **telegram:** complete channel integration with sequential reply support ([0c17e06](https://github.com/chris-bluera/claude-code-anywhere/commit/0c17e06a6060573969fb0a52367da07d765beb04))

## [0.2.0](https://github.com/chris-bluera/claude-code-anywhere/compare/v0.1.6...v0.2.0) (2026-01-08)


### ⚠ BREAKING CHANGES

* Removes Telnyx SMS provider support in favor of native
macOS Messages.app integration via the imsg CLI tool.

## Why
- No carrier registration (10DLC/toll-free) required
- No third-party SMS costs
- Simpler architecture - direct local integration
- Works immediately without provider setup

## Changes
- Add MessagesClient using imsg CLI for send/receive
- Implement polling-based message retrieval (imsg history)
- Add hash tracking to filter SMS echoes (self-messaging dedup)
- Remove Telnyx, tunnel, and webhook signature code
- Simplify config to just SMS_USER_PHONE
- Update pre-push hook to use test:coverage:quiet
- Add comprehensive tests for hash tracking (90%+ coverage)
- Update README with Twilio/Telnyx comparison and known limitations

## Requirements
- macOS only
- brew install steipete/tap/imsg
- Full Disk Access for terminal app
- iPhone with SMS relay enabled

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>

### Features

* /notify on starts server, /notify off stops it ([ca2e31e](https://github.com/chris-bluera/claude-code-anywhere/commit/ca2e31e8c686f2de94836e4be7e2f88ee7525845))
* auto-load .env file with dotenv ([baf631c](https://github.com/chris-bluera/claude-code-anywhere/commit/baf631c9af66159cc9465d0cff5f6c373bfdb04f))
* configurable poll interval and improved MIME parsing ([478566c](https://github.com/chris-bluera/claude-code-anywhere/commit/478566c043c143708420ad4da52178bbf83b1bd2))
* replace iMessage with email (SMTP/IMAP) backend ([3a96fb8](https://github.com/chris-bluera/claude-code-anywhere/commit/3a96fb88cdd34a7b3710194403776bc497542e17))
* replace Telnyx with macOS Messages.app backend ([eea1983](https://github.com/chris-bluera/claude-code-anywhere/commit/eea1983243b085b2624ec6c13aa7729da0733050))
* switch from SMS to iMessage for duplicate-free messaging ([8e21579](https://github.com/chris-bluera/claude-code-anywhere/commit/8e21579b10e719aba02230e6631a63aad3a63511))


### Bug Fixes

* delete processed emails to prevent re-processing ([a96855a](https://github.com/chris-bluera/claude-code-anywhere/commit/a96855adc580af7aebf0b6f9e877b20b0ef2f477))

## [0.1.6](https://github.com/chris-bluera/claude-code-anywhere/compare/v0.1.5...v0.1.6) (2026-01-07)

## [0.1.5](https://github.com/chris-bluera/claude-code-anywhere/compare/v0.1.4...v0.1.5) (2026-01-07)

## [0.1.4](https://github.com/chris-bluera/claude-code-anywhere/compare/v0.1.2...v0.1.4) (2026-01-06)

## [0.1.3](https://github.com/chris-bluera/claude-code-anywhere/compare/v0.1.2...v0.1.3) (2026-01-06)

## [0.1.2](https://github.com/chris-bluera/claude-code-anywhere/compare/v0.1.1...v0.1.2) (2026-01-06)


### Bug Fixes

* **config:** throw on missing home directory instead of fallback ([db44e7c](https://github.com/chris-bluera/claude-code-anywhere/commit/db44e7ca37b9b803b03f45a1613a9b45818ef6d9))
* **config:** use dynamic port in default bridge URL ([2ac5076](https://github.com/chris-bluera/claude-code-anywhere/commit/2ac507680a89fc5db5cae3383d1034cfc3c000fa))
* enforce fail-fast error handling per CLAUDE.md ([8c27bda](https://github.com/chris-bluera/claude-code-anywhere/commit/8c27bda12de5968d78bbc4b4e9dbbecc9b70eb90))
* **routes:** cleanup request listeners after settling ([7bd63ab](https://github.com/chris-bluera/claude-code-anywhere/commit/7bd63abe51b8f37cb7a3b1a5ccf0a80945a4169a))
* **server:** move URL parsing inside try-catch block ([b3f67f8](https://github.com/chris-bluera/claude-code-anywhere/commit/b3f67f8c546d2948a90428c1cab729c0df897c2f))
* **sessions:** storeResponse throws on missing session ([88d758b](https://github.com/chris-bluera/claude-code-anywhere/commit/88d758b04468398f76407e46540bb55bb1d7ac46))
* **state:** strict validation and reload-before-modify ([690c19e](https://github.com/chris-bluera/claude-code-anywhere/commit/690c19ed5bc2cd8d4908974d99781007d1fc1c63))

## [0.1.1](https://github.com/chris-bluera/claude-code-anywhere/compare/v0.1.0...v0.1.1) (2026-01-06)


### Features

* **code-review:** add local codebase review command ([c83000f](https://github.com/chris-bluera/claude-code-anywhere/commit/c83000f5087abdbae49b5eaa633fd393335a3426))


### Bug Fixes

* **code-review:** simplify context command to avoid permission error ([f358fec](https://github.com/chris-bluera/claude-code-anywhere/commit/f358fec6079e8433b9c70744dacbfd0c164f238d))
* **server:** enforce fail-fast error handling per CLAUDE.md ([6d83bba](https://github.com/chris-bluera/claude-code-anywhere/commit/6d83bbafdeca786dd0380c35e27f2ec6179c38c4))
