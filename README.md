# QR Studio

A privacy-respecting, fully client-side QR code generator with extensive styling options. No tracking, no API limits, no signup — open it and create.

**[Live demo →](https://omariosc.github.io/qr-code-generator/)**

## Features

- **Two rendering engines** in one app:
  - **Styled** — gradients, dot shapes, corner styles, logo embedding, PNG/SVG/JPEG/WebP. Powered by [`qr-code-styling`](https://github.com/kozakdenys/qr-code-styling).
  - **Simple** — fast, lean, PNG or SVG. Powered by [`qrcode`](https://github.com/soldair/node-qrcode).
- Foreground & background colors
- Linear or radial **gradients** (with rotation) on foreground and background
- Transparent background option
- Six dot styles: square, rounded, dots, classy, classy rounded, extra rounded
- Three corner-square styles and two corner-dot styles
- **Logo overlay** with size, margin, and "hide dots behind logo" controls
- Adjustable error correction (L / M / Q / H)
- Adjustable size and margin
- Export as **PNG, SVG, JPEG, or WebP**
- Liquid-glass UI with automatic light/dark mode

## Run locally

Two options:

1. Double-click `index.html` — it works directly in your browser (no build step).
2. Serve the folder, e.g.:
   ```bash
   python3 -m http.server 8000
   # then open http://localhost:8000
   ```

The two QR libraries are loaded from jsDelivr. For fully offline use, download `qrcode.min.js` and `qr-code-styling.js` from jsDelivr and replace the CDN URLs in the `<script>` tags of `index.html`.

## Why?

Most online QR generators are hosted services that track URLs, paywall styling features, or insert tracking redirects. This is the opposite:

- 100% client-side — your URL, settings, and logo image never leave your browser
- No analytics, no signup, no rate limits — generate as many as you like
- Open source (MIT) — fork it, embed it, modify it

## License

[MIT](LICENSE)
