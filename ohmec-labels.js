// Copyright OHMEC contributors.
// Licensed under the Apache License, Version 2.0, see LICENSE for details.
// SPDX-License-Identifier: Apache-2.0

// Part of the OHMEC viewer; loaded before ohmec.js bootstrap.

function pointToLayer(point, latlng) {
  return L.marker(latlng, { opacity: 0.0, zIndexOffset: 1000 });
}

function getTextLabel(bounds, id, label, isPoint, properties, fontinfo, altProperties, ratio) {
  // Set width to 100, and scale height based upon ratio of bounds.
  // Not perfect due to lat/long relationships but good enough for now.

  let width = 100;
  let widthd2 = width/2;
  let height =
    (bounds.getEast() === bounds.getWest()) ? 1 :
    (width * (bounds.getNorth() - bounds.getSouth()) / (bounds.getEast() - bounds.getWest()));
  let heightd2 = height/2;
  let textLabel = document.createElementNS("http://www.w3.org/2000/svg", "svg");

  textLabel.setAttribute('xmlns',   "http://www.w3.org/2000/svg");
  textLabel.setAttribute('width',   width);
  textLabel.setAttribute('height',  height);
  textLabel.setAttribute('viewBox', "0 0 " + width + " " + height);

  let textLabelDefs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
  textLabel.appendChild(textLabelDefs);

  let labelScale = ("labelScale" in properties) ? properties.labelScale : 1.0;
  let rotateAdj = 0;
  let arcValue = 0;
  let xAdj = 0;
  let yAdj = 0;
  let useArc = "labelArc" in properties;

  // check for animation requirements
  if(altProperties) {
    if("labelScale" in properties || "labelScale" in altProperties) {
      let scaleA = ("labelScale" in    properties) ?    properties.labelScale : 1.0;
      let scaleB = ("labelScale" in altProperties) ? altProperties.labelScale : 1.0;
      labelScale = scaleA+((scaleB-scaleA)*ratio);
    }
    if("labelRotate" in properties || "labelRotate" in altProperties) {
      let rotateA = ("labelRotate" in    properties) ?    properties.labelRotate : 0;
      let rotateB = ("labelRotate" in altProperties) ? altProperties.labelRotate : 0;
      rotateAdj = (rotateB-rotateA)*ratio;
    }
    if("labelX" in properties || "labelX" in altProperties) {
      let xA = ("labelX" in    properties) ?    properties.labelX : 0;
      let xB = ("labelX" in altProperties) ? altProperties.labelX : 0;
      xAdj = (xB-xA)*ratio;
    }
    if("labelY" in properties || "labelY" in altProperties) {
      let yA = ("labelY" in    properties) ?    properties.labelY : 0;
      let yB = ("labelY" in altProperties) ? altProperties.labelY : 0;
      yAdj = (yB-yA)*ratio;
    }
    if("labelArc" in properties || "labelArc" in altProperties) {
      // arc is weird in that you want to move to either +INF or -INF, depending
      // upon where you start. so if one is negative, then other needs to default
      // to -INF, else +INF. Since averaging towards INF would make it flatten out
      // instantaneously, use 500 as about flat enough
      let arcA = 0;
      let arcB = 0;
      useArc = true;
      if(("labelArc" in properties) && ("labelArc" in altProperties)) {
        arcA =    properties.labelArc;
        arcB = altProperties.labelArc;
      } else if("labelArc" in properties) {
        arcA =    properties.labelArc;
        arcB = (arcA < 0) ? -500 : 500;
      } else if("labelArc" in altProperties) {
        arcB = altProperties.labelArc;
        arcA = (arcB < 0) ? -500 : 500;
      }
      arcValue = arcA+(arcB-arcA)*ratio;
    }
  } else if(useArc) {
    arcValue = properties.labelArc;
  }

  let segments = label.split('\n');
  let labelLength = label.length;
  // add in any subLabels
  if("subLabel" in properties) {
    let subsegments = properties.subLabel.split('\n');
    segments = segments.concat(subsegments);
  }
  if(segments.length > 1) {
    labelLength = segments[0].length;
    for(let i=1; i<segments.length; i++) {
      if(segments[i].length > labelLength) {
        labelLength = segments[i].length;
      }
    }
  }

  let fontsize = isPoint ? fontinfo.scale/25 : labelLength ? fontinfo.scale/labelLength : 1;
  fontsize *= labelScale;

  let inner = '';
  for(let i=0; i<segments.length; i++) {
    let segmentLabel = segments[i];
    // spaces might be used for alignment, but get glommed in HTML, convert to &nbsp;
    let regexSpace = new RegExp(" ", "g");
    segmentLabel = segmentLabel.replace(regexSpace,'&nbsp;');
    let thisFontsize = fontsize*(1 - 0.2*i);  // font shrinks a bit on each line
    // if labelArc is used, we first need to define the circular path that the text will traverse
    // it is a circle with radius 'arc' that has a tangent at (50,h/2), either with the circle below
    // and the text on the top (if arc > 0) or the circle above with the text on the bottom (arc < 0).
    if(useArc) {
      let my   = heightd2 + 2*arcValue + i*fontsize;
      let ar   = (arcValue >= 0) ? arcValue : -arcValue;
      let pos  = (arcValue >= 0) ? 1 : 0;
      let ar2n = arcValue*2;
      let ar2p = arcValue*-2;
      inner += '<path id="arcpath' + i + id + '" stroke="none" fill="none" d="m 50,' + my;
      inner += ' a ' + ar + ',' + ar + ' 0 0 ' + pos + ' 0,' + ar2p;
      inner +=   ' ' + ar + ',' + ar + ' 0 0 ' + pos + ' 0,' + ar2n + ' z"/>';
    }
    let justify = isPoint ? 'left' : 'middle';
    if("labelJustify" in properties) {
      justify = properties.labelJustify;
    }
    let anchor = 'middle';
    let tx = width*0.5;
    let ty = height*0.5;
    switch(justify) {
      case 'above': anchor = 'middle'; tx = width*0.50; ty = height*0.48; break;
      case 'below': anchor = 'middle'; tx = width*0.50; ty = height*0.54; break;
      case 'right': anchor =    'end'; tx = width*0.48; ty = height*0.51; break;
      case 'left':  anchor =  'start'; tx = width*0.52; ty = height*0.51; break;
    }
    inner += '<text text-anchor="' + anchor + '"';
    inner += ' font-family="' + fontinfo.name + ', Courier, sans-serif"';
    inner += ' fill="' + fontinfo.color + '"';
    if("labelSpacing" in properties) {
      inner += ' letter-spacing="' + properties.labelSpacing + '"';
    }
    inner += ' font-size="' + thisFontsize.toFixed(2) + 'px"';
    if("labelRotate" in properties || "labelX" in properties || "labelY" in properties) {
      inner += ' transform="';
      if("labelRotate" in properties) {
        inner += ' rotate(' + (properties.labelRotate + rotateAdj) + ' ' + widthd2 + ' ' + heightd2 + ')';
      }
      let xoff = ("labelX" in properties) ? (properties.labelX + xAdj) : xAdj;
      let yoff = ("labelY" in properties) ? (properties.labelY + yAdj) : yAdj;
      inner += ' translate(' + xoff + ' ' + yoff + ')"';
    }
    if(!useArc) {
      let ny = ty + i*fontsize;
      inner += ' x=' + tx + ' y=' + ny;
    }
    inner += '>';
    if(useArc) {
      inner += '<textPath href="#arcpath' + i + id + '" startOffset="50%">' + segmentLabel + '</textPath></text>';
    } else {
      inner += segmentLabel + '</text>';
    }
  }
  textLabel.innerHTML = inner;
  return textLabel;
}

