from flask import Flask, request, jsonify, send_file
import os
import tempfile
import shutil
from pdf_splitter import PDFSplitter
from utils import validate_file_size, generate_filename

app = Flask(__name__, static_folder='static', static_url_path='')
app.config['MAX_CONTENT_LENGTH'] = 200 * 1024 * 1024  # 200MB limit

@app.route('/', methods=['GET'])
def index():
    return app.send_static_file('index.html')

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'service': 'pdf-splitter'}), 200

@app.route('/split', methods=['POST'])
def split_pdf():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not file.filename.lower().endswith('.pdf'):
        return jsonify({'error': 'File must be a PDF'}), 400
    
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