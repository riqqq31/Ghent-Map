import json

f = open(r'c:\geojoson\data\ghent_buildings.geojson', 'r', encoding='utf-8')
d = json.load(f)
f.close()

KEEP = {
    'castle', 'cathedral', 'chapel', 'church', 'civic', 'monastery',
    'temple', 'synagogue', 'historic', 'palace', 'gate_house', 'tower',
    'fort', 'bunker', 'government', 'hospital', 'university', 'school',
    'public', 'train_station'
}

filtered = [
    feat for feat in d['features']
    if feat['properties'].get('building') in KEEP or feat['properties'].get('name')
]

print(f"Filtered to {len(filtered)} notable buildings from {len(d['features'])}")

out = {'type': 'FeatureCollection', 'features': filtered}
with open(r'c:\geojoson\data\ghent_buildings.geojson', 'w', encoding='utf-8') as f2:
    json.dump(out, f2)
print("Saved!")
