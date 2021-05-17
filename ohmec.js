// Copyright OHMEC contributors.
// Licensed under the Apache License, Version 2.0, see LICENSE for details.
// SPDX-License-Identifier: Apache-2.0

let ohmap = L.map('map').setView([39, -110], 4);

L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={ohmec_mapbox_token}', {
  maxZoom: 18,
  attribution: 'Historical data OHMEC contributors | ' +
    'Tile imagery &copy; <a href="https://www.mapbox.com/">Mapbox</a>',
  id: 'mapbox/light-v9',
  tileSize: 512,
  ohmec_mapbox_token: 'pk.eyJ1Ijoic2pjdXBlcnRpbm8iLCJhIjoiY2trM2M2c3V4MTVqbjJwcWRtbG5xYzBuNCJ9.U9HinfthlYYG9oznaMUK3A',
  zoomOffset: -1
}).addTo(ohmap);

let legend = L.control({position: 'bottomright'});
let today = new Date();
let curDate = today.getFullYear() + ":" + (today.getMonth() + 1) + ":" + today.getDate();
let timelineMin = today.getFullYear();
let timelineMax = 0;
let timelineStart = 1790.415; // randomly chosen as the day just after the 13th colony added

function dateInfo(date) {
  let contents = date.split(':');
  if (contents[0] == 'none') {
    contents[0] = today.getFullYear();
    contents[1] = today.getMonth()+1;
    contents[2] = today.getDate();
  }
  return {
    day: parseFloat(contents[2]),
    mon: parseFloat(contents[1]),
    year: parseFloat(contents[0])
  };
}

function within_dates(cd,sd,ed) {
  let cdinfo = dateInfo(cd);
  let sdinfo = dateInfo(sd);
  let edinfo = dateInfo(ed);
  let scompare = (cdinfo.year < sdinfo.year) ? -1 :
                 (cdinfo.year > sdinfo.year) ?  1 :
                 (cdinfo.mon  < sdinfo.mon ) ? -1 :
                 (cdinfo.mon  > sdinfo.mon ) ?  1 :
                 (cdinfo.day  < sdinfo.day ) ? -1 :
                 (cdinfo.day  > sdinfo.day ) ?  1 : 0;
  let ecompare = (cdinfo.year < edinfo.year) ? -1 :
                 (cdinfo.year > edinfo.year) ?  1 :
                 (cdinfo.mon  < edinfo.mon ) ? -1 :
                 (cdinfo.mon  > edinfo.mon ) ?  1 :
                 (cdinfo.day  < edinfo.day ) ? -1 :
                 (cdinfo.day  > edinfo.day ) ?  1 : 0;
  if(scompare >= 0 && ecompare <= 0) {
    return 1;
  } else {
    return 0;
  }
}

function yearMin(minYear, newDate) {
  let newYear = dateInfo(newDate).year;
  return (minYear < newYear) ? minYear : newYear;
}

function yearMax(maxYear, newDate) {
  let newYear = dateInfo(newDate).year;
  return (maxYear > newYear) ? maxYear : newYear;
}

let geojson;

function highlightFeature(e) {
  var layer = e.target;

  layer.setStyle({
    weight: 5,
    color: '#666',
    dashArray: '',
    fillOpacity: 0.7
  });

  if (!L.Browser.ie && !L.Browser.opera && !L.Browser.edge) {
    layer.bringToFront();
  }
}

function resetHighlight(e) {
  geojson.resetStyle(e.target);
}

function mouseInfo(e) {
//      here for possible future use
//      console.log(e.containerPoint + " within " + e.sourceTarget.feature.properties.entity2name);
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
    mousemove: mouseInfo,
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
          "entity2name", "fidelity", "startdate", "enddate"]) {
          if(!(required in p))
            throw "feature " + f.id + " missing property " + required;
        }
        let fid = p.fidelity;
        if(fid < 1 || fid > 5) {
          throw "fidelity for " + f.id + " should be between 1 (lowest) and 5 (highest), got " + fid;
        }
        timelineMin = yearMin(timelineMin, p.startdate);
        timelineMax = yearMax(timelineMax, p.enddate);
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

geojson = L.geoJson(dataNA, {
  style: featureStyle,
  onEachFeature: onEachFeature
}).addTo(ohmap);

geojson.evaluateLayers = function () {
  for(let l in this._layers) {
    let lyr = this._layers[l];
    let prop = lyr.feature.properties;
    if(within_dates(curDate,prop.startdate,prop.enddate)) {
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
  this._div = L.DomUtil.create('div', 'info curdate');
  this.update();
  return this._div;
};

legend.update = function () {
  let curInfo = dateInfo(curDate);
  this._div.innerHTML =
    'Current date:<br/><div id="fixeddate">' +
    fixInt(curInfo.mon, 2) + '&sol;' +
    fixInt(curInfo.day, 2) + '&sol;' +
    fixInt(curInfo.year,4) + '</div>';
};
legend.addTo(ohmap);

let refreshMap = function( {value} ) {
  let newYear = Math.floor(value);
  let newDayNum = Math.floor(365*(value - newYear));
  let newMon, newDay;
  let monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let curDay = 0;
  let curMon = 0;
  for(let i in monthDays) {
    if(newDayNum < (curDay + monthDays[i])) { 
      newMon = curMon;
      newDay = newDayNum - curDay + 1;
      break;
    }
    curMon += 1;
    curDay += monthDays[i];
  }
  curDate = newYear + ":" + (newMon+1) + ":" + newDay;
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
