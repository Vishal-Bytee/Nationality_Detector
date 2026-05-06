# NatioScan — AI Nationality Detector

A machine learning web application that predicts nationality, emotion, age, and dress colour from a face image using DeepFace and Flask.



## Table of Contents

- [About the Project](#about-the-project)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [How It Works](#how-it-works)
- [Installation](#installation)
- [Usage](#usage)
- [Conditional Output Logic](#conditional-output-logic)
- [Known Issues](#known-issues)
- [Future Work](#future-work)



## About the Project

NatioScan is a web-based AI tool that analyzes human face images to predict:

- Nationality / Race
- Dominant Emotion
- Age (for selected nationalities)
- Dress / Clothing Colour (for selected nationalities)

The model uses the DeepFace library which is built on top of TensorFlow and Keras. The backend is powered by Flask and the frontend is a custom dark-themed UI built with HTML, CSS, and vanilla JavaScript.

This project was built as part of a machine learning course assignment focused on facial attribute detection and demographic analysis.


## Features

- Drag and drop image upload
- Real-time face analysis using DeepFace
- Nationality detection with confidence percentage
- Emotion detection with distribution chart
- Race distribution bar chart
- Conditional age and dress colour detection based on nationality
- HSV-based clothing colour detection from torso region
- Responsive dark UI
- Error handling for invalid files and analysis failures


## Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| Backend    | Python, Flask                     |
| ML Model   | DeepFace (VGG-Face, SSD detector) |
| CV Library | OpenCV                            |
| Frontend   | HTML, CSS, Vanilla JavaScript     |
| Fonts      | Google Fonts (Syne, DM Sans)      |


## Project Structure

nationality_detector/
│
├── app.py                    # Flask application, routes
│
├── utils/
│   ├── predictor.py          # Core ML logic, DeepFace analysis
│   └── image_utils.py        # Image validation helper
│
├── static/
│   ├── css/
│   │   └── style.css         # UI styling
│   └── js/
│       └── app.js            # Frontend logic
│
├── templates/
│   └── index.html            # Main HTML page
│
├── uploads/                  # Temporary upload folder (auto created)
├── requirements.txt          # Python dependencies
├── .gitignore
└── README.md


## How It Works

1. User uploads a face image through the web interface
2. Flask receives the image and saves it temporarily to the uploads folder
3. OpenCV reads and resizes the image to 640px max dimension for speed
4. DeepFace analyzes the image using the SSD face detector backend
5. DeepFace returns age, gender, race scores, and emotion scores
6. The predictor maps the dominant race to a nationality label
7. Based on nationality, conditional fields like age and dress colour are included
8. Dress colour is detected using HSV color segmentation on the torso region
9. All numpy types are converted to native Python types for JSON serialization
10. Flask returns the result as JSON and the frontend renders it



## Installation

### Requirements

- Python 3.9 or above
- pip

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/natioscan.git
cd natioscan

# 2. Create virtual environment
python -m venv venv

# 3. Activate virtual environment
# Windows
venv\Scripts\activate
# Mac / Linux
source venv/bin/activate

# 4. Install dependencies
pip install -r requirements.txt

# 5. Run the application
python app.py
```

Open your browser and go to `http://127.0.0.1:5000`

### Note on First Run

On the very first run, DeepFace will automatically download the model weights (~537 MB). This is a one-time download and will be cached at `C:\Users\username\.deepface\weights\` on Windows.

To pre-download the models before starting the app:

```bash
python -c "from deepface import DeepFace; DeepFace.build_model('Race')"
```

---

## Usage

1. Open the app in your browser
2. Drag and drop a face image or click to browse
3. Supported formats: JPG, PNG, WEBP, BMP (max 10 MB)
4. Click the Analyze button
5. Wait for the analysis to complete
6. Results will show nationality, emotion, and other details based on the detected race

---

## Conditional Output Logic

The output fields vary depending on the detected nationality:

| Nationality       | Nationality | Emotion | Age | Dress Colour |
|-------------------|-------------|---------|-----|--------------|
| Indian            | Yes         | Yes     | Yes | Yes          |
| American/European | Yes         | Yes     | Yes | No           |
| African           | Yes         | Yes     | No  | Yes          |
| Asian             | Yes         | Yes     | No  | No           |
| Middle Eastern    | Yes         | Yes     | No  | No           |
| Latino/Hispanic   | Yes         | Yes     | No  | No           |

---

## Known Issues

- DeepFace accuracy depends heavily on image quality and lighting conditions
- The SSD detector backend may fail on very low resolution images
- Dress colour detection works best on upper body / portrait style images
- The race model is based on UTKFace dataset which has known demographic biases
- Age prediction can be inaccurate for extreme age groups

---

## Future Work

- Add support for multiple faces in a single image
- Improve dress colour detection using semantic segmentation instead of HSV crop
- Add a history section to show previous analysis results
- Train a custom nationality model on a more diverse and balanced dataset
- Add API endpoint so other applications can use the analysis
- Add support for real-time webcam analysis
- Improve accuracy for Asian and Middle Eastern faces which are currently underrepresented in the training data
- Add multilingual support for the UI
- Deploy on cloud platform like Render or Railway for public access
- Add confidence threshold filter to reject low confidence predictions

---

## Disclaimer

This project is built for educational purposes only as part of a machine learning assignment. The nationality predictions are based on facial features and visual patterns learned from the UTKFace dataset. These predictions are probabilistic and not definitive. The tool should not be used for any real-world identification, profiling, or decision-making purposes.

---

