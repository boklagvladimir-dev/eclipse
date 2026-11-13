# Eclipse — Language & Region Profiles

[Русский](README.md) · **English**

Eclipse is a Manifest V3 extension for Chromium-based **desktop** browsers. It applies user-selected language, locale, time zone and optional coordinates on supported web pages. Choose a regional preset or create a custom profile.

**Version:** 0.8.4. Automated CI checks passed and the user confirmed a Chrome 157 browser check. This is not proof of compatibility across all sites and browsers. See [PR #1](https://github.com/boklagvladimir-dev/eclipse/pull/1) for the change history.

## Features

- Override `navigator.language` and `navigator.languages` on supported pages.
- Adjust HTTP `Accept-Language`, `Date` and `Intl` behavior.
- Optionally report chosen coordinates, subject to website geolocation permission.
- Regional presets, custom profiles, language and time-zone search.
- Basic and advanced modes; 12 interface languages: English, Russian, German, Finnish, Italian, French, Spanish, Brazilian Portuguese, Simplified Chinese, Japanese, Arabic and Persian.
- Per-site exceptions for a domain and its subdomains.
- Tab status indicators and **on-demand** diagnostics, including an optional public-IP lookup.

## Installation

For development and testing:

1. Download the [0.8.4 source](https://github.com/boklagvladimir-dev/eclipse/archive/refs/heads/main.zip) and extract it to a permanent folder, or clone the repository.
2. Open `chrome://extensions` (or the equivalent page in your Chromium browser).
3. Turn on **Developer mode**, select **Load unpacked**, and choose the folder containing `manifest.json`.

The packaged extension is at [dist/eclipse-0.8.4.zip](dist/eclipse-0.8.4.zip). It is an extension ZIP for packaging or store review, **not** an executable installer. For **Load unpacked**, extract it first.

To update an unpacked installation without creating a new extension instance, replace the files inside its existing folder, then click **Reload** on the extensions page. Back up any locally modified files beforehand.

## Usage

Select a preset or configure the language, time zone and coordinates manually. Toggle the power button to enable or disable overrides. If you edit settings while enabled, click **Save**. Check **Do not use on this site** to skip overrides for the current domain and its subdomains.

A green status dot means the extension's available checks have passed on that tab. It **does not** mean that every browser fingerprinting API matches, or that a VPN is connected.

The **Check IP** button calls the third-party service [ipwho.is](https://ipwho.is/) only when you request it. It reveals your outgoing public IP to that service; the service returns approximate geographic information. See [Privacy Policy](PRIVACY.md).

## Limitations

Eclipse **does not** change the network public IP address, DNS, WebRTC, device fonts, cookies, account region or browser-wide settings. It is not a VPN, an anonymity guarantee or an access-unblocking service.

On Chrome 157, version 0.8.4 uses page-level JavaScript overrides instead of the Chrome Debugger API. Early site scripts can access original values before injection, and **Web Workers keep their original settings**. Cross-origin frames, geolocation permissions and network headers need real-browser testing.

The target is Chromium 125+ on desktop. Compatibility with all Chromium-based browsers has **not** been established; Firefox, Safari and mobile browsers are not supported by this package.

## Verification

The CI workflow checks JavaScript syntax and runs regression tests for page profiles, language lists, zones, UI, translations, exclusions and tab actions. Passing unit tests is **not** a substitute for testing an installed extension on the target browser.

```sh
for f in *.js; do node --check "$f"; done
node tests/page-profile.cjs
node tests/languages.cjs
node tests/zones.cjs
node tests/ui.cjs
node tests/i18n.cjs
node tests/exclusions.cjs
node tests/tab-action.cjs
```

## Project information

- [Russian README / Подробная инструкция](README.md)
- [Change log](CHANGELOG.md)
- [Project status and testing notes](docs/PROJECT-STATUS.md)
- [Privacy Policy](PRIVACY.md)
- [License](LICENSE) — free for **noncommercial** use with required attribution and a visible link to the original repository; commercial use requires separate written permission
- [Third-party asset notices](THIRD_PARTY_NOTICES.md)

Support: [Boosty](https://boosty.to/diokyma) · [Lava.top](https://app.lava.top/diokyma) · [YooMoney](https://yoomoney.ru/to/4100118568918193)

For questions, use the [GitHub Issues](https://github.com/boklagvladimir-dev/eclipse/issues) page; do not post sensitive data in public issues.
