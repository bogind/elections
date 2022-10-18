from pandas import read_csv
from requests import get
from json import dump

data = read_csv("election_results.csv")
base_obj = {"type": "FeatureCollection", "features": []}
for i in range(0,len(data)):
    try:
        #url = "http://localhost:8083/search.php?q={}&extratags=1&namedetails=1&accept-language=he-il&dedupe=0&addressdetails=1&format=json&polygon_text=1".format(data.iloc[i,1])
        url = "https://services2.arcgis.com/xMRYm7cNgdR5RN6F/arcgis/rest/services/DemogSetl_2013/FeatureServer/0/query?where=SEMEL_YISHUV={}&returnGeometry=true&geometryPrecision=8&outSR=4326&f=pgeojson".format(data.iloc[i,2])
        res = get(url)
        gj = res.json()
        if "features" in gj and len(gj["features"]) > 0:
            feature = gj["features"][0]
            feature["properties"]["found"] = 1
            feature["properties"]["lms_code"] = int(data.iloc[i,2])
            feature["properties"]["set_name"] = str(data.iloc[i,1])
            feature["properties"]["vaada"] = int(data.iloc[i,0])
            base_obj["features"].append(feature)
        else:
            feature = {
                "type": "Feature",
                "properties": {"found":0,"lms_code":int(data.iloc[i,2]),"set_name":str(data.iloc[i,1]),"vaada":int(data.iloc[i,0])},
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                    [[34.688644,32.53176],
                        [34.715423,32.531762],
                        [34.7154235,32.545076],
                        [34.688644,32.545076],
                        [34.688644,32.5317628]]
                    ]
                }
            }
            base_obj["features"].append(feature)
    except Exception as e:
        print(e)

with open('sets2.geojson', 'w') as json_file:
  dump(base_obj, json_file)

