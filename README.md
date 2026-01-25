# PDF Splitter - Secure, Private, & Beautiful

A modern, privacy-focused web application for splitting PDF files. Built with Flask, it features a stunning Glassmorphism UI, "Zero Retention" architecture, and robust security measures.

![PDF Splitter UI](https://pdf-splitter.railway.app/og-image.jpg)

## ✨ Features

-   **Zero Retention Policy**: Files are processed in temporary memory and strictly deleted immediately after download. Nothing is stored on our servers.
-   **Local Processing**: The backend handles files ephemerally, ensuring maximum privacy.
-   **Split Modes**:
    -   **By Pages**: Split into chunks of N pages (e.g., every 10 pages).
    -   **By Size**: Split into chunks of X MB (e.g., max 10MB per file).
    -   **By Range**: Extract specific ranges (e.g., `1-5, 10-12`).
-   **Advanced Naming**: Custom templates for output filenames (e.g., `Contract_{index}.pdf`).
-   **Security**:
    -   Strict Magic Number validation (prevents fake PDF uploads).
    -   Rate Limiting (10 requests/hour per IP).
    -   Bot Protection (Honeypot fields).
-   **Modern UI**: Fully responsive Glassmorphism design with animations and dark-mode friendly gradients.
-   **SEO Optimized**: Full meta tag support, sitemap, and Open Graph data.

## 🚀 Live Demo

Check out the live deployment here: [PDF Splitter Demo](https://pdf-splitter.railway.app/)

## 🛠️ Local Development

### Prerequisites
-   Python 3.11+
-   pip

### Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/The-Product-Guy/pdf-splitter.git
    cd pdf-splitter
    ```

2.  **Create virtual environment**
    ```bash
    python -m venv venv
    source venv/bin/activate  # Windows: venv\Scripts\activate
    ```

3.  **Install dependencies**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Run the application**
    ```bash
    python app.py
    ```

5.  **Visit** `http://localhost:8000`

## 📦 Deployment (Railway)

This project is optimized for [Railway](https://railway.app/).

1.  **Fork** this repo.
2.  **Connect** in Railway.
3.  **Deploy**! No complex configuration needed.
    -   `railway.json` handles the build schema.
    -   `Procfile` / `Start Command`: `gunicorn app:app`

## 🔒 Privacy & Security

We take privacy seriously:
-   **No Database**: We don't track users or save file metadata.
-   **Ephemeral Storage**: `tempfile` is used for processing, which is OS-managed and self-cleaning.
-   **Validation**: Every upload is binary-scanned for `%PDF` headers to prevent malware injection vectors.

## 📄 License

MIT License - feel free to use this for your own projects!