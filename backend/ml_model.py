import joblib
import pandas as pd
import numpy as np

def predict_risk(patient_data):
    """
    Predicts the risk of opioid overdose using a trained machine learning model.
    Returns Firestore-safe values.
    """

    # Load model + encoders + scaler
    try:
        model = joblib.load('ml_model/best_model.pkl')
        scaler = joblib.load('ml_model/scaler.pkl')
        label_encoders = joblib.load('ml_model/label_encoders.pkl')
    except FileNotFoundError:
        return {"error": "Model files not found. Ensure best_model.pkl, scaler.pkl, label_encoders.pkl exist."}

    # Convert incoming dict to DataFrame
    df = pd.DataFrame([patient_data])

    # Replace empties with defaults
    df['gender'] = df['gender'].replace("", "unknown")
    df['primary_opioid'] = df['primary_opioid'].replace("", "unknown")
    df['alcohol_use'] = df['alcohol_use'].replace("", "None")

    # Ensure required categorical fields exist
    required_cat = ["gender", "primary_opioid", "alcohol_use"]
    for col in required_cat:
        if col not in df:
            df[col] = "unknown"

        # Label encode categorical features (skip target / missing cols like overdose_risk_label)
    used_cat_cols = []

    for col, le in label_encoders.items():
        # Only encode columns that actually exist in the incoming data
        if col not in df.columns:
            continue  # e.g. skip 'overdose_risk_label' at prediction time

        df[col] = df[col].astype(str)

        # Add unseen values safely
        for label in df[col].unique():
            if label not in le.classes_:
                le.classes_ = np.append(le.classes_, label)

        df[col + "_encoded"] = le.transform(df[col])
        used_cat_cols.append(col)

    # Drop only the original categorical columns we actually encoded
    df = df.drop(columns=used_cat_cols, errors="ignore")


    # Correct feature order
    feature_names = [
        'age', 'weight_kg', 'height_cm',
        'has_chronic_pain', 'has_mental_health_dx', 'history_of_substance_abuse',
        'liver_disease', 'kidney_disease', 'respiratory_disease',
        'daily_dosage_mg', 'treatment_duration_months',
        'concurrent_benzos', 'concurrent_muscle_relaxants',
        'concurrent_sleep_meds', 'concurrent_antidepressants',
        'tobacco_use', 'previous_overdose',
        'daily_mme', 'risk_factors_count',
        'gender_encoded', 'primary_opioid_encoded', 'alcohol_use_encoded'
    ]

    df = df.reindex(columns=feature_names, fill_value=0)

    # Convert numeric fields properly
    numeric_fields = [
        'age', 'weight_kg', 'height_cm', 'daily_dosage_mg',
        'treatment_duration_months', 'daily_mme', 'risk_factors_count'
    ]

    for col in numeric_fields:
        df[col] = pd.to_numeric(df[col], errors="coerce").fillna(0)

    # Apply scaler
    scaled_features = scaler.transform(df)

    # Perform prediction
    prediction = model.predict(scaled_features)
    probability = model.predict_proba(scaled_features)

    # --- RETURN FIRESTORE-SAFE VALUES ---
    return {
        "prediction": int(prediction[0]),              # integer
        "risk_probability": float(probability[0][1])   # clean float
    }
