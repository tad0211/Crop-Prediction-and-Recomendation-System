"""
Flask REST API for Crop Prediction & Recommendation System.
Serves crop recommendations, yield predictions, model statistics, and crop metadata.
"""

import os
import json
import joblib
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

from utils import CROP_DATA, get_yield_category

app = Flask(__name__)
# Enable CORS for all routes (important for front-end integration on different ports/files)
CORS(app)

# Global variables for models and encoders
classifier = None
regressor = None
label_encoders = None
model_metrics = None

# Base path relative to app.py
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_DIR = os.path.join(BASE_DIR, "model", "saved_model")

def load_resources():
    """
    Loads saved models, encoders, and metrics from model/saved_model directory.
    """
    global classifier, regressor, label_encoders, model_metrics
    
    clf_path = os.path.join(MODEL_DIR, "crop_classifier.pkl")
    reg_path = os.path.join(MODEL_DIR, "yield_regressor.pkl")
    encoders_path = os.path.join(MODEL_DIR, "label_encoders.pkl")
    metrics_path = os.path.join(MODEL_DIR, "metrics.json")
    
    print("Loading machine learning models and encoders...")
    try:
        if os.path.exists(clf_path):
            classifier = joblib.load(clf_path)
            print("Classifier loaded successfully.")
        else:
            print("Warning: Classifier model file not found.")
            
        if os.path.exists(reg_path):
            regressor = joblib.load(reg_path)
            print("Regressor loaded successfully.")
        else:
            print("Warning: Regressor model file not found.")
            
        if os.path.exists(encoders_path):
            label_encoders = joblib.load(encoders_path)
            print("Label encoders loaded successfully.")
        else:
            print("Warning: Label encoders file not found.")
            
        if os.path.exists(metrics_path):
            with open(metrics_path, "r") as f:
                model_metrics = json.load(f)
            print("Model metrics loaded successfully.")
        else:
            print("Warning: Metrics JSON file not found.")
    except Exception as e:
        print(f"Error loading resources: {str(e)}")

# Load resources at startup
load_resources()

@app.route("/predict", methods=["POST"])
def predict():
    """
    POST /predict
    Input JSON:
    {
      "region": "North",
      "soil_type": "Loam",
      "rainfall_mm": 450,
      "temperature": 25.5,
      "fertilizer_used": true,
      "irrigation_used": true,
      "weather_condition": "Rainy",
      "days_to_harvest": 110
    }
    """
    global classifier, regressor, label_encoders
    
    # Check if models are loaded
    if classifier is None or regressor is None or label_encoders is None:
        # Try to reload
        load_resources()
        if classifier is None or regressor is None or label_encoders is None:
            return jsonify({"error": "ML models are not loaded. Please train models first."}), 500
            
    try:
        data = request.get_json(force=True)
        
        # Parse and validate inputs
        region = data.get("region")
        soil_type = data.get("soil_type")
        rainfall_mm = float(data.get("rainfall_mm"))
        temperature = float(data.get("temperature"))
        fertilizer_used = bool(data.get("fertilizer_used"))
        irrigation_used = bool(data.get("irrigation_used"))
        weather_condition = data.get("weather_condition")
        days_to_harvest = float(data.get("days_to_harvest"))
        
        # Convert boolean flags to 1/0
        fertilizer_int = 1 if fertilizer_used else 0
        irrigation_int = 1 if irrigation_used else 0
        
        # Label encode categoricals using saved encoders
        try:
            region_enc = int(label_encoders["Region"].transform([region])[0])
            soil_type_enc = int(label_encoders["Soil_Type"].transform([soil_type])[0])
            weather_enc = int(label_encoders["Weather_Condition"].transform([weather_condition])[0])
        except ValueError as val_err:
            return jsonify({
                "error": f"Invalid categorical value. Details: {str(val_err)}"
            }), 400
            
        # Assemble feature array in exact order:
        # [Region, Soil_Type, Rainfall_mm, Temperature_Celsius, Fertilizer_Used, Irrigation_Used, Weather_Condition, Days_to_Harvest]
        features = np.array([[
            region_enc,
            soil_type_enc,
            rainfall_mm,
            temperature,
            fertilizer_int,
            irrigation_int,
            weather_enc,
            days_to_harvest
        ]])
        
        # 1. Predict Crop Recommendation (Classification)
        crop_probs = classifier.predict_proba(features)[0]
        classes = classifier.classes_
        
        # Get top 3 recommended crops
        sorted_indices = np.argsort(crop_probs)[::-1]
        top3_crops = [
            {"crop": str(classes[idx]), "prob": round(float(crop_probs[idx]), 4)}
            for idx in sorted_indices[:3]
        ]
        
        recommended_crop = top3_crops[0]["crop"]
        crop_confidence = top3_crops[0]["prob"]
        
        # 2. Predict Yield (Regression)
        predicted_yield = float(regressor.predict(features)[0])
        predicted_yield = round(predicted_yield, 2)
        
        # Get yield category
        yield_cat = get_yield_category(predicted_yield)
        
        # Return complete JSON payload
        return jsonify({
            "recommended_crop": recommended_crop,
            "crop_confidence": crop_confidence,
            "top3_crops": top3_crops,
            "predicted_yield_tons_per_ha": predicted_yield,
            "yield_category": yield_cat
        })
        
    except Exception as e:
        return jsonify({"error": f"Failed to predict. Details: {str(e)}"}), 400

@app.route("/model-stats", methods=["GET"])
def model_stats():
    """
    GET /model-stats
    Returns pre-calculated model evaluation statistics.
    """
    global model_metrics
    
    if model_metrics is None:
        # Attempt reload
        load_resources()
        if model_metrics is None:
            return jsonify({"error": "Model evaluation statistics are not available."}), 500
            
    return jsonify(model_metrics)

@app.route("/crops", methods=["GET"])
def get_crops():
    """
    GET /crops
    Returns detailed metadata about supported crop varieties.
    """
    return jsonify(CROP_DATA)

if __name__ == "__main__":
    print("Starting Flask API server on port 5000...")
    app.run(host="0.0.0.0", port=5000, debug=True)
