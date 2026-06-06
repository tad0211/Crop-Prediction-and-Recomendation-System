"""
Model Training Script for Crop Prediction and Yield Regression.
Trains RandomForestClassifier for crop recommendation and RandomForestRegressor for yield prediction.
Saves trained models and label encoders to disk.
"""

import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import LabelEncoder
import joblib

def main():
    # 1. Paths configuration
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(script_dir, "..", "data", "crop_yield.csv")
    saved_model_dir = os.path.join(script_dir, "saved_model")
    os.makedirs(saved_model_dir, exist_ok=True)
    
    print("Loading dataset...")
    # Sample 200,000 rows for training speed, keeping reproducibility
    df = pd.read_csv(data_path).sample(200000, random_state=42)
    print(f"Dataset sampled successfully. Shape: {df.shape}")
    
    # 2. Preprocessing
    print("Preprocessing data...")
    # Convert booleans or string-booleans to 1/0
    # The dataset can have boolean types directly or string representations
    for col in ["Fertilizer_Used", "Irrigation_Used"]:
        if df[col].dtype == object or df[col].dtype == bool:
            df[col] = df[col].astype(int)
            
    # Label encode categorical features: Region, Soil_Type, Weather_Condition
    categorical_cols = ["Region", "Soil_Type", "Weather_Condition"]
    encoders = {}
    
    for col in categorical_cols:
        le = LabelEncoder()
        # Fit on the entire sample to capture all classes
        df[col] = le.fit_transform(df[col].astype(str))
        encoders[col] = le
        print(f"Encoded '{col}': classes = {le.classes_}")
        
    # Save encoders dict
    encoders_path = os.path.join(saved_model_dir, "label_encoders.pkl")
    joblib.dump(encoders, encoders_path)
    print(f"Saved label encoders to {encoders_path}")
    
    # Define features and targets
    features = [
        "Region", 
        "Soil_Type", 
        "Rainfall_mm", 
        "Temperature_Celsius", 
        "Fertilizer_Used", 
        "Irrigation_Used", 
        "Weather_Condition", 
        "Days_to_Harvest"
    ]
    
    X = df[features]
    y_crop = df["Crop"]
    y_yield = df["Yield_tons_per_hectare"]
    
    # --- MODEL 1: Crop Classifier ---
    print("\n--- Training Crop Classifier ---")
    # Split
    X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(
        X, y_crop, test_size=0.20, random_state=42
    )
    
    # Train
    clf = RandomForestClassifier(n_estimators=100, max_depth=12, min_samples_leaf=10, random_state=42, n_jobs=-1)
    clf.fit(X_train_c, y_train_c)
    
    # Save
    clf_path = os.path.join(saved_model_dir, "crop_classifier.pkl")
    joblib.dump(clf, clf_path)
    print(f"Saved classifier model to {clf_path}")
    
    # Score
    clf_acc = clf.score(X_test_c, y_test_c)
    print(f"Classifier Training Complete. Validation Accuracy: {clf_acc * 100:.2f}%")
    
    # --- MODEL 2: Yield Regressor ---
    print("\n--- Training Yield Regressor ---")
    # Split
    X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(
        X, y_yield, test_size=0.20, random_state=42
    )
    
    # Train
    reg = RandomForestRegressor(n_estimators=100, max_depth=12, min_samples_leaf=10, random_state=42, n_jobs=-1)
    reg.fit(X_train_r, y_train_r)
    
    # Save
    reg_path = os.path.join(saved_model_dir, "yield_regressor.pkl")
    joblib.dump(reg, reg_path)
    print(f"Saved regressor model to {reg_path}")
    
    # Score
    reg_r2 = reg.score(X_test_r, y_test_r)
    print(f"Regressor Training Complete. Validation R² Score: {reg_r2:.4f}")
    
    print("\nModel training workflow completed successfully!")

if __name__ == "__main__":
    main()
