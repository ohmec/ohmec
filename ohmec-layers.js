// Copyright OHMEC contributors.
// Licensed under the Apache License, Version 2.0, see LICENSE for details.
// SPDX-License-Identifier: Apache-2.0

// Part of the OHMEC viewer; loaded before ohmec.js bootstrap.

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
  // (see https://leafletjs.com/reference-1.9.4.html#path-option)
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

function evaluateLayers() {
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

/* ohmec module exports */
(function (g) {
  g.featureStyle = featureStyle;
  g.cToHex = cToHex;
  g.str2RGB = str2RGB;
  g.interpolateFloat = interpolateFloat;
  g.interpolateColor = interpolateColor;
  g.removeFeatureFromMap = removeFeatureFromMap;
  g.addFeatureToMap = addFeatureToMap;
  g.morphAnimatedLayer = morphAnimatedLayer;
  g.refreshAnimatedLabel = refreshAnimatedLabel;
  g.findDoiIndex = findDoiIndex;
  g.hideFeatureById = hideFeatureById;
  g.showFeatureById = showFeatureById;
  g.updateAnimatedActive = updateAnimatedActive;
  g.applyLayerDepth = applyLayerDepth;
  g.syncToDoiIndex = syncToDoiIndex;
  g.evaluateLayers = evaluateLayers;
})(typeof window !== "undefined" ? window : globalThis);
