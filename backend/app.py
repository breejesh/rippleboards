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
nmf_data = None
mortality_data = None
locations_cache = None

def load_nmf_data():
    """Load Non-Medical Factors data (state-level aggregated)"""
    global nmf_data
    if nmf_data is None:
        print("Loading state-aggregated SDOH data...")
        nmf_data = pd.read_csv(DATA_PATH / "NonMedicalSDOH_StateAggregated.csv")
        nmf_data['Data_Value'] = pd.to_numeric(nmf_data['Data_Value'], errors='coerce')
        print(f"Loaded {len(nmf_data)} SDOH records")
    return nmf_data

def load_mortality_data():
    """Load Premature Mortality data"""
    global mortality_data
    if mortality_data is None:
        print("Loading Premature Mortality CSV data...")
        mortality_data = pd.read_csv(DATA_PATH / "premature-mortality" / "Overall.csv", skiprows=5)
        # Rename columns for clarity
        mortality_data.rename(columns={
            'Premature Age-Adjusted Mortality Rate - deaths per 100,000(1)': 'MortalityRate'
        }, inplace=True)
        # Extract state name (remove FIPS and create mapping)
        print(f"Loaded {len(mortality_data)} mortality records")
    return mortality_data

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})


@app.route('/api/states', methods=['GET'])
def get_states():
    """Return states with actual premature mortality rates, sorted by mortality."""
    nmf = load_nmf_data()
    mort = load_mortality_data()
    
    # Create state mapping from mortality data
    mortality_by_state = {}
    for idx, row in mort.iterrows():
        state_name = row['State'].strip()
        if state_name != 'United States':  # Skip total
            rate = float(row['MortalityRate'])
            mortality_by_state[state_name] = rate
    
    # State centroids for mapping (fallback for all states)
    state_centroids = {
        'Alabama': [32.8067, -86.7113], 'Alaska': [64.2008, -152.2782], 'Arizona': [33.7298, -111.4312],
        'Arkansas': [34.9697, -92.3731], 'California': [36.1163, -119.6674], 'Colorado': [39.0598, -105.3111],
        'Connecticut': [41.5978, -72.7554], 'Delaware': [39.0181, -75.7244], 'Florida': [27.9947, -81.7603],
        'Georgia': [33.0406, -83.6431], 'Hawaii': [21.0943, -157.4983], 'Idaho': [44.2405, -114.4788],
        'Illinois': [40.3495, -88.9861], 'Indiana': [39.8494, -86.2604], 'Iowa': [42.0115, -93.2105],
        'Kansas': [38.5266, -96.7265], 'Kentucky': [37.6681, -84.6701], 'Louisiana': [31.1695, -91.8749],
        'Maine': [44.6939, -69.3819], 'Maryland': [39.0639, -76.8021], 'Massachusetts': [42.2302, -71.5301],
        'Michigan': [43.3266, -84.5361], 'Minnesota': [45.6945, -93.9196], 'Mississippi': [32.7416, -89.6787],
        'Missouri': [38.4561, -92.2884], 'Montana': [46.9819, -109.6333], 'Nebraska': [41.4925, -99.9018],
        'Nevada': [38.8026, -116.4194], 'New Hampshire': [43.4525, -71.3136], 'New Jersey': [40.0583, -74.4057],
        'New Mexico': [34.8405, -106.2371], 'New York': [42.1657, -74.9481], 'North Carolina': [35.6301, -79.8064],
        'North Dakota': [47.5289, -99.784], 'Ohio': [40.3888, -82.7649], 'Oklahoma': [35.5653, -96.9289],
        'Oregon': [44.5720, -122.1093], 'Pennsylvania': [40.5908, -77.2098], 'Rhode Island': [41.6809, -71.5118],
        'South Carolina': [34.0007, -81.163], 'South Dakota': [44.2998, -99.4388], 'Tennessee': [35.7478, -86.6923],
        'Texas': [31.9686, -99.9018], 'Utah': [39.3210, -111.0937], 'Vermont': [43.9695, -72.7107],
        'Virginia': [37.7693, -78.1694], 'Washington': [47.7511, -120.7401], 'West Virginia': [38.4912, -82.9006],
        'Wisconsin': [44.2685, -89.6165], 'Wyoming': [42.755, -107.3025], 'District of Columbia': [38.9072, -77.0369]
    }
    
    # Get unique states from aggregated SDOH data
    states_list = []
    for state in nmf['StateDesc'].dropna().unique():
        state = str(state).strip()
        
        # Get mortality rate (default to 0 if not found)
        mortality_rate = mortality_by_state.get(state, 0)
        
        # Count SDOH measures for this state (should be 9 per state typically)
        state_data = nmf[nmf['StateDesc'] == state]
        measure_count = len(state_data)
        
        # Use state centroid
        centroid = state_centroids.get(state, [39.8, -98.5])
        lat_center = centroid[0]
        lng_center = centroid[1]
        
        states_list.append({
            'state': state,
            'mortalityRate': float(mortality_rate),
            'locationCount': int(measure_count),
            'lat': float(lat_center),
            'lng': float(lng_center)
        })
    
    # Sort by mortality rate descending (highest first)
    states_list.sort(key=lambda x: x['mortalityRate'], reverse=True)
    return jsonify(states_list)


@app.route('/api/state-measures/<state_name>', methods=['GET'])
def get_state_measures(state_name):
    """Return all non-medical factor measures for a state (from pre-aggregated data)."""
    nmf = load_nmf_data()
    
    # Filter by state
    state_data = nmf[nmf['StateDesc'] == state_name].copy()
    if state_data.empty:
        return jsonify([])
    
    # Data is already aggregated by state and measure, just format and return
    measures_list = []
    for idx, row in state_data.iterrows():
        measure_name = row.get('Measure', 'Unknown')
        data_value = row.get('Data_Value', 0)
        
        try:
            data_value = float(data_value)
        except (ValueError, TypeError):
            data_value = 0.0
        
        measures_list.append({
            'measure': str(measure_name),
            'value': data_value if not np.isnan(data_value) else 0.0,
            'unit': '%'
        })
    
    # Sort by value descending
    measures_list.sort(key=lambda x: x['value'], reverse=True)
    return jsonify(measures_list)


@app.route('/api/measures', methods=['GET'])
def list_measures():
    """Return a list of unique non-medical factor measure names."""
    nmf = load_nmf_data()
    measures = sorted(nmf['Measure'].dropna().unique().tolist())
    return jsonify(measures)

@app.route('/api/simulate', methods=['POST'])
def simulate_intervention():
    """
    Simulate intervention impact on mortality
    
    Request format:
    {
        "state": "State Name",
        "intervention": "broadband_grant",  # or "housing_subsidy"
        "intensity": 0.5  # 0-1 scale
    }
    """
    nmf = load_nmf_data()
    body = request.get_json()
    state = body.get('state')
    intervention = body.get('intervention', 'broadband_grant')
    intensity = body.get('intensity', 0.5)
    
    # Get state measures
    state_data = nmf[nmf['StateDesc'] == state]
    if state_data.empty:
        return jsonify({'error': 'State not found'}), 404
    
    # Simple intervention model
    projected_impact = {
        'state': state,
        'intervention': intervention,
        'intensity': intensity,
        'projected_mortality_reduction': intensity * 0.15,  # 0-15% reduction
        'priority_score': intensity * 100
    }
    
    return jsonify(projected_impact)

if __name__ == '__main__':
    load_nmf_data()  # Warmup
    load_mortality_data()  # Warmup
    app.run(debug=True, port=5000)
