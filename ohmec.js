// Copyright OHMEC contributors.
// Licensed under the Apache License, Version 2.0, see LICENSE for details.
// SPDX-License-Identifier: Apache-2.0

// check for URL override

let parameters = location.search.substring(1).split("&");

let today = new Date();
let timelineMin = today;
let timelineMax = new Date(1,0,1);
let timelineStart = new Date(1776,6,4); // oldest date that has all the polygons entered for US region
let overrideMin = 1;
let overrideMax = 1;
let latSetting = 39;
let lonSetting = -110;
let zoomSetting = 4;

for(let param of parameters) {
  let test = /(startdatestr|enddatestr|curdatestr)=(\d+:\d+:\d+)/;
  let match = param.match(test);
  if (match !== null) {
    let info = match[2].split(':');
    let dateVal = new Date(info[0],info[1]-1,info[2]);
    if (match[1] == 'startdatestr') {
      timelineMin = dateVal;
      overrideMin = 0;
    }
    if (match[1] == 'enddatestr') {
      timelineMax = dateVal;
      overrideMax = 0;
    }
    if (match[1] == 'curdatestr') {
      timelineStart = dateVal;
    }
  }
  test = /(lat|lon|z)=(\-?[\d.]+)/;
  match = param.match(test);
  if (match !== null) {
    let info = match[2];
    if (match[1] == 'lat' && info >= -90 && info <= 90) {
      latSetting = info;
    }
    if (match[1] == 'lon' && info >= -180 && info <= 180) {
      lonSetting = info;
    }
    if (match[1] == 'z' && info >= 1 && info <= 18) {
      zoomSetting = info;
    }
  }
}

let ohmap = L.map('map').setView([latSetting, lonSetting], zoomSetting);

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
  this._div.innerHTML = 
    (prop ?
      ('<b>' + prop.entity1type  + '</b>: ' + prop.entity1name + '<br/>' +
       '<b>' + prop.entity2type  + '</b>: ' + prop.entity2name + '<br/>' +
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

  layer.setStyle({
    weight: 5,
    color: '#666',
    dashArray: '',
    fillOpacity: 0.7
  });

  if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
    layer.bringToFront();
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

function onEachFeature(feature, layer) {
  layer.on({
    mouseover: highlightFeature,
    mouseout:  resetHighlight,
    mousedown: mouseInfo,
    keydown:   keyInfo,
  });

  // create SVG for name
  let bounds = layer.getBounds();

  // Set width to 100, and scale height based upon ratio of bounds.
  // Not perfect due to lat/long relationships but good enough for now.
  // 
  let width = 100;
  let widthd2 = width/2;
  let height = width * (bounds.getNorth() - bounds.getSouth()) / (bounds.getEast() - bounds.getWest());
  let heightd2 = height/2;
  let fontinfo = getFeatureFont(feature);
  feature.textLabel = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  feature.textLabel.setAttribute('xmlns',   "http://www.w3.org/2000/svg");
  feature.textLabel.setAttribute('width',   width);
  feature.textLabel.setAttribute('height',  height);
  feature.textLabel.setAttribute('viewBox', "0 0 " + width + " " + height);

  feature.textLabelDefs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  feature.textLabel.appendChild(feature.textLabelDefs);

  let label = getFeatureLabel(feature);
  let fontsize = fontinfo.scale/label.length;
  if("labelScale" in feature.properties) {
    fontsize *= feature.properties.labelScale;
  }
  let inner = '<text text-anchor="middle" x=' + widthd2 + ' y=' + heightd2;
  inner += ' font-family="' + fontinfo.name + ', Courier, sans-serif"';
  inner += ' font-size="' + Math.floor(fontsize) + 'px"';
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
  inner += '>' + label + '</text>';
  feature.textLabel.innerHTML = inner;
  let svgElementBounds = [ [ bounds.getNorth(), bounds.getWest() ], [ bounds.getSouth(), bounds.getEast() ] ];
  feature.textOverlay = L.svgOverlay(feature.textLabel, svgElementBounds);
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
        for(let required of ["entity1type", "entity1name", "entity2type",
          "entity2name", "fidelity", "startdatestr", "enddatestr"]) {
          if(!(required in p))
            throw "feature " + f.id + " missing property " + required;
        }
        let contents = p.startdatestr.split(':');
        p.startDate = new Date(contents[0], contents[1]-1, contents[2]);
        if(p.enddatestr == 'present') {
          p.endDate = today;
        } else {
          contents = p.enddatestr.split(':');
          p.endDate = new Date(contents[0], contents[1]-1, contents[2]);
        }
        let fid = p.fidelity;
        if(fid < 1 || fid > 5) {
          throw "fidelity for " + f.id + " should be between 1 (lowest) and 5 (highest), got " + fid;
        }
        if(overrideMin) {
          timelineMin = dateMin(timelineMin, p.endDate);
        }
        if(overrideMax) {
          timelineMax = dateMax(timelineMax, p.startDate);
        }
        datesOfInterest.push(p.startDate);
        polygonCount += 1;
      } else {
        throw "no properties in feature " + f.id;
      }
      if("geometry" in f) {
        let g = f.geometry;
        if((g.type !== "Polygon") && (g.type !== "MultiPolygon")) {
          throw "feature " + f.id + " should have geometry of Polygon or MultiPolygon, got " + g.type;
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
  style: featureStyle,
  onEachFeature: onEachFeature
}).addTo(ohmap);

geojson.evaluateLayers = function () {
  for(let l in this._layers) {
    let lyr = this._layers[l];
    let prop = lyr.feature.properties;
    if(curDate >= prop.startDate && curDate <= prop.endDate) {
      lyr.addTo(ohmap);
      lyr.feature.textOverlay.addTo(ohmap);
    } else {
      lyr.removeFrom(ohmap);
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
  timelineMin:   timelineMin,
  timelineMax:   timelineMax,
  timelineStart: timelineStart,
  mousedown:     mouseInfoSlider,
  mousemove:     mouseInfoSlider,
  updateTime:    refreshMap}).addTo(ohmap);

let polygonSpan = document.querySelector("span");
polygonSpan.textContent = polygonCount;
