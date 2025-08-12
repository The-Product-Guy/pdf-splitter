# PDF Splitter

A web application for splitting PDF files by page count or file size, built with Flask and deployed on Railway.

## Features

- **Split by Pages**: Split PDFs into chunks of specified page count
- **Split by Size**: Split PDFs into chunks with maximum file size (MB)
- **Password Support**: Handle password-protected PDFs
- **Custom Naming**: Configurable file naming templates
- **Web Interface**: Drag-and-drop upload with responsive design
- **File Limits**: Supports PDFs up to 200MB

## Local Development

### Prerequisites
- Python 3.11+
- pip

### Setup

1. Clone the repository:
```bash
git clone https://github.com/The-Product-Guy/pdf-splitter.git
cd pdf-splitter
```

2. Create virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run the application:
```bash
python app.py
```

Visit `http://localhost:8000` to use the application.

## Railway Deployment

This application is configured for deployment on Railway using the included configuration files.

### Files for Railway Deployment:
- `railway.json` - Railway service configuration
- `runtime.txt` - Python version specification
- `requirements.txt` - Python dependencies including gunicorn

### Deploy to Railway:

1. **Connect Repository**: Link your GitHub repository to Railway
2. **Auto-Deploy**: Railway will automatically detect the configuration and deploy
3. **Environment Variables**: None required for basic functionality

### Railway Configuration Details:

- **Build**: Uses Nixpacks with automatic Python detection
- **Start Command**: `gunicorn --bind 0.0.0.0:$PORT app:app`
- **Health Check**: Available at `/health` endpoint
- **Restart Policy**: Restarts only on failure

## API Endpoints

- `GET /` - Web interface
- `GET /health` - Health check endpoint
- `POST /split` - PDF splitting endpoint

### Split API Usage:

```bash
curl -X POST \
  -F "file=@document.pdf" \
  -F "mode=pages" \
  -F "pageCount=50" \
  -F "naming_template={base}_part{index}" \
  http://your-railway-app.railway.app/split
```

Parameters:
- `file`: PDF file to split
- `mode`: Either "pages" or "size"
- `pageCount`: Number of pages per split (when mode=pages)
- `sizeLimit`: Max MB per split (when mode=size)
- `password`: PDF password (optional)
- `naming_template`: Output filename template (optional)

## Technology Stack

- **Backend**: Flask (Python)
- **PDF Processing**: pikepdf, PyMuPDF
- **Frontend**: HTML, CSS, JavaScript
- **Deployment**: Railway
- **Production Server**: Gunicorn

## File Structure

```
pdf-splitter/
├── app.py                 # Main Flask application
├── pdf_splitter.py        # PDF processing logic
├── utils.py              # Utility functions
├── static/
│   └── index.html        # Web interface
├── requirements.txt      # Python dependencies
├── railway.json         # Railway configuration
├── runtime.txt          # Python version
├── .gitignore           # Git ignore rules
└── README.md            # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## License

MIT License - see LICENSE file for details.