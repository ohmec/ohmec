// Copyright OHMEC contributors.
// Licensed under the Apache License, Version 2.0, see LICENSE for details.
// SPDX-License-Identifier: Apache-2.0

// Bootstrap: study flags, map/controls wiring, DOI prep, first evaluate.
// Helpers live in ohmec-*.js (loaded before this file).

let today = new Date();
let timelineDateStartDefault = new Date(1776,6,4);  // "interesting" start date, but arbitrary
let timelineDateStart = timelineDateStartDefault;
let timelineDateMinDefault = today;                 // these are the calculated min/max times of interest
let timelineDateMaxDefault = new Date(1000,0,1);
let timelineDateMinOverride;                        // these allow the database to change timeline range
let timelineDateMaxOverride;                        // unless provided in the URL override parameters
let timelineIntervalCountDefault = 500;
let timelineIntervalDurationDefault = 50;           // milliseconds
let timelineIntervalCount = timelineIntervalCountDefault;
let timelineIntervalDuration = timelineIntervalDurationDefault;

let latSettingDefault = 38.5;                       // centering around USA region for this Phase
let lonSettingDefault = -98.0;
let latSettingStart = latSettingDefault;
let lonSettingStart = lonSettingDefault;
let latSettingMin = -90.0;
let latSettingMax = 90.0;
let lonSettingMin = -180.0;
let lonSettingMax = 180.0;

let zoomSettingMin = 2.5;
let zoomSettingMax = 15.0;
let zoomSettingDefault = 4.5;
let zoomSettingStart = zoomSettingDefault;

let boundsHash = {};
let smartStepDefault = 1;
let smartStepFeature = smartStepDefault;
let popupFeatureEnabled = true;
let popupSelectExpanded = false;
let popupDefaultStyleFont;
let popupDefaultStyleFontSize;
let popupDefaultStyleFontColor;
let popupDefaultStyleFontAColor;
let popupDefaultStyleBackgroundColor;

let timelineSlider;
let backgroundLayerDefault = 'relief';
let backgroundLayerSetting = backgroundLayerDefault;
let backgroundLayers = {};
let maxZoomPerBackground = {};
let lastBackgroundLayer;
let lastLayer;
let lastFeature = null;
let allLayers = [];
let activeIds = new Set(); // features currently shown on the map for curDate
// Rebuild animated feature labels only when morph progress moves by this much (Phase B).
// ~50 label updates per full animation instead of one per slider/Advance tick.
let animLabelRatioStep = 0.02;
let lastDoiIndex = -1; // Phase D: last datesOfInterest index applied to the map
let layerById = {};    // feature id -> Leaflet layer

let infoboxNormalBackground = "rgba(4,112,255,0.7)";
let infoboxPinnedBackground = "rgba(4, 64,160,0.7)";

let hrefText = location.href;
let splits = hrefText.split('?');
let urlText = splits[0];
splits = urlText.split('/');
let pagename = splits[splits.length-1];

let infoPinned = false;
let animationHash = {};
let fHash = {};
// Study selection comes from studies.js (?study=…, legacy tokens, or old index_*.html stubs).
let studyFlags = (typeof OHMEC_STUDY !== 'undefined' && OHMEC_STUDY.flags) ? OHMEC_STUDY.flags : {};
let useEurope = !!studyFlags.useEurope;
let useAA = !!studyFlags.useAA;
let useMeso = !!studyFlags.useMeso;
let useAciv = !!studyFlags.useAciv;
let useNativeLands = !!studyFlags.useNativeLands;
let cherokeeExample = !!studyFlags.cherokeeExample;
let popupList = [];

// check for URL override

let parameters = location.search.substring(1).split("&");

if (cherokeeExample) {
  timelineDateMinOverride = str2date('800BC',false);
  timelineDateStart       = str2date('800BC',false);
}