function getFeatureLabel(feature) {
  if("noLabel" in feature.properties && feature.properties.noLabel) {
    return ""
  } else if("noLabel" in feature.style && feature.style.noLabel) {
    return ""
  } else if("entity2name" in feature.properties) {
    return feature.properties.entity2name;
  } else {
    return feature.properties.entity1name;
  }
}

function getFeatureFont(feature, useHiFont) {
  // default styles
  let fontname   = 'sans serif';
  let fontscale  = 80;
  let fontcolor  = "black";

  if("style" in feature) {
    // scale the font based upon the family, since some are wider than others
    switch(feature.style.fontname) {
      case 'Rubik':                fontscale = 81; break;
      case 'Rubik Wet Paint':      fontscale = 81; break;
      case 'Cabin Sketch':         fontscale = 87; break;
      case 'Corben':               fontscale = 77; break;
      case 'New Tegomin':          fontscale = 84; break;
      case 'Special Elite':        fontscale = 81; break;
      case 'Fredericka the Great': fontscale = 81; break;
      case 'Rye':                  fontscale = 73; break;
      case 'Akaya Telivigala':     fontscale = 94; break;
      case 'MedievalSharp':        fontscale = 85; break;
      case 'Lugrasimo':            fontscale = 69; break;
      case 'Benne':                fontscale = 91; break;
    }
    return {
      name:  feature.style.fontname,
      scale: useHiFont ? (fontscale*1.05) : fontscale,
      color: useHiFont ? feature.style.hifontcolor : feature.style.fontcolor
    };
  } else {
    return {
      name:  fontname,
      scale: fontscale,
      color: fontcolor
    };
  }
}

function onEachFeature(feature, layer) {
  layer.on({
    mouseover: infoboxFeatureOn,
    mouseout:  infoboxFeatureOff,
    mousedown: lowerZ
  });

  let labelBounds;
  let isPoint = feature.geometry.type === "Point";

  if (isPoint) {
    // create icon for Point, and create label bounds
    let coords = feature.geometry.coordinates;
    let plon = coords[0];
    let plat = coords[1];
    let iconSize = 0.05;  // arbitraty size of icon, 0.05 degrees
    let bboxSize = 1.0;   // arbitraty size of label bounding box, 1 degree

    // allow the icon and label box to be scaled
    if("iconScale" in feature.properties) {
      iconSize = iconSize * feature.properties.iconScale;
      bboxSize = bboxSize * feature.properties.iconScale;
    }

    let iconElementBounds = [ [ plat+iconSize/2, plon-iconSize/2 ], [ plat-iconSize/2, plon+iconSize/2 ] ];
    let poiType = "poi";
    let fillColor = "#c0c0ff";

    // other available icon images
    if(feature.properties.entity1type === 'settlement'  ||
       feature.properties.entity1type === 'archaeology' ||
       feature.properties.entity1type === 'diamond'     ||
       feature.properties.entity1type === 'battle'      ||
       feature.properties.entity1type === 'camp') {
      poiType = feature.properties.entity1type;
    }
    // if POI is in entity2, use the poi file as input, then modify
    // the fill color to inherit from entity1
    if(feature.properties.entity2type === 'settlement'  ||
       feature.properties.entity2type === 'archaeology' ||
       feature.properties.entity2type === 'diamond'     ||
       feature.properties.entity2type === 'battle'      ||
       feature.properties.entity2type === 'camp'        ||
       feature.properties.entity2type === 'poi') {
      poiType = feature.properties.entity2type;
      if("style" in feature) {
        fillColor = feature.style.fillColor;
      }
    }

    // Author's note: I can't find a way to do this via the preferred SVG file
    // manipulation method. So instead we're adding color via a more cumbersom
    // direct SVG creation. The file inclusion method is left here for
    // a brief period in case I can find the better way.
//  let iconFile = 'poi_' + poiType + '.svg';
//  feature.iconOverlay = L.imageOverlay(iconFile, iconElementBounds, { zIndex: 300 });

    let poiElement = document.createElementNS("http://www.w3.org/2000/svg", "svg");

    poiElement.setAttribute('xmlns',   "http://www.w3.org/2000/svg");
    poiElement.setAttribute('width',   40);
    poiElement.setAttribute('height',  40);
    poiElement.setAttribute('viewBox', "0 0 40 40");
    let poiInner = '<path d="';
    if(poiType === 'settlement') {
      poiInner += "M 20,30 A 10,10 0 0 0 20,10 10,10 0 0 0 20,30 z\n";
      poiInner += "M 20,13\n";
      poiInner += "L 27,20 L 25,20 L 25,26 L 21.5,26 L 21.5,23 L 18.5,23\n";
      poiInner += "L 18.5,26 L 15,26 L 15,20 L 13,20 z";
    } else if(poiType === 'archaeology') {
      poiInner += "M   20,30   A  10,10  0 0 0   20,10   10,10   0 0 0   20,30   z\n";
      poiInner += "M   20,18.5 A 3.5,3.5 0 1 1   20,11.5 3.5,3.5 0 1 1   20,18.5 z\n";
      poiInner += "M 15.7,26   A 3.5,3.5 0 1 1 15.7,19   3.5,3.5 0 1 1 15.7,26   z\n";
      poiInner += "M 24.3,26   A 3.5,3.5 0 1 1 24.3,19   3.5,3.5 0 1 1 24.3,26   z";
    } else if(poiType === 'diamond') {
      poiInner += "M 20,30 A 10,10 0 0 0 20,10 10,10 0 0 0 20,30 z\n";
      poiInner += "M 20,13\n";
      poiInner += "L 27,20 L 20,27 L 13,20 z";
    } else if(poiType === 'battle') {
      poiInner += "M 20,30 A 10,10 0 0 0 20,10 10,10 0 0 0 20,30 z\n";
      poiInner += "M 20.0,17.2 L 22.8,14.3 L 25.7,14.3 L 25.7,17.2\n";
      poiInner += "L 22.8,20.0 L 23.5,20.7 L 22.8,21.4 L 24.2,22.8 L 25.7,22.8\n";
      poiInner += "L 26.4,23.5 L 25.7,24.2 L 26.4,25.0 L 25.0,26.4 L 24.2,25.7\n";
      poiInner += "L 23.5,26.4 L 22.8,25.7 L 22.8,24.2 L 21.4,22.8 L 20.7,23.5\n";
      poiInner += "L 20.0,22.8\n";
      poiInner += "L 19.3,23.5 L 18.6,22.8 L 17.2,24.2 L 17.2,25.7 L 16.5,26.4\n";
      poiInner += "L 15.8,25.7 L 15.1,26.4 L 13.6,25.0 L 14.3,24.2 L 13.6,23.5\n";
      poiInner += "L 14.3,22.8 L 15.8,22.8 L 17.2,21.4 L 16.5,20.7 L 17.2,20.0\n";
      poiInner += "L 14.3,17.2 L 14.3,14.3 L 17.2,14.3 z\n";
      poiInner += "M 24.2,15.8 L 18.6,21.4\n";
      poiInner += "M 15.8,15.8 L 21.4,21.4";
    } else if(poiType === 'camp') {
      poiInner += "M 20,30 A 10,10 0 0 0 20,10 10,10 0 0 0 20,30 z\n";
      poiInner += "M 19,12\n";
      poiInner += "L 28,24 L 28.5,24 L 11.5,24 L 12,24 L 21,12 L 20,13.3 z\n";
      poiInner += "M 20,18\n";
      poiInner += "L 24.5,24 L 15.5,24 L 20,18 z";
    } else {
      poiInner += "M 20,30 A 10,10 0 0 0 20,10 10,10 0 0 0 20,30 z\n";
      poiInner += "M 20,13\n";
      poiInner += "L 22.1,17.2 L 26.7,17.8 L 23.3,21.1 L 24.1,25.7 L 20.0,23.5\n";
      poiInner += "L 15.9,25.7 L 16.7,21.1 L 13.3,17.8 L 17.9,17.2 z";
    }
    poiInner += '" stroke-width="0.75" fill="' + fillColor + '" stroke = "black" />';
    poiElement.innerHTML = poiInner;
    feature.iconOverlay = L.svgOverlay(poiElement, iconElementBounds, { zIndex: 300 });

    // create bounding box for the label since a point has no bounds.
    // the bounds are arbitrary for Point since there is no default size.
    // just creating a "square" 1 degree high and wide centered around Point.

    labelBounds = L.latLngBounds([[plat+bboxSize/2, plon+bboxSize/2], [plat-bboxSize/2, plon-bboxSize/2]]);
  } else {
    labelBounds = layer.getBounds();
  }

  boundsHash[feature.id] = labelBounds;

  // create SVG for label
  feature.origBounds = labelBounds;
  feature.textLabel = getTextLabel(
    labelBounds,
    feature.id,
    getFeatureLabel(feature),
    isPoint,
    feature.properties,
    getFeatureFont(feature,false));

  let labelElementBounds = [ [ labelBounds.getNorth(), labelBounds.getWest() ], [ labelBounds.getSouth(), labelBounds.getEast() ] ];
  feature.textOverlay = L.svgOverlay(feature.textLabel, labelElementBounds);
}

function updateTextOverlay(feature, bounds, useHiFont, altProperties, ratio) {
  // create SVG for label
  let textLabel = getTextLabel(
    bounds,
    feature.id,
    getFeatureLabel(feature),
    false,
    feature.properties,
    getFeatureFont(feature,useHiFont),
    altProperties,
    ratio);

  let svgElementBounds = [ [ bounds.getNorth(), bounds.getWest() ], [ bounds.getSouth(), bounds.getEast() ] ];
  return L.svgOverlay(textLabel, svgElementBounds);
}

