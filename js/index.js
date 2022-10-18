const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const ln = urlParams.get('ln') ? urlParams.get('ln') : "he";
var map = new maplibregl.Map({
    container: 'map',
    style: {
        "version" : 8,
        "sprite" : "https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer/resources/sprites/sprite",
        "glyphs" : "https://basemaps.arcgis.com/arcgis/rest/services/World_Basemap_v2/VectorTileServer/resources/fonts/{fontstack}/{range}.pbf",
        "sources" : {
        },
        "layers" : [
            {
                    "id": "background",
                    "type": "background",
                    "layout": {
                        "visibility": "visible"
                    },
                    "paint": {
                        "background-color": {
                            "stops": [
                                [
                                    6,
                                    "rgba(252, 247, 229, 1)"
                                ],
                                [
                                    10,
                                    "rgba(252, 247, 229, 1)"
                                ],
                                [
                                    14,
                                    "rgba(246, 241, 229, 1)"
                                ],
                                [
                                    15,
                                    "rgba(246, 241, 229, 1)"
                                ]
                            ]
                        }
                    }
                }
            
        ]
    }, // stylesheet location
    center: [35.078096, 31.4411522], // starting position [lng, lat]
    zoom: 7 // starting zoom
    });
let israelGJ = {
    "type": "FeatureCollection",
    "features": []
  }

async function onMapLoad(){
    map.addSource('israelBG', {
        'type': 'geojson',
        'data': israelGJ
    });
    
    map.addLayer({
        'id': 'israelBG',
        'type': 'fill',
        'source': 'israelBG',
        'layout': {},
        'paint': {
        'fill-color': '#fff',
        'fill-opacity': 0.8
        }
    });        
    loadBG()
}
async function loadBG(){
    const BGresponse = await fetch('israel.fgb');
    for await (let feature of flatgeobuf.deserialize(BGresponse.body, undefined)) {

        israelGJ.features.push(feature)
        let sourceObject = map.getSource('israelBG');
        sourceObject.setData(israelGJ)
    }
    fetch("elections.json")
    .then(res => res.json())
    .then(data => {
        results2021 = data;
        addLayer()
    })
}
map.on('load',onMapLoad)


let results2021;


function addLayer(){

    map.addSource('results', {
        'type': 'geojson',
        'data': results2021.citiesData.results//results2021.neighbourhoodsData.results
        });

    map.addLayer({
        'id': 'results',
        'type': 'fill',
        'source': 'results',
        'layout': {},
        'paint': {
        'fill-color': '#088',
        'fill-opacity': 0.8
        }
    });
    map.addLayer({
        'id': 'room-extrusion',
        'type': 'fill-extrusion',
        'source': 'israelBG',
        'paint': {
        // Get the `fill-extrusion-color` from the source `color` property.
        'fill-extrusion-color': 'blue',
         
        // Get `fill-extrusion-height` from the source `height` property.
        'fill-extrusion-height': 50,
         
        // Get `fill-extrusion-base` from the source `base_height` property.
        'fill-extrusion-base': 5,
         
        // Make extrusions slightly opaque to see through indoor walls.
        'fill-extrusion-opacity': 0.5
        }
        });
    addInteractions()
}

function addInteractions(){
    map.on('click', 'results', function (e) {
        var feature = e.features[0];
        console.log(feature)
        var center = turf.centroid(feature.geometry);
        var description = `<h2>${feature.properties.areaId.trim()}</h2>`;
        description += `${tr(1,ln)} : ${feature.properties.max_party}<br>`
        description += '<div id="plot">'

        props = JSON.parse(feature.properties.electionsResults)
        console.log(props)
        keys = Object.keys(props)
        values = Object.values(props)
        var data = []
        for(var i=0;i<keys.length;i++){
            trace = {
                y:['תוצאות'],
                x:[values[i]],
                name:keys[i],
                orientation: 'h',
                width: 0.5,
                type:'bar'

            }
            data.push(trace)
        }
        
        
        var layout = {barmode: 'stack',
                        height:200,
                        showlegend: false,
                        yaxis:{
                            showline:false,
                            showgrid:false
                        },
                        xaxis:{
                            showline:false,
                            showgrid:false,
                            zeroline:false

                        },
                        margin:{
                            t:0,
                            b:0,
                            l:0,
                            r:0
                        }};
         
        
         
        new maplibregl.Popup({maxWidth:'300px'})
            .setLngLat(center.geometry.coordinates)
            .setHTML(description)
            .addTo(map);
        
        setDirection(ln)
        console.log(data)
        Plotly.newPlot('plot', data, layout,{scrollZoom: false, displayModeBar: false});
        });
         
        // Change the cursor to a pointer when the mouse is over the places layer.
        map.on('mouseenter', 'results', function () {
            map.getCanvas().style.cursor = 'pointer';
        });
         
        // Change it back to a pointer when it leaves.
        map.on('mouseleave', 'results', function () {
            map.getCanvas().style.cursor = '';
        });
        
}

function setDirection(ln){
    if(ln != "he"){
        const popupContentStyle = document.querySelector('.maplibregl-popup-content');
        popupContentStyle.direction = "left"
    }
}