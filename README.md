# Crop Yield Prediction & Recommendation System

An end-to-end Machine Learning system that leverages **Random Forest** algorithms to solve two critical agricultural challenges:
1. **Crop Recommendation (Classification)**: Recommends the best crop variety for a given soil, region, and weather profile.
2. **Yield Prediction (Regression)**: Predicts the expected yield in tons per hectare.

The application includes an automated Python training pipeline, a REST API built with Flask, and an interactive, premium HTML/CSS/JS frontend dashboard.

---

## 📁 File Structure

```
crop-prediction-system/
├── data/
│   └── crop_yield.csv                   # Dataset (~1M rows, 10 columns)
├── model/
│   ├── train_model.py                   # Train RF classifier + RF regressor
│   ├── evaluate_model.py                # Evaluate models & save metrics/charts
│   └── saved_model/
│       ├── crop_classifier.pkl          # Saved RandomForestClassifier
│       ├── yield_regressor.pkl          # Saved RandomForestRegressor
│       ├── label_encoders.pkl           # Categorical variable label encoders
│       ├── metrics.json                 # Model evaluation scores
│       └── feature_importance.png       # Matplotlib feature importance chart
├── backend/
│   ├── app.py                           # Flask REST API
│   ├── requirements.txt                 # Backend dependency list
│   └── utils.py                         # Helper functions & crop metadata
├── frontend/
│   ├── index.html                       # Landing Page
│   ├── predict.html                     # Input Form & Interactive Prediction
│   ├── dashboard.html                   # Model Performance Analytics Dashboard
│   ├── css/
│   │   └── style.css                    # Custom CSS styling (green/lime theme)
│   ├── js/
│   │   └── main.js                      # Custom JS and Chart.js integration
│   └── assets/images/                   # Asset folder for static assets
├── notebooks/
│   └── eda.ipynb                        # Exploratory Data Analysis Jupyter Notebook
└── README.md                            # Comprehensive system documentation
```

---

## 🛠️ Setup & Installation

### 1. Prerequisites
- Python 3.9 or higher installed.

### 2. Prepare the Environment
Create a virtual environment and install the required dependencies:

```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On macOS/Linux:
source .venv/bin/activate

# Install required python packages
pip install -r backend/requirements.txt
```

### 3. Place the Dataset
Ensure the raw dataset file `crop_yield.csv` is placed inside the `data/` directory at the project root:
`data/crop_yield.csv`

---

## 🤖 Model Training & Evaluation

To train the Random Forest models on a sampled 200,000 subset of the dataset:

```bash
# Run training script (creates model/saved_model/*.pkl files)
python model/train_model.py

# Run evaluation script (creates metrics.json & feature_importance.png)
python model/evaluate_model.py
```

### Expected Output
On training completion, the console will print:
```
Classifier Accuracy: XX.XX%
Regressor R² Score: X.XXXX, RMSE: X.XXXX
```
A double-horizontal bar plot comparing feature importances for both models will be saved to `model/saved_model/feature_importance.png`.

---

## 🔌 Backend Server (Flask REST API)

Launch the Flask backend server from the project directory:

```bash
python backend/app.py
```

The API will start running locally at `http://localhost:5000`.

### API Documentation

#### 1. `POST /predict`
Submit input parameters to get crop recommendations and yield predictions.

**Request Body (JSON)**:
```json
{
  "region": "North",
  "soil_type": "Loam",
  "rainfall_mm": 450.0,
  "temperature": 25.5,
  "fertilizer_used": true,
  "irrigation_used": true,
  "weather_condition": "Rainy",
  "days_to_harvest": 110
}
```

**Response Body (JSON)**:
```json
{
  "recommended_crop": "Wheat",
  "crop_confidence": 0.87,
  "top3_crops": [
    { "crop": "Wheat", "prob": 0.87 },
    { "crop": "Barley", "prob": 0.08 },
    { "crop": "Soybean", "prob": 0.03 }
  ],
  "predicted_yield_tons_per_ha": 5.32,
  "yield_category": "Good"
}
```
*Note: Yield Category ranges: Poor (< 3 tons/ha), Moderate (3-6 tons/ha), Good (6-8 tons/ha), Excellent (> 8 tons/ha).*

#### 2. `GET /model-stats`
Retrieves pre-calculated validation statistics and feature importance weights.

**Response Body (JSON)**:
```json
{
  "classifier_accuracy": 0.9925,
  "regressor_r2": 0.9523,
  "regressor_rmse": 0.3521,
  "feature_importances": [
    {
      "feature": "Rainfall_mm",
      "classifier_importance": 0.385,
      "regressor_importance": 0.412
    },
    ...
  ]
}
```

#### 3. `GET /crops`
Retrieves descriptive metadata for all 6 supported crop varieties.

---

## 🌐 Frontend Website

The frontend runs purely in the browser.
Simply open `frontend/index.html` in any modern web browser.

**Features include**:
- **Landing Page (`index.html`)**: Beautiful hero header with customized, responsive CSS SVG animation (falling raindrops and sunbeams), dataset stats, and core features display.
- **Form Predictor (`predict.html`)**: Rich control sliders for Rainfall, Temperature, and Harvest Days; toggle buttons for fertilizer and irrigation; and interactive emoji weather buttons. Displays live Chart.js doughnut confidence circles and semi-circular gauges on result submissions.
- **Analytics Dashboard (`dashboard.html`)**: Loads validation scores dynamically from `/model-stats`. Renders a multi-model feature importance comparison chart, crop balance distribution pie, yield ranges bar graph, and a weather-yield HTML/CSS correlation heatmap.
