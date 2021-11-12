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

for(let param of parameters) {
  let test = /(startdatestr|enddatestr|curdatestr)=([-?\d:BC]+)/;
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
}

// Declare the bounds of which the user can pan the viewing portal.
// This is limited to the starting point viewpoint, but also just
// a bit off the "edge" to give context on those geographies near
// the international date line. Note that the map overlays won't
// show "across the edge" with the exception of geometries that
// straddle, eg Alaska. Note this also trims some of the poles
// since a) there isn't interesting geo-political content below
// 70S and above 85N anyway; b) they don't render very well in a
// Mercator projection.

let panBounds = new L.LatLngBounds(new L.LatLng(-70, -200), new L.LatLng(85, 220));

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

ohmap.on('moveend', updateDirectLink);

let numBackgrounds = 0;

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

L.control.layers(backgroundLayers).addTo(ohmap);

ohmap.on('baselayerchange', updateLayerInfo);

// feature info box
let infobox = L.control();
let held_id, held_prop, infoTmout;

infobox.onAdd = function() {
  this._div = L.DomUtil.create('div', 'infobox');
  this.update();
  return this._div;
};

infobox.update = function(id, prop) {
  let e2text = '';
  if(prop && ("entity2type" in prop)) {
    e2text = '<b>' + prop.entity2type + '</b>: ' + prop.entity2name + '<br/>';
  }
  this._div.innerHTML =
    (prop ?
      ('<b>' + prop.entity1type  + '</b>: ' + prop.entity1name + '<br/>' +
       e2text +
               prop.startdatestr + ' - '    + prop.enddatestr  + '<br/>' +
               (prop.source ? ('<a href="' + prop.source + '" target="_blank">source</a><br/>') : '') +
       '<b>' + 'id: '           + '</b>'   + id) :
      '<b>Feature Information</b>');
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

function highlightFeature(e) {
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

  infobox.update(layer.feature.id,layer.feature.properties);
}

function resetHighlight(e) {
  geojson.resetStyle(e.target);
  infobox.update(held_id,held_prop);
}

// upon mouse click, hold the information, allowing the
// user to click on the source link. so as to not linger
// forever, hold the information about a few seconds.
function mouseInfo(e) {
  held_prop = e.target.feature.properties;
  held_id   = e.target.feature.id;
  // a little random, but 7 seconds
  if(infoTmout) {
    clearTimeout(infoTmout);
  }
  infoTmout = setTimeout(() => { held_id = ''; held_prop = ''; infobox.update(); }, 7000);
}

// this renders the default leaflet Point marker as transparent,
// while still allowing for selection / hovering. It also moves
// points high in the z stack for first priority.
function pointToLayer(point, latlng) {
  return L.marker(latlng, { opacity: 0.0, zIndexOffset: 1000 });
}

function onEachFeature(feature, layer) {
  layer.on({
    mouseover: highlightFeature,
    mouseout:  resetHighlight,
    mousedown: mouseInfo
  });

  let labelBounds;
  let label = getFeatureLabel(feature);

  if (feature.geometry.type === "Point") {
    // create icon for Point, and create label bounds
    let coords = feature.geometry.coordinates;
    let plon = coords[0];
    let plat = coords[1];
    let iconSize = 0.05;  // arbitrary size of icon, 0.05 degrees
    let bboxSize = 1.0;   // arbitrary size of label bounding box, 1 degree
    let iconFile = 'poi_poi.svg';

    // other available icon images
    if(feature.properties.entity1type === 'settlement' ||
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

  // Set width to 100, and scale height based upon ratio of bounds.
  // Not perfect due to lat/long relationships but good enough for now.

  let width = 100;
  let widthd2 = width/2;
  let height = width * (labelBounds.getNorth() - labelBounds.getSouth()) / (labelBounds.getEast() - labelBounds.getWest());
  let heightd2 = height/2;
  let fontinfo = getFeatureFont(feature);
  feature.textLabel = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  feature.textLabel.setAttribute('xmlns',   "http://www.w3.org/2000/svg");
  feature.textLabel.setAttribute('width',   width);
  feature.textLabel.setAttribute('height',  height);
  feature.textLabel.setAttribute('viewBox', "0 0 " + width + " " + height);

  feature.textLabelDefs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  feature.textLabel.appendChild(feature.textLabelDefs);

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

  let fontsize = (feature.geometry.type === "Point") ? fontinfo.scale/25 : fontinfo.scale/labelLength;
  if("labelScale" in feature.properties) {
    fontsize *= feature.properties.labelScale;
  }

  let inner = '';
  for(let i=0; i<segments.length; i++) {
    let segmentLabel = segments[i];
    let thisFontsize = fontsize*(1 - 0.2*i);  // font shrinks a bit on each line
    // if labelArc is defined, we first need to define the circular path that the text will traverse
    // it is a circle with radius 'arc' that has a tangent at (50,h/2), either with the circle below
    // and the text on the top (if arc > 0) or the circle above with the text on the bottom (arc < 0).
    if("labelArc" in feature.properties) {
      let arcval = feature.properties.labelArc;
      let my   = heightd2 + 2*arcval + i*thisFontsize;
      let ar   = (arcval >= 0) ? arcval : -arcval;
      let pos  = (arcval >= 0) ?  1 :   0;
      let ar2n = arcval*2;
      let ar2p = arcval*-2;
      inner += '<path id="arcpath' + i + feature.id + '" stroke="none" fill="none" d="m 50,' + my;
      inner += ' a ' + ar + ',' + ar + ' 0 0 ' + pos + ' 0,' + ar2p;
      inner +=   ' ' + ar + ',' + ar + ' 0 0 ' + pos + ' 0,' + ar2n + ' z"/>';
    }
    let justify = (feature.geometry.type === "Point") ? 'left' : 'middle';
    if("labelJustify" in feature.properties) {
      justify = feature.properties.labelJustify;
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
    inner += ' fill="' + fontinfo.color + '"';  // e.g. "red" or "#c80015"
    inner += ' font-size="' + fontsize.toFixed(2) + 'px"';
    if("labelRotate" in feature.properties || "labelX" in feature.properties || "labelY" in feature.properties) {
      inner += ' transform="';
      if("labelRotate" in feature.properties) {
        inner += ' rotate(' + feature.properties.labelRotate + ' ' + widthd2 + ' ' + heightd2 + ')';
      }
      if("labelX" in feature.properties || "labelY" in feature.properties) {
        let xoff = ("labelX" in feature.properties) ? feature.properties.labelX : 0;
        let yoff = ("labelY" in feature.properties) ? feature.properties.labelY : 0;
        inner += ' translate(' + xoff + ' ' + yoff + ')';
      }
      inner += '"';
    }
    if(!("labelArc" in feature.properties)) {
      let ny = ty + i*thisFontsize
      inner += ' x=' + tx + ' y=' + ny;
    }
    inner += '>';
    if(("labelArc" in feature.properties)) {
      inner += '<textPath href="#arcpath' + i + feature.id + '" startOffset="50%">' + segmentLabel + '</textPath></text>';
    } else {
      inner += segmentLabel + '</text>';
    }
  }
  feature.textLabel.innerHTML = inner;
  let labelElementBounds = [ [ labelBounds.getNorth(), labelBounds.getWest() ], [ labelBounds.getSouth(), labelBounds.getEast() ] ];
  feature.textOverlay = L.svgOverlay(feature.textLabel, labelElementBounds);
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

geo_lint(dataNA);

datesOfInterest.push(today);
let datesOfInterestSorted = uniqueDateSort(datesOfInterest);

// Figure out what changes from one "date of interest" to
// the next. start with figuring out which IDs are valid in
// each date

// go through each feature and add it to an array of valid
// IDs per DOI
let idsPerDOI = [];
for(let f of dataNA.features) {
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

geojson = L.geoJson(dataNA, {
  style:         featureStyle,
  pointToLayer:  pointToLayer,
  onEachFeature: onEachFeature
}).addTo(ohmap);

geojson.evaluateLayers = function () {
  for(let l in this._layers) {
    let lyr = this._layers[l];
    let prop = lyr.feature.properties;
    if(curDate >= prop.startDate && curDate <= prop.endDate) {
      lyr.addTo(ohmap);
      if (lyr.feature.geometry.type === "Point") {
        lyr.feature.iconOverlay.addTo(ohmap);
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

function mouseInfoSlider(e) {
  console.log(e);
}

let timelineDateMin = timelineDateMinOverride ? timelineDateMinOverride : timelineDateMinDefault;
let timelineDateMax = timelineDateMaxOverride ? timelineDateMaxOverride : timelineDateMaxDefault;

L.control.timelineSlider({
  timelineDateMin:   timelineDateMin,
  timelineDateMax:   timelineDateMax,
  timelineDateStart: timelineDateStart,
  mousedown:         mouseInfoSlider,
  mousemove:         mouseInfoSlider,
  updateTime:        refreshMap}).addTo(ohmap);

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
spanPtr = document.querySelector('#startdef');

// upon keypress, if on a feature, hold its information, allowing the
// user to click on the source link. so as to not linger forever,
// hold the information about a few seconds.
function checkKeypress(e) {
  let backgroundUpdated = false;
  if (e.originalEvent.key === '0') {
    backgroundLayerSetting = 'relief';
    backgroundUpdated = true;
  }
  if (e.originalEvent.key === '1') {
    backgroundLayerSetting = 'world';
    backgroundUpdated = true;
  }
  if (e.originalEvent.key === '2') {
    backgroundLayerSetting = 'physical';
    backgroundUpdated = true;
  }
  if (e.originalEvent.key === '3') {
    backgroundLayerSetting = 'white';
    backgroundUpdated = true;
  }
  if (e.originalEvent.key === '4') {
    backgroundLayerSetting = 'stamen';
    backgroundUpdated = true;
  }
  if (e.originalEvent.key === '5') {
    backgroundLayerSetting = 'streets';
    backgroundUpdated = true;
  }
  if (e.originalEvent.key === '6') {
    backgroundLayerSetting = 'paint';
    backgroundUpdated = true;
  }
  if (e.originalEvent.key === 's') {
    smartStepFeature = 1 - smartStepFeature;
    timelineSlider.updateButtons(smartStepFeature);
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
