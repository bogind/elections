const queryString = window.location.search;
const fullResultsUrl = "https://script.google.com/macros/s/AKfycbyKWmvN7Abj12obdm3F0q15Xxi5KILdnqW0Lu5xHc-NSJTAQB2W1mk9ZLjzV2hT6Mbi/exec?national=0"
const nationalResultsUrl = "https://script.google.com/macros/s/AKfycbyKWmvN7Abj12obdm3F0q15Xxi5KILdnqW0Lu5xHc-NSJTAQB2W1mk9ZLjzV2hT6Mbi/exec?national=1"
const urlParams = new URLSearchParams(queryString);
let ln = urlParams.get("ln") ? urlParams.get("ln") : "he";
const showBorders = urlParams.get("border") ? urlParams.get("border") : 0;
const isMobile = window.matchMedia(
  "only screen and (max-width: 760px)"
).matches;

var map = new maplibregl.Map({
  container: "map",
  style: {
    version: 8,
    glyphs: "https://bogind.github.io/glfonts/{fontstack}/{range}.pbf",
    sources: {},
    layers: [
      {
        id: "background",
        type: "background",
        layout: {
          visibility: "visible",
        },
        paint: {
          "background-color": {
            stops: [
              [6, "rgba(252, 247, 229, 1)"],
              [10, "rgba(252, 247, 229, 1)"],
              [14, "rgba(246, 241, 229, 1)"],
              [15, "rgba(246, 241, 229, 1)"],
            ],
          },
        },
      },
    ],
  }, // stylesheet location
  center: [35.078096, 31.4411522], // starting position [lng, lat]
  zoom: 7, // starting zoom
});
let israelGJ = {
    "type": "FeatureCollection",
    "features": []
  }
let setsGJ = {
    "type": "FeatureCollection",
    "features": []
  }

