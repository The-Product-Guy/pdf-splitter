# PDF Splitter – Product Requirements Document (PRD)

- **Working name**: PDF Splitter (final name TBD)
- **Product type**: Standalone app with cross-link from `PDF-XLS-Converter`
- **Primary platforms (v1)**: Web (desktop-first), CLI; Desktop app optional in Phase 2

### 1) Goals and Non-Goals
- **Goals**:
  - Best-in-class PDF splitting across common and advanced use cases
  - Local, privacy-first processing; performant on large files
  - Simple UX for casual users; powerful batch/automation for pros/teams
- **Non-Goals (v1)**:
  - Full PDF editor (annotations/edit content)
  - OCR text recognition beyond metadata reading (add later if needed)
  - eSign/PKI features (beyond signature-preservation warnings)

### 2) Personas and Key Use Cases
- **Individual knowledge workers**: split chapters, extract sections, send smaller files
- **Finance/ops teams**: batch split multi-invoice PDFs by bookmarks/content
- **Legal/compliance**: split exhibits and preserve Bates, metadata, bookmarks
- **Developers/IT**: automate splitting via CLI/CI jobs and cloud storage flows

### 3) Competitive Benchmark (feature parity targets)
- **Adobe Acrobat**: split by pages, bookmarks, file size; batch; premium pricing
- **Sejda/Smallpdf/iLovePDF**: strong web UX; cloud storage; limits on free tiers
- **PDFsam**: desktop, free/open-source; solid batch and modes; basic UX
- **Foxit/Soda PDF/Nitro**: desktop suites with robust splitting features

**We match or exceed**: split by pages/bookmarks/size/every N; batch; preview; naming templates; cloud integrations; password handling; signature awareness; CLI; local privacy; high performance on large files.

### 4) Scope and Features

#### Core splitting modes
- **By page range(s)**: 1,3,5; 10-20; 1-; -5; mix of ranges
- **Every N pages**: configurable step (e.g., every 2)
- **By bookmarks**: split at top-level, and optionally at levels 1–3
- **By file size**: target size (e.g., 5 MB chunks); smart grouping to minimize page reflow
- **By even/odd pages**
- **Extract-only**: pick specific pages and export
- **Remove ranges**: delete selected pages and export remainder

#### Advanced/content-aware (Phase 2 unless user priority elevates)
- **Split by detected document sections**: invoice boundaries, section headers via bookmarks/outlines/text patterns
- **Page label support** (PDF page labels vs. absolute indices)
- **Pattern-based splitting**: cut at pages matching a regex in text (when extractable)
- **Custom rules presets**: save/load splitting rules

#### Batch and automation
- **Batch queue**: drop multiple PDFs; apply one rule or per-file rules
- **Presets**: save naming templates, output structure, splitting modes
- **CLI**: `pdfsplit --input *.pdf --mode ranges --ranges "1-5,10-12" --output out/ --name "{base}_part{index}" --parallel 4`
- **Config file**: JSON/YAML runbooks for repeatable ops
- **Exit codes** and machine-readable logs (JSON)

#### Preview and UX
- **Drag-and-drop**; file cards with page count, size, protection status
- **Fast thumbnails** and zoom; page picker with range builder
- **Visual markers** for split points; live result preview (estimated file parts)
- **Range syntax helper** and validation feedback
- **Keyboard shortcuts**; undo/redo of selections
- **Progress bar** with per-file ETA in batch mode

#### Output management
- **Naming templates**: `{base}`, `{index}`, `{range}`, `{bookmark}`, `{date}`, `{uuid}`
- **Output structure**: flat or per-file folders
- **Combine after split** (optional re-merge selected parts)
- **Post-actions**: open in Finder/Explorer, copy path, share

#### Preservation and compatibility
- **Preserve bookmarks, links, form fields, page labels** where possible
- **Optional flatten forms** on output; warn if signatures become invalid post-split
- **Keep original metadata**; allow override (title, author) via template
- **PDF/A compatibility pass** (Phase 2)

#### Security and privacy
- **Local processing by default**; no file uploads to our servers
- **No data retention**; ephemeral temp storage; secure deletion (best effort)
- **Password-protected PDFs**: prompt, cache in-memory only for session
- **At-rest encryption** (configurable for caching/temp); TLS for any API calls
- **GDPR-friendly UX**; clear privacy controls and offline mode

#### Integrations
- **Cloud drives**: Google Drive, Dropbox, OneDrive (Phase 2)
- **S3-compatible storage** for teams
- **Webhooks/Zapier/Make integration** (Phase 2)
- **Cross-link** from `PDF-XLS-Converter` and bundle offer

#### Internationalization & accessibility
- **i18n**: EN v1; add ES/HI/AR/FR/DE in Phase 2
- **WCAG 2.1 AA**: keyboard nav, screen reader labels, contrast

#### Telemetry and diagnostics (opt-in)
- **Anonymous performance metrics** and failure reasons
- **Local diagnostics bundle export** for support

