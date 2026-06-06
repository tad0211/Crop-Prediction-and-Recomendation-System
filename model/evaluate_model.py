"""
Model Evaluation Script for Crop Prediction and Yield Regression.
Computes evaluation metrics (Accuracy, R2, RMSE) on the test set.
Generates and saves the feature importance chart and saves metrics.json.
"""

import os
import pandas as pd
import numpy as np
import joblib
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score, accuracy_score
import matplotlib.pyplot as plt
import seaborn as sns
import json

def main():
    # Set directories and paths
    script_dir = os.path.dirname(os.path.abspath(__file__))
    data_path = os.path.join(script_dir, "..", "data", "crop_yield.csv")
    saved_model_dir = os.path.join(script_dir, "saved_model")
    
    # Check if files exist
    clf_path = os.path.join(saved_model_dir, "crop_classifier.pkl")
    reg_path = os.path.join(saved_model_dir, "yield_regressor.pkl")
    encoders_path = os.path.join(saved_model_dir, "label_encoders.pkl")
    
    if not (os.path.exists(clf_path) and os.path.exists(reg_path) and os.path.exists(encoders_path)):
        print("Error: Models or encoders not found in saved_model directory. Please run train_model.py first.")
        return
        
    print("Loading models and encoders...")
    clf = joblib.load(clf_path)
    reg = joblib.load(reg_path)
    encoders = joblib.load(encoders_path)
    
    print("Loading dataset...")
    df = pd.read_csv(data_path).sample(200000, random_state=42)
    
    # Preprocess
    for col in ["Fertilizer_Used", "Irrigation_Used"]:
        if df[col].dtype == object or df[col].dtype == bool:
            df[col] = df[col].astype(int)
            
    categorical_cols = ["Region", "Soil_Type", "Weather_Condition"]
    for col in categorical_cols:
        if col in encoders:
            # Transform categorical features using saved encoders
            df[col] = encoders[col].transform(df[col].astype(str))
            
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
    
    # 80/20 Split (same random state to ensure test sets are identical)
    X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(
        X, y_crop, test_size=0.20, random_state=42
    )
    X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(
        X, y_yield, test_size=0.20, random_state=42
    )
    
    # Predict and Evaluate Classifier
    print("Evaluating classifier...")
    y_pred_c = clf.predict(X_test_c)
    acc = accuracy_score(y_test_c, y_pred_c)
    
    # Predict and Evaluate Regressor
    print("Evaluating regressor...")
    y_pred_r = reg.predict(X_test_r)
    r2 = r2_score(y_test_r, y_pred_r)
    rmse = np.sqrt(mean_squared_error(y_test_r, y_pred_r))
    
    # Print Metrics in requested format
    print("\n================ EVALUATION SUMMARY ================")
    print(f"Classifier Accuracy: {acc * 100:.2f}%")
    print(f"Regressor R² Score: {r2:.4f}, RMSE: {rmse:.4f}")
    print("====================================================\n")
    
    # Save feature importance chart
    print("Generating feature importance chart...")
    clf_importances = clf.feature_importances_
    reg_importances = reg.feature_importances_
    
    importance_df = pd.DataFrame({
        'Feature': features,
        'Classifier Importance': clf_importances,
        'Regressor Importance': reg_importances
    })
    
    # Set style
    sns.set_theme(style="whitegrid")
    fig, axes = plt.subplots(1, 2, figsize=(14, 6), sharey=False)
    
    # Classifier Plot
    importance_df_sorted_clf = importance_df.sort_values(by='Classifier Importance', ascending=False)
    sns.barplot(
        x='Classifier Importance', 
        y='Feature', 
        data=importance_df_sorted_clf, 
        ax=axes[0], 
        palette='crest'
    )
    axes[0].set_title('Crop Classifier Feature Importance', fontsize=14, pad=10, weight='bold', color='#1B5E20')
    axes[0].set_xlabel('Importance Score')
    axes[0].set_ylabel('')
    
    # Regressor Plot
    importance_df_sorted_reg = importance_df.sort_values(by='Regressor Importance', ascending=False)
    sns.barplot(
        x='Regressor Importance', 
        y='Feature', 
        data=importance_df_sorted_reg, 
        ax=axes[1], 
        palette='viridis'
    )
    axes[1].set_title('Yield Regressor Feature Importance', fontsize=14, pad=10, weight='bold', color='#1B5E20')
    axes[1].set_xlabel('Importance Score')
    axes[1].set_ylabel('')
    
    plt.tight_layout()
    chart_path = os.path.join(saved_model_dir, "feature_importance.png")
    plt.savefig(chart_path, dpi=300, bbox_inches='tight')
    plt.close()
    
    # Save metrics.json
    metrics = {
        "classifier_accuracy": float(acc),
        "regressor_r2": float(r2),
        "regressor_rmse": float(rmse),
        "feature_importances": [
            {
                "feature": feat,
                "classifier_importance": float(clf_imp),
                "regressor_importance": float(reg_imp)
            }
            for feat, clf_imp, reg_imp in zip(features, clf_importances, reg_importances)
        ]
    }
    
    metrics_path = os.path.join(saved_model_dir, "metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=4)
        
    print(f"Saved evaluation metrics to: {metrics_path}")
    print(f"Feature importance chart saved to: {chart_path}")
    print("Evaluation completed successfully.")

if __name__ == "__main__":
    main()
