import os
import base64
from flask import Flask, request, jsonify, render_template
from werkzeug.utils import secure_filename
from utils.predictor import analyze_face
from utils.image_utils import validate_image

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB limit
app.config['UPLOAD_FOLDER'] = 'uploads'

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp', 'bmp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/analyze', methods=['POST'])
def analyze():
    if 'image' not in request.files:
        return jsonify({'success': False, 'error': ' No image file provided.'}), 400

    file = request.files['image']

    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected.'}), 400

    if not allowed_file(file.filename):
        return jsonify({'success': False, 'error': ' Invalid file type. Use JPG, PNG, WEBP, or BMP.'}), 400

    is_valid, error_msg = validate_image(file)
    if not is_valid:
        return jsonify({'success': False, 'error': error_msg}), 400

    filename = secure_filename(file.filename)
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    try:
        result = analyze_face(filepath)
        os.remove(filepath)  # Clean up after analysis
        return jsonify({'success': True, 'result': result})
    except Exception as e:
        if os.path.exists(filepath):
            os.remove(filepath)
        return jsonify({'success': False, 'error': f' Analysis failed: {str(e)}'}), 500


if __name__ == '__main__':
    print(" Nationality Detector is starting...")
    print(" Open http://127.0.0.1:5000 in your browser")
    app.run(debug=True, host='0.0.0.0', port=5000)
