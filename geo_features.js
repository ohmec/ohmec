// Copyright OHMEC contributors.
// Licensed under the Apache License, Version 2.0, see LICENSE for details.
// SPDX-License-Identifier: Apache-2.0

function colorScale(color1, color2, scale1, scale2, value) {
  let r1, g1, b1, r2, g2, b2;
  let re = /#(..)(..)(..)/;
  let m1 = color1.match(re);
  if(m1 !== null) {
    r1 = parseInt(m1[1],16);
    g1 = parseInt(m1[2],16);
    b1 = parseInt(m1[3],16);
  } else {
    throw "bad color " + color1;
  }
  let m2 = color2.match(re);
  if(m2 !== null) {
    r2 = parseInt(m2[1],16);
    g2 = parseInt(m2[2],16);
    b2 = parseInt(m2[3],16);
  } else {
    throw "bad color " + color2;
  }
  let rspan = r2-r1;
  let gspan = g2-g1;
  let bspan = b2-b1;
  let ratio = (value-scale1) / (scale2-scale1);
  let rc = Math.round(rspan*ratio+r1).toString(16);
  let gc = Math.round(gspan*ratio+g1).toString(16);
  let bc = Math.round(bspan*ratio+b1).toString(16);
  if(rc.length == 1) rc = "0" + rc;
  if(gc.length == 1) gc = "0" + gc;
  if(bc.length == 1) bc = "0" + bc;
  return "#" + rc + gc + bc;
}

function featureStyle(feature) {
  // default styles
  let strokeOn      = true;
  let strokeOpacity = 1.0;
  let strokeColor   = 'white';
  let strokeWeight  = 2.0;
  let strokeDash    = '3';
  let fillOn        = true;
  let fillOpacity   = 0.5;
  let fillColor     = '#c0c0c0';

  // big lookup table for entity types and names, mapping to colors and other info
  let entity1name = feature.properties.entity1name;
  let entity2type = feature.properties.entity2type;
  if(entity1name == 'England' && entity2type == 'grant') {
    strokeColor  = '#a00000';
    strokeWeight = 1.0;
    strokeDash   = '3';
    fillColor    = '#a07070';
  } else if(entity1name == 'England' && entity2type == 'colony') {
    strokeColor  = '#a00000';
    strokeWeight = 1.5;
    strokeDash   = '1';
    fillColor    = '#a05050';
  } else if(entity1name == 'USA') {
    strokeColor  = '#0000a0';
    strokeWeight = 2.0;
    strokeDash   = '1';
    fillColor    = '#4040a0';
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
  let fontchoice = 1;
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
  }
  return {
    name:  fontname,
    scale: fontscale
  };
}
