# PDF Splitter - Private Browser PDF Splitting

A modern, privacy-focused web application for splitting PDF files. The main workflow runs in the browser, so users can split large PDFs into smaller chunks without uploading the file to the server.

![PDF Splitter UI](https://smallpdfsplit.online/og-image.svg)

## ✨ Features

-   **Browser-Based Processing**: PDFs are read, split, and packaged locally in the user's browser.
-   **No Upload Required**: The primary web tool does not send PDF contents to the server.
-   **Split Modes**:
    -   **By Pages**: Split into chunks of N pages (e.g., every 10 pages).
    -   **By Size**: Split into approximate chunks of X MB (e.g., target 10MB per file).
    -   **By Range**: Extract specific ranges (e.g., `1-5, 10-12`).
-   **Advanced Naming**: Custom templates for output filenames (e.g., `Contract_{index}.pdf`).
-   **Security**:
    -   Browser-side PDF processing with no server upload in the primary workflow.
    -   Legacy server implementation is retained under `legacy/` for reference.
-   **Modern UI**: Fully responsive design with animations and a navy-blue Ambion Softwares brand system.
-   **SEO Optimized**: Full meta tag support, sitemap, and Open Graph data.

## 🚀 Live Demo

Check out the live deployment here: [PDF Splitter Demo](https://smallpdfsplit.online/)

## 🛠️ Local Development

### Prerequisites
-   Python 3.11+

### Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/The-Product-Guy/pdf-splitter.git
    cd pdf-splitter
    ```

2.  **Run the static server**
    ```bash
    python serve.py
    ```

3.  **Visit** `http://localhost:8000`

## 📦 Deployment (Railway)

This project is optimized for [Railway](https://railway.app/).

1.  **Fork** this repo.
2.  **Connect** in Railway.
3.  **Deploy**! No complex configuration needed.
    -   `railway.json` handles the build schema.
    -   Start command: `python serve.py`

## 🔒 Privacy & Security

We take privacy seriously:
-   **No Database**: We don't track users or save file metadata.
-   **Local First**: The main splitting workflow runs in the browser, keeping PDF contents on the user's device.
-   **No Upload Step**: Large PDF files are not sent through Railway or Cloudflare for the primary tool.

## 📄 License

MIT License - feel free to use this for your own projects!