for(let param of parameters) {
  let test = /(startdatestr|enddatestr|curdatestr)=([\d:BC-]+)/;
  let match = param.match(test);
  if (match !== null) {
    if (match[1] == 'startdatestr') {
      timelineDateMinOverride = str2date(match[2],false);
    }
    if (match[1] == 'enddatestr') {
      timelineDateMaxOverride = str2date(match[2],true);
    }
    if (match[1] == 'curdatestr') {
      timelineDateStart = str2date(match[2],false);
    }
  }
  test = /(lat|lon|z)=(-?[\d.]+)/;
  match = param.match(test);
  if (match !== null) {
    let info = match[2];
    if (match[1] == 'lat' && info >= latSettingMin && info <= latSettingMax) {
      latSettingStart = info;
    }
    if (match[1] == 'lon' && info >= lonSettingMin && info <= lonSettingMax) {
      lonSettingStart = info;
    }
    if (match[1] == 'z' && info >= zoomSettingMin && info <= zoomSettingMax) {
      zoomSettingStart = info;
    }
  }
  test = /smartstep=(on|off)/;
  match = param.match(test);
  if (match !== null) {
    smartStepFeature = (match[1]==='on') ? 1 : 0;
  }
  test = /background=(relief|topo|stamen|positron|voyager|paint|streets|physical|world|white)/;
  match = param.match(test);
  if (match !== null) {
    backgroundLayerSetting = resolveBackgroundId(match[1]);
  }
  test = /advInt=(\d+)/;
  match = param.match(test);
  if (match !== null && match[1] !== 0) {
    timelineIntervalCount = match[1];
  }
  test = /advDur=(\d+)/;
  match = param.match(test);
  if (match !== null && match[1] !== 0) {
    timelineIntervalDuration = match[1];
  }
  test = /popup=(on|off)/;
  match = param.match(test);
  if (match !== null) {
    popupFeatureEnabled = (match[1]==='on') ? true : false;
  }
}

// Declare the bounds of which the user can pan the viewing portal.
// This is limited to the starting point viewpoint, but also just
// a bit off the "edge" to give context on those geographies near
// the international date line. Note that the map overlays won't
// show "across the edge" with the exception of geometries that
// straddle, eg Alaska. Note this also trims some of the poles
// since a) there isn't interesting geo-political content below
// 70S and above 75N anyway; b) they don't render very well in a
// Mercator projection.

let panBounds = new L.LatLngBounds(new L.LatLng(-70, -200), new L.LatLng(75, 200));

let ohmap = L.map('map', {
  center:        [latSettingStart, lonSettingStart],
  zoom:          zoomSettingStart,
  zoomSnap:      0.5,
  zoomDelta:     0.5,
  minZoom:       zoomSettingMin,
  maxZoom:       zoomSettingMax,
  maxBounds:     panBounds,
  maxBoundsViscosity: 0.75, // gives a little "bounce"
  worldCopyJump: false  // true would replicate upon panning far west/east, but has unattractive skips
});

let linkSpan = document.querySelector('#directlink');

ohmap.on('moveend', completeMapMove);

// Mapbox token must not be committed. Provide via mapbox-config.js
// (see mapbox-config.example.js) or ?mapbox=pk.... URL parameter.
let ohmec_mapbox_token = '';
if (typeof OHMEC_MAPBOX_TOKEN === 'string' && OHMEC_MAPBOX_TOKEN.length > 0) {
  ohmec_mapbox_token = OHMEC_MAPBOX_TOKEN;
} else {
  let mapboxParam = new URLSearchParams(location.search).get('mapbox');
  if (mapboxParam) {
    ohmec_mapbox_token = mapboxParam;
  }
}

addBackgroundLayer(
  'relief',
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
	13,
  'Historical data OHMEC contributors | Tiles &copy; Esri &mdash; Source: Esri'
);

addBackgroundLayer(
  'world',
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
	16,
  'Historical data OHMEC contributors | Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
);

addBackgroundLayer(
  'physical',
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Physical_Map/MapServer/tile/{z}/{y}/{x}',
	9,
  'Historical data OHMEC contributors | Tiles &copy; Esri &mdash; Source: US National Park Service'
);

addBackgroundLayer(
  'white',
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}',
	13,
  'Historical data OHMEC contributors | Tiles &copy; Esri &mdash; Source: Esri'
);

// Free no-auth basemaps. Old URL ids stamen→topo, paint→voyager (see backgroundAliases).
// OpenTopoMap: terrain/contours. CARTO Positron: light unlabeled (good label contrast).
// CARTO Voyager: soft colorful base without labels.
addBackgroundLayer(
  'topo',
  'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  17,
  'Historical data OHMEC contributors | &copy; <a href="https://opentopomap.org" target="_blank">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank">CC-BY-SA</a>)',
  true
);

addBackgroundLayer(
  'positron',
  'https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
  18,
  'Historical data OHMEC contributors | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>',
  true
);

if (ohmec_mapbox_token) {
  addBackgroundLayer(
    'streets',
    'https://api.mapbox.com/styles/v1/mapbox/light-v9/tiles/{z}/{x}/{y}?access_token=' + ohmec_mapbox_token,
    18,
    'Historical data OHMEC contributors | Tile imagery &copy; <a href="https://www.mapbox.com/">Mapbox</a>'
  );
}

