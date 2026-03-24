"""
Simple ML model for mortality prediction based on social determinants
"""
import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestRegressor
import joblib
import warnings
warnings.filterwarnings('ignore')

DATA_PATH = Path(__file__).parent.parent / "data"
MODEL_PATH = Path(__file__).parent / "model.pkl"
SCALER_PATH = Path(__file__).parent / "scaler.pkl"

def load_and_prep_data():
    """Load and prepare data for modeling"""
    print("Loading data for ML...")
    df = pd.read_csv(DATA_PATH / "Non-Medical_Factor_Measures_for_Place__ACS_2017-2021.csv")
    
    # Convert Data_Value to numeric, coercing errors to NaN
    df['Data_Value'] = pd.to_numeric(df['Data_Value'], errors='coerce')
    
    # Pivot measures into features (groups by location)
    features = df.groupby(['LocationName', 'StateDesc'])['Data_Value'].agg(['count', 'mean', 'std']).reset_index()
    features = features.fillna(0)
    features.columns = ['LocationName', 'StateDesc', 'measure_count', 'measure_mean', 'measure_std']
    
    print(f"Processed {len(features)} locations with {features.shape[1]-2} features")
    return features

def train_model():
    """Train simple mortality prediction model"""
    features = load_and_prep_data()
    
    # For now, use a synthetic mortality signal (in production, this would come from CDC data)
    # Higher social determinant deprivation = higher mortality
    X = features[['measure_count', 'measure_mean', 'measure_std']].values
    y = (features['measure_mean'].values * 100 + np.random.normal(0, 5, len(features))).clip(500, 1000)
    
    print("Training Random Forest model...")
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    model = RandomForestRegressor(n_estimators=20, max_depth=8, random_state=42)
    model.fit(X_scaled, y)
    
    # Save model and scaler
    joblib.dump(model, MODEL_PATH)
    joblib.dump(scaler, SCALER_PATH)
    
    print(f"✓ Model trained. R² score: {model.score(X_scaled, y):.3f}")
    print(f"✓ Saved to: {MODEL_PATH}")
    return model

def predict_mortality(location_data):
    """Predict mortality for a location"""
    if not MODEL_PATH.exists():
        train_model()
    
    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    
    # Expect location_data as list/array
    X = np.array(location_data).reshape(1, -1)
    X_scaled = scaler.transform(X)
    prediction = model.predict(X_scaled)[0]
    
    return prediction

def simulate_intervention_impact(current_mortality, intervention_type, intensity):
    """
    Simulate mortality reduction from intervention
    """
    effect_multipliers = {
        'broadband_grant': 0.12,
        'housing_subsidy': 0.08,
        'healthcare_access': 0.10,
    }
    
    multiplier = effect_multipliers.get(intervention_type, 0.05)
    reduction = current_mortality * multiplier * intensity
    projected = current_mortality - reduction
    
    return max(projected, current_mortality * 0.5)

if __name__ == '__main__':
    train_model()
