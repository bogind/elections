const queryString = window.location.search;
const fullResultsUrl = "https://script.google.com/macros/s/AKfycbyKWmvN7Abj12obdm3F0q15Xxi5KILdnqW0Lu5xHc-NSJTAQB2W1mk9ZLjzV2hT6Mbi/exec?national=0"
const nationalResultsUrl = "https://script.google.com/macros/s/AKfycbyKWmvN7Abj12obdm3F0q15Xxi5KILdnqW0Lu5xHc-NSJTAQB2W1mk9ZLjzV2hT6Mbi/exec?national=1"
const urlParams = new URLSearchParams(queryString);
let ln = urlParams.get("ln") ? urlParams.get("ln") : "he";
const showBorders = urlParams.get("border") ? urlParams.get("border") : 0;
const isMobile = window.matchMedia("only screen and (max-width: 760px)").matches;
const vw = window.innerWidth;
const vh = window.inneHeight;
let results = 0

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
    fetch(nationalResultsUrl).then(value => value.json()),
    fetch(fullResultsUrl).then(value => value.json()),
  ]).then((allResponses) => {
    results2021 = allResponses[0];
    partyColor = allResponses[1];
    setsGJ = allResponses[2]
    results = runCalc(allResponses[3])
    results2022 = allResponses[4]
    nationalResults = addNationalResultsPlot()
    mydisplayNationtalScoreBtn.onAdd()
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
      delete setResults["פסולים"];
      props.electionsResults = setResults
      props.max_party = setResults.max_party
      props.partyColor = setResults.partyColor
      
      props.cityVotingHeight = props.votingPercentage * 5000
      feature.properties = props;
    } catch (error) {
      console.log(error)
    }
    
  })
  addLayer();
}

// function addPartiesInfo(geojson, partyColor) {
//   geojson.features.forEach((feature) => {
//     var partyColorForFeature = partyColor[feature.properties.max_party];

//     if (partyColorForFeature) {
//       feature.properties.partyColor = partyColorForFeature.Color;
//       feature.properties.partyName = tr(feature.properties.max_party, ln);
//       //feature.properties.votingPercentage = feature.properties.electionsResults.כשרים/feature.properties.electionsResults.בזב
//       feature.properties.cityVotingHeight =
//       feature.properties.votingPercentage * 500;
//     }
//   });

