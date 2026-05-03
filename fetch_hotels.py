import json, urllib.request, urllib.parse, os, ssl

# Try multiple Overpass endpoints
endpoints = [
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
]

query = '[out:json][timeout:60];area["name"="Gent"]["admin_level"="8"]->.ghent;(nwr["tourism"](area.ghent);nwr["building"="hotel"](area.ghent);)->.all;(.all;>;);out body;'

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

result = None
for ep in endpoints:
    try:
        url = ep + "?data=" + urllib.parse.quote(query)
        req = urllib.request.Request(url, headers={
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "application/json"
        })
        print(f"Trying {ep}...")
        with urllib.request.urlopen(req, timeout=120, context=ctx) as resp:
            result = json.loads(resp.read().decode())
        print("Success!")
        break
    except Exception as e:
        print(f"  Failed: {e}")

if not result:
    print("All endpoints failed. Creating hotels from existing dataset instead.")
    # Fallback: extract from main dataset
    f = open(r'c:\geojoson\ghent_dataset_geojson_uid_4425dfb6-d92d-40e7-9abb-fb0535df3afb\ghent_dataset.geojson','r',encoding='utf-8')
    d = json.load(f)
    f.close()
    features = []
    for feat in d['features']:
        p = feat['properties']
        if p.get('building') == 'hotel':
            props = dict(p)
            props['tourism'] = 'hotel'
            feat2 = dict(feat)
            feat2['properties'] = props
            features.append(feat2)
    out = {"type": "FeatureCollection", "features": features}
    os.makedirs(r"c:\geojoson\data", exist_ok=True)
    with open(r"c:\geojoson\data\ghent_hotels.geojson", "w", encoding="utf-8") as f2:
        json.dump(out, f2)
    print(f"Fallback: Saved {len(features)} hotel features from main dataset.")
    exit()

elements = result.get("elements", [])
print(f"Raw elements: {len(elements)}")

nodes = {e["id"]: e for e in elements if e["type"] == "node"}
ways = [e for e in elements if e["type"] == "way" and "tags" in e]
tagged_nodes = [e for e in elements if e["type"] == "node" and "tags" in e]

KEEP = {"hotel", "guest_house", "hostel", "motel", "apartment"}
features = []

def make_props(tags, oid, otype):
    return {
        "osm_id": oid, "osm_type": otype,
        "name": tags.get("name", ""), "tourism": tags.get("tourism", ""),
        "building": tags.get("building", ""), "stars": tags.get("stars", ""),
        "rooms": tags.get("rooms", ""),
        "phone": tags.get("phone", tags.get("contact:phone", "")),
        "website": tags.get("website", tags.get("contact:website", "")),
        "email": tags.get("email", tags.get("contact:email", "")),
        "addr_street": tags.get("addr:street", ""),
        "addr_housenumber": tags.get("addr:housenumber", ""),
        "operator": tags.get("operator", ""),
        "internet_access": tags.get("internet_access", ""),
        "wheelchair": tags.get("wheelchair", ""),
        "wikidata": tags.get("wikidata", ""),
        "wikipedia": tags.get("wikipedia", ""),
        "image": tags.get("image", ""),
    }

for n in tagged_nodes:
    tags = n.get("tags", {})
    t = tags.get("tourism", "")
    b = tags.get("building", "")
    if t not in KEEP and b != "hotel":
        continue
    features.append({
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [n["lon"], n["lat"]]},
        "properties": make_props(tags, n["id"], "node")
    })

for w in ways:
    tags = w.get("tags", {})
    t = tags.get("tourism", "")
    b = tags.get("building", "")
    if t not in KEEP and b != "hotel":
        continue
    coords = []
    for nid in w.get("nodes", []):
        if nid in nodes:
            coords.append([nodes[nid]["lon"], nodes[nid]["lat"]])
    if len(coords) < 3:
        continue
    if coords[0] != coords[-1]:
        coords.append(coords[0])
    features.append({
        "type": "Feature",
        "geometry": {"type": "Polygon", "coordinates": [coords]},
        "properties": make_props(tags, w["id"], "way")
    })

out = {"type": "FeatureCollection", "features": features}
os.makedirs(r"c:\geojoson\data", exist_ok=True)
with open(r"c:\geojoson\data\ghent_hotels.geojson", "w", encoding="utf-8") as f:
    json.dump(out, f)
print(f"Saved {len(features)} hotel/accommodation features.")
for feat in features[:5]:
    print(json.dumps({k:v for k,v in feat["properties"].items() if v}, indent=2))
