// Copyright OHMEC contributors.
// Licensed under the Apache License, Version 2.0, see LICENSE for details.
// SPDX-License-Identifier: Apache-2.0

// check for URL override

let parameters = location.search.substring(1).split("&");

let useStepBox = true;

let today = new Date();
let timelineMin = today;
let timelineMax = new Date(1,0,1);
let timelineStart = new Date(1776,6,4); // oldest date that has all the polygons entered for US region
let overrideMin = 1;
let overrideMax = 1;
let latSetting = 38.5;
let lonSetting = -98;
let zoomSetting = 4.5;

for(let param of parameters) {
  let test = /(startdatestr|enddatestr|curdatestr)=([\d:]+)/;
  let match = param.match(test);
  if (match !== null) {
    if (match[1] == 'startdatestr') {
      timelineMin = str2date(match[2],false);
      overrideMin = 0;
    }
    if (match[1] == 'enddatestr') {
      timelineMax = str2date(match[2],true);
      overrideMax = 0;
    }
    if (match[1] == 'curdatestr') {
      timelineStart = str2date(match[2],false);
    }
  }
  test = /(lat|lon|z)=(-?[\d.]+)/;
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

let ohmap = L.map('map', {
  center:        [latSetting, lonSetting],
  zoom:          zoomSetting,
  zoomSnap:      0.5,
  zoomDelta:     0.5,
  worldCopyJump: false  // true would replicate upon panning far west/east, but has unattractive skips
});

let linkSpan = document.querySelector('#directlink');

let updateDirectLink = function() {
  let hrefText = location.href;
  let splits = hrefText.split('?');
  let latlon = ohmap.getCenter();
  let urlText = splits[0] +
    '?startdatestr=' + fixInt(timelineMin.getFullYear(),4) + ':' +
                       fixInt(timelineMin.getMonth()+1,2)  + ':' +
                       fixInt(timelineMin.getDate(),2) +
    '&enddatestr='   + fixInt(timelineMax.getFullYear(),4) + ':' +
                       fixInt(timelineMax.getMonth()+1,2)  + ':' +
                       fixInt(timelineMax.getDate(),2) +
    '&curdatestr='   + fixInt(curDate.getFullYear(),4) + ':' +
                       fixInt(curDate.getMonth()+1,2)  + ':' +
                       fixInt(curDate.getDate(),2) +
    '&lat='          + parseFloat(latlon.lat).toPrecision(6) +
    '&lon='          + parseFloat(latlon.lng).toPrecision(6) +
    '&z='            + parseFloat(ohmap.getZoom()).toPrecision(2);
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

// step box
let stepbox = L.control();

stepbox.onAdd = function() {
  this._div = L.DomUtil.create('div', 'stepbox');
  this.update();
  return this._div;
}

stepbox.update = function(str) {
  this._div.innerHTML = '<b>Step Changes</b>';
  if(str) {
    this._div.innerHTML += '<br/>' + str;
  }
};

stepbox.addTo(ohmap);

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

function onEachFeature(feature, layer) {
  layer.on({
    mouseover: highlightFeature,
    mouseout:  resetHighlight,
    mousedown: mouseInfo,
    keydown:   keyInfo,
  });

  boundsHash[feature.id] = layer.getBounds();
  enameHash[feature.id] = ("entity2name" in feature.properties) ? feature.properties.entity2name : feature.properties.entity1name;

  if (layer.feature.geometry.type !== "Point") {  // default Point style being used at this time; mouse-over text does show
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
    let inner = '';
    // if labelArc is defined, we first need to define the circular path that the text will traverse
    // it is a circle with radius 'arc' that has a tangent at (50,h/2), either with the circle below
    // and the text on the top (if arc > 0) or the circle above with the text on the bottom (arc < 0).
    if("labelArc" in feature.properties) {
      let arcval = feature.properties.labelArc;
      let my   = heightd2 + 2*arcval;
      let ar   = (arcval >= 0) ? arcval : -arcval;
      let pos  = (arcval >= 0) ?  1 :   0;
      let ar2n = arcval*2;
      let ar2p = arcval*-2;
      inner += '<path id="arcpath' + feature.id + '" stroke="none" fill="none" d="m 50,' + my;
      inner += ' a ' + ar + ',' + ar + ' 0 0 ' + pos + ' 0,' + ar2p;
      inner +=   ' ' + ar + ',' + ar + ' 0 0 ' + pos + ' 0,' + ar2n + ' z"/>';
    }
    inner += '<text text-anchor="middle"';
    inner += ' font-family="' + fontinfo.name + ', Courier, sans-serif"';
    inner += ' fill="' + fontinfo.color + '"';  // e.g. "red" or "#c80015"
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
    if(!("labelArc" in feature.properties)) {
      inner += ' x=' + widthd2 + ' y=' + heightd2;
    }
    inner += '>';
    if(("labelArc" in feature.properties)) {
      inner += '<textPath href="#arcpath' + feature.id + '" startOffset="50%">' + label + '</textPath></text>';
    } else {
      inner += label + '</text>';
    }
    feature.textLabel.innerHTML = inner;
    let svgElementBounds = [ [ bounds.getNorth(), bounds.getWest() ], [ bounds.getSouth(), bounds.getEast() ] ];
    feature.textOverlay = L.svgOverlay(feature.textLabel, svgElementBounds);
  }
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

let boundsHash = {};
let enameHash = {};

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
      if(idsPerDOI[i] == undefined) {
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
  style: featureStyle,
  onEachFeature: onEachFeature
}).addTo(ohmap);

geojson.evaluateLayers = function () {
  for(let l in this._layers) {
    let lyr = this._layers[l];
    let prop = lyr.feature.properties;
    if(curDate >= prop.startDate && curDate <= prop.endDate) {
      lyr.addTo(ohmap);
      if (lyr.feature.geometry.type !== "Point") {  // default Point style being used at this time; no textOverlay associated w/ Points
        lyr.feature.textOverlay.addTo(ohmap);
      }
    } else {
      lyr.removeFrom(ohmap);
      if (lyr.feature.geometry.type !== "Point") {  // default Point style being used at this time; no textOverlay associated w/ Points
        lyr.feature.textOverlay.removeFrom(ohmap);
      }
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
  timelineMin:   timelineMin,
  timelineMax:   timelineMax,
  timelineStart: timelineStart,
  mousedown:     mouseInfoSlider,
  mousemove:     mouseInfoSlider,
  updateTime:    refreshMap}).addTo(ohmap);

let polygonSpan = document.querySelector('#polycount');
polygonSpan.textContent = polygonCount;
