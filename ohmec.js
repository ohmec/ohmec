// Copyright OHMEC contributors.
// Licensed under the Apache License, Version 2.0, see LICENSE for details.
// SPDX-License-Identifier: Apache-2.0

// check for URL override

let parameters = location.search.substring(1).split("&");

let today = new Date();
let timelineDateStartDefault = new Date(1776,6,4);  // "interesting" start date, but arbitrary
let timelineDateStart = timelineDateStartDefault;
let timelineDateMinDefault = today;                 // these are the calculated min/max times of interest
let timelineDateMaxDefault = new Date(1,0,1);
let timelineDateMinOverride;                        // these allow the database to change timeline range
let timelineDateMaxOverride;                        // unless provided in the URL override parameters

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
let zoomSettingStart = 4.5;

let boundsHash = {};
let smartStepDefault = 1;
let smartStepFeature = smartStepDefault;

let timelineSlider;
let backgroundLayerDefault = 'relief';
let backgroundLayerSetting = backgroundLayerDefault;
let backgroundLayers = {};
let maxZoomPerBackground = {};
let lastBackgroundLayer;
let lastLayer;
let lastFeature = null;

let infoboxNormalBackground = "rgba(4,112,255,0.7)";
let infoboxPinnedBackground = "rgba(4, 64,160,0.7)";

let infoPinned = false;
let animationHash = {};
let fHash = {};
let useEurope = false;

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
  test = /background=(relief|stamen|paint|streets|physical|world|white)/;
  match = param.match(test);
  if (match !== null) {
    backgroundLayerSetting = match[1];
  }
  test = /easter/;
  match = param.match(test);
  if (match !== null) {
    timelineDateMinOverride = str2date('15000BC',false);
    timelineDateMaxOverride = str2date( '6000BC',true);
    timelineDateStart       = str2date('14500BC',false);
    latSettingStart = 48;
    lonSettingStart =  3;
    zoomSettingStart = 4;
    useEurope = true;
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
  let absYear = (year < 0) ? -1*year : year;
  return fixInt(absYear,4) + slash +
         fixInt(dateInput.getMonth()+1,2) + slash +
         fixInt(dateInput.getDate(),2) +
         ((year < 0) ? 'BC' : '');
}

let updateDirectLink = function() {
  let hrefText = location.href;
  let splits = hrefText.split('?');
  let latlon = ohmap.getCenter();
  let conjoin = '?';
  let urlText = splits[0];
  if(timelineDateMinOverride) {
    urlText += conjoin +
      'startdatestr='  + dateStr(timelineDateMinOverride,':');
    conjoin = '&';
  }
  if(timelineDateMaxOverride) {
    urlText += conjoin +
       'enddatestr='   + dateStr(timelineDateMaxOverride,':');
    conjoin = '&';
  }
  urlText += conjoin +
    'curdatestr='    + dateStr(curDate,':') +
    '&lat='          + parseFloat(latlon.lat).toFixed(2) +
    '&lon='          + parseFloat(latlon.lng).toFixed(2) +
    '&z='            + parseFloat(ohmap.getZoom()).toFixed(1);
  if(smartStepFeature != smartStepDefault) {
    urlText += '&smartstep=' + (smartStepFeature ? 'on' : 'off');
  }
  if(backgroundLayerSetting !== backgroundLayerDefault) {
    urlText += '&background=' + backgroundLayerSetting;
  }
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

function addBackgroundLayer(name, access, maxZoom, attribution) {
  let maxZoomSetting = (maxZoom > zoomSettingMax) ? zoomSettingMax : maxZoom;
  backgroundLayers[name] = L.tileLayer(access, {
    maxZoom:     maxZoomSetting,
    attribution: attribution,
    tileSize:    512,
    zoomOffset:  -1
  });
  maxZoomPerBackground[name] = maxZoomSetting;
}

let ohmec_mapbox_token = 'pk.eyJ1Ijoic2pjdXBlcnRpbm8iLCJhIjoiY2trM2M2c3V4MTVqbjJwcWRtbG5xYzBuNCJ9.U9HinfthlYYG9oznaMUK3A';

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

addBackgroundLayer(
  'stamen',
  'https://stamen-tiles-{s}.a.ssl.fastly.net/terrain-background/{z}/{x}/{y}{r}.png',
	18,
  'Historical data OHMEC contributors | Tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>',
);

addBackgroundLayer(
  'streets',
  'https://api.mapbox.com/styles/v1/mapbox/light-v9/tiles/{z}/{x}/{y}?access_token=' + ohmec_mapbox_token,
  18,
  'Historical data OHMEC contributors | Tile imagery &copy; <a href="https://www.mapbox.com/">Mapbox</a>'
);

addBackgroundLayer(
  'paint',
  'https://stamen-tiles-{s}.a.ssl.fastly.net/watercolor/{z}/{x}/{y}.jpg',
  16,
  'Historical data OHMEC contributors | Map tiles by <a href="http://stamen.com">Stamen Design</a>, <a href="http://creativecommons.org/licenses/by/3.0">CC BY 3.0</a>'
);

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
  if (prop) {
    this._div.innerHTML = '<b>' + prop.entity1type  + '</b>: ' + prop.entity1name + '<br/>';
    if("entity2type" in prop) {
      this._div.innerHTML += '<b>' + prop.entity2type + '</b>: ' + prop.entity2name + '<br/>';
    }
    this._div.innerHTML += prop.startdatestr + ' - ' + prop.enddatestr  + '<br/>';
    if("source" in prop) {
      this._div.innerHTML += '<a href="' + prop.source + '" target="_blank">source</a><br/>';
    } else if("sources" in prop) {
      for (let i=0;i<prop.sources.length;i++) {
        this._div.innerHTML += '<a href="' + prop.sources[i] + '" target="_blank">source ' + (i+1) + '</a><br/>';
      }
    }
    this._div.innerHTML += '<b>id:</b>' + id;
  } else {
    this._div.innerHTML = '<b>Feature Information</b>';
  }
};

