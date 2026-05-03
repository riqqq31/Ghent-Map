import json
import os

input_file = r'c:\geojoson\ghent_dataset_geojson_uid_4425dfb6-d92d-40e7-9abb-fb0535df3afb\ghent_dataset.geojson'
output_dir = r'c:\geojoson\data'

os.makedirs(output_dir, exist_ok=True)

print("Loading dataset...")
with open(input_file, 'r', encoding='utf-8') as f:
    data = json.load(f)

print(f"Total features loaded: {len(data.get('features', []))}")

waterways = []
buildings = []
historics = []

for feature in data.get('features', []):
    props = feature.get('properties', {})
    
    if 'waterway' in props and props['waterway']:
        waterways.append(feature)
    elif 'historic' in props and props['historic']:
        historics.append(feature)
    elif 'building' in props and props['building']:
        buildings.append(feature)

print(f"Found {len(waterways)} waterways.")
print(f"Found {len(buildings)} buildings.")
print(f"Found {len(historics)} historic sites.")

# To keep the file size manageable for the WebGIS, let's limit buildings if there are too many
# Actually, let's just write them out. Leaflet can handle a few thousand, but if it's >10000, it might lag.
MAX_BUILDINGS = 5000
if len(buildings) > MAX_BUILDINGS:
    print(f"Limiting buildings to {MAX_BUILDINGS} to prevent browser lag.")
    buildings = buildings[:MAX_BUILDINGS]

def save_geojson(features, filename):
    out_path = os.path.join(output_dir, filename)
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump({
            "type": "FeatureCollection",
            "features": features
        }, f)
    print(f"Saved {len(features)} features to {filename}")

save_geojson(waterways, 'ghent_waterways.geojson')
save_geojson(buildings, 'ghent_buildings.geojson')
save_geojson(historics, 'ghent_historic.geojson')
print("Extraction complete!")
