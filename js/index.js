const queryString = window.location.search;
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
  type: "FeatureCollection",
  features: [],
};

async function onMapLoad() {
  map.addSource("israelBG", {
    type: "geojson",
    data: israelGJ,
  });
  let polygonPaint = {
    "fill-color": "#fff",
    "fill-opacity": 0.8,
  };
  let polygonFilter = ["==", "name", "dissolved"];
  if (showBorders == 1) {
    polygonPaint = {
      "fill-color": ["match", ["get", "name"], "israel", "#fff", "#a4a4a4"],
      "fill-opacity": 0.8,
    };
    polygonFilter = ["!=", "name", "dissolved"];
  }
  map.addLayer({
    id: "israelBG",
    type: "fill",
    source: "israelBG",
    layout: {},
    paint: polygonPaint,
    filter: polygonFilter,
  });
  if (showBorders == 1) {
    map.addLayer({
      id: "israelBG-line",
      type: "line",
      source: "israelBG",
      layout: {},
      paint: {
        "line-color": "#000",
        "line-opacity": 0.9,
        "line-dasharray": [4, 2],
      },
      filter: ["!=", "name", "dissolved"],
    });
  }

  loadBG();
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
  ]).then((allResponses) => {
    results2021 = allResponses[0];
    partyColor = allResponses[1];
    addLayer();
  });
}
map.on("load", onMapLoad);

let partyColor;
let results2021;

function addPariesInfo(geojson, partyColor) {
  geojson.features.forEach((feature) => {
    var partyColorForFeature = partyColor[feature.properties.max_party];

    if (partyColorForFeature) {
      feature.properties.partyColor = partyColorForFeature.Color;
      feature.properties.partyName = tr(feature.properties.max_party, ln);
      feature.properties.cityVotingHeight =
        feature.properties.votingPercentage * 500;
    }
  });

  return geojson;
}

function addLayer() {
  var geojson = addPariesInfo(results2021.citiesData.results, partyColor);
  map.addSource("results", {
    type: "geojson",
    data: geojson,
  });

  map.addLayer({
    id: "results",
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
  });
  map.addLayer({
    id: "labels-symbol",
    type: "symbol",
    source: "results",
    layout: {
      "text-font": ["Noto Sans Regular"],
      "text-field": ["get", "areaId"],
      "text-size": 16,
      "text-anchor": "bottom",
      "text-offset": [0, -2],
    },
    paint: {
      "text-color": "black",
      "text-halo-color": "white",
      "text-halo-width": 1,
    },
    filter: [
      "in",
      ["get", "areaId"],
      [
        "literal",
        ["תל אביב יפו", "ירושלים", "חיפה", "אילת", "טבריה", "באר שבע"],
      ],
    ],
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

  addInteractions();
}

function addInteractions() {
  map.on("click", "results", function (e) {
    var feature = e.features[0];
    console.log(feature);
    var center = turf.centroid(feature.geometry);
    console.log(feature.properties.partyName);
    var description = `<h2>${tr(feature.properties.areaId.trim(), ln)}</h2>`;

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

function setDirection(ln) {
  if (ln != "he") {
    const popupContentStyle = document.querySelector(
      ".maplibregl-popup-content"
    );
    popupContentStyle.direction = "left";
  }
}

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
