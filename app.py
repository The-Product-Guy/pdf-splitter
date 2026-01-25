from flask import Flask, request, jsonify, send_file, render_template
import os
import tempfile
import shutil
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from pdf_splitter import PDFSplitter
from utils import validate_file_size, generate_filename, validate_pdf_header

app = Flask(__name__, static_folder='static', static_url_path='/static', template_folder='templates')
app.config['MAX_CONTENT_LENGTH'] = 200 * 1024 * 1024  # 200MB limit

# Get GTM ID from environment variable
GTM_ID = os.environ.get('GTM_ID', '')

# Initialize Rate Limiter
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"
)

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html', gtm_id=GTM_ID)

@app.route('/sitemap.xml')
def sitemap():
    return app.send_static_file('sitemap.xml')

@app.route('/robots.txt')
def robots():
    return app.send_static_file('robots.txt')

@app.route('/about')
def about():
    return render_template('about.html', gtm_id=GTM_ID)

@app.route('/terms')
def terms():
    return render_template('terms.html', gtm_id=GTM_ID)

@app.route('/privacy')
def privacy():
    return render_template('privacy.html', gtm_id=GTM_ID)

@app.route('/contact')
def contact():
    return render_template('contact.html', gtm_id=GTM_ID)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'pdf-splitter'}), 200

@app.route('/split', methods=['POST'])
@limiter.limit("10 per hour")  # Strict limit for splitting to save resources
def split_pdf():
    # Honeypot check for bots
    if request.form.get('website_url'):
        return jsonify({'error': 'Spamm detected'}), 400
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not file.filename.lower().endswith('.pdf'):
        return jsonify({'error': 'File must be a PDF'}), 400
    
    
    
    # Strict Magic Number Validation
    if not validate_pdf_header(file.stream):
        return jsonify({'error': 'Invalid PDF file. Header check failed.'}), 400
    
    mode = request.form.get('mode', 'pages')
    password = request.form.get('password', '')
    naming_template = request.form.get('naming_template', '{base}_part{index}')
    
    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            input_path = os.path.join(temp_dir, file.filename)
            file.save(input_path)
            
            splitter = PDFSplitter(input_path, password)
            
            if mode == 'pages':
                page_count = int(request.form.get('pageCount', 100))
                output_files = splitter.split_by_pages(page_count, naming_template)
            elif mode == 'size':
                size_limit = int(request.form.get('sizeLimit', 50))
                output_files = splitter.split_by_size(size_limit, naming_template)
            elif mode == 'ranges':
                ranges = request.form.get('ranges', '')
                output_files = splitter.split_by_ranges(ranges, naming_template)
            else:
                return jsonify({'error': 'Invalid split mode'}), 400
            
            if len(output_files) == 1:
                return send_file(output_files[0], as_attachment=True)
            else:
                zip_path = splitter.create_zip(output_files)
                return send_file(zip_path, as_attachment=True)
                
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 8000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(debug=debug, host='0.0.0.0', port=port)