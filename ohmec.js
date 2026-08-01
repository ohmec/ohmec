// Copyright OHMEC contributors.
// Licensed under the Apache License, Version 2.0, see LICENSE for details.
// SPDX-License-Identifier: Apache-2.0

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
  test = /background=(relief|stamen|positron|paint|streets|physical|world|white)/;
  match = param.match(test);
  if (match !== null) {
    backgroundLayerSetting = match[1];
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

function dateStr(dateInput,slash) {
  let year = dateInput.getFullYear();
  if(year < 0) {
    return fixInt(-1*year,4) + 'BC';
  }
  return fixInt(year,4) + slash +
         fixInt(dateInput.getMonth()+1,2) + slash +
         fixInt(dateInput.getDate(),2);
}

function urlString(mindate,maxdate,curdate) {
  let hrefText = location.href;
  let splits = hrefText.split('?');
  let latlon = ohmap.getCenter();
  let conjoin = '?';
  let urlText = splits[0];
  // Prefer canonical index.html?study=… links even when opened via a stub page.
  if (/index_[a-z]+\.html$/.test(urlText)) {
    urlText = urlText.replace(/index_[a-z]+\.html$/, 'index.html');
  }
  if (typeof OHMEC_STUDY_ID !== 'undefined' && OHMEC_STUDY_ID && OHMEC_STUDY_ID !== 'na') {
    urlText += conjoin + 'study=' + OHMEC_STUDY_ID;
    conjoin = '&';
  }
  if(mindate) {
    urlText += conjoin +
      'startdatestr='  + dateStr(mindate,':');
    conjoin = '&';
  }
  if(maxdate) {
    urlText += conjoin +
       'enddatestr='   + dateStr(maxdate,':');
    conjoin = '&';
  }
  urlText += conjoin +
    'curdatestr='    + dateStr(curdate,':') +
    '&lat='          + parseFloat(latlon.lat).toFixed(2) +
    '&lon='          + parseFloat(latlon.lng).toFixed(2) +
    '&z='            + parseFloat(ohmap.getZoom()).toFixed(1);
  if(smartStepFeature != smartStepDefault) {
    urlText += '&smartstep=' + (smartStepFeature ? 'on' : 'off');
  }
  if(backgroundLayerSetting !== backgroundLayerDefault) {
    urlText += '&background=' + backgroundLayerSetting;
  }
  if(timelineIntervalCount !== timelineIntervalCountDefault) {
    urlText += '&advInt=' + timelineIntervalCount;
  }
  if(timelineIntervalDuration !== timelineIntervalDurationDefault) {
    urlText += '&advDur=' + timelineIntervalDuration;
  }
  if(popupFeatureEnabled === false) {
    urlText += '&popup=off';
  }
  return urlText;
}

let updateDirectLink = function() {
  let hrefText = location.href;
  let urlText = urlString(timelineDateMinOverride, timelineDateMaxOverride, curDate);
  linkSpan.textContent = urlText;
  linkSpan.href = urlText;
};

let updateLayerInfo = function(e) {
  // change backgroundLayerSetting and also the URL link
  if(e !== undefined && e.type === 'baselayerchange') {
    backgroundLayerSetting = e.name;
    lastBackgroundLayer = backgroundLayers[backgroundLayerSetting];
    ohmap.setMaxZoom(maxZoomPerBackground[backgroundLayerSetting]);
  }
  updateDirectLink();
};

function completeMapMove() {
  infoPinned = false;
  infobox._div.style.background = infoboxNormalBackground;
  if (lastFeature) {
    infobox.update(lastFeature.id,lastFeature.properties);
  } else {
    infobox.update();
  }
  updateDirectLink();
}

ohmap.on('moveend', completeMapMove);

// useStandardTiles: true for 256px XYZ providers (Stadia, OpenTopoMap, etc.)
function addBackgroundLayer(name, access, maxZoom, attribution, useStandardTiles) {
  let maxZoomSetting = (maxZoom > zoomSettingMax) ? zoomSettingMax : maxZoom;
  let layerOpts = {
    maxZoom:     maxZoomSetting,
    attribution: attribution
  };
  if (useStandardTiles) {
    layerOpts.tileSize = 256;
  } else {
    // Retina-style tiling used by Mapbox / some Esri endpoints in this project
    layerOpts.tileSize = 512;
    layerOpts.zoomOffset = -1;
  }
  backgroundLayers[name] = L.tileLayer(access, layerOpts);
  maxZoomPerBackground[name] = maxZoomSetting;
}

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

// Free no-auth basemaps (layer ids "stamen"/"paint" kept for URL + keyboard compat).
// OpenTopoMap: terrain/contours. CARTO Positron: light unlabeled (good label contrast).
// CARTO Voyager: soft colorful base without labels.
addBackgroundLayer(
  'stamen',
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
  'paint',
  'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png',
  18,
  'Historical data OHMEC contributors | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>',
  true
);

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

function getSourceNameType(stext, idx) {
  let test = /^(\w+):(\w.+)$/;
  let tmatch = stext.match(test);
  let sname = stext;
  let stype = "source";
  // complicated HTML to get the keyboard digit representing the source
  let sprefix = "&#x" + (idx+49).toString(16) + ";&#xfe0f;&#x20e3; ";
  if (tmatch !== null) {
    stype = tmatch[1];
    sname = tmatch[2];
  } else {
    test = /http.*wikipedia/;
    stype = "wikipedia source";
  }
  return [sprefix,sname,stype];
}

infobox.update = function(id, prop) {
  if (prop) {
    let thisHTML = '<b>' + prop.entity1type  + '</b>: ' + prop.entity1name + '<br/>';
    if("entity2type" in prop) {
      thisHTML += '<b>' + prop.entity2type + '</b>: ' + prop.entity2name + '<br/>';
    }
    thisHTML += prop.startdatestr + ' - ' + prop.enddatestr  + '<br/>';
    if("source" in prop) {
      if(prop.source.includes("native-land")) { // give explicit credit to Native Lands for their data
        thisHTML += '<a href="' + prop.source + '" target="_blank">source: Native Lands</a><br/>';
      } else {
        let sreturn = getSourceNameType(prop.source,0);
        thisHTML += sreturn[0] + '<a href="' + sreturn[1] + '" target="_blank">' + sreturn[2] + '</a><br/>';
      }
    } else if("sources" in prop) {
      for (let i=0;i<prop.sources.length;i++) {
        let sreturn = getSourceNameType(prop.sources[i],i);
        thisHTML += sreturn[0] + '<a href="' + sreturn[1] + '" target="_blank">' + sreturn[2] + '</a><br/>';
      }
    }
    thisHTML += '<b>id:</b>' + id;
    if ("emblem" in fHash[id] && "periodList" in fHash[id]) {
      thisHTML += '<div id="embox">';
    }
    if ("emblem" in fHash[id]) {
      thisHTML += '<center><img id="emblem" src="emblems/' + fHash[id].emblem + '" height="40"></center>';
    }
    if ("periodList" in fHash[id]) {
      for(let m in fHash[id].periodList) {
        let entry = fHash[id].periodList[m];
        // error out if there are entries that don't conform to expectation
        if("startdatestr" in entry && "enddatestr" in entry && "period" in entry) {
          let startDate = str2date(entry.startdatestr,false);
          let endDate = str2date(entry.enddatestr,true);
          if(curDate >= startDate && curDate <= endDate) {
            let pe = entry.period;
            thisHTML += '<div id="pinfo"><center>' + pe + '</center></div>';
          }
        } else {
          if(!("startdatestr" in entry)) {
            throw "missing startdatestr in periodList for " + id;
          }
          if(!("enddatestr" in entry)) {
            throw "missing enddatestr in periodList for " + id;
          }
          if(!("period" in entry)) {
            throw "missing period in periodList for " + id;
          }
        }
      }
    }
    if ("emblem" in fHash[id] && "periodList" in fHash[id]) {
      thisHTML += '</div>';
    }
    infobox._div.innerHTML = thisHTML;

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
      if ("emblem" in fHash[id] && "periodList" in fHash[id]) {
        document.getElementById("embox").style.borderColor = divcolor;
      }
      for (let aelem of document.getElementsByClassName('infobox')[0].getElementsByTagName('a')) {
        aelem.style.color = linkcolor;
      }
    }
  } else {
    infobox._div.innerHTML = '<b>Feature Information</b>';
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

function dateMin(minDate, newDate) {
  return (minDate < newDate) ? minDate : newDate;
}

function dateMax(maxDate, newDate) {
  return (maxDate > newDate) ? maxDate : newDate;
}

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

function infoboxFeatureOn(e) {
  let layer = e.target;

  if (layer.feature.geometry.type !== "Point") {  // Point styles are not being overridden at this time
    // borderless features shouldn't be highlighted (but still have selectability)
    let newOpacity = (layer.feature.style.fillOpacity >= 0.60) ? 0.80 : 0.70;
    let opacity = (layer.feature.style.borderless) ? layer.feature.style.fillOpacity : newOpacity;
    layer.setStyle({
      weight: 5,
      color: '#666',
      dashArray: '',
      fillOpacity: opacity
    });

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
      if("layerDepth" in layer.feature.style && layer.feature.style.layerDepth !== "back") {
        layer.bringToFront();
      }
    }
  }
  lastFeature = layer.feature;
  lastLayer = layer;

  // possibly update font color if it differs in style
  if(layer.feature.style.borderless && layer.feature.style.hifontcolor !== layer.feature.style.fontcolor && !("animateTo" in layer.feature.properties)) {
    layer.feature.textOverlay.removeFrom(ohmap);
    layer.feature.textOverlay = updateTextOverlay(layer.feature, layer.getBounds(), true);
    layer.feature.textOverlay.addTo(ohmap);
  }

  if (infoPinned && (infoPinnedId == layer.feature.id)) {
    infobox._div.style.background = infoboxPinnedBackground;
  } else {
    infobox._div.style.background = infoboxNormalBackground;
  }
  infobox.update(layer.feature.id,layer.feature.properties);

  // check other layers to see if they need to be brought up to the front
  for(let l in allLayers) {
    let lyr = allLayers[l];
    let prop = lyr.feature.properties;
    let style = lyr.feature.style;
    if(curDate >= prop.startDate && curDate <= prop.endDate && "layerDepth" in style && style.layerDepth === "front") {
      lyr.bringToFront();
    }
  }
}

function infoboxFeatureOff(e) {
  geojson.resetStyle(e.target);
  lastFeature = null;
  if(infoPinned) {
    infobox._div.style.background = infoboxPinnedBackground;
    infobox.update(infoPinnedId,infoPinnedProperties);
  } else {
    infobox.clear();
  }

  // possibly revert font color if it differs in style
  let layer = e.target;
  if(layer.feature.style.borderless && layer.feature.style.hifontcolor !== layer.feature.style.fontcolor && !("animateTo" in layer.feature.properties)) {
    layer.feature.textOverlay.removeFrom(ohmap);
    layer.feature.textOverlay = updateTextOverlay(layer.feature, layer.getBounds(), false);
    layer.feature.textOverlay.addTo(ohmap);
  }
}

// upon mouse click, lower this feature to lowest in the
// click stack so next time it hovers on something else
function lowerZ(e) {
  if(e.target.feature.geometry.type !== 'Point') {
    e.target.bringToBack();
  }
}

// this renders the default leaflet Point marker as transparent,
// while still allowing for selection / hovering. It also moves
// points high in the z stack for first priority.
function pointToLayer(point, latlng) {
  return L.marker(latlng, { opacity: 0.0, zIndexOffset: 1000 });
}

function getTextLabel(bounds, id, label, isPoint, properties, fontinfo, altProperties, ratio) {
  // Set width to 100, and scale height based upon ratio of bounds.
  // Not perfect due to lat/long relationships but good enough for now.

  let width = 100;
  let widthd2 = width/2;
  let height =
    (bounds.getEast() === bounds.getWest()) ? 1 :
    (width * (bounds.getNorth() - bounds.getSouth()) / (bounds.getEast() - bounds.getWest()));
  let heightd2 = height/2;
  let textLabel = document.createElementNS("http://www.w3.org/2000/svg", "svg");

  textLabel.setAttribute('xmlns',   "http://www.w3.org/2000/svg");
  textLabel.setAttribute('width',   width);
  textLabel.setAttribute('height',  height);
  textLabel.setAttribute('viewBox', "0 0 " + width + " " + height);

  let textLabelDefs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  textLabel.appendChild(textLabelDefs);

  let labelScale = ("labelScale" in properties) ? properties.labelScale : 1.0;
  let rotateAdj = 0;
  let arcValue = 0;
  let xAdj = 0;
  let yAdj = 0;
  let useArc = "labelArc" in properties;

  // check for animation requirements
  if(altProperties) {
    if("labelScale" in properties || "labelScale" in altProperties) {
      let scaleA = ("labelScale" in    properties) ?    properties.labelScale : 1.0;
      let scaleB = ("labelScale" in altProperties) ? altProperties.labelScale : 1.0;
      labelScale = scaleA+((scaleB-scaleA)*ratio);
    }
    if("labelRotate" in properties || "labelRotate" in altProperties) {
      let rotateA = ("labelRotate" in    properties) ?    properties.labelRotate : 0;
      let rotateB = ("labelRotate" in altProperties) ? altProperties.labelRotate : 0;
      rotateAdj = (rotateB-rotateA)*ratio;
    }
    if("labelX" in properties || "labelX" in altProperties) {
      let xA = ("labelX" in    properties) ?    properties.labelX : 0;
      let xB = ("labelX" in altProperties) ? altProperties.labelX : 0;
      xAdj = (xB-xA)*ratio;
    }
    if("labelY" in properties || "labelY" in altProperties) {
      let yA = ("labelY" in    properties) ?    properties.labelY : 0;
      let yB = ("labelY" in altProperties) ? altProperties.labelY : 0;
      yAdj = (yB-yA)*ratio;
    }
    if("labelArc" in properties || "labelArc" in altProperties) {
      // arc is weird in that you want to move to either +INF or -INF, depending
      // upon where you start. so if one is negative, then other needs to default
      // to -INF, else +INF. Since averaging towards INF would make it flatten out
      // instantaneously, use 500 as about flat enough
      let arcA = 0;
      let arcB = 0;
      useArc = true;
      if(("labelArc" in properties) && ("labelArc" in altProperties)) {
        arcA =    properties.labelArc;
        arcB = altProperties.labelArc;
      } else if("labelArc" in properties) {
        arcA =    properties.labelArc;
        arcB = (arcA < 0) ? -500 : 500;
      } else if("labelArc" in altProperties) {
        arcB = altProperties.labelArc;
        arcA = (arcB < 0) ? -500 : 500;
      }
      arcValue = arcA+(arcB-arcA)*ratio;
    }
  } else if(useArc) {
    arcValue = properties.labelArc;
  }

  let segments = label.split('\n');
  let labelLength = label.length;
  // add in any subLabels
  if("subLabel" in properties) {
    let subsegments = properties.subLabel.split('\n');
    segments = segments.concat(subsegments);
  }
  if(segments.length > 1) {
    labelLength = segments[0].length;
    for(let i=1; i<segments.length; i++) {
      if(segments[i].length > labelLength) {
        labelLength = segments[i].length;
      }
    }
  }

  let fontsize = isPoint ? fontinfo.scale/25 : labelLength ? fontinfo.scale/labelLength : 1;
  fontsize *= labelScale;

  let inner = '';
  for(let i=0; i<segments.length; i++) {
    let segmentLabel = segments[i];
    // spaces might be used for alignment, but get glommed in HTML, convert to &nbsp;
    let regexSpace = new RegExp(" ", "g");
    segmentLabel = segmentLabel.replace(regexSpace,'&nbsp;');
    let thisFontsize = fontsize*(1 - 0.2*i);  // font shrinks a bit on each line
    // if labelArc is used, we first need to define the circular path that the text will traverse
    // it is a circle with radius 'arc' that has a tangent at (50,h/2), either with the circle below
    // and the text on the top (if arc > 0) or the circle above with the text on the bottom (arc < 0).
    if(useArc) {
      let my   = heightd2 + 2*arcValue + i*fontsize;
      let ar   = (arcValue >= 0) ? arcValue : -arcValue;
      let pos  = (arcValue >= 0) ? 1 : 0;
      let ar2n = arcValue*2;
      let ar2p = arcValue*-2;
      inner += '<path id="arcpath' + i + id + '" stroke="none" fill="none" d="m 50,' + my;
      inner += ' a ' + ar + ',' + ar + ' 0 0 ' + pos + ' 0,' + ar2p;
      inner +=   ' ' + ar + ',' + ar + ' 0 0 ' + pos + ' 0,' + ar2n + ' z"/>';
    }
    let justify = isPoint ? 'left' : 'middle';
    if("labelJustify" in properties) {
      justify = properties.labelJustify;
    }
    let anchor = 'middle';
    let tx = width*0.5;
    let ty = height*0.5;
    switch(justify) {
      case 'above': anchor = 'middle'; tx = width*0.50; ty = height*0.48; break;
      case 'below': anchor = 'middle'; tx = width*0.50; ty = height*0.54; break;
      case 'right': anchor =    'end'; tx = width*0.48; ty = height*0.51; break;
      case 'left':  anchor =  'start'; tx = width*0.52; ty = height*0.51; break;
    }
    inner += '<text text-anchor="' + anchor + '"';
    inner += ' font-family="' + fontinfo.name + ', Courier, sans-serif"';
    inner += ' fill="' + fontinfo.color + '"';
    if("labelSpacing" in properties) {
      inner += ' letter-spacing="' + properties.labelSpacing + '"';
    }
    inner += ' font-size="' + thisFontsize.toFixed(2) + 'px"';
    if("labelRotate" in properties || "labelX" in properties || "labelY" in properties) {
      inner += ' transform="';
      if("labelRotate" in properties) {
        inner += ' rotate(' + (properties.labelRotate + rotateAdj) + ' ' + widthd2 + ' ' + heightd2 + ')';
      }
      let xoff = ("labelX" in properties) ? (properties.labelX + xAdj) : xAdj;
      let yoff = ("labelY" in properties) ? (properties.labelY + yAdj) : yAdj;
      inner += ' translate(' + xoff + ' ' + yoff + ')"';
    }
    if(!useArc) {
      let ny = ty + i*fontsize;
      inner += ' x=' + tx + ' y=' + ny;
    }
    inner += '>';
    if(useArc) {
      inner += '<textPath href="#arcpath' + i + id + '" startOffset="50%">' + segmentLabel + '</textPath></text>';
    } else {
      inner += segmentLabel + '</text>';
    }
  }
  textLabel.innerHTML = inner;
  return textLabel;
}

function getFeatureLabel(feature) {
  if("noLabel" in feature.properties && feature.properties.noLabel) {
    return ""
  } else if("noLabel" in feature.style && feature.style.noLabel) {
    return ""
  } else if("entity2name" in feature.properties) {
    return feature.properties.entity2name;
  } else {
    return feature.properties.entity1name;
  }
}

function getFeatureFont(feature, useHiFont) {
  // default styles
  let fontname   = 'sans serif';
  let fontscale  = 80;
  let fontcolor  = "black";

  if("style" in feature) {
    // scale the font based upon the family, since some are wider than others
    switch(feature.style.fontname) {
      case 'Rubik':                fontscale = 81; break;
      case 'Rubik Wet Paint':      fontscale = 81; break;
      case 'Cabin Sketch':         fontscale = 87; break;
      case 'Corben':               fontscale = 77; break;
      case 'New Tegomin':          fontscale = 84; break;
      case 'Special Elite':        fontscale = 81; break;
      case 'Fredericka the Great': fontscale = 81; break;
      case 'Rye':                  fontscale = 73; break;
      case 'Akaya Telivigala':     fontscale = 94; break;
      case 'MedievalSharp':        fontscale = 85; break;
      case 'Lugrasimo':            fontscale = 69; break;
      case 'Benne':                fontscale = 91; break;
    }
    return {
      name:  feature.style.fontname,
      scale: useHiFont ? (fontscale*1.05) : fontscale,
      color: useHiFont ? feature.style.hifontcolor : feature.style.fontcolor
    };
  } else {
    return {
      name:  fontname,
      scale: fontscale,
      color: fontcolor
    };
  }
}

function onEachFeature(feature, layer) {
  layer.on({
    mouseover: infoboxFeatureOn,
    mouseout:  infoboxFeatureOff,
    mousedown: lowerZ
  });

  let labelBounds;
  let isPoint = feature.geometry.type === "Point";

  if (isPoint) {
    // create icon for Point, and create label bounds
    let coords = feature.geometry.coordinates;
    let plon = coords[0];
    let plat = coords[1];
    let iconSize = 0.05;  // arbitraty size of icon, 0.05 degrees
    let bboxSize = 1.0;   // arbitraty size of label bounding box, 1 degree

    // allow the icon and label box to be scaled
    if("iconScale" in feature.properties) {
      iconSize = iconSize * feature.properties.iconScale;
      bboxSize = bboxSize * feature.properties.iconScale;
    }

    let iconElementBounds = [ [ plat+iconSize/2, plon-iconSize/2 ], [ plat-iconSize/2, plon+iconSize/2 ] ];
    let poiType = "poi";
    let fillColor = "#c0c0ff";

    // other available icon images
    if(feature.properties.entity1type === 'settlement'  ||
       feature.properties.entity1type === 'archaeology' ||
       feature.properties.entity1type === 'diamond'     ||
       feature.properties.entity1type === 'battle'      ||
       feature.properties.entity1type === 'camp') {
      poiType = feature.properties.entity1type;
    }
    // if POI is in entity2, use the poi file as input, then modify
    // the fill color to inherit from entity1
    if(feature.properties.entity2type === 'settlement'  ||
       feature.properties.entity2type === 'archaeology' ||
       feature.properties.entity2type === 'diamond'     ||
       feature.properties.entity2type === 'battle'      ||
       feature.properties.entity2type === 'camp'        ||
       feature.properties.entity2type === 'poi') {
      poiType = feature.properties.entity2type;
      if("style" in feature) {
        fillColor = feature.style.fillColor;
      }
    }

    // Author's note: I can't find a way to do this via the preferred SVG file
    // manipulation method. So instead we're adding color via a more cumbersom
    // direct SVG creation. The file inclusion method is left here for
    // a brief period in case I can find the better way.
//  let iconFile = 'poi_' + poiType + '.svg';
//  feature.iconOverlay = L.imageOverlay(iconFile, iconElementBounds, { zIndex: 300 });

    let poiElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    poiElement.setAttribute('xmlns',   "http://www.w3.org/2000/svg");
    poiElement.setAttribute('width',   40);
    poiElement.setAttribute('height',  40);
    poiElement.setAttribute('viewBox', "0 0 40 40");
    let poiInner = '<path d="';
    if(poiType === 'settlement') {
      poiInner += "M 20,30 A 10,10 0 0 0 20,10 10,10 0 0 0 20,30 z\n";
      poiInner += "M 20,13\n";
      poiInner += "L 27,20 L 25,20 L 25,26 L 21.5,26 L 21.5,23 L 18.5,23\n";
      poiInner += "L 18.5,26 L 15,26 L 15,20 L 13,20 z";
    } else if(poiType === 'archaeology') {
      poiInner += "M   20,30   A  10,10  0 0 0   20,10   10,10   0 0 0   20,30   z\n";
      poiInner += "M   20,18.5 A 3.5,3.5 0 1 1   20,11.5 3.5,3.5 0 1 1   20,18.5 z\n";
      poiInner += "M 15.7,26   A 3.5,3.5 0 1 1 15.7,19   3.5,3.5 0 1 1 15.7,26   z\n";
      poiInner += "M 24.3,26   A 3.5,3.5 0 1 1 24.3,19   3.5,3.5 0 1 1 24.3,26   z";
    } else if(poiType === 'diamond') {
      poiInner += "M 20,30 A 10,10 0 0 0 20,10 10,10 0 0 0 20,30 z\n";
      poiInner += "M 20,13\n";
      poiInner += "L 27,20 L 20,27 L 13,20 z";
    } else if(poiType === 'battle') {
      poiInner += "M 20,30 A 10,10 0 0 0 20,10 10,10 0 0 0 20,30 z\n";
      poiInner += "M 20.0,17.2 L 22.8,14.3 L 25.7,14.3 L 25.7,17.2\n";
      poiInner += "L 22.8,20.0 L 23.5,20.7 L 22.8,21.4 L 24.2,22.8 L 25.7,22.8\n";
      poiInner += "L 26.4,23.5 L 25.7,24.2 L 26.4,25.0 L 25.0,26.4 L 24.2,25.7\n";
      poiInner += "L 23.5,26.4 L 22.8,25.7 L 22.8,24.2 L 21.4,22.8 L 20.7,23.5\n";
      poiInner += "L 20.0,22.8\n";
      poiInner += "L 19.3,23.5 L 18.6,22.8 L 17.2,24.2 L 17.2,25.7 L 16.5,26.4\n";
      poiInner += "L 15.8,25.7 L 15.1,26.4 L 13.6,25.0 L 14.3,24.2 L 13.6,23.5\n";
      poiInner += "L 14.3,22.8 L 15.8,22.8 L 17.2,21.4 L 16.5,20.7 L 17.2,20.0\n";
      poiInner += "L 14.3,17.2 L 14.3,14.3 L 17.2,14.3 z\n";
      poiInner += "M 24.2,15.8 L 18.6,21.4\n";
      poiInner += "M 15.8,15.8 L 21.4,21.4";
    } else if(poiType === 'camp') {
      poiInner += "M 20,30 A 10,10 0 0 0 20,10 10,10 0 0 0 20,30 z\n";
      poiInner += "M 19,12\n";
      poiInner += "L 28,24 L 28.5,24 L 11.5,24 L 12,24 L 21,12 L 20,13.3 z\n";
      poiInner += "M 20,18\n";
      poiInner += "L 24.5,24 L 15.5,24 L 20,18 z";
    } else {
      poiInner += "M 20,30 A 10,10 0 0 0 20,10 10,10 0 0 0 20,30 z\n";
      poiInner += "M 20,13\n";
      poiInner += "L 22.1,17.2 L 26.7,17.8 L 23.3,21.1 L 24.1,25.7 L 20.0,23.5\n";
      poiInner += "L 15.9,25.7 L 16.7,21.1 L 13.3,17.8 L 17.9,17.2 z";
    }
    poiInner += '" stroke-width="0.75" fill="' + fillColor + '" stroke = "black" />';
    poiElement.innerHTML = poiInner;
    feature.iconOverlay = L.svgOverlay(poiElement, iconElementBounds, { zIndex: 300 });

    // create bounding box for the label since a point has no bounds.
    // the bounds are arbitrary for Point since there is no default size.
    // just creating a "square" 1 degree high and wide centered around Point.

    labelBounds = L.latLngBounds([[plat+bboxSize/2, plon+bboxSize/2], [plat-bboxSize/2, plon-bboxSize/2]]);
  } else {
    labelBounds = layer.getBounds();
  }

  boundsHash[feature.id] = labelBounds;

  // create SVG for label
  feature.origBounds = labelBounds;
  feature.textLabel = getTextLabel(
    labelBounds,
    feature.id,
    getFeatureLabel(feature),
    isPoint,
    feature.properties,
    getFeatureFont(feature,false));

  let labelElementBounds = [ [ labelBounds.getNorth(), labelBounds.getWest() ], [ labelBounds.getSouth(), labelBounds.getEast() ] ];
  feature.textOverlay = L.svgOverlay(feature.textLabel, labelElementBounds);
}

function updateTextOverlay(feature, bounds, useHiFont, altProperties, ratio) {
  // create SVG for label
  let textLabel = getTextLabel(
    bounds,
    feature.id,
    getFeatureLabel(feature),
    false,
    feature.properties,
    getFeatureFont(feature,useHiFont),
    altProperties,
    ratio);

  let svgElementBounds = [ [ bounds.getNorth(), bounds.getWest() ], [ bounds.getSouth(), bounds.getEast() ] ];
  return L.svgOverlay(textLabel, svgElementBounds);
}

let datesOfInterest = [];

function uniqueDateSort(inArray) {
  if (inArray.length === 0) {
    return inArray;
  }
  let sortedArray = inArray.sort(function(a,b) { return a.getTime() - b.getTime(); });
  let returnArray = [ sortedArray[0] ];
  for (let i=1;i<sortedArray.length;i++) {
    if (sortedArray[i-1].toDateString() !== sortedArray[i].toDateString()) {
      returnArray.push(sortedArray[i]);
    }
  }
  return returnArray;
}

let polygonCount = 0;

function str2date(datestr,roundLate) {
  // if roundLate is true, we'll set it for the next day, then subtract
  // one second after completion.
  let yr,mo,dy;
  let stripBC = datestr.replace("BC",'');
  let isBC = (datestr === stripBC) ? false : true;
  let info = stripBC.split(':');
  // if datestr only contained one member (year), consider it 1st day of the year,
  // either next year (if roundLate) or this.
  // if only contains two (year, month), consider it 1st day of month,
  // either next month (if roundLate) or this.
  if(info.length==3) {
    yr = info[0] * (isBC ? -1 : 1);
    mo = info[1]-1;
    dy = info[2];
  } else if(info.length==2) {
    yr = info[0] * (isBC ? -1 : 1);
    mo = info[1]-1;
    dy = 1;
    if(roundLate) {
      if(info[1] == 12) {
        mo = 0;
        yr++;
      } else {
        mo++;
      }
    }
  } else if(info.length==1) {
    yr = info[0] * (isBC ? -1 : 1);
    mo = 0;
    dy = 1;
    if(roundLate) {
      yr++;
    }
  } else {
    throw "bad date format for date: " + datestr;
  }
  let newdate = new Date(yr,mo,dy);
  newdate.setFullYear(yr);  // fixes "feature" for dates from 1-99
  if(roundLate) {
    if(info.length==3) {
      newdate.setDate(newdate.getDate());
    } else {
      newdate.setDate(newdate.getDate()-1);
    }
    newdate.setHours(23);
    newdate.setMinutes(59);
    newdate.setSeconds(59);
  }
  return newdate;
}

// Soft-fail lint: bad features are skipped so one mistake doesn't kill the map.
let geoLintErrors = [];

function recordGeoLintError(message) {
  let text = (typeof message === 'string') ? message :
    (message && message.message) ? message.message : String(message);
  geoLintErrors.push(text);
  console.error('[geo_lint] ' + text);
}

function showGeoLintWarnings() {
  if (geoLintErrors.length === 0) {
    return;
  }
  let el = document.querySelector('#geolintwarn');
  if (!el) {
    return;
  }
  el.hidden = false;
  let summary = document.querySelector('#geolintwarn-summary');
  let detail = document.querySelector('#geolintwarn-detail');
  if (summary) {
    summary.textContent = 'Skipped ' + geoLintErrors.length +
      ' data issue' + (geoLintErrors.length === 1 ? '' : 's') +
      ' so the map could still load. See console for the full log.';
  }
  if (detail) {
    detail.textContent = geoLintErrors.join('\n');
  }
}

function geo_lint(dataset, convertFromNativeLands, replaceIndigenous, applyCherokeeExample) {
  let id_set = new Set();
  let newFeatureList = [];
  if(dataset.type !== "FeatureCollection") {
    recordGeoLintError("expected dataset type === FeatureCollection, got " + dataset.type);
    dataset.features = [];
    return;
  }
  if("viewpoint" in dataset) {
    try {
      if("startdatestr" in dataset.viewpoint && !timelineDateMinOverride) {
        timelineDateMinOverride = str2date(dataset.viewpoint.startdatestr,false);
      }
      if("curdatestr" in dataset.viewpoint && timelineDateStart === timelineDateStartDefault) {
        timelineDateStart = str2date(dataset.viewpoint.curdatestr,false);
      }
      if("enddatestr" in dataset.viewpoint && !timelineDateMaxOverride) {
        timelineDateMaxOverride = str2date(dataset.viewpoint.enddatestr,true);
      }
    } catch (e) {
      recordGeoLintError("viewpoint date error: " + e);
    }
    if("defaultLat" in dataset.viewpoint && latSettingStart === latSettingDefault) {
      latSettingStart = dataset.viewpoint.defaultLat;
    }
    if("defaultLon" in dataset.viewpoint && lonSettingStart === lonSettingDefault) {
      lonSettingStart = dataset.viewpoint.defaultLon;
    }
    if("defaultZ" in dataset.viewpoint && zoomSettingStart === zoomSettingDefault) {
      zoomSettingStart = dataset.viewpoint.defaultZ;
    }
  }
  if("popups" in dataset) {
    for(let p of dataset.popups) {
      try {
        let pentry = {};
        pentry.text = p.text;
        pentry.startDate = str2date(p.startdatestr,false);
        pentry.endDate = str2date(p.enddatestr,false);
        pentry.coordinates = p.coordinates;
        pentry.done = false;
        pentry.popup = null;
        if("style" in p) {
          pentry.style = p.style;
        }
        popupList.push(pentry);
      } catch (e) {
        recordGeoLintError("popup error: " + e);
      }
    }
  }
  ohmap.setView([latSettingStart, lonSettingStart],zoomSettingStart);
  if(!("features" in dataset)) {
    recordGeoLintError("no features in dataset");
    dataset.features = [];
    return;
  }
  for(let f of dataset.features) {
    let acceptedId = null;
    try {
      let removeFeature = false;
      if(f.type !== "Feature") {
        throw "feature type not Feature, got " + f.type;
      }
      if(id_set.has(f.id)) {
        throw "got duplicate dataset ID " + f.id;
      }
      id_set.add(f.id);
      acceptedId = f.id;
      fHash[f.id] = f;
      if(!("geometry" in f)) {
        throw "no geometry in feature " + f.id;
      }
      let g = f.geometry;
      if((g.type !== "Polygon") && (g.type !== "MultiPolygon") && (g.type !== "Point") && (g.type !== "LineString")) {
        throw "feature " + f.id + " should have geometry of Polygon, MultiPolygon, LineString or Point, got " + g.type;
      }
      if("properties" in f) {
        let p = f.properties;
        if(convertFromNativeLands) {
          // make sure the feature lands in NA. NOTE this is clearly intended for
          // adding to the NA database and not others, but this can be extended
          // and formalized when other databases are considered.
          // make sure this feature is in North America before adding
          let bounds = L.polygon(f.geometry.coordinates).getBounds();
          // roughly compare against Panama in the south (7N) and Greenland on the east (21W)
          // geoJson has order [lon,lat] so oddly this flips the definitions of south and east
          let boundsE = bounds.getSouth();
          let boundsW = bounds.getNorth();
          let boundsS = bounds.getWest();
          let boundsN = bounds.getEast();
          let is_na = (boundsE <= -21) && (boundsS >= 7);
          // there are still some in NW South America, clip those too
          if(is_na && (boundsN < 12.68) && (boundsW > -77)) {
            is_na = false;
          }
          if(is_na) {
            // convert the format from nativelands.ca into extended GeoJSON format
            for(let required of ["Name", "color"]) {
              if(!(required in p)) {
                throw "feature " + f.id + " missing property " + required;
              }
            }
            p.entity1type = "nation";
            p.entity1name = "Indigenous";
            p.entity2type = "tribe";
            // for larger labels, put a carriage return for each parenthetical
            p.entity2name = p.Name.replace(/ \(/g,'\n(');
            p.fidelity = 4;
            p.startdatestr = "700";   // arbitrary, and to be rectified with more research
            p.enddatestr   = "1768";  // arbitrary, and to be rectified with more research
            p.startDate = str2date(p.startdatestr,false);
            p.endDate = str2date(p.enddatestr,true);
            if("description" in p) {
              p.source = p.description;
            }
          } else {
            removeFeature = true;
          }
        } else {
          for(let required of ["entity1type", "entity1name", "fidelity",
              "startdatestr", "enddatestr"]) {
            if(!(required in p)) {
              throw "feature " + f.id + " missing property " + required;
            }
          }
          if(!("source" in p) && !("sources" in p)) {
            throw "feature " + f.id + " requires either `source` or `sources` property";
          }
          p.startDate = str2date(p.startdatestr,false);
          if(p.enddatestr == 'present') {
            p.endDate = today;
          } else {
            p.endDate = str2date(p.enddatestr,true);
          }
          let fid = p.fidelity;
          if(fid < 1 || fid > 5) {
            throw "fidelity for " + f.id + " should be between 1 (lowest) and 5 (highest), got " + fid;
          }
          // if nativelands.ca is used, don't add homegrown indigenous
          if(replaceIndigenous && p.entity1name === 'Indigenous') {
            removeFeature = true;
          }
          if(applyCherokeeExample && p.entity1name === 'Indigenous') {
            removeFeature = true;
          }
          if(!applyCherokeeExample && p.entity1type === 'tribe' && p.entity1name.match(/Cherokee/)) {
            removeFeature = true;
          }
          if("coordinate_copy" in f.geometry) {
            if(f.geometry.coordinate_copy in fHash) {
              if(f.geometry.coordinate_copy === f.id) {
                throw "can't copy coordinates from self (id " + f.id + ")";
              } else if(fHash[f.geometry.coordinate_copy].geometry.type === f.geometry.type) {
                f.geometry.coordinates = fHash[f.geometry.coordinate_copy].geometry.coordinates;
              } else {
                throw "can't copy coordinates from " + f.geometry.coordinate_copy + " type " +
                  fHash[f.geometry.coordinate_copy].geometry.type + " to " + f.id + " type " + f.geometry.type;
              }
            } else {
              throw "can't copy coordinates from " + f.geometry.coordinate_copy + " for " + f.id;
            }
          }
          if("coordinate_copies" in f.geometry) {
            f.geometry.coordinates = [];
            for(let copyid of f.geometry.coordinate_copies) {
              if(copyid in fHash) {
                if(f.geometry.type !== 'MultiPolygon') {
                  throw "can't copy multiple coordinates to " + f.id + " type " + f.geometry.type;
                } else if(fHash[copyid].geometry.type === 'Polygon') {
                  f.geometry.coordinates.push(fHash[copyid].geometry.coordinates);
                } else if(fHash[copyid].geometry.type === 'MultiPolygon') {
                  for(let c=0;c<fHash[copyid].geometry.coordinates.length;c++) {
                    f.geometry.coordinates.push(fHash[copyid].geometry.coordinates[c]);
                  }
                } else {
                  throw "can't copy coordinates from " + copyid + " type " + fHash[copyid].geometry.type;
                }
              } else {
                throw "can't copy coordinates from " + copyid + " for " + f.id;
              }
            }
          }
        }
      } else {
        throw "no properties in feature " + f.id;
      }
      // capture the style from the style list.
      // apply styles as matching in order, starting with default
      // be careful to not override given styles, so hold those and
      // reapply at the end
      if(convertFromNativeLands) {
        f.style = {};
        f.style.strokeColor = f.properties.color;
        f.style.fillColor = f.properties.color;
        f.style.strokeDash = 1;
        f.style.strokeOn = true;
        f.style.strokeOpacity = 1;
        f.style.strokeWeight = 0.5;
        f.style.fontname = "New Tegomin";
        f.style.fontcolor = "#105010";
        f.style.fillOn = true;
        f.style.fillOpacity = 0.1;
        f.style.borderless = false;
        f.style.layerDepth = "default";
      } else if("styles" in dataset) {
        if("style" in f) {
          f.stylehold = f.style;
        }
        f.style = {};
        for(let s of dataset.styles) {
          if(s.type === "default" && "style" in s) {
            for(let e in s.style) {
              f.style[e] = s.style[e];
            }
          } else if(s.type === "match") {
            for(let m in s.match) {
              let v = s.match[m];
              // geometry type is special, rest are for properties
              if(m === "geometryType") {
                if(f.geometry.type === v) {
                  for(let e in s.style) {
                    f.style[e] = s.style[e];
                  }
                }
              } else {
                let match = 1;
                for(let m in s.match) {
                  let v = s.match[m];
                  if(f.properties[m] !== v) {
                    match = 0;
                  }
                }
                if(match) {
                  for(let e in s.style) {
                    f.style[e] = s.style[e];
                  }
                  if("emblem" in s) {
                    f.emblem = s.emblem;
                  }
                }
              }
            }
          }
        }
      }
      if("stylehold" in f) {
        for(let e in f.stylehold) {
          f.style[e] = f.stylehold[e];
        }
      }
      // go through potential period data structures
      if("periods" in dataset) {
        for(let p of dataset.periods) {
          let match = 1;
          for(let m in p.match) {
            let v = p.match[m];
            if(f.properties[m] !== v) {
              match = 0;
            }
          }
          if(match) {
            f.periodList = p.periods;
          }
        }
      }
      if(!removeFeature) {
        timelineDateMinDefault = dateMin(timelineDateMinDefault, f.properties.endDate);
        timelineDateMaxDefault = dateMax(timelineDateMaxDefault, f.properties.startDate);
        datesOfInterest.push(f.properties.startDate);
        polygonCount += 1;
        if("animateTo" in f.properties) {
          animationHash[f.id] = f.properties.animateTo;
        }
        newFeatureList.push(f);
      }
    } catch (e) {
      recordGeoLintError(e);
      // Only roll back state committed for this feature (not a prior owner of the same id).
      if (acceptedId !== null) {
        id_set.delete(acceptedId);
        delete fHash[acceptedId];
        delete animationHash[acceptedId];
      }
    }
  }
  dataset.features = newFeatureList;
}

// prepare animations by keeping track of which coordinates change
// to reduce compute time

function prepare_animations() {
  for(let id_from of Object.keys(animationHash)) {
    try {
      if(!(id_from in fHash)) {
        throw "can't find animate-from id " + id_from + " in fHash";
      }
      let fromF = fHash[id_from];
      if(!(animationHash[id_from] in fHash)) {
        throw "can't find animate-to id " + animationHash[id_from] + " in fHash";
      }
      // find the list of differing coordinates
      let destF = fHash[animationHash[id_from]];
      if(fromF.geometry.type === 'MultiPolygon') {
        let fromLen = fromF.geometry.coordinates.length;
        let destLen = destF.geometry.coordinates.length;
        let maxPoly = fromLen < destLen ? fromLen : destLen;
        fromF.pairDiffs = [];
        for(let outer=0;outer<maxPoly;outer++) {
          let fromC = fromF.geometry.coordinates[outer][0];
          let destC = destF.geometry.coordinates[outer][0];
          if (fromC.length != destC.length) {
            throw "can't animate from " + id_from + " to " + animationHash[id_from] + " since coordinate lengths differ (" + fromC.length + " vs " + destC.length + ") for polygon " + outer;
          }
          fromF.pairDiffs[outer] = [];
          for(let i in fromC) {
            if(fromC[i][0] !== destC[i][0] || fromC[i][1] !== destC[i][1]) {
              fromF.pairDiffs[outer].push(i);
            }
          }
        }
      } else if(fromF.geometry.type === 'Polygon') {
        let fromC, destC;
        if("coordinates" in fromF.geometry) {
          fromC = fromF.geometry.coordinates[0];
        } else {
          throw "can't animate from " + id_from + " to " + animationHash[id_from] + " since no coordinates for " + id_from;
        }
        if("coordinates" in destF.geometry) {
          if (!destF.geometry.coordinates) {
            throw "can't animate from " + id_from + " to " + animationHash[id_from] + " since no coordinates for " + animationHash[id_from];
          }
          destC = destF.geometry.coordinates[0];
        } else {
          throw "can't animate from " + id_from + " to " + animationHash[id_from] + " since no coordinates for " + animationHash[id_from];
        }
        if (fromC.length != destC.length) {
          throw "can't animate from " + id_from + " to " + animationHash[id_from] + " since coordinate lengths differ (" + fromC.length + " vs " + destC.length + ")";
        }
        fromF.pairDiffs = [];
        for(let i in fromC) {
          if(fromC[i][0] !== destC[i][0] || fromC[i][1] !== destC[i][1]) {
            fromF.pairDiffs.push(i);
          }
        }
      } else if(fromF.geometry.type === 'LineString') {
        let fromC = fromF.geometry.coordinates;
        let destC = destF.geometry.coordinates;
        // figure out the animation length, ie. the length of new
        // line that must be grown. this isn't precise - it should
        // take into consideration the latitude - but should be
        // close enough for decent animation
        fromF.animLength = 0;
        for(let i=fromC.length;i<destC.length;i++) {
          fromF.animLength += distComp(destC[i-1],destC[i]);
        }
        if(destC.length < (fromC.length)) {
          throw "for now can only animate from " + id_from + " to " + animationHash[id_from] + " if length is same or growing, got (" + fromC.length + " vs " + destC.length + ")";
        }
      }
    } catch (e) {
      recordGeoLintError(e);
      // Keep the feature as a static shape; drop the broken animation link.
      delete animationHash[id_from];
      if (id_from in fHash && fHash[id_from].properties) {
        delete fHash[id_from].properties.animateTo;
      }
    }
  }
}

function distComp(ptA, ptB) {
  return Math.sqrt(((ptA[0]-ptB[0])**2)+((ptA[1]-ptB[1])**2));
}

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

function featureStyle(feature) {
  // default styles
  let strokeOn      = true;       // hides feature boundaries if false
  let strokeOpacity = 1.0;
  let strokeColor   = 'white';
  let strokeWeight  = 2.0;
  let strokeDash    = '3';
  let fillOn        = true;
  let fillColor     = '#c0c0c0';
  let fidelity      = feature.properties.fidelity;
  let fillOpacity   = 0.2 + fidelity/10;

  // returning all style contents even if default, just to have as reference
  // (see https://leafletjs.com/reference-1.7.1.html#path-option)
  if("style" in feature) {
    return {
      stroke:       feature.style.strokeOn,
      opacity:      feature.style.strokeOpacity,
      color:        feature.style.strokeColor,
      weight:       feature.style.strokeWeight,
      dashArray:    feature.style.strokeDash,
      fill:         feature.style.fillOn,
      fillOpacity:  feature.style.fillOpacity,
      fillColor:    feature.style.fillColor
    };
  } else {
    return {
      stroke:       strokeOn,
      opacity:      strokeOpacity,
      color:        strokeColor,
      weight:       strokeWeight,
      dashArray:    strokeDash,
      fill:         fillOn,
      fillOpacity:  fillOpacity,
      fillColor:    fillColor
    };
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

function cToHex(c) {
  let hex = c.toString(16);
  return hex.length == 1 ? "0" + hex : hex;
}

function str2RGB(colorStr) {
  // Defensive: animated style interpolation can see missing colors when a
  // feature is temporarily shown outside its date range during a DOI walk.
  if (typeof colorStr !== 'string') {
    return [192, 192, 192];
  }
  let test = /^#?([a-f\d]{8})$/;  // 4-field color
  let match = colorStr.match(test);
  if(match !== null) {
    let parseResult = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(colorStr);
    if (parseResult === null) {
      return [192, 192, 192];
    }
    let rgb = [];
    rgb[0] = parseInt(parseResult[1], 16);
    rgb[1] = parseInt(parseResult[2], 16);
    rgb[2] = parseInt(parseResult[3], 16);
    rgb[3] = parseInt(parseResult[4], 16);
    return rgb;
  } else {
    let parseResult = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(colorStr);
    if (parseResult === null) {
      return [192, 192, 192];
    }
    let rgb = [];
    rgb[0] = parseInt(parseResult[1], 16);
    rgb[1] = parseInt(parseResult[2], 16);
    rgb[2] = parseInt(parseResult[3], 16);
    return rgb;
  }
}

function interpolateFloat(ratio, floatFrom, floatTo) {
  return (floatTo-floatFrom)*ratio + floatFrom;
}

function interpolateColor(ratio, colorFrom, colorTo) {
  let rgbFrom = str2RGB(colorFrom);
  let rgbTo   = str2RGB(colorTo);
  if (rgbFrom.length === 3 && rgbTo.length === 3) {
    let rNew = parseInt(interpolateFloat(ratio, rgbFrom[0], rgbTo[0]));
    let gNew = parseInt(interpolateFloat(ratio, rgbFrom[1], rgbTo[1]));
    let bNew = parseInt(interpolateFloat(ratio, rgbFrom[2], rgbTo[2]));
    return "#" + cToHex(rNew) + cToHex(gNew) + cToHex(bNew);
  } else {
    let rNew = parseInt(interpolateFloat(ratio, rgbFrom[0], rgbTo[0]));
    let gNew = parseInt(interpolateFloat(ratio, rgbFrom[1], rgbTo[1]));
    let bNew = parseInt(interpolateFloat(ratio, rgbFrom[2], rgbTo[2]));
    let oFrom = (rgbFrom.length === 3) ? 255 : rgbFrom[3];
    let oTo   = (  rgbTo.length === 3) ? 255 :   rgbTo[3];
    let oNew = parseInt(interpolateFloat(ratio, oFrom, oTo));
    return "#" + cToHex(rNew) + cToHex(gNew) + cToHex(bNew) + cToHex(oNew);
  }
}

function removeFeatureFromMap(lyr) {
  lyr.removeFrom(ohmap);
  if (lyr.feature.geometry.type === "Point") {
    lyr.feature.iconOverlay.removeFrom(ohmap);
  }
  lyr.feature.textOverlay.removeFrom(ohmap);
  delete lyr.feature._lastLabelTimeRatio;
}

function addFeatureToMap(lyr) {
  lyr.addTo(ohmap);
  if (lyr.feature.geometry.type === "Point") {
    lyr.feature.iconOverlay.addTo(ohmap);
  }
  lyr.feature.textOverlay.addTo(ohmap);
}

// Morph an animateTo feature in place for curDate. Returns timeRatio.
function morphAnimatedLayer(lyr) {
  let prop = lyr.feature.properties;
  let fromC = lyr.feature.geometry.coordinates;
  let destC = fHash[prop.animateTo].geometry.coordinates;
  let timeDiv = (fHash[prop.animateTo].properties.startDate.getTime() - prop.startDate.getTime())/(1000*60*60*24);
  let timeNum = (curDate.getTime() - prop.startDate.getTime())/(1000*60*60*24);
  let timeRatio = timeNum/timeDiv;
  // Clamp: DOI add/sub walks can briefly show a feature while curDate is far
  // outside its span (e.g. initial jump from "today" to a BC viewpoint).
  // Unclamped ratios produced insane styles (negative opacity) and crashes.
  if (!isFinite(timeRatio)) {
    timeRatio = 0;
  } else if (timeRatio < 0) {
    timeRatio = 0;
  } else if (timeRatio > 1) {
    timeRatio = 1;
  }
  if(lyr.feature.geometry.type === 'MultiPolygon') {
    for(let o in lyr.feature.pairDiffs) {
      for(let i of lyr.feature.pairDiffs[o]) {
        let newlat = interpolateFloat(timeRatio, fromC[o][0][i][1], destC[o][0][i][1]);
        let newlon = interpolateFloat(timeRatio, fromC[o][0][i][0], destC[o][0][i][0]);
        lyr._latlngs[o][0][i] = L.latLng(newlat,newlon);
      }
    }
  } else if(lyr.feature.geometry.type === 'Polygon') {
    for(let i of lyr.feature.pairDiffs) {
      let newlat = interpolateFloat(timeRatio, fromC[0][i][1], destC[0][i][1]);
      let newlon = interpolateFloat(timeRatio, fromC[0][i][0], destC[0][i][0]);
      lyr._latlngs[0][i] = L.latLng(newlat,newlon);
    }
  } else if(lyr.feature.geometry.type === 'LineString') {
    if(fromC.length == (destC.length-1)) { // interpolate the last entry
      let newlat = interpolateFloat(timeRatio, destC[destC.length-2][1], destC[destC.length-1][1]);
      let newlon = interpolateFloat(timeRatio, destC[destC.length-2][0], destC[destC.length-1][0]);
      lyr._latlngs[destC.length-1] = L.latLng(newlat,newlon);
    } else if(fromC.length != destC.length) {
      // need to walk through the paths and figure out where we are in the interpolation
      // from the end of fromC to destC
      lyr._latlngs = [];
      for(let i=0;i<fromC.length;i++) {
        lyr._latlngs[i] = L.latLng(destC[i][1],destC[i][0]);
      }
      let sumLength = 0;
      for(let i=fromC.length;i<destC.length;i++) {
        let thisLength = distComp(destC[i-1],destC[i]);
        // if this segment still stays under time ratio, add it completely
        if((thisLength+sumLength) < (timeRatio*lyr.feature.animLength)) {
          lyr._latlngs[i] = L.latLng(destC[i][1],destC[i][0]);
        // else if this segment crosses over the time ratio, interpolate it
        } else if(sumLength < (timeRatio*lyr.feature.animLength)) {
          let startRatio = sumLength / lyr.feature.animLength;
          let endRatio = (sumLength+thisLength) / lyr.feature.animLength;
          let interpRatio = (timeRatio - startRatio) / (endRatio - startRatio);
          let newlat = interpolateFloat(interpRatio, destC[i-1][1], destC[i][1]);
          let newlon = interpolateFloat(interpRatio, destC[i-1][0], destC[i][0]);
          lyr._latlngs[i] = L.latLng(newlat,newlon);
        } // else don't add anything
        sumLength += thisLength;
      }
    }
  } else {
    throw "how do I animate a " + lyr.feature.geometry.type;
  }
  let resetStyle = false;
  if(!("origFillColor"     in prop)) prop.origFillColor     = lyr.feature.style.fillColor;
  if(!("origStrokeColor"   in prop)) prop.origStrokeColor   = lyr.feature.style.strokeColor;
  if(!("origFillOpacity"   in prop)) prop.origFillOpacity   = lyr.feature.style.fillOpacity;
  if(!("origStrokeOpacity" in prop)) prop.origStrokeOpacity = lyr.feature.style.strokeOpacity;
  if(!("origStrokeWeight"  in prop)) prop.origStrokeWeight  = lyr.feature.style.strokeWeight;
  if(!("origFontcolor"     in prop)) prop.origFontcolor     = lyr.feature.style.fontcolor;
  if(prop.origFillColor !== fHash[prop.animateTo].style.fillColor) {
    let newFillColor = interpolateColor(timeRatio, prop.origFillColor, fHash[prop.animateTo].style.fillColor);
    lyr.feature.style.fillColor = newFillColor;
    resetStyle = true;
  }
  if(prop.origStrokeColor !== fHash[prop.animateTo].style.strokeColor) {
    let newStrokeColor = interpolateColor(timeRatio, prop.origStrokeColor, fHash[prop.animateTo].style.strokeColor);
    lyr.feature.style.strokeColor = newStrokeColor;
    lyr.feature.style.color = newStrokeColor;
    resetStyle = true;
  }
  if(prop.origFillOpacity !== fHash[prop.animateTo].style.fillOpacity) {
    let newFillOpacity = interpolateFloat(timeRatio, prop.origFillOpacity, fHash[prop.animateTo].style.fillOpacity);
    lyr.feature.style.fillOpacity = newFillOpacity;
    resetStyle = true;
  }
  if(prop.origStrokeOpacity !== fHash[prop.animateTo].style.strokeOpacity) {
    let newStrokeOpacity = interpolateFloat(timeRatio, prop.origStrokeOpacity, fHash[prop.animateTo].style.strokeOpacity);
    lyr.feature.style.strokeOpacity = newStrokeOpacity;
    lyr.feature.style.opacity = newStrokeOpacity;
    resetStyle = true;
  }
  if(prop.origStrokeWeight !== fHash[prop.animateTo].style.strokeWeight) {
    let newStrokeWeight = interpolateFloat(timeRatio, prop.origStrokeWeight, fHash[prop.animateTo].style.strokeWeight);
    lyr.feature.style.strokeWeight = newStrokeWeight;
    lyr.feature.style.weight = newStrokeWeight;
    resetStyle = true;
  }
  if(prop.origFontcolor !== fHash[prop.animateTo].style.fontcolor) {
    let newFontcolor = interpolateColor(timeRatio, prop.origFontcolor, fHash[prop.animateTo].style.fontcolor);
    lyr.feature.style.fontcolor = newFontcolor;
    resetStyle = true;
  }
  if(resetStyle) {
    lyr.setStyle(lyr.feature.style);
  }
  // Push mutated latlngs into Leaflet without detach/reattach
  if (typeof lyr.setLatLngs === 'function') {
    lyr.setLatLngs(lyr._latlngs);
  } else if (typeof lyr.redraw === 'function') {
    lyr.redraw();
  }
  return timeRatio;
}

// Rebuild an animated feature's SVG label overlay. If the old overlay was on the
// map, the new one is put back; otherwise only the overlay object is replaced
// (caller may attach via addFeatureToMap). Static labels are left alone (Phase B).
function refreshAnimatedLabel(lyr, timeRatio, force) {
  let last = lyr.feature._lastLabelTimeRatio;
  if (!force && last !== undefined) {
    let atEnd = (timeRatio <= 0 || timeRatio >= 1);
    if (!atEnd && Math.abs(timeRatio - last) < animLabelRatioStep) {
      return false;
    }
    if (atEnd && last === timeRatio) {
      return false;
    }
  }
  let bounds = L.polygon(lyr._latlngs).getBounds();
  let wasOnMap = !!(lyr.feature.textOverlay && lyr.feature.textOverlay._map);
  if (wasOnMap) {
    lyr.feature.textOverlay.removeFrom(ohmap);
  }
  lyr.feature.textOverlay = updateTextOverlay(lyr.feature, bounds, false, fHash[lyr.feature.properties.animateTo].properties, timeRatio);
  if (wasOnMap) {
    lyr.feature.textOverlay.addTo(ohmap);
  }
  lyr.feature._lastLabelTimeRatio = timeRatio;
  return true;
}

// Largest DOI index with datesOfInterestSorted[i] <= date (or -1 if none).
function findDoiIndex(date) {
  let t = date.getTime();
  let lo = 0;
  let hi = datesOfInterestSorted.length - 1;
  let ans = -1;
  while (lo <= hi) {
    let mid = (lo + hi) >> 1;
    if (datesOfInterestSorted[mid].getTime() <= t) {
      ans = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return ans;
}

function hideFeatureById(id) {
  let lyr = layerById[id];
  if (!lyr) {
    return;
  }
  if (activeIds.has(id) || lyr._map) {
    removeFeatureFromMap(lyr);
  }
  activeIds.delete(id);
}

function showFeatureById(id) {
  let lyr = layerById[id];
  if (!lyr) {
    return;
  }
  let isAnimated = "animateTo" in lyr.feature.properties;
  let timeRatio;
  if (isAnimated) {
    timeRatio = morphAnimatedLayer(lyr);
    refreshAnimatedLabel(lyr, timeRatio, true);
  }
  if (!activeIds.has(id)) {
    addFeatureToMap(lyr);
    activeIds.add(id);
  }
}

function updateAnimatedActive() {
  for (let id of activeIds) {
    let lyr = layerById[id];
    if (lyr && "animateTo" in lyr.feature.properties) {
      let timeRatio = morphAnimatedLayer(lyr);
      refreshAnimatedLabel(lyr, timeRatio, false);
    }
  }
}

function applyLayerDepth() {
  allLayers = geojson._layers;
  for (let id of activeIds) {
    let lyr = layerById[id];
    if (!lyr) {
      continue;
    }
    let style = lyr.feature.style;
    if ("layerDepth" in style && style.layerDepth !== "default") {
      if (style.layerDepth === "front") {
        lyr.bringToFront();
      }
      if (style.layerDepth === "back") {
        lyr.bringToBack();
      }
    }
  }
}

// Make the map match idsPerDOISorted[doiIndex] exactly (first paint / large jumps).
function syncToDoiIndex(doiIndex) {
  let targetIds = new Set(
    (doiIndex >= 0 && doiIndex < idsPerDOISorted.length) ? idsPerDOISorted[doiIndex] : []
  );
  for (let id of [...activeIds]) {
    if (!targetIds.has(id)) {
      hideFeatureById(id);
    }
  }
  // First paint: GeoJSON starts fully on the map with activeIds empty
  for (let l in geojson._layers) {
    let lyr = geojson._layers[l];
    let id = lyr.feature.id;
    if (!targetIds.has(id) && lyr._map) {
      hideFeatureById(id);
    }
  }
  for (let id of targetIds) {
    if (activeIds.has(id)) {
      let lyr = layerById[id];
      if (lyr && "animateTo" in lyr.feature.properties) {
        let timeRatio = morphAnimatedLayer(lyr);
        refreshAnimatedLabel(lyr, timeRatio, false);
      }
    } else {
      showFeatureById(id);
    }
  }
}

geojson.evaluateLayers = function () {
  // Phase D: non-animated visibility follows DOI add/sub diffs.
  // Phase A/B still apply inside show/hide and animated updates.
  let doiIndex = findDoiIndex(curDate);
  // Large jumps (notably first paint at "today" then slider to a BC start)
  // are safer as a full sync: incremental undo briefly re-shows later
  // features and morphs them at the destination curDate.
  let jump = (lastDoiIndex < 0) ? Infinity : Math.abs(doiIndex - lastDoiIndex);
  if (lastDoiIndex < 0 || jump > 20) {
    syncToDoiIndex(doiIndex);
  } else if (doiIndex === lastDoiIndex) {
    updateAnimatedActive();
  } else if (doiIndex > lastDoiIndex) {
    for (let i = lastDoiIndex + 1; i <= doiIndex; i++) {
      for (let id of idSubsPerDOI[i]) {
        hideFeatureById(id);
      }
      for (let id of idAddsPerDOI[i]) {
        showFeatureById(id);
      }
    }
    updateAnimatedActive();
  } else {
    // Walk backward: undo adds/subs from lastDoiIndex down toward doiIndex
    for (let i = lastDoiIndex; i > Math.max(doiIndex, 0); i--) {
      for (let id of idAddsPerDOI[i]) {
        hideFeatureById(id);
      }
      for (let id of idSubsPerDOI[i]) {
        showFeatureById(id);
      }
    }
    if (doiIndex < 0) {
      // Before first DOI: nothing should remain visible
      for (let id of [...activeIds]) {
        hideFeatureById(id);
      }
    } else {
      updateAnimatedActive();
    }
  }
  lastDoiIndex = doiIndex;
  applyLayerDepth();
}

// First paint should match the study viewpoint / URL date, not "today".
// Otherwise evaluateLayers syncs to the present, then the slider jumps back
// across millennia and can abort mid-walk on animated features.
curDate.setTime(timelineDateStart.getTime());
geojson.evaluateLayers();

function fixInt(numstr, length) {
  return numstr.toLocaleString('en-US', {minimumIntegerDigits: length, useGrouping:false});
}

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
function updateHTML(spanName, value) {
  let spanHandle = document.querySelector('#' + spanName);
  spanHandle.textContent = value;
}

updateHTML('polycount', polygonCount);

// update the text forms that allow date modification to contain
// the initial start / current / end dates to begin with.
function updateForm(formName, value) {
  let formHandle = document.querySelector('#' + formName);
  formHandle.value = value;
}

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

function handleIPress() {
  if (infoPinned && (!lastFeature || (lastFeature.id == infoPinnedId))) {
    infoPinned = false;
    infobox._div.style.background = infoboxNormalBackground;
    if (lastFeature) {
      infobox.update(lastFeature.id,lastFeature.properties);
    } else {
      infobox.update();
    }
  } else if (lastFeature) {
    infoPinned = true;
    infoPinnedProperties = lastFeature.properties;
    infoPinnedId = lastFeature.id;
    infobox._div.style.background = infoboxPinnedBackground;
    infobox.update(lastFeature.id,lastFeature.properties);
  } else {
    infoPinnedProperties = undefined;
    infoPinnedId = undefined;
    infobox.update();
  }
}

// for number press, default to opening up a source, unless nothing highlighted
// in which case fall back to original meaning (setting the background layer)

function handleNumPress(val, layerstring) {
  let sources = [];
  if (lastFeature) {
    if("source" in lastFeature.properties) {
      sources = [lastFeature.properties.source];
    } else if("sources" in lastFeature.properties) {
      sources = lastFeature.properties.sources;
    }
  }
  if (val >= 1 && val <= sources.length) {
    // open up source # (val-1)
    let test = /^(\w+):(\w.+)$/;
    let tmatch = sources[val-1].match(test);
    if (tmatch !== null) {
      window.open(tmatch[2], "_blank");
    } else {
      window.open(sources[val-1], "_blank");
    }
    return false;
  }
  if (layerstring) {
    // if still here, fall back on setting the background
    backgroundLayerSetting = layerstring;
    return true;
  }
  return false;
}

// check keypress value to determine function.
function checkKeypress(e) {
  let backgroundUpdated = false;
  switch(e.originalEvent.key) {
    case '0': backgroundUpdated = handleNumPress(parseInt(e.originalEvent.key), 'relief');   break;
    case '1': backgroundUpdated = handleNumPress(parseInt(e.originalEvent.key), 'world');    break;
    case '2': backgroundUpdated = handleNumPress(parseInt(e.originalEvent.key), 'physical'); break;
    case '3': backgroundUpdated = handleNumPress(parseInt(e.originalEvent.key), 'white');    break;
    case '4': backgroundUpdated = handleNumPress(parseInt(e.originalEvent.key), 'stamen');   break;
    case '5': backgroundUpdated = handleNumPress(parseInt(e.originalEvent.key), 'positron'); break;
    case '6': backgroundUpdated = handleNumPress(parseInt(e.originalEvent.key), 'streets');  break;
    case '7': backgroundUpdated = handleNumPress(parseInt(e.originalEvent.key), 'paint');    break;
    case '7':
    case '8':
    case '9': backgroundUpdated = handleNumPress(parseInt(e.originalEvent.key), null); break;
    case 'a':
      timelineSlider.affectAdvance();
      break;
    case 'i': handleIPress(); break;
    case 'r':
      ohmap.setView([latSettingStart, lonSettingStart],zoomSettingStart);
      break;
    case 's':
      smartStepFeature = 1 - smartStepFeature;
      timelineSlider.updateButtons(smartStepFeature);
      updateDirectLink();
      break;
    case 'z':
      if(lastLayer) {
        ohmap.fitBounds(lastLayer.getBounds());
      }
      break;
    case '>':
    case '.':
      timelineSlider.affectStepF();
      break;
    case '<':
    case ',':
      timelineSlider.affectStepR();
      break;
  }
  if (backgroundUpdated) {
    if (!(backgroundLayerSetting in backgroundLayers)) {
      backgroundLayerSetting = backgroundLayerDefault;
    }
    lastBackgroundLayer.remove();
    lastBackgroundLayer = backgroundLayers[backgroundLayerSetting];
    lastBackgroundLayer.addTo(ohmap);
    ohmap.setMaxZoom(maxZoomPerBackground[backgroundLayerSetting]);
    updateDirectLink();
  }
}

function checkPopups() {
  // check for ones that need to be closed once age range is exited
  for(let p of popupList) {
    if(p.popup && p.popup.isOpen()) {
      if(!popupFeatureEnabled || !(curDate <= p.endDate && curDate >= p.startDate)) {
        ohmap.closePopup(p.popup);
      }
    }
  }

  if(popupFeatureEnabled) {
    for(let p of popupList) {
      let bounds = ohmap.getBounds();
      let ll = new L.latLng(p.coordinates[1], p.coordinates[0]);
      if(!p.done && curDate <= p.endDate && curDate >= p.startDate && bounds.contains(ll) && !p.popup) {
        p.popup = L.popup({
          maxWidth: 500,
          autoPan: false,
          autoClose: false}).
            setLatLng(ll).
            setContent('<div class="popup_class">' + p.text + '</div>').
            openOn(ohmap);
        p.done = true;
        // check for style override, else use default
        let background_ptr = document.getElementsByClassName('leaflet-popup-content-wrapper');
        let popup_ptr = document.getElementsByClassName('popup_class');
        if(!popupDefaultStyleFont) {
          let pp = popup_ptr[0];
          let popup_aptr = pp.getElementsByTagName('a')[0];
          let css_obj_popup = getComputedStyle(pp);
          let css_obj_background = getComputedStyle(background_ptr[0]);
          popupDefaultStyleFont = css_obj_popup.getPropertyValue('font-family');
          popupDefaultStyleFontSize = css_obj_popup.getPropertyValue('font-size');
          popupDefaultStyleFontColor = css_obj_popup.getPropertyValue('color');
          popupDefaultStyleFontAColor = getComputedStyle(popup_aptr).getPropertyValue('color');
          popupDefaultStyleBackgroundColor = css_obj_background.getPropertyValue('background-color');
        }
        if('style' in p) {
          for(let pp of popup_ptr) {
            if('fontname' in p.style) {
              pp.style['font-family'] = p.style.fontname;
            } else {
              pp.style['font-family'] = popupDefaultStyleFont;
            }
            if('fontsize' in p.style) {
              pp.style['font-size'] = p.style.fontsize;
            } else {
              pp.style['font-size'] = popupDefaultStyleFontSize;
            }
            if('fontcolor' in p.style) {
              pp.style['color'] = p.style.fontcolor;
            } else {
              pp.style['color'] = popupDefaultStyleFontColor;
            }
            let popup_aptr = pp.getElementsByTagName('a');
            for (let aelem of popup_aptr) {
              if('hifontcolor' in p.style) {
                aelem.style['color'] = p.style.hifontcolor;
              } else {
                aelem.style['color'] = popupDefaultStyleFontAColor;
              }
            }
          }
          for(let bptr of background_ptr) {
            if('fillColor' in p.style) {
              bptr.style['background-color'] = p.style.fillColor;
            } else {
              bptr.style['background-color'] = popupDefaultStyleBackgroundColor;
            }
          }
        }
      }
    }
  }
}

function checkMouseMove(e) {
  if((e.originalEvent.target == popupSelect._div) ||
     (e.originalEvent.target == popupSelect._div.firstChild) ||
     (e.originalEvent.target == popupSelect._div.lastChild)) {
    if(!popupSelectExpanded) {
      popupSelectExpanded = true;
      popupSelect.update();
    }
  } else if(popupSelectExpanded) {
    popupSelectExpanded = false;
    popupSelect.update();
  }
}

ohmap.on('keydown',   checkKeypress);
ohmap.on('moveend',   checkPopups);
ohmap.on('mousemove', checkMouseMove);

checkPopups();