//   return geojson;
// }

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
    if(ln != "he" && ln != "ar" ){
      //var description = `<h2>${tr(feature.properties.set_code, ln)}</h2>`;
        var description = `<div class="popup-content-ltr"><h2>${tr(feature.properties.lms_code, ln)}</h2>`;
      }else{
        var description = `<div class="popup-content-rtl"><h2>${tr(feature.properties.lms_code, ln)}</h2>`;
      }
    


    description += `${tr("mostVotesPartyString", ln)} : ${tr(
      feature.properties.max_party,
      ln
    )}<br>`;
    description += '<div id="plot">';

    let props = JSON.parse(feature.properties.electionsResults);
    delete props["max_party"]
    delete props["partyColor"]
    let sortable = [];
    for (var key in props) {
        sortable.push([key, props[key]]);
    }
    sortable.sort(function(a, b) {
        return a[1] - b[1];
    });
    let keys = [];
    let values = [];
    let colors = [];
    for(var k=0;k<sortable.length;k++){
      keys.push(tr(sortable[k][0],ln))
      values.push(sortable[k][1])
      colors.push(partyColor[sortable[k][0]].Color)
    }
    console.log(colors)
    var data = [];
    for (var i = 0; i < keys.length; i++) {
      trace = {
        y: ["קולות"],
        x: [values[i]],
        name: keys[i],
        orientation: "h",
        width: 0.5,
        type: "bar",
        marker:{
          color: colors[i]
        },
      };
      data.push(trace);
    }

    var layout = {
      barmode: "stack",
      height: 250,
      showlegend: false,
      yaxis: {
        showline: false,
        showgrid: false,
        text:''
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

function setDirection(ln) {
  if (ln != "he") {
    const popupContentStyle = document.querySelector(
      ".maplibregl-popup-content"
    );
    popupContentStyle.direction = "left";
  }
}
function addNationalResultsPlot(){
  let plotData = {},
  x =[],
  y =[]
  myArray = results.parties.filter(function( obj ) {
      return obj.aboveBlockPercent !== false;
  });
  myArray.sort((a, b) => (a.totalMandates > b.totalMandates ? -1 : 1))
  for (let index = 0; index < myArray.length; index++) {
    try {
      let element = myArray[index];
          //Tr will work when the real results arrive
          x.push(tr(element.partyName,ln))
      //console.log("creating plot - party name " +element.partyName)
      
      //x.push(tr(element.partyName,ln))
      y.push(element.totalMandates)  
    } catch (error) {
      console.log(myArray)
      console.log(index)
    }
             
  }
  plotData=[{x,y,type:"bar"}]
  return plotData
  
}

class displayNationtalScore {
  onAdd(map){
      this.map = map;
      this.container = document.createElement('div');
      this.container.className = 'nationalResultsMapboxgl maplibregl-ctrl mapboxgl-ctrl';

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

      this.slider.classList.toggle("slide-down")

      this.contants.style.display = "block";
      
      
      return this.container;
  }
  onRemove(){
      this.container.remove()
    //this.container.parentNode.removeChild(this.container);
    this.contants.style.display = "block";

    this.map = undefined;
  }
  
}

class languageSelectionButtons {
  onAdd(map) {
    this.map = map;
    this.container = document.createElement("div");
    this.container.id = "langBar";
    this.container.className =
    "custom-control-class maplibregl-ctrl mapboxgl-ctrl popup-content-rtl";
    if(ln != "he" &&  ln != "ar" ){
        this.container.classList.remove('popup-content-rtl') 
        this.container.classList.add('popup-content-ltr') 
    }
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
        map.setLayoutProperty('labels-symbol',"text-field", ["get", ln]);
        if(ln != "he" &&  ln != "ar" ){
          try {
            this.container.classList.remove('popup-content-rtl')

          } catch (error) {

          }  
        }
      });
    }

    return this.container;
  }
  onRemove() {
    this.container.parentNode.removeChild(this.container);
    this.map = undefined;
  }
}

let myCustomControl = new languageSelectionButtons();

map.addControl(myCustomControl, (position = "top-left"));

class displayNationtalScoreBtn {
  onAdd(map){
      this.map = map;
      
      this.container = document.createElement('div');
      this.container.className = 'nationalResultsBtnMapboxgl maplibregl-ctrl mapboxgl-ctrl';

      this.nationtalScore = document.createElement('button');
      this.nationtalScore.className = "nationalResultsBtn"
      this.nationtalScore.textContent = tr("nationalResults",ln)

      this.container.appendChild(this.nationtalScore)
      var clickCount = 0;
      var nationtalScore = 0;
      this.nationtalScore.addEventListener("click", function() {

          if ( clickCount % 2 == 0 ) {
              
              console.log(clickCount)
              nationtalScore = new displayNationtalScore();
              map.addControl(nationtalScore,'bottom-right');
              addPlot()
}
          else{
              nationtalScore.onRemove()
              nationtalScore = undefined;
              // console.log(clickCount)
          } 
          
          clickCount++

            });
      
      return this.container;
  }
  onRemove(){
    this.container.parentNode.removeChild(this.container);
    this.map = undefined;
  }
  
}

let mydisplayNationtalScoreBtn = new displayNationtalScoreBtn();

  map.addControl(mydisplayNationtalScoreBtn);

function addPlot(){
    let layout = {
      autosize: true,
      width: vw*0.9,
      height: 0.3*vh
    }
    Plotly.newPlot("hiddenContent", nationalResults,layout);

}