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

  // big lookup table for entity types and names, mapping to colors and other info
  let entity1name = feature.properties.entity1name;
  let entity2type = feature.properties.entity2type;
  let entity2name = feature.properties.entity2name;

  // declare a new property 'borderless' if not already given
  let borderless  = false;
  if("borderless" in feature.properties) {
    borderless = feature.properties.borderless;
  }

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
  } else if(entity1name == 'Indigenous' && entity2type == 'tribe') {
    // don't override a pre-defined property, but otherwise set to true for indigenous
    if(!("borderless" in feature.properties)) {
      borderless = true;
    }
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
    fillColor    = '#a070d0';
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
  } else if(entity1name == 'Netherlands' && entity2type == 'colony') {
    strokeColor  = '#b00000';
    strokeWeight = 1.5;
    strokeDash   = '1';
    fillColor    = '#1088cc';
  } else if(entity1name == 'Texas') {
    strokeColor  = '#900020';
    strokeWeight = 1.5;
    strokeDash   = '1';
    fillColor    = '#b00020';
  } else if(entity1name == 'Mexico') {
    strokeColor  = '#b00023';
    strokeWeight = 1.5;
    strokeDash   = '1';
    fillColor    = '#0d5036';
  } else if(entity1name == 'Guatemala') {
    strokeColor  = '#ffffff';
    strokeWeight = 1.5;
    strokeDash   = '1';
    fillColor    = '#0d64b0';
  } else if(entity1name == 'Belize') {
    strokeColor  = '#043c70';
    strokeWeight = 1.5;
    strokeDash   = '1';
    fillColor    = '#b8000c';
  } else if(entity1name == 'El Salvador') {
    strokeColor  = '#ffffff';
    strokeWeight = 1.5;
    strokeDash   = '1';
    fillColor    = '#0b00a0';
  } else if(entity1name == 'Honduras') {
    strokeColor  = '#000080';
    strokeWeight = 1.5;
    strokeDash   = '1';
    fillColor    = '#ffffff';
  } else if(entity1name == 'Nicaragua') {
    strokeColor  = '#837a1c';
    strokeWeight = 1.5;
    strokeDash   = '1';
    fillColor    = '#1660bc';
  } else if(entity1name == 'Costa Rica') {
    strokeColor  = '#103078';
    strokeWeight = 1.5;
    strokeDash   = '1';
    fillColor    = '#ba001c';
  } else if(entity1name == 'Panama') {
    strokeColor  = '#c80015';
    strokeWeight = 1.5;
    strokeDash   = '1';
    fillColor    = '#092088';
  } else if(entity1name == 'Canada' && entity2type == 'province') {
    strokeColor  = '#ffffff';
    strokeWeight = 1.5;
    strokeDash   = '1';
    fillColor    = '#da0015';
  } else if(entity1name == 'Canada') {
    strokeColor  = '#ffffff';
    strokeWeight = 1.5;
    strokeDash   = '1';
    fillColor    = '#ff8095';
  } else if(entity1name == 'England' && entity2type == 'dominion' && entity2name == 'Newfoundland') {
    strokeColor  = '#bb0020';
    strokeWeight = 1.5;
    strokeDash   = '1';
    fillColor    = '#031056';
  }

  // since we're making borderless a largely hidden property, and
  // using it later, set it indefinitely
  feature.properties.borderless = borderless;
  if(borderless) {
    strokeOn     = false;
    fillOpacity  = 0.0;
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
  if("entity2name" in feature.properties) {
    return feature.properties.entity2name;
  } else {
    return feature.properties.entity1name;
  }
}

function getFeatureFont(feature) {
  // default styles
  let fontchoice = 9;
  let fontname   = 'sans serif';
  let fontscale  = 1;
  let fontcolor  = "black";

  // lookup table for entity types and names, mapping to font and font color and other info
  let entity1name = feature.properties.entity1name;
  let entity2type = feature.properties.entity2type;

  if(entity1name == 'Indigenous' && entity2type == 'tribe') {
    fontchoice = 3;
    fontcolor  = "#c00000";
  }

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
    scale: fontscale,
    color: fontcolor
  };
}
