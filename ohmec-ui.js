// Copyright OHMEC contributors.
// Licensed under the Apache License, Version 2.0, see LICENSE for details.
// SPDX-License-Identifier: Apache-2.0

// Part of the OHMEC viewer; loaded before ohmec.js bootstrap.

function getSourceNameType(stext, idx) {
  let test = /^(\w+):(\w.+)$/;
  let tmatch = stext.match(test);
  let sname = stext;
  let stype = "source";
  // keycap digit for keyboard shortcut (1️⃣ …)
  let sprefix = String.fromCharCode(0x31 + idx) + '\uFE0F\u20E3 ';
  if (tmatch !== null) {
    stype = tmatch[1];
    sname = tmatch[2];
  } else if (/http.*wikipedia/i.test(stext)) {
    stype = "wikipedia source";
  }
  return [sprefix,sname,stype];
}


function clearElement(el) {
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

function appendBr(parent) {
  parent.appendChild(document.createElement('br'));
}

function appendLabeledLine(parent, label, value) {
  let bold = document.createElement('b');
  bold.textContent = label;
  parent.appendChild(bold);
  parent.appendChild(document.createTextNode(': ' + value));
  appendBr(parent);
}

function appendSourceLink(parent, sourceText, idx) {
  if (typeof sourceText === 'string' && sourceText.includes('native-land')) {
    let a = document.createElement('a');
    let href = safeHttpUrl(sourceText);
    if (href) {
      a.href = href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    a.textContent = 'source: Native Lands';
    parent.appendChild(a);
    appendBr(parent);
    return;
  }
  let sreturn = getSourceNameType(sourceText, idx);
  parent.appendChild(document.createTextNode(sreturn[0]));
  let a = document.createElement('a');
  let href = safeHttpUrl(sreturn[1]);
  if (href) {
    a.href = href;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
  }
  a.textContent = sreturn[2];
  parent.appendChild(a);
  appendBr(parent);
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

