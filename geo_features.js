// Copyright OHMEC contributors.
// Licensed under the Apache License, Version 2.0, see LICENSE for details.
// SPDX-License-Identifier: Apache-2.0

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
  // (see https://leafletjs.com/reference-1.7.1.html#path-option)
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

function getFeatureLabel(feature) {
  if("entity2name" in feature.properties) {
    return feature.properties.entity2name;
  } else if(feature.properties.entity1type === 'geography' && feature.properties.entity1name === 'icecap') {
    return ' '
  } else {
    return feature.properties.entity1name;
  }
}

function getFeatureFont(feature) {
  // default styles
  let fontchoice = 9;
  let fontname   = 'sans serif';
  let fontscale  = 80;
  let fontcolor  = "black";

  if("style" in feature) {
    // scale the font based upon the family, since some are wider than others
    switch(feature.style.fontname) {
      case 'Rubik':                fontscale = 81; break;
      case 'Cabin Sketch':         fontscale = 87; break;
      case 'Corben':               fontscale = 77; break;
      case 'New Tegomin':          fontscale = 84; break;
      case 'Special Elite':        fontscale = 81; break;
      case 'Fredericka the Great': fontscale = 81; break;
      case 'Rye':                  fontscale = 73; break;
      case 'Akaya Telivigala':     fontscale = 94; break;
      case 'MedievalSharp':        fontscale = 85; break;
      case 'Benne':                fontscale = 91; break;
    }
    return {
      name:  feature.style.fontname,
      scale: fontscale,
      color: feature.style.fontcolor
    };
  } else {
    return {
      name:  fontname,
      scale: fontscale,
      color: fontcolor
    };
  }
}
