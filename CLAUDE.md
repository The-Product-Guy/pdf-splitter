# PDF Splitter

## Overview

Browser-first PDF splitting tool. All PDF processing happens client-side using JavaScript — files never leave the user's device. Deployed as a static site on Railway.

**Live URL**: https://smallpdfsplit.online

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS (no framework, no build step)
- **PDF Processing**: pdf-lib (v1.17.1) — runs in a Web Worker
- **ZIP Creation**: JSZip (v3.10.1) — for multi-file downloads
- **Styling**: Custom CSS with Ambion Softwares branding (navy blues), Poppins + DM Sans typography
- **Deployment**: Railway (Python static file server)
- **Analytics**: Umami (self-hosted on Railway) + Google Tag Manager (optional)
- **Monetization**: Google AdSense (ca-pub-7556107501563555)

## Project Structure

```
/
├── index.html              # Main app page
├── about.html              # About page
├── contact.html            # Contact form (demo)
├── privacy.html            # Privacy policy
├── terms.html              # Terms & conditions
├── sitemap.xml             # SEO sitemap
├── robots.txt              # Search engine rules
├── serve.py                # Static file server (Railway)
├── railway.json            # Railway deployment config
├── runtime.txt             # Python version for Railway
├── ads.txt                 # Google AdSense authorization
├── img/
│   ├── logo.svg            # Ambion Softwares logo (SVG, preferred)
│   └── logo.png            # Ambion Softwares logo (PNG fallback)
├── css/
│   └── style.css           # All styles (Ambion branding, responsive)
├── js/
│   ├── pdf-splitter.js     # Main thread: UI, file reading, worker mgmt
│   ├── pdf-worker.js       # Web Worker: PDF splitting logic
│   └── vendor/
│       ├── pdf-lib.min.js  # Self-hosted pdf-lib
│       └── jszip.min.js    # Self-hosted JSZip
├── legacy/                 # Previous server-side Python implementation
│   ├── app.py              # Flask app (reference only)
│   ├── pdf_splitter.py     # pikepdf splitting logic (reference only)
│   └── ...
└── templates/              # Old Jinja2 templates (reference only)
```

## Architecture

### Processing Flow
1. User selects/drops a PDF file (no upload)
2. `pdf-splitter.js` reads file as ArrayBuffer via FileReader
3. ArrayBuffer is transferred to Web Worker (`pdf-worker.js`)
4. Worker uses pdf-lib to split the PDF (3 modes: pages, ranges, size)
5. Results returned to main thread as transferable ArrayBuffers
6. Single PDF: direct Blob download. Multiple PDFs: JSZip creates ZIP
7. All data cleared when page is closed

### Split Modes
- **By Pages**: Split every N pages (default: 100)
- **By Ranges**: Extract specific ranges (e.g., "1-5, 10-12, 20-")
- **By Size**: Target max file size per chunk (estimates + verification)

### Key Design Decisions
- **Web Worker**: Prevents UI freeze during PDF processing
- **Transferable ArrayBuffers**: Zero-copy data transfer between threads
- **Self-hosted libs**: No CDN dependency; pdf-lib and JSZip in `js/vendor/`
- **No framework**: App is simple enough for vanilla JS
- **Clean URLs**: `serve.py` maps `/about` → `/about.html`

## Development

### Local Testing
```bash
python serve.py
# Open http://localhost:8000
```

### Configuration
GTM and base URL are configured via `window.APP_CONFIG` in each HTML file:
```js
window.APP_CONFIG = { GTM_ID: 'GTM-XXXXXXX', BASE_URL: 'https://smallpdfsplit.online' };
```
Set `GTM_ID` to empty string `''` to disable analytics.

### Updating JS Libraries
Download new versions into `js/vendor/`:
```bash
curl -sL "https://cdn.jsdelivr.net/npm/pdf-lib@VERSION/dist/pdf-lib.min.js" -o js/vendor/pdf-lib.min.js
curl -sL "https://cdn.jsdelivr.net/npm/jszip@VERSION/dist/jszip.min.js" -o js/vendor/jszip.min.js
```

## Known Limitations

- **AES-256 encrypted PDFs**: pdf-lib may not handle all encryption types. Shows clear error message.
- **Very large files (>500MB)**: May hit browser memory limits, especially on mobile. Warning shown to user.
- **Split-by-size accuracy**: Uses estimation with safety factor + verification. Slightly less precise than server-side pikepdf.

## Conventions

- No build step — all files are served directly
- **Brand**: Ambion Softwares identity — navy blue palette, Poppins headlines, DM Sans body text
- **Logo**: SVG preferred (`img/logo.svg`), viewBox cropped to content area; PNG fallback available
- CSS design tokens defined as CSS custom properties in `:root`
- All HTML pages share the same brand header (logo), GTM boilerplate, Umami analytics, and footer navigation
- Footer links to ambionsoftwares.com
- `legacy/` folder contains the old Flask/pikepdf server code for reference