addBackgroundLayer(
  'voyager',
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
  18,
  'Historical data OHMEC contributors | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>',
  true
);

backgroundLayerSetting = resolveBackgroundId(backgroundLayerSetting);
if (!(backgroundLayerSetting in backgroundLayers)) {
  backgroundLayerSetting = backgroundLayerDefault;
}

lastBackgroundLayer = backgroundLayers[backgroundLayerSetting];
lastBackgroundLayer.addTo(ohmap);
ohmap.setMaxZoom(maxZoomPerBackground[backgroundLayerSetting]);

L.control.layers(backgroundLayers, undefined, {position: 'topleft'}).addTo(ohmap);

ohmap.on('baselayerchange', updateLayerInfo);

// feature info box
let infobox = L.control();
let infoPinnedId, infoPinnedProperties;

infobox.onAdd = function() {
  this._div = L.DomUtil.create('div', 'infobox');
  this.update();
  return this._div;
};

infobox.update = function(id, prop) {
  clearElement(infobox._div);
  if (prop) {
    appendLabeledLine(infobox._div, prop.entity1type, prop.entity1name);
    if("entity2type" in prop) {
      appendLabeledLine(infobox._div, prop.entity2type, prop.entity2name);
    }
    infobox._div.appendChild(
      document.createTextNode(prop.startdatestr + ' - ' + prop.enddatestr)
    );
    appendBr(infobox._div);
    if("source" in prop) {
      appendSourceLink(infobox._div, prop.source, 0);
    } else if("sources" in prop) {
      for (let i=0;i<prop.sources.length;i++) {
        appendSourceLink(infobox._div, prop.sources[i], i);
      }
    }
    let idBold = document.createElement('b');
    idBold.textContent = 'id:';
    infobox._div.appendChild(idBold);
    infobox._div.appendChild(document.createTextNode(String(id)));

    let embox = null;
    let hasEmblem = ("emblem" in fHash[id]);
    let hasPeriods = ("periodList" in fHash[id]);
    if (hasEmblem && hasPeriods) {
      embox = document.createElement('div');
      embox.id = 'embox';
      infobox._div.appendChild(embox);
    }
    let emblemParent = embox || infobox._div;
    if (hasEmblem) {
      let emblemSrc = safeEmblemPath(fHash[id].emblem);
      if (emblemSrc) {
        let center = document.createElement('center');
        let img = document.createElement('img');
        img.id = 'emblem';
        img.src = emblemSrc;
        img.height = 40;
        img.alt = '';
        center.appendChild(img);
        emblemParent.appendChild(center);
      }
    }
    if (hasPeriods) {
      for(let m in fHash[id].periodList) {
        let entry = fHash[id].periodList[m];
        if("startdatestr" in entry && "enddatestr" in entry && "period" in entry) {
          let startDate = str2date(entry.startdatestr,false);
          let endDate = str2date(entry.enddatestr,true);
          if(curDate >= startDate && curDate <= endDate) {
            let pinfo = document.createElement('div');
            pinfo.id = 'pinfo';
            let center = document.createElement('center');
            center.textContent = entry.period;
            pinfo.appendChild(center);
            (embox || infobox._div).appendChild(pinfo);
          }
        } else {
          console.error('incomplete periodList entry for ' + id, entry);
        }
      }
    }

    if (!fHash[id].style.borderless) {
      // set the background of the infobox to match the style fill color of feature
      infobox._div.style.background = fHash[id].style.fillColor;
      let divcolor = '#eee';  // default style colors
      let linkcolor = '#bbf';

      // if the fillcolor tends light, need to darken the text and a:links
      let rgb = str2RGB(fHash[id].style.fillColor);
      let rgbsum = rgb[0] + rgb[1] + rgb[2];
      if(rgbsum >= 3*0x70) {
        divcolor =  '#111';
        linkcolor = '#11e';
      }
      infobox._div.style.color = divcolor;
      if (embox) {
        embox.style.borderColor = divcolor;
      }
      for (let aelem of infobox._div.getElementsByTagName('a')) {
        aelem.style.color = linkcolor;
      }
    }
  } else {
    let title = document.createElement('b');
    title.textContent = 'Feature Information';
    infobox._div.appendChild(title);
    infobox._div.style.background = infoboxNormalBackground;
    infobox._div.style.color = '#eee';
  }
};

infobox.addTo(ohmap);

// popup select
let popupSelect = L.control();
popupSelect.setPosition("topleft");

