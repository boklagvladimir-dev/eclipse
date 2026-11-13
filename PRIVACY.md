# Eclipse Privacy Policy

Last updated: 8 November 2026

This policy describes how the Eclipse browser extension handles information. Eclipse lets you configure the language, locale, time zone and optional geographical coordinates reported to websites.

## Local settings

Eclipse stores your selected languages, locale, time zone, optional coordinates, enabled state, site-exception hostnames and saved profiles in your browser's local extension storage. Interface language, display mode and expanded sections are stored locally as interface preferences. These settings are not uploaded to the developer.

Coordinates may come from a regional preset or be entered by you. They represent the location you choose to report to websites; Eclipse does not request your device's actual GPS location.

## Tabs, navigation and browser properties

Eclipse processes tab identifiers and website URLs locally to identify supported HTTP(S) pages, apply your settings when navigation occurs and show the current tab's status. It does not create a browsing-history database or send website URLs or titles to the developer or to the IP-check service.

When you request diagnostics, Eclipse reads the current page's reported language preferences, date and number formatting locales and time zone. The comparison is performed locally. Diagnostics do not read page text, form entries, passwords, messages or account information.

## Optional public IP and approximate-location check

Clicking “Check IP”, or the combined “Check current tab and IP” button, starts a request to https://ipwho.is/, a third-party IP information service. This request reveals the outgoing public IP address to that service. The service returns the IP address and approximate geographical information, such as country, city and time zone, which Eclipse displays in the popup. The country name may be localized by the browser. Flag images are bundled with the extension and do not require a separate request to an image server.

The IP check does not run automatically in the background. Eclipse sends the request over HTTPS without credentials or a referrer. It does not include the current tab's URL, page content or your saved profile settings in the request. The IP response is used in the popup and is not saved by Eclipse in persistent extension storage.

The service necessarily receives connection information associated with an HTTPS request and may handle or retain it under its own policies. The developer does not control the service's logging or retention. Service information: https://ipwhois.io/.

With a proxy or split routing, the extension's outgoing IP may differ from the IP used by a particular website tab.

## Applying your selected settings

While enabled, Eclipse uses request-header rules and code injected into the page to apply your chosen settings. Websites may receive your selected language preferences and, if you enable coordinate overrides and the site's permissions allow it, your selected coordinates. Eclipse does not change your public IP address.

## Advertising, analytics and data transfers

Eclipse does not include advertising analytics, behavioral tracking or a developer-operated data-collection backend. The developer does not receive or sell your extension settings, browsing URLs or diagnostic results.

Data is used only to provide the extension's stated language and region features. It is not used for personalized advertising, creditworthiness or lending decisions.

Eclipse's use of information received from Google APIs adheres to the Chrome Web Store User Data Policy, including the Limited Use requirements.

The optional IP-check request described above is the extension's third-party data transfer for that feature. If you follow a source-code, support or donation link, the destination website handles your visit under its own policies.

## Retention and your choices

Local settings remain until you change or delete them, clear the extension's data or uninstall Eclipse. You can delete saved custom profiles in the interface. You can remove a site exception by clearing “Do not use on this site” on an affected site. Site exceptions are stored only locally and are used to skip overrides for the selected hostname and its subdomains. Temporary tab records are removed when their tabs close; session storage is cleared when the browser session ends. Disabling Eclipse stops applying overrides and removes its active header rule.

Close the popup to discard the displayed IP response and diagnostic output. Avoid the IP-check button if you do not want to contact the third-party IP service. Clearing extension data does not erase records a third-party service may independently retain.

Local storage relies on your browser and device protections; Eclipse does not add its own encryption to saved settings.

## Changes and contact

Updates to this policy will be published on this page with a revised date. Material changes to data handling will also be disclosed through the extension or its store listing as appropriate.

For privacy questions, contact the maintainer through the project's support page:
https://github.com/boklagvladimir-dev/eclipse/issues

GitHub issues are public. Do not post passwords, personal browsing URLs, IP addresses or other sensitive information there.