async function onMapLoad(){
    map.addSource('israelBG', {
        'type': 'geojson',
        'data': israelGJ
    });
    map.addSource('sets', {
        'type': 'geojson',
        'data': setsGJ
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
        id: "israelBG",
        type: "fill",
        source: "israelBG",
        layout: {},
        paint: polygonPaint,
        filter: polygonFilter,
    })
    
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

async function loadBG() {
  const BGresponse = await fetch("israel.fgb");
  for await (let feature of flatgeobuf.deserialize(
    BGresponse.body,
    undefined
  )) {
    israelGJ.features.push(feature);
    let sourceObject = map.getSource("israelBG");
    sourceObject.setData(israelGJ);
  }

  Promise.all([
    fetch("elections.json").then((value) => value.json()),
    fetch("parties.json").then((value) => value.json()),
    fetch("sets5.geojson").then(value => value.json()),
    fetch(fullResultsUrl).then(value => value.json()),
  ]).then((allResponses) => {
    results2021 = allResponses[0];
    partyColor = allResponses[1];
    setsGJ = allResponses[2]
    results2022 = allResponses[3]
    joinResults(setsGJ,results2022)
    
  });
}
map.on("load", onMapLoad);

let partyColor;
let results2021;
function joinResults(setsGJ,results2022){
  setsGJ.features.forEach(feature => {
    try {
      setResults = results2022[feature.properties.lms_code]
      trNames = dict[feature.properties.lms_code]
      props = {
          ...feature.properties,
          ...trNames
      };
      props.bzb = setResults["בזב"]
      props.voters = setResults["מצביעים"]
      props.kosher = setResults["כשרים"]
      props.votingPercentage = props["מצביעים"]/props["בזב"]
      delete setResults["בזב"];
      delete setResults["מצביעים"];
      delete setResults["כשרים"];
      props.electionsResults = setResults
      props.max_party = setResults.max_party
      props.partyColor = setResults.partyColor
      
      props.cityVotingHeight = props.votingPercentage * 5000
      feature.properties = props;
    } catch (error) {
      console.log(feature)
    }
    
  })
  addLayer();
  addNationalResultsPlot()
}

function addPartiesInfo(geojson, partyColor) {
  geojson.features.forEach((feature) => {
    var partyColorForFeature = partyColor[feature.properties.max_party];

    if (partyColorForFeature) {
      feature.properties.partyColor = partyColorForFeature.Color;
      feature.properties.partyName = tr(feature.properties.max_party, ln);
      feature.properties.cityVotingHeight =
      feature.properties.votingPercentage * 500;
        //feature.properties.votingPercentage = feature.properties.electionsResults.כשרים/feature.properties.electionsResults.בזב
    }
  });

  return geojson;
}

function addLayer() {
  //var geojson = addPartiesInfo(results2021.citiesData.results, partyColor);
  map.addSource("results", {
    type: "geojson",
    data: setsGJ,
  });

  map.addLayer({
    id: "results",
    type: "fill",
    source: "results",
    layout: {},
    paint: {
      // Get the `fill-extrusion-color` from the source `color` property.
      "fill-color": ["get", "partyColor"]
    },
    filter:[
      "in",
      ["get", "found"],
      [
        "literal",
        [1],
      ],
    ]
  });

  map.addLayer({
    id: "results-extruded",
    type: "fill-extrusion",
    source: "results",
    layout: {},
    paint: {
      // Get the `fill-extrusion-color` from the source `color` property.
      "fill-extrusion-color": ["get", "partyColor"],

      // Get `fill-extrusion-height` from the source `height` property.
      "fill-extrusion-height": ["get", "cityVotingHeight"],

      // Get `fill-extrusion-base` from the source `base_height` property.
      "fill-extrusion-base": 50,

      // Make extrusions slightly opaque to see through indoor walls.
      "fill-extrusion-opacity": 0.5,
    },
    filter:[
      "in",
      ["get", "found"],
      [
        "literal",
        [1],
      ],
    ]
  });
  map.addLayer({
    id: "labels-symbol",
    type: "symbol",
    source: "results",
    layout: {
      "text-font": ["Noto Sans Regular"],
      "text-field": ["get", ln],
      "text-size": 16,
      "text-anchor": "bottom",
      "symbol-spacing": 5000,
      "icon-allow-overlap": false,
      "text-offset": [0, -2],
    },
    paint: {
      "text-color": "black",
      "text-halo-color": "white",
      "text-halo-width": 1,
    },
    filter: [
      "in",
      ["get", "lms_code"],
      [
        "literal",
        [5000, 3000, 4000, 2600, 6700, 9000],
      ],
    ],
  });


  addInteractions();
}

function addInteractions() {
  map.on("click", "results", function (e) {
    var feature = e.features[0];
    var center = turf.centroid(feature.geometry);
    var description = `<h2>${tr(feature.properties.lms_code, ln)}</h2>`;
    //var description = `<h2>${tr(feature.properties.set_code, ln)}</h2>`;


    description += `${tr("mostVotesPartyString", ln)} : ${tr(
      feature.properties.max_party,
      ln
    )}<br>`;
    description += '<div id="plot">';

    props = JSON.parse(feature.properties.electionsResults);
    console.log(props);
    keys = Object.keys(props);
    values = Object.values(props);
    var data = [];
    for (var i = 0; i < keys.length; i++) {
      trace = {
        y: ["תוצאות"],
        x: [values[i]],
        name: keys[i],
        orientation: "h",
        width: 0.5,
        type: "bar",
      };
      data.push(trace);
    }

    var layout = {
      barmode: "stack",
      height: 200,
      showlegend: false,
      yaxis: {
        showline: false,
        showgrid: false,
      },
      xaxis: {
        showline: false,
        showgrid: false,
        zeroline: false,
      },
      margin: {
        t: 0,
        b: 0,
        l: 0,
        r: 0,
      },
    };

    new maplibregl.Popup({ maxWidth: "300px" })
      .setLngLat(center.geometry.coordinates)
      .setHTML(description)
      .addTo(map);

    setDirection(ln);
    console.log(data);
    Plotly.newPlot("plot", data, layout, {
      scrollZoom: false,
      displayModeBar: false,
    });
  });

  // Change the cursor to a pointer when the mouse is over the places layer.
  map.on("mouseenter", "results", function () {
    map.getCanvas().style.cursor = "pointer";
  });

  // Change it back to a pointer when it leaves.
  map.on("mouseleave", "results", function () {
    map.getCanvas().style.cursor = "";
  });
}
function setDirection(ln){
  if(ln != "he" || "ar" ){
      const popupContentStyle = document.querySelector('.maplibregl-popup-content');
      popupContentStyle.direction = "left"
  }
}
function addNationalResultsPlot(){
  let plotData = {},
  x =[],
  y =[]
  for (let index = 0; index < results.parties.length; index++) {
      let element = results.parties[index];
      if (element.aboveBlockPercent) {
          //Tr will work when the real results arrive
          //x.push(tr(element.partyName),ln)
          x.push(element.partyName)
          y.push(element.totalMandates)         
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
              slider.classList.toggle("slide-down")

              contants.style.display = "block";
            }
            else if (window.getComputedStyle(contants).getPropertyValue("display") == "block") {
              contants.style.display = "none";
            }
      
          
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
  onAdd(map) {
    this.map = map;
    this.container = document.createElement("div");
    this.container.id = "langBar";
    this.container.className =
      "custom-control-class maplibregl-ctrl mapboxgl-ctrl";
    this.container.appendChild(createLangBtn(" Hebrew |", "he"));
    this.container.appendChild(createLangBtn(" English |", "en"));
    this.container.appendChild(createLangBtn(" Arabic |", "ar"));
    this.container.appendChild(createLangBtn(" Russian", "ru"));
    function createLangBtn(btnLngText, lng) {
      let btn = document.createElement("a");
      btn.textContent = btnLngText;
      btn.className = "langBtn";
      changeLanguge(btn, lng);
      return btn;
    }
    function changeLanguge(clickablearea, languageChange) {
      clickablearea.addEventListener("click", () => {
        ln = languageChange;
        setDirection(ln);
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