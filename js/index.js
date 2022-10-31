const queryString = window.location.search;
const urlParams = new URLSearchParams(queryString);
let ln = urlParams.get('ln') ? urlParams.get('ln') : "he";
const showBorders = urlParams.get('border') ? urlParams.get('border') : 0;
const isMobile = window.matchMedia("only screen and (max-width: 760px)").matches;
let results = 0
     
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
                                [6,"rgba(252, 247, 229, 1)"],
                                [10,"rgba(252, 247, 229, 1)"],
                                [14,"rgba(246, 241, 229, 1)"],
                                [15,"rgba(246, 241, 229, 1)"]
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
    let polygonPaint = {
        'fill-color': '#fff',
        'fill-opacity': 0.8
        }
    let polygonFilter = ['==', 'name', 'dissolved']
    if(showBorders == 1){
        polygonPaint = {
            'fill-color': ['match',
                            ['get', 'name'],
                            'israel',
                            '#fff',
                            '#a4a4a4'],
            'fill-opacity': 0.8
            }
        polygonFilter = ['!=', 'name', 'dissolved']
    }
    map.addLayer({
        'id': 'israelBG',
        'type': 'fill',
        'source': 'israelBG',
        'layout': {},
        'paint': polygonPaint,
        'filter': polygonFilter
    });
    if(showBorders == 1){
        map.addLayer({
            'id': 'israelBG-line',
            'type': 'line',
            'source': 'israelBG',
            'layout': {},
            'paint': {
            'line-color': '#000',
            'line-opacity': 0.9,
            'line-dasharray': [4, 2]
            },
            'filter': ['!=', 'name', 'dissolved']
        });
    }
    
    loadBG()
}
async function loadBG(){
    const BGresponse = await fetch('israel.fgb');
    for await (let feature of flatgeobuf.deserialize(BGresponse.body, undefined)) {

        israelGJ.features.push(feature)
        let sourceObject = map.getSource('israelBG');
        sourceObject.setData(israelGJ)
    }


    Promise.all([
        fetch("elections.json").then(value => value.json()),
        fetch("parties.json").then(value => value.json()),
        fetch("national.json").then(value => value.json()),

        ]).then(allResponses => {
            
            results2021 = allResponses[0]
            partyColor = allResponses[1]
            results = runCalc(allResponses[2])
            addLayer()
          })
}
map.on('load',onMapLoad)



let partyColor
let results2021;


function addLayer(){

    var geojson = addPariesInfo(results2021.citiesData.results, partyColor);
    map.addSource('results', {
    'type': 'geojson',
    'data': geojson
    });

    function addPariesInfo(geojson, partyColor) {
        geojson.features.forEach((feature) => {
        var partyColorForFeature = partyColor[feature.properties.max_party];

        if (partyColorForFeature) {
            feature.properties.partyColor = partyColorForFeature.Color;
            feature.properties.partyName = tr(feature.properties.max_party,ln);
            feature.properties.cityVotingHeight = feature.properties.votingPercentage * 500

    }
  });

  return geojson;
}
    map.addLayer({
        'id': 'results',
        'type': 'fill-extrusion',
        'source': 'results',
        'layout': {},
        'paint': {

        // Get the `fill-extrusion-color` from the source `color` property.
        'fill-extrusion-color': ['get', 'partyColor'], 
         
        // Get `fill-extrusion-height` from the source `height` property.
        'fill-extrusion-height': ['get', 'cityVotingHeight'],
          
            
         
        // Get `fill-extrusion-base` from the source `base_height` property.
        'fill-extrusion-base': 50,
         
        // Make extrusions slightly opaque to see through indoor walls.
        'fill-extrusion-opacity': 0.5
        }
        });  
        map.addLayer({
            id: "trailheads-symbol",
            type: "symbol",
            source: "results",
            layout: {
  
              "text-font": ["Arial Italic"],
              "text-field": ["get", "areaId"],
              "text-size": 12,
              "text-anchor": "bottom",
              "text-offset": [0, -2]
  
            },
            paint: {
              "text-color": "white",
              "text-halo-color": "seagreen",
              "text-halo-width": 2
  
            }
          });
        // map.setLayoutProperty('results', 'text-field', [
        //     'format',
        //     ['get', 'areaId'],
        //     { 'font-scale': 1.2 },
        //     {
        //     'font-scale': 0.8,
        //     'text-font': [
        //     'literal',
        //     ['David', 'Arial Unicode MS Regular']
        //     ]
        //     }
        //     ]);
    
    addInteractions()
}

