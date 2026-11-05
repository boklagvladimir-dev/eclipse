# Chrome Web Store materials — Eclipse 0.8.0

The English description starts with all 12 interface languages. Paste `description-en.txt` into the English listing.

| File in assets/ | Field | Dimensions |
| --- | --- | --- |
| store-icon-128.png | Store icon | 128 × 128 |
| 01-language-region-1280x800.png | Feature image / screenshot gallery | 1280 × 800 |
| 02-advanced-settings-1280x800.png | Feature image / screenshot gallery | 1280 × 800 |
| 03-twelve-languages-1280x800.png | Feature image / screenshot gallery | 1280 × 800 |
| promo-small-440x280.png | Small promotional tile | 440 × 280 |
| promo-marquee-1400x560.png | Marquee promotional image | 1400 × 560 |

All gallery and promotional images use opaque RGB PNG. The store icon uses the extension's transparent PNG.

Interface illustrations are static renderings of popup.html, using the extension's own translation dictionaries. They are marked “Interface preview” and show the extension off; they do not represent a live diagnostic result or a screenshot from an installed browser. The language overview is a promotional graphic. Before submitting the listing, add a real screenshot of Eclipse running in Chrome.

Default listing language: English. Category: Tools. Homepage: https://github.com/boklagvladimir-dev/eclipse
Support: https://github.com/boklagvladimir-dev/eclipse/issues

Rebuild previews: `python store/render-previews.py` (beautifulsoup4, weasyprint, PyMuPDF, Node).
Rebuild artwork: `node store/build-assets.cjs` (sharp).