infobox.addTo(ohmap);

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
    let opacity = (layer.feature.properties.borderless) ? 0.0 : 0.7;
    layer.setStyle({
      weight: 5,
      color: '#666',
      dashArray: '',
      fillOpacity: opacity
    });

    if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
      layer.bringToFront();
    }
  }
  lastFeature = layer.feature;
  lastLayer = layer;

  if (infoPinned && (infoPinnedId == layer.feature.id)) {
    infobox._div.style.background = infoboxPinnedBackground;
  } else {
    infobox._div.style.background = infoboxNormalBackground;
  }
  infobox.update(layer.feature.id,layer.feature.properties);
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
  let height = width * (bounds.getNorth() - bounds.getSouth()) / (bounds.getEast() - bounds.getWest());
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
  if(segments.length > 1) {
    labelLength = segments[0].length;
    for(let i=1; i<segments.length; i++) {
      if(segments[i].length > labelLength) {
        labelLength = segments[i].length;
      }
    }
  }

  let fontsize = isPoint ? fontinfo.scale/25 : fontinfo.scale/labelLength;
  fontsize *= labelScale;

  let inner = '';
  for(let i=0; i<segments.length; i++) {
    let segmentLabel = segments[i];
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
    inner += ' font-size="' + fontsize.toFixed(2) + 'px"';
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
    let iconFile = 'poi_poi.svg';

    // other available icon images
    if(feature.properties.entity1type === 'settlement'  ||
       feature.properties.entity1type === 'archaeology' ||
       feature.properties.entity1type === 'battle') {
      iconFile = 'poi_' + feature.properties.entity1type + '.svg';
    }

    let iconElementBounds = [ [ plat+iconSize/2, plon-iconSize/2 ], [ plat-iconSize/2, plon+iconSize/2 ] ];
    feature.iconOverlay = L.imageOverlay(iconFile, iconElementBounds, { zIndex: 300 });

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
    getFeatureFont(feature));

  let labelElementBounds = [ [ labelBounds.getNorth(), labelBounds.getWest() ], [ labelBounds.getSouth(), labelBounds.getEast() ] ];
  feature.textOverlay = L.svgOverlay(feature.textLabel, labelElementBounds);
}

