from flask import Flask, jsonify, request
from flask_cors import CORS
import pandas as pd
import numpy as np
from pathlib import Path
import json

app = Flask(__name__)
CORS(app)

# Load data cache
DATA_PATH = Path(__file__).parent.parent / "data"
data = None
locations_cache = None

def load_data():
    global data, locations_cache
    if data is None:
        print("Loading CSV data...")
        data = pd.read_csv(DATA_PATH / "Non-Medical_Factor_Measures_for_Place__ACS_2017-2021.csv")
        # Create locations summary
        locations_cache = data.groupby(['StateDesc', 'LocationName']).agg({
            'Data_Value': 'mean',
            'Measure': 'count'
        }).reset_index()
        print(f"Loaded {len(data)} records, {len(locations_cache)} locations")
    return data

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

@app.route('/api/locations', methods=['GET'])
def get_locations():
    """Get all census tract locations"""
    df = load_data()
    locations = df[['StateDesc', 'LocationName', 'Geolocation']].drop_duplicates()
    locations = locations[locations['Geolocation'].notna()]
    return jsonify(locations.head(100).to_dict('records'))

@app.route('/api/measures/<location_id>', methods=['GET'])
def get_measures(location_id):
    """Get all measures for a specific location"""
    df = load_data()
    loc_data = df[df['LocationName'] == location_id]
    measures = loc_data[['Measure', 'Data_Value', 'Category']].drop_duplicates()
    return jsonify(measures.to_dict('records'))

@app.route('/api/simulate', methods=['POST'])
def simulate_intervention():
    """
    Simulate intervention impact on mortality
    
    Request format:
    {
        "location": "census_tract_name",
        "intervention": "broadband_grant",  # or "housing_subsidy"
        "intensity": 0.5  # 0-1 scale
    }
    """
    body = request.get_json()
    location = body.get('location')
    intervention = body.get('intervention', 'broadband_grant')
    intensity = body.get('intensity', 0.5)
    
    df = load_data()
    loc_data = df[df['LocationName'] == location]
    
    if loc_data.empty:
        return jsonify({'error': 'Location not found'}), 404
    
    # Calculate current state
    current_state = loc_data.groupby('Measure')['Data_Value'].mean().to_dict()
    
    # Simple intervention model
    projected_impact = {
        'location': location,
        'intervention': intervention,
        'intensity': intensity,
        'current_state': current_state,
        'projected_mortality_reduction': intensity * 0.15,  # 0-15% reduction
        'priority_score': intensity * 100
    }
    
    return jsonify(projected_impact)

if __name__ == '__main__':
    load_data()  # Warmup
    app.run(debug=True, port=5000)
