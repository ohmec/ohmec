// Copyright OHMEC contributors.
// Licensed under the Apache License, Version 2.0, see LICENSE for details.
// SPDX-License-Identifier: Apache-2.0

// check for URL override

let parameters = location.search.substring(1).split("&");

let today = new Date();
let timelineDateStart = new Date(1776,6,4); // "interesting" start date, but arbitraty
let timelineDateMin = today;                // these will be overridden as features come in
let timelineDateMax = new Date(1,0,1);
let overrideDateMin = 1;                    // these allow the database to change timeline range
let overrideDateMax = 1;                    // unless provided in the URL override parameters

let latSettingStart = 38.5;                 // centering around USA region for this Phase
let lonSettingStart = -98.0;
let latSettingMin = -90.0;
let latSettingMax = 90.0;
let lonSettingMin = -180.0;
let lonSettingMax = 180.0;

let zoomSettingMin = 2.5;
let zoomSettingMax = 15.0;
let zoomSettingStart = 4.5;

for(let param of parameters) {
  let test = /(startdatestr|enddatestr|curdatestr)=([\d:]+)/;
  let match = param.match(test);
  if (match !== null) {
    if (match[1] == 'startdatestr') {
      timelineDateMin = str2date(match[2],false);
      overrideDateMin = 0;
    }
    if (match[1] == 'enddatestr') {
      timelineDateMax = str2date(match[2],true);
      overrideDateMax = 0;
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

let updateDirectLink = function() {
  let hrefText = location.href;
  let splits = hrefText.split('?');
  let latlon = ohmap.getCenter();
  let urlText = splits[0] +
    '?startdatestr=' + fixInt(timelineDateMin.getFullYear(),4) + ':' +
                       fixInt(timelineDateMin.getMonth()+1,2)  + ':' +
                       fixInt(timelineDateMin.getDate(),2) +
    '&enddatestr='   + fixInt(timelineDateMax.getFullYear(),4) + ':' +
                       fixInt(timelineDateMax.getMonth()+1,2)  + ':' +
                       fixInt(timelineDateMax.getDate(),2) +
    '&curdatestr='   + fixInt(curDate.getFullYear(),4) + ':' +
                       fixInt(curDate.getMonth()+1,2)  + ':' +
                       fixInt(curDate.getDate(),2) +
    '&lat='          + parseFloat(latlon.lat).toFixed(2) +
    '&lon='          + parseFloat(latlon.lng).toFixed(2) +
    '&z='            + parseFloat(ohmap.getZoom()).toFixed(1);
  linkSpan.textContent = urlText;
  linkSpan.href = urlText;
};

ohmap.on('moveend', updateDirectLink);

L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={ohmec_mapbox_token}', {
  maxZoom: 18,
  attribution: 'Historical data OHMEC contributors | ' +
    'Tile imagery &copy; <a href="https://www.mapbox.com/">Mapbox</a>',
  id: 'mapbox/light-v9',
  tileSize: 512,
  ohmec_mapbox_token: 'pk.eyJ1Ijoic2pjdXBlcnRpbm8iLCJhIjoiY2trM2M2c3V4MTVqbjJwcWRtbG5xYzBuNCJ9.U9HinfthlYYG9oznaMUK3A',
  zoomOffset: -1
}).addTo(ohmap);

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

function keyInfo(e) {
//      this doesn't appear to work, need to figure out why later, not important now
  console.log("key pressed: " + e);
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
    mousedown: mouseInfo,
    keydown:   keyInfo,
  });

  let labelBounds;
  let label = getFeatureLabel(feature);

  if (feature.geometry.type === "Point") {
    // create icon for Point, and create label bounds
    let coords = feature.geometry.coordinates;
    let plon = coords[0];
    let plat = coords[1];
    let iconSize = 0.05;  // arbitraty size of icon, 0.05 degrees
    let bboxSize = 1.0;   // arbitraty size of label bounding box, 1 degree
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
    if (sortedArray[i-1] !== sortedArray[i]) {
      returnArray.push(sortedArray[i]);
    }
  }
  return returnArray;
}

let polygonCount = 0;

function str2date(datestr,roundLate) {
  let info = datestr.split(':');
  // if datestr only contains one member (year), consider it 1st or last day of the year
  // if only contains two (year, month), consider it 1st or last day of month
  let yr,mo,dy;
  let subtract = false;
  if(info.length==3) {
    yr = info[0];
    mo = info[1]-1;
    dy = info[2];
  } else if(info.length==2) {
    yr = info[0];
    mo = roundLate ? info[1] : (info[1]-1);
    dy = 1;
    subtract = roundLate;
  } else if(info.length==1) {
    yr = info[0];
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
        if(overrideDateMin) {
          timelineDateMin = dateMin(timelineDateMin, p.endDate);
        }
        if(overrideDateMax) {
          timelineDateMax = dateMax(timelineDateMax, p.startDate);
        }
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
    fixInt(curDate.getMonth()+1, 2) + '&sol;' +
    fixInt(curDate.getDate(),    2) + '&sol;' +
    fixInt(curDate.getFullYear(),4) + '</div>';
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

L.control.timelineSlider({
  timelineDateMin:   timelineDateMin,
  timelineDateMax:   timelineDateMax,
  timelineDateStart: timelineDateStart,
  mousedown:         mouseInfoSlider,
  mousemove:         mouseInfoSlider,
  updateTime:        refreshMap}).addTo(ohmap);

let polygonSpan = document.querySelector('#polycount');
polygonSpan.textContent = polygonCount;
