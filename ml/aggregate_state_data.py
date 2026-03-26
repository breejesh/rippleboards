import pandas as pd
from pathlib import Path

data_path = Path('../data')

# Columns to exclude (geolocation and sub-state location identifiers)
EXCLUDE_COLS = {'Geolocation', 'LocationName', 'LocationID'}

print("=" * 70)
print("PLACES DATA - STATE AGGREGATION (Keep All Columns)")
print("=" * 70)

# Load PLACES data
places = pd.read_csv(data_path / 'PlacesData.csv', low_memory=False)
print(f"\nOriginal shape: {places.shape}")
print(f"Original columns ({len(places.columns)}): {places.columns.tolist()}")

# Columns to keep
keep_cols = [col for col in places.columns if col not in EXCLUDE_COLS]
places_keep = places[keep_cols].copy()

print(f"\nKeeping {len(keep_cols)} columns (excluded: {EXCLUDE_COLS})")

# Identify numeric and categorical columns
numeric_cols = places_keep.select_dtypes(include=['number']).columns.tolist()
categorical_cols = places_keep.select_dtypes(include=['object']).columns.tolist()

print(f"Numeric columns ({len(numeric_cols)}): {numeric_cols}")
print(f"Categorical columns ({len(categorical_cols)}): {categorical_cols}")

# Aggregate by StateDesc
# For categorical columns, take the first value (should be constant within state)
# For numeric columns, take the mean
agg_dict = {col: 'first' for col in categorical_cols}
agg_dict.update({col: 'mean' for col in numeric_cols})

places_agg = places_keep.groupby('StateDesc', as_index=False).agg(agg_dict)

# Round numeric columns to 2 decimals
for col in numeric_cols:
    places_agg[col] = places_agg[col].round(2)

places_agg.to_csv(data_path / 'PlacesData_StateAggregated.csv', index=False)

print(f"\n✓ Saved PlacesData_StateAggregated.csv")
print(f"  Shape: {places_agg.shape}")
print(f"  Columns: {places_agg.columns.tolist()}")

print("\n" + "=" * 70)
print("NON-MEDICAL SDOH - STATE AGGREGATION (Keep All Columns)")
print("=" * 70)

# Load NonMedicalSDOH data
nmf = pd.read_csv(data_path / 'NonMedicalSDOH.csv')
print(f"\nOriginal shape: {nmf.shape}")
print(f"Original columns ({len(nmf.columns)}): {nmf.columns.tolist()}")

# Columns to keep
nmf_keep_cols = [col for col in nmf.columns if col not in EXCLUDE_COLS]
nmf_keep = nmf[nmf_keep_cols].copy()

print(f"\nKeeping {len(nmf_keep_cols)} columns (excluded: {EXCLUDE_COLS})")

# Convert Data_Value to numeric
nmf_keep['Data_Value'] = pd.to_numeric(nmf_keep['Data_Value'], errors='coerce')

# Identify numeric and categorical columns
nmf_numeric_cols = nmf_keep.select_dtypes(include=['number']).columns.tolist()
nmf_categorical_cols = nmf_keep.select_dtypes(include=['object']).columns.tolist()

print(f"Numeric columns ({len(nmf_numeric_cols)}): {nmf_numeric_cols}")
print(f"Categorical columns ({len(nmf_categorical_cols)}): {nmf_categorical_cols}")

# Aggregate by StateDesc and Measure
# For categorical columns, take the first value (should be constant within state+measure)
# For numeric columns, take the mean
nmf_agg_dict = {col: 'first' for col in nmf_categorical_cols}
nmf_agg_dict.update({col: 'mean' for col in nmf_numeric_cols})

nmf_agg = nmf_keep.groupby(['StateDesc', 'Measure'], as_index=False).agg(nmf_agg_dict)

# Round numeric columns to 2 decimals
for col in nmf_numeric_cols:
    nmf_agg[col] = nmf_agg[col].round(2)

nmf_agg.to_csv(data_path / 'NonMedicalSDOH_StateAggregated.csv', index=False)

print(f"\n✓ Saved NonMedicalSDOH_StateAggregated.csv")
print(f"  Shape: {nmf_agg.shape}")
print(f"  Columns: {nmf_agg.columns.tolist()}")

print("\n" + "=" * 70)
print("SUMMARY")
print("=" * 70)
print(f"PlacesData_StateAggregated.csv: {places_agg.shape[0]} states × {places_agg.shape[1]} columns")
print(f"NonMedicalSDOH_StateAggregated.csv: {nmf_agg.shape[0]} rows × {nmf_agg.shape[1]} columns")
print(f"  ({len(nmf_agg['StateDesc'].unique())} states × {len(nmf_agg['Measure'].unique())} measures)")