popupSelect.update = function() {
  if(popupSelectExpanded) {
    if(popupFeatureEnabled) {
      this._div.innerHTML = '<input type="radio" id="psel" name="psel" checked /><label for="psel">popups enabled</label>';
    } else {
      this._div.innerHTML = '<input type="radio" id="psel" name="psel" /><label for="psel">popups disabled</label>';
    }
  } else {
    if(popupFeatureEnabled) {
      this._div.innerHTML = '<input type="radio" id="psel" name="psel" checked /><label for="psel"></label>';
    } else {
      this._div.innerHTML = '<input type="radio" id="psel" name="psel" /><label for="psel"></label>';
    }
  }
}

popupSelect.onAdd = function() {
  this._div = L.DomUtil.create('div', 'popupselect');
  this.update();

  this._div.addEventListener("click", () => {
    popupFeatureEnabled = popupFeatureEnabled ? false : true;
    popupSelect.update();
    updateDirectLink();
  });
  return this._div;
}

popupSelect.addTo(ohmap);

let legend = L.control({position: 'bottomright'});
let curDate = today;

let geojson;

infobox.clear = function() {
  infobox._div.style.background = infoboxNormalBackground;
  infoPinned = false;
  if (lastFeature) {
    infobox.update(lastFeature.id,lastFeature.properties);
  } else {
    infobox.update();
  }
}

let datesOfInterest = [];

let polygonCount = 0;

// Soft-fail lint: bad features are skipped so one mistake doesn't kill the map.
let geoLintErrors = [];

if(useEurope) {
  geo_lint(dataEur,false,false,false);
} else if(useAA) {
  geo_lint(dataAA,false,false,false);
} else if(useMeso) {
  geo_lint(dataMeso,false,false,false);
} else if(useAciv) {
  geo_lint(dataACiv,false,false,false);
} else {
  geo_lint(dataNA,false,useNativeLands,cherokeeExample);
  if(useNativeLands) {
    geo_lint(dataNL,true,false);
    dataNA.features = dataNA.features.concat(dataNL.features);
    dataNA.popups = dataNA.popups.concat(dataNL.popups);
  }
}

let geoDB = useEurope ? dataEur : useAA ? dataAA : useMeso ? dataMeso : useAciv ? dataACiv : dataNA;

prepare_animations();
showGeoLintWarnings();

datesOfInterest.push(today);
// Include the first moment after each feature ends so DOI diffs capture
// disappearances (starts alone miss ends that fall between other starts).
for (let f of geoDB.features) {
  datesOfInterest.push(new Date(f.properties.endDate.getTime() + 1000));
}
let datesOfInterestSorted = uniqueDateSort(datesOfInterest);

// Figure out what changes from one "date of interest" to
// the next. start with figuring out which IDs are valid in
// each date

// go through each feature and add it to an array of valid
// IDs per DOI
let idsPerDOI = [];
for (let i = 0; i < datesOfInterestSorted.length; i++) {
  idsPerDOI[i] = [];
}
for(let f of geoDB.features) {
  let sd = str2date(f.properties.startdatestr,false);
  let ed = str2date(f.properties.enddatestr,  true);
  for (let i=0;i<datesOfInterestSorted.length;i++) {
    let doi = datesOfInterestSorted[i].getTime();
    if (doi > ed) {
      break;
    }
    if(sd <= doi) {
      idsPerDOI[i].push(f.id);
    }
  }
}

// now sort the IDs and compare them against the last version
// to find the differences.
let idsPerDOISorted = [];
let idAddsPerDOI = [];
let idSubsPerDOI = [];
for (let doi=0;doi<idsPerDOI.length;doi++) {
  idsPerDOISorted.push(idsPerDOI[doi].sort());
  idAddsPerDOI[doi] = [];
  idSubsPerDOI[doi] = [];
  if (doi>=1) {
    let im = 0;
    let ip = 0;
    while(im < idsPerDOISorted[doi-1].length || ip < idsPerDOISorted[doi].length) {
      if(im === idsPerDOISorted[doi-1].length) {
        idAddsPerDOI[doi].push(idsPerDOISorted[doi][ip]);
        ip++;
      } else if(ip === idsPerDOISorted[doi].length) {
        idSubsPerDOI[doi].push(idsPerDOISorted[doi-1][im]);
        im++;
      } else if (idsPerDOISorted[doi-1][im] === idsPerDOISorted[doi][ip]) {
        im++;
        ip++;
      } else if(idsPerDOISorted[doi][ip] < idsPerDOISorted[doi-1][im]) {
        idAddsPerDOI[doi].push(idsPerDOISorted[doi][ip]);
        ip++;
      } else {
        idSubsPerDOI[doi].push(idsPerDOISorted[doi-1][im]);
        im++;
      }
    }
  }
}

