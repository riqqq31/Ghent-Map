$json = Get-Content "c:\Map\Ghent-Map\tambahan_geojson_uid_19270ad4-e1fc-43a9-aa49-bb7963106727\tambahan.geojson" | ConvertFrom-Json
$amenities = @{}
$tourism = @{}
$shop = @{}

foreach ($f in $json.features) {
    if ($f.properties.amenity) { $amenities[$f.properties.amenity]++ }
    if ($f.properties.tourism) { $tourism[$f.properties.tourism]++ }
    if ($f.properties.shop) { $shop[$f.properties.shop]++ }
}

echo "--- Amenities ---"
$amenities.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 15
echo "--- Tourism ---"
$tourism.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 15
echo "--- Shop ---"
$shop.GetEnumerator() | Sort-Object Value -Descending | Select-Object -First 15