function addInteractions(){
    map.on('click', 'results', function (e) {
        var feature = e.features[0];
        console.log(feature)
        var center = turf.centroid(feature.geometry);
        console.log(feature.properties.partyName)
        var description = `<h2>${tr(feature.properties.id,ln)}</h2>`;
        
        description += `${tr("mostVotesPartyString",ln)} : ${tr(feature.properties.max_party,ln)}<br>`
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
    if(ln != "he" || "ar" ){
        const popupContentStyle = document.querySelector('.maplibregl-popup-content');
        popupContentStyle.direction = "left"
    }
}
function returnPlot(){
    let plotData = {},
    x =[],
    y =[]
    for (let index = 0; index < results.length; index++) {
        let element = results[index];
        if (element.aboveBlockPercent) {
            x.push(element.partyName)
            y.push(element.mandatesByVotes)         
        }

        //plotData({x:[].push(element.partyName),y:[].push(element.votes)})
        
    }
    plotData=[{x,y,type:"bar"}]
    Plotly.newPlot('hiddenContent', plotData);
    
}

class displayNationtalScore {
    onAdd(map){
        this.map = map;
        
        this.container = document.createElement('div');
        this.container.className = 'custom-control-class maplibregl-ctrl mapboxgl-ctrl';

        this.nationtalScore = document.createElement('button');
        this.nationtalScore.className = "nationalResultsBtn"
        this.nationtalScore.textContent = tr("nationalResults",ln)

        this.container.appendChild(this.nationtalScore)

        this.slider = document.createElement("div")
        this.slider.id = "slider"
        this.slider.className = "slide-up"

        this.container.appendChild(this.slider)

        this.filler = document.createElement("div")

        this.slider.appendChild(this.filler)

        this.contants = document.createElement("div")
        this.contants.className = "contents"
        this.contants.id = "hiddenContent"

        this.slider.appendChild(this.contants)

        const slider = this.slider
        const contants = this.contants
        
        //var result = Object.keys(results).map((key) => [key, results[key]]);

        
        this.nationtalScore.addEventListener("click", function() {

            if (window.getComputedStyle(slider).getPropertyValue("display") == "none") {
                console.log("up")
                slider.classList.toggle("slide-down")
                returnPlot()
                slider.style.display = "block";
              }
              else if (window.getComputedStyle(slider).getPropertyValue("display") == "block") {
                console.log("down")
                slider.style.display = "none";
              }
        
             
                
                // showNationalResults(contants)
            
        });

        
        return this.container;
    }
    // onAdd(map){
    //     this.map = map;
        
    //     this.container = document.createElement('div');
    //     this.container.className = 'custom-control-class maplibregl-ctrl mapboxgl-ctrl';

    //     this.nationtalScore = document.createElement('button');
    //     this.nationtalScore.className = "nationalResultsBtn"
    //     this.nationtalScore.textContent = tr("nationalResults",ln)

    //     this.container.appendChild(this.nationtalScore)

    //     this.slider = document.createElement("div")
    //     this.slider.id = "slider"
    //     this.slider.className = "slide-up"

    //     this.container.appendChild(this.slider)

    //     this.filler = document.createElement("div")

    //     this.slider.appendChild(this.filler)

    //     this.contants = document.createElement("p")
    //     this.contants.className = "contents"
    //     this.contants.textContent = "teset"

    //     this.slider.appendChild(this.contants)

    //     const slider = this.slider
    //     this.nationtalScore.addEventListener("click", function() {
    //             //let silder = document.getElementById("slider");
        
    //             slider.classList.toggle("slide-down")
            
    //     //     //let results = calcMandates()
    //     });

        
    //     return this.container;
    // }
    onRemove(){
      this.container.parentNode.removeChild(this.container);
      this.map = undefined;
    }
    
  }

  let myDisplayNationtalScore = new displayNationtalScore();

  map.addControl(myDisplayNationtalScore);

class languageSelectionButtons {
    onAdd(map){
      this.map = map;
      this.container = document.createElement('div');
      this.hebBtn = document.createElement('a');
      this.hebBtn.textContent = " Hebrew |"
      this.enBtn = document.createElement('a');
      this.enBtn.textContent = " English |"
      this.arBtn = document.createElement('a');
      this.arBtn.textContent = " Arabic |"
      this.rusBtn = document.createElement('a');
      this.rusBtn.textContent = " Russian"
      this.container.appendChild(this.hebBtn)
      this.container.appendChild(this.enBtn)
      this.container.appendChild(this.arBtn)
      this.container.appendChild(this.rusBtn)
      this.container.className = 'custom-control-class maplibregl-ctrl mapboxgl-ctrl';
      this.hebBtn.className = 'langBtn'
      this.enBtn.className = 'langBtn'
      this.arBtn.className = 'langBtn'
      this.rusBtn.className = 'langBtn'
      changeLanguge(this.hebBtn,'he');
      changeLanguge(this.enBtn,'en');
      changeLanguge(this.arBtn,'ar');
      changeLanguge(this.rusBtn,'ru');
        function changeLanguge(clickablearea,languageChange) {
            clickablearea.addEventListener("click", () => {
                ln = languageChange;
            });

        }


        return this.container;

    }
    onRemove(){
      this.container.parentNode.removeChild(this.container);
      this.map = undefined;
    }
  }

  let myLanguageSelectionButtons = new languageSelectionButtons();

  map.addControl(myLanguageSelectionButtons,position = 'top-left');

