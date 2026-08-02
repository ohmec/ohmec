// Copyright OHMEC contributors.
// Licensed under the Apache License, Version 2.0, see LICENSE for details.
// SPDX-License-Identifier: Apache-2.0

// Part of the OHMEC viewer; loaded before ohmec.js bootstrap.

let backgroundAliases = {
  stamen: 'topo',
  paint: 'voyager'
};

function resolveBackgroundId(id) {
  return backgroundAliases[id] || id;
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

/* ohmec module exports */
(function (g) {
  g.resolveBackgroundId = resolveBackgroundId;
  g.urlString = urlString;
  g.updateDirectLink = updateDirectLink;
  g.updateLayerInfo = updateLayerInfo;
  g.completeMapMove = completeMapMove;
  g.addBackgroundLayer = addBackgroundLayer;
})(typeof window !== "undefined" ? window : globalThis);
