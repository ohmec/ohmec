// Copyright OHMEC contributors.
// Licensed under the Apache License, Version 2.0, see LICENSE for details.
// SPDX-License-Identifier: Apache-2.0

function featureStyle(feature) {
  // default styles
  let strokeOn      = true;
  let strokeOpacity = 1.0;
  let strokeColor   = 'white';
  let strokeWeight  = 2.0;
  let strokeDash    = '3';
  let fillOn        = true;
  let fillColor     = '#c0c0c0';

  let fidelity      = feature.properties.fidelity;
  let fillOpacity   = 0.2 + fidelity/10;

  // big lookup table for entity types and names, mapping to colors and other info
  let entity1name = feature.properties.entity1name;
  let entity2type = feature.properties.entity2type;
  if(entity1name == 'England' && entity2type == 'grant') {
    strokeColor  = '#a00000';
    strokeWeight = 1.0;
    strokeDash   = '3';
    fillColor    = '#a08080';
  } else if(entity1name == 'England' && entity2type == 'colony') {
    strokeColor  = '#a00000';
    strokeWeight = 1.5;
    strokeDash   = '1';
    fillColor    = '#a04040';
  } else if(entity1name == 'England' && entity2type == 'territory') {
    strokeColor  = '#a00000';
    strokeWeight = 1.5;
    strokeDash   = '1';
    fillColor    = '#a06060';
  } else if(entity1name == 'USA' && entity2type == 'secessionist') {
    strokeColor  = '#0000a0';
    strokeWeight = 2.0;
    strokeDash   = '1';
    fillColor    = '#900020';
  } else if(entity1name == 'CSA' && entity2type == 'territory') {
    strokeColor  = '#0000a0';
    strokeWeight = 2.0;
    strokeDash   = '1';
    fillColor    = '#ffa0a0';
  } else if(entity1name == 'USA' && entity2type == 'territory') {
    strokeColor  = '#0000a0';
    strokeWeight = 2.0;
    strokeDash   = '1';
    fillColor    = '#b0b0ff';
  } else if(entity1name == 'USA' && entity2type == 'colony') {
    strokeColor  = '#0000a0';
    strokeWeight = 2.0;
    strokeDash   = '1';
    fillColor    = '#7070d0';
  } else if(entity1name == 'USA' && entity2type == 'state') {
    strokeColor  = '#0000a0';
    strokeWeight = 2.0;
    strokeDash   = '1';
    fillColor    = '#4040a0';
  } else if(entity1name == 'Spain' && entity2type == 'territory') {
    strokeColor  = '#900018';
    strokeWeight = 1.5;
    strokeDash   = '1';
    fillColor    = '#f0a010';
  } else if(entity1name == 'Texas') {
    strokeColor  = '#900020';
    strokeWeight = 1.5;
    strokeDash   = '1';
    fillColor    = '#b00020';
  }

  // returning all style contents even if default, just to have as reference
  // (see https://leafletjs.com/reference-1.7.1.html#path-option)
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

function getFeatureLabel(feature) {
  return feature.properties.entity2name;
}

function getFeatureFont(feature) {
  // leave this useless switch statement here to show the fonts
  // that have been explored
  let fontchoice = 9;
  let fontname = 'sans serif';
  let fontscale = 1;
  // scale the font based upon the family, since some are wider than others
  switch(fontchoice) {
    case 0: fontname = 'Rubik';                fontscale = 81; break;
    case 1: fontname = 'Cabin Sketch';         fontscale = 87; break;
    case 2: fontname = 'Corben';               fontscale = 77; break;
    case 3: fontname = 'New Tegomin';          fontscale = 84; break;
    case 4: fontname = 'Special Elite';        fontscale = 81; break;
    case 5: fontname = 'Fredericka the Great'; fontscale = 81; break;
    case 6: fontname = 'Rye';                  fontscale = 73; break;
    case 7: fontname = 'Akaya Telivigala';     fontscale = 94; break;
    case 8: fontname = 'MedievalSharp';        fontscale = 85; break;
    case 9: fontname = 'Benne';                fontscale = 91; break;
  }
  return {
    name:  fontname,
    scale: fontscale
  };
}
