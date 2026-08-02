// Copyright OHMEC contributors.
// Licensed under the Apache License, Version 2.0, see LICENSE for details.
// SPDX-License-Identifier: Apache-2.0

// Part of the OHMEC viewer; loaded before ohmec.js bootstrap.

function updateHTML(spanName, value) {
  let spanHandle = document.querySelector('#' + spanName);
  spanHandle.textContent = value;
}

function updateForm(formName, value) {
  let formHandle = document.querySelector('#' + formName);
  formHandle.value = value;
}

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
    let rawUrl = (tmatch !== null) ? tmatch[2] : sources[val-1];
    let href = safeHttpUrl(rawUrl);
    if (href) {
      window.open(href, "_blank", "noopener,noreferrer");
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
    case '4': backgroundUpdated = handleNumPress(parseInt(e.originalEvent.key), 'topo');     break;
    case '5': backgroundUpdated = handleNumPress(parseInt(e.originalEvent.key), 'positron'); break;
    case '6': backgroundUpdated = handleNumPress(parseInt(e.originalEvent.key), 'streets');  break;
    case '7': backgroundUpdated = handleNumPress(parseInt(e.originalEvent.key), 'voyager');  break;
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

/* ohmec module exports */
(function (g) {
  g.updateHTML = updateHTML;
  g.updateForm = updateForm;
  g.handleIPress = handleIPress;
  g.handleNumPress = handleNumPress;
  g.checkKeypress = checkKeypress;
  g.checkPopups = checkPopups;
  g.checkMouseMove = checkMouseMove;
})(typeof window !== "undefined" ? window : globalThis);