geojson = L.geoJson(geoDB, {
  style:         featureStyle,
  pointToLayer:  pointToLayer,
  onEachFeature: onEachFeature
}).addTo(ohmap);

for (let l in geojson._layers) {
  let lyr = geojson._layers[l];
  layerById[lyr.feature.id] = lyr;
}

geojson.evaluateLayers = evaluateLayers;

// First paint should match the study viewpoint / URL date, not "today".
// Otherwise evaluateLayers syncs to the present, then the slider jumps back
// across millennia and can abort mid-walk on animated features.
curDate.setTime(timelineDateStart.getTime());
geojson.evaluateLayers();

legend.onAdd = function () {
  this._div = L.DomUtil.create('div', 'curdate');
  this.update();
  return this._div;
};

legend.update = function () {
  this._div.innerHTML =
    'Current date:<br/><div id="fixeddate">' +
    dateStr(curDate,'&sol;') +
    '</div>';
  updateDirectLink();
};
legend.addTo(ohmap);

// Coalesce slider scrubbing / Advance ticks to one evaluate per animation frame.
let pendingDateValue = null;
let refreshMapRaf = null;

let refreshMap = function( {dateValue} ) {
  pendingDateValue = dateValue;
  if (refreshMapRaf !== null) {
    return;
  }
  refreshMapRaf = requestAnimationFrame(function () {
    refreshMapRaf = null;
    curDate.setTime(pendingDateValue);
    legend.update();
    geojson.evaluateLayers();
    checkPopups();
  });
}

let timelineDateMin = timelineDateMinOverride ? timelineDateMinOverride : timelineDateMinDefault;
let timelineDateMax = timelineDateMaxOverride ? timelineDateMaxOverride : timelineDateMaxDefault;

let mapBounds = function() {
  return ohmap.getBounds();
}

timelineSlider = L.control.timelineSlider({
  timelineDateMin:          timelineDateMin,
  timelineDateMax:          timelineDateMax,
  timelineDateStart:        timelineDateStart,
  timelineIntervalCount:    timelineIntervalCount,
  timelineIntervalDuration: timelineIntervalDuration,
  infoboxHandle:            infobox,
  smartStepFeature:         smartStepFeature,
  clearInfobox:             infobox.clear,
  idAddsPerDOI:             idAddsPerDOI,
  idSubsPerDOI:             idSubsPerDOI,
  boundsHash:               boundsHash,
  mapBounds:                mapBounds,
  datesOfInterestSorted:    datesOfInterestSorted,
  updateTime:               refreshMap}).addTo(ohmap);

// update HTML data

updateHTML('polycount', polygonCount);

// update the text forms that allow date modification to contain
// the initial start / current / end dates to begin with.

updateForm('sdform', dateStr(timelineDateMinOverride,':'));
updateForm('cdform', dateStr(curDate,':'));
updateForm('edform', dateStr(timelineDateMaxOverride,':'));

let sdFormElem = document.querySelector('#sdform');
let cdFormElem = document.querySelector('#cdform');
let edFormElem = document.querySelector('#edform');

// "listen" for updates to any one of the three date forms
// and refresh the page with the modification

sdFormElem.addEventListener('change', () => {
  let newurl = urlString(str2date(sdFormElem.value), timelineDateMaxOverride, curDate);
  open(newurl,"_self");
});

cdFormElem.addEventListener('change', () => {
  let newurl = urlString(timelineDateMinOverride, timelineDateMaxOverride, str2date(cdFormElem.value));
  open(newurl,"_self");
});

edFormElem.addEventListener('change', () => {
  let newurl = urlString(timelineDateMinOverride, str2date(edFormElem.value, true), curDate);
  open(newurl,"_self");
});

// if key `i` is pressed, potentially modify the infobox,
// using this algorithm
//
// o  if nothing is currently pinned, and mouse is over a feature,
//    pin that feature
// o  if a feature is currently pinned, and mouse is over that
//    same feature, or no feature, unpin that feature
// o  if a feature is currently pinned, and mouse is over a new
//    feature, pin that feature.

ohmap.on('keydown',   checkKeypress);
ohmap.on('moveend',   checkPopups);
ohmap.on('mousemove', checkMouseMove);

checkPopups();