### 5) Non-Functional Requirements
- **Performance**:
  - Load 500-page PDF preview in ≤ 3s on mid-range laptop
  - Split 1,000-page, 150 MB text-based PDF in ≤ 10s; image-heavy ≤ 45s
  - Batch throughput: ≥ 3 files concurrently (configurable)
- **Scalability**: Process up to 2 GB files; stream/low-memory mode
- **Reliability**: Success rate ≥ 99.5% on supported PDFs; graceful degradation with actionable errors
- **Resource usage**: Memory ceiling configurable; spill to disk when needed
- **Offline-first**: All core features offline; integrations degrade gracefully

### 6) Technical Architecture (Web + CLI, Python-first)
- **Libraries**:
  - **Split/structure**: `pikepdf` (qpdf bindings) or direct `qpdf` CLI for lossless page extraction
  - **Preview/thumbnails**: `PyMuPDF` (fitz) for fast renders
  - **Outlines/bookmarks/metadata**: `pikepdf`/`PyMuPDF`
  - **Passwords/signatures**: detect with `pikepdf`; warn on changes invalidating signatures
- **App**:
  - **Backend**: Flask API (reusing current stack), worker pool (ThreadPool/ProcessPool)
  - **Streaming IO**: incremental reading/writing; chunked temp files
  - **File store**: ephemeral temp dir; periodic cleanup
- **CLI**:
  - **Single binary wrapper** via `shiv`/`pex`/`pipx` for easy install
  - **JSON logs** and config support
- **Desktop (Phase 2)**:
  - **Electron or PySide/Qt wrapper** around local engine for full offline UX
- **Cloud integrations (Phase 2)**:
  - **OAuth 2.0** for drives; client-side download/upload with resumable transfers

### 7) API and CLI (v1)
- **REST endpoints**
  - `POST /split` multipart: file + mode params → returns ZIP/download link
  - `GET /tasks/{id}`: status/progress
  - `POST /presets`: create/read presets
- **CLI samples**
  - **Ranges**: `pdfsplit -i in.pdf -m ranges -r "1-5,10-12" -o out/ -n "{base}_p{range}"`
  - **Bookmarks**: `pdfsplit -i in.pdf -m bookmarks --level 1`
  - **Every N**: `pdfsplit -i in.pdf -m step --n 2`
  - **Size**: `pdfsplit -i in.pdf -m size --mb 10`

### 8) Pricing and Monetization
- **Free tier**:
  - Single-file split, by ranges/every N; up to 50 pages or 50 MB; basic naming
- **Pro (monthly/annual)**:
  - Unlimited size/pages, batch, bookmarks/size modes, presets, naming templates, priority processing, CLI
- **Team**:
  - Seats, usage controls, SSO (Phase 2), S3/Drive integrations, webhooks
- **Bundle**:
  - Cross-bundle with `PDF-XLS-Converter` at discount

### 9) Success Metrics (KPIs)
- **Time-to-first-split (TTFS)** median ≤ 60s new users
- **Split success rate** ≥ 99.5% across supported PDFs
- **Pro conversion rate** ≥ 4% of monthly actives
- **Crash/error rate** ≤ 0.5% of jobs; average job duration targets above
- **NPS** ≥ 50; refund rate < 2%

### 10) Acceptance Criteria (MVP)
- Upload a 300-page protected PDF, enter password, split by:
  - Ranges “1-5, 10-12” with correct pages in outputs
  - Every 3 pages with correct chunking
  - Bookmarks (level 1) preserving sub-bookmarks in each output
- Naming template `{base}_part{index}` applied correctly
- Batch 10 files, mixed modes, outputs in < 2 minutes total on mid-range laptop
- Links and form fields preserved where applicable; warning on signatures
- No network required for core flows

### 11) Phased Roadmap
- **Phase 0 (1–2 weeks)**: Design, tech spikes (pikepdf/qpdf/PyMuPDF), prototype splitting and preview
- **Phase 1 (3–5 weeks)**: Core modes (ranges, every N, bookmarks), preview UI, naming templates, single-file flow, MVP release
- **Phase 2 (4–6 weeks)**: Batch, size-based splitting, presets, CLI, performance hardening
- **Phase 3 (4–6 weeks)**: Cloud drives, patterns/content-aware split, i18n, telemetry opt-in, desktop wrapper
- **Ongoing**: A11y, analytics, crash reporting, docs/help center

### 12) Risks and Mitigations
- **Very large/scanned PDFs performance**: stream, chunking, optional downsampling for previews
- **Signatures invalidation**: explicit warnings; “preserve if possible” options
- **File size split accuracy**: heuristic grouping with tolerance; disclose variability
- **Library edge cases**: fallback to qpdf CLI; robust error mapping with guidance

### 13) Open Questions
- Priority of size-based vs. content-aware splitting for v1?
- Desktop app immediate need or Phase 2 acceptable?
- Required languages for initial i18n?
- Target free-tier limits (pages/MB) to balance conversion and utility?
