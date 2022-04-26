const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
const ln = urlParams.get('ln') ? urlParams.get('ln') : "he";
var map = new maplibregl.Map({
    container: 'map',
    style: 'style1.json', // stylesheet location
    center: [35.078096, 31.4411522], // starting position [lng, lat]
    zoom: 7 // starting zoom
    });

let results2021;
fetch("elections.json")
.then(res => res.json())
.then(data => {
    results2021 = data;
    addLayer()
})

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
    addInteractions()
}

function addInteractions(){
    map.on('click', 'results', function (e) {
        var center = turf.centroid(e.features[0].geometry);
        var description = `<h2>${e.features[0].properties.areaId.trim()}</h2>`;
        description += `${tr(1,ln)} : ${e.features[0].properties.max_party}`
         
        
         
        new maplibregl.Popup()
            .setLngLat(center.geometry.coordinates)
            .setHTML(description)
            .addTo(map);
        
        setDirection(ln)
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