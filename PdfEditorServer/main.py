from pathlib import Path
import os
from flask import Flask

from flask import request, jsonify
from pdfminer.high_level import extract_pages
from pdfminer.layout import LTTextBoxHorizontal
from flask_cors import CORS




  
app = Flask(__name__) 
CORS(app)

# Configure the upload folder and allowed extensions
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'pdf'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

# Ensure the upload folder exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    """Check if the file has an allowed extension."""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/upload-pdf', methods=['POST'])
def upload_pdf():
    if 'pdf' not in request.files:
        return jsonify({'message': 'No file part'}), 400

    file = request.files['pdf']
    if file.filename == '':
        return jsonify({'message': 'No selected file'}), 400

    if file and allowed_file(file.filename):
        filename = f"{int(os.path.getmtime(os.path.abspath(__file__)))}-{file.filename}"
        file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
        pdf_data = []
        i = 0
        # Parse the PDF file
        for page_layout in extract_pages('uploads/' + filename):
            for element in page_layout:
                if isinstance(element, LTTextBoxHorizontal):  # Only process text boxes
                    text = element.get_text().strip()  # Get the text from the text box
                    if text:  # Only include non-empty text boxes
                        block_data = {
                            "text": text,               # Full text from the box
                            "x": element.x0,            # X-coordinate of the text box
                            "y": element.y0,            # Y-coordinate of the text box
                            "index": i
                        }
                        pdf_data.append(block_data)
            i=i+1
        return jsonify(pdf_data), 200
    else:
        return jsonify({'message': 'Invalid file type. Only PDF files are allowed.'}), 400
  
if __name__ == "__main__": 
    app.run(debug=True) 