function updateTextOverlay(feature, bounds, altProperties, ratio) {
  // create SVG for label
  let textLabel = getTextLabel(
    bounds,
    feature.id, 
    getFeatureLabel(feature),
    false,
    feature.properties,
    getFeatureFont(feature),
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
  let yr,mo,dy;
  let subtract = false;
  let stripBC = datestr.replace("BC",'');
  let isBC = (datestr === stripBC) ? false : true;
  let info = stripBC.split(':');
  // if datestr only contained one member (year), consider it 1st or last day of the year
  // if only contains two (year, month), consider it 1st or last day of month
  if(info.length==3) {
    yr = info[0] * (isBC ? -1 : 1);
    mo = info[1]-1;
    dy = info[2];
  } else if(info.length==2) {
    yr = info[0] * (isBC ? -1 : 1);
    mo = roundLate ? info[1] : (info[1]-1);
    dy = 1;
    subtract = roundLate;
  } else if(info.length==1) {
    yr = info[0] * (isBC ? -1 : 1);
    mo = roundLate ? 11 : 0;
    dy = roundLate ? 31 : 1;
  } else {
    throw "bad date format for date: " + datestr;
  }
  let newdate = new Date(yr,mo,dy);
  newdate.setFullYear(yr);  // fixes "feature" for dates from 1-99
  if(subtract) {
    newdate.setDate(newdate.getDate()-1);
  }
  return newdate;
}

function geo_lint(dataset) {
  let id_set = new Set();
  if(dataset.type !== "FeatureCollection")
    throw "expected dataset type === FeatureCollection, got " + dataset.type;
  if("features" in dataset) {
    for(let f of dataset.features) {
      if(f.type !== "Feature") {
        throw "feature type not Feature, got " + f.type;
      }
      if(id_set.has(f.id)) {
        throw "got duplicate dataset ID " + f.id;
      }
      id_set.add(f.id);
      fHash[f.id] = f;
      if("properties" in f) {
        let p = f.properties;
        for(let required of ["entity1type", "entity1name", "fidelity",
            "startdatestr", "enddatestr"]) {
          if(!(required in p))
            throw "feature " + f.id + " missing property " + required;
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
        timelineDateMinDefault = dateMin(timelineDateMinDefault, p.endDate);
        timelineDateMaxDefault = dateMax(timelineDateMaxDefault, p.startDate);
        datesOfInterest.push(p.startDate);
        polygonCount += 1;
        if("animateTo" in p) {
          animationHash[f.id] = p.animateTo;
        }
      } else {
        throw "no properties in feature " + f.id;
      }
      if("geometry" in f) {
        let g = f.geometry;
        if((g.type !== "Polygon") && (g.type !== "MultiPolygon") && (g.type !== "Point")) {
          throw "feature " + f.id + " should have geometry of Polygon, MultiPolygon or Point, got " + g.type;
        }
      } else {
        throw "no geometry in feature " + f.id;
      }
    }
  } else {
    throw "no features in dataset"
  }
}

// prepare animations by keeping track of which coordinates change
// to reduce compute time

function prepare_animations() {
  for(let id_from in animationHash) {
    let fromF = fHash[id_from];
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
    } else {
      let fromC = fromF.geometry.coordinates[0];
      let destC = destF.geometry.coordinates[0];
      if (fromC.length != destC.length) {
        throw "can't animate from " + id_from + " to " + animationHash[id_from] + " since coordinate lengths differ (" + fromC.length + " vs " + destC.length + ")";
      }
      fromF.pairDiffs = [];
      for(let i in fromC) {
        if(fromC[i][0] !== destC[i][0] || fromC[i][1] !== destC[i][1]) {
          fromF.pairDiffs.push(i);
        }
      }
    }
  }
}

if(useEurope) {
  geo_lint(dataEur);
} else {
  geo_lint(dataNA);
}

let geoDB = useEurope ? dataEur : dataNA;

prepare_animations();

datesOfInterest.push(today);
let datesOfInterestSorted = uniqueDateSort(datesOfInterest);

// Figure out what changes from one "date of interest" to
// the next. start with figuring out which IDs are valid in
// each date

// go through each feature and add it to an array of valid
// IDs per DOI
let idsPerDOI = [];
for(let f of geoDB.features) {
  let sd = str2date(f.properties.startdatestr,false);
  let ed = str2date(f.properties.enddatestr,  true);
  for (let i=0;i<datesOfInterestSorted.length;i++) {
    let doi = datesOfInterestSorted[i].getTime();
    if (doi > ed) {
      break;
    }
    if(sd <= doi) {
      if(idsPerDOI[i] === undefined) {
        idsPerDOI[i] = [];
      }
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
  if (doi>=1) {
    idAddsPerDOI[doi] = [];
    idSubsPerDOI[doi] = [];
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

geojson.evaluateLayers = function () {
  for(let l in this._layers) {
    let lyr = this._layers[l];
    let prop = lyr.feature.properties;
    let bounds = L.latLngBounds(lyr.feature.origBounds.getNorthEast(), lyr.feature.origBounds.getSouthWest());
    let ratio;
    if(curDate >= prop.startDate && curDate <= prop.endDate) {
      if("animateTo" in prop) {
        lyr.removeFrom(ohmap);
        let fromC = lyr.feature.geometry.coordinates;
        let destC = fHash[prop.animateTo].geometry.coordinates;
        let timeDiv = (fHash[prop.animateTo].properties.startDate.getTime() - prop.startDate.getTime())/(1000*60*60*24);
        let timeNum = (curDate.getTime() - prop.startDate.getTime())/(1000*60*60*24);
        ratio = timeNum/timeDiv;
        if(lyr.feature.geometry.type === 'MultiPolygon') {
          for(let o in lyr.feature.pairDiffs) {
            for(let i of lyr.feature.pairDiffs[o]) {
              let newlat = ((destC[o][0][i][1]-fromC[o][0][i][1])*ratio) + fromC[o][0][i][1];
              let newlon = ((destC[o][0][i][0]-fromC[o][0][i][0])*ratio) + fromC[o][0][i][0];
              lyr._latlngs[o][0][i] = L.latLng(newlat,newlon);
              bounds.extend(lyr._latlngs[o][0][i]);
            }
          }
        } else {
          for(let i of lyr.feature.pairDiffs) {
            let newlat = ((destC[0][i][1]-fromC[0][i][1])*ratio) + fromC[0][i][1];
            let newlon = ((destC[0][i][0]-fromC[0][i][0])*ratio) + fromC[0][i][0];
            lyr._latlngs[0][i] = L.latLng(newlat,newlon);
            bounds.extend(lyr._latlngs[0][i]);
          }
        }
      }
      lyr.addTo(ohmap);
      if (lyr.feature.geometry.type === "Point") {
        lyr.feature.iconOverlay.addTo(ohmap);
      }
      if("animateTo" in prop) {
        lyr.feature.textOverlay.removeFrom(ohmap);
        lyr.feature.textOverlay = updateTextOverlay(lyr.feature, bounds, fHash[prop.animateTo].properties,ratio);
      }
      lyr.feature.textOverlay.addTo(ohmap);
    } else {
      lyr.removeFrom(ohmap);
      if (lyr.feature.geometry.type === "Point") {
        lyr.feature.iconOverlay.removeFrom(ohmap);
      }
      lyr.feature.textOverlay.removeFrom(ohmap);
    }
  }
}

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

let refreshMap = function( {dateValue} ) {
  curDate.setTime(dateValue);
  legend.update();
  geojson.evaluateLayers();
}

let timelineDateMin = timelineDateMinOverride ? timelineDateMinOverride : timelineDateMinDefault;
let timelineDateMax = timelineDateMaxOverride ? timelineDateMaxOverride : timelineDateMaxDefault;

let mapBounds = function() {
  return ohmap.getBounds();
}

timelineSlider = L.control.timelineSlider({
  timelineDateMin:         timelineDateMin,
  timelineDateMax:         timelineDateMax,
  timelineDateStart:       timelineDateStart,
  infoboxHandle:           infobox,
  smartStepFeature:        smartStepFeature,
  clearInfobox:            infobox.clear,
  idAddsPerDOI:            idAddsPerDOI,
  idSubsPerDOI:            idSubsPerDOI,
  boundsHash:              boundsHash,
  mapBounds:               mapBounds,
  datesOfInterestSorted:   datesOfInterestSorted,
  updateTime:              refreshMap}).addTo(ohmap);

// update HTML data
function updateHTML(spanName, value) {
  let spanHandle = document.querySelector('#' + spanName);
  spanHandle.textContent = value;
}
  
updateHTML('startdef',  dateStr(timelineDateMinDefault,':'));
updateHTML('enddef',    dateStr(timelineDateMaxDefault,':'));
updateHTML('curdef',    dateStr(timelineDateStartDefault,':'));
updateHTML('latdef',    latSettingDefault);
updateHTML('londef',    lonSettingDefault);
updateHTML('zdef',      zoomSettingStart);
updateHTML('stepdef',   smartStepDefault ? 'on' : 'off');
updateHTML('backdef',   backgroundLayerDefault);
updateHTML('polycount', polygonCount);

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
  console.log("i pressed with lastFeature = " + lastFeature);
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

// check keypress value to determine function.
function checkKeypress(e) {
  let backgroundUpdated = false;
  switch(e.originalEvent.key) {
    case '0': backgroundLayerSetting = 'relief';   backgroundUpdated = true; break;
    case '1': backgroundLayerSetting = 'world';    backgroundUpdated = true; break;
    case '2': backgroundLayerSetting = 'physical'; backgroundUpdated = true; break;
    case '3': backgroundLayerSetting = 'white';    backgroundUpdated = true; break;
    case '4': backgroundLayerSetting = 'stamen';   backgroundUpdated = true; break;
    case '5': backgroundLayerSetting = 'streets' ; backgroundUpdated = true; break;
    case '6': backgroundLayerSetting = 'paint';    backgroundUpdated = true; break;
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
    lastBackgroundLayer.remove();
    lastBackgroundLayer = backgroundLayers[backgroundLayerSetting];
    lastBackgroundLayer.addTo(ohmap);
    ohmap.setMaxZoom(maxZoomPerBackground[backgroundLayerSetting]);
    updateDirectLink();
  }
}

ohmap.on('keydown', checkKeypress);
