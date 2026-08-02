// Copyright OHMEC contributors.
// Licensed under the Apache License, Version 2.0, see LICENSE for details.
// SPDX-License-Identifier: Apache-2.0

// SVG fill textures for feature polygons (classic scripts; no Leaflet plugin).
// Patterns must live in the *same* SVG as Leaflet paths or fills silently fail.
// userSpaceOnUse + Leaflet layer-pixel coords => constant screen-pixel spacing.

let ohmecTextureDefs = null;
let ohmecTextureSvg = null;
let ohmecTextureWarned = {};
let ohmecTextureZoomBound = false;
const OHMEC_HATCH_PX = 20;
const OHMEC_HATCH_STROKE = '#000000';
const OHMEC_HATCH_STROKE_WIDTH = '1';
const OHMEC_HATCH_STROKE_OPACITY = '0.5';

// Supported texture names and their hatch path(s) inside an OHMEC_HATCH_PX tile.
const OHMEC_TEXTURES = {
  crosshatch: function (size) {
    let half = size / 2;
    return [
      'M0,0 L' + size + ',' + size +
        ' M-' + half + ',' + half + ' L' + half + ',' + (size + half) +
        ' M' + half + ',-' + half + ' L' + (size + half) + ',' + half,
      'M' + size + ',0 L0,' + size +
        ' M' + (size + half) + ',' + half + ' L' + half + ',' + (size + half) +
        ' M' + half + ',-' + half + ' L-' + half + ',' + half
    ];
  },
  // Bottom-left to top-right diagonals.
  diagonal: function (size) {
    let half = size / 2;
    return [
      'M0,' + size + ' L' + size + ',0' +
        ' M-' + half + ',' + half + ' L' + half + ',-' + half +
        ' M' + half + ',' + (size + half) + ' L' + (size + half) + ',' + half
    ];
  },
  horizontal: function (size) {
    let mid = size / 2;
    return [
      'M0,' + mid + ' L' + size + ',' + mid
    ];
  },
  vertical: function (size) {
    let mid = size / 2;
    return [
      'M' + mid + ',0 L' + mid + ',' + size
    ];
  }
};

function ensureTextureRoot(pathEl) {
  if (typeof ohmap === 'undefined' || !ohmap) {
    return null;
  }
  // Prefer the SVG that owns the path being filled.
  let svg = (pathEl && pathEl.ownerSVGElement) ||
    ohmap.getPanes().overlayPane.querySelector('svg');
  if (!svg) {
    return null;
  }
  if (ohmecTextureDefs && ohmecTextureDefs.isConnected && ohmecTextureSvg === svg) {
    return ohmecTextureDefs;
  }
  // Drop the old detached defs helper SVG if present from earlier builds.
  let orphan = document.getElementById('ohmec-texture-svg');
  if (orphan && orphan !== svg) {
    orphan.remove();
  }
  let defs = svg.querySelector('defs');
  if (!defs) {
    defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    svg.insertBefore(defs, svg.firstChild);
  }
  ohmecTextureSvg = svg;
  ohmecTextureDefs = defs;
  bindTextureZoomRefresh();
  return defs;
}

function bindTextureZoomRefresh() {
  if (ohmecTextureZoomBound || typeof ohmap === 'undefined' || !ohmap) {
    return;
  }
  ohmecTextureZoomBound = true;
  // Leaflet redraws path geometry in layer pixels on view reset; re-apply
  // fills so hatch stays in screen-pixel space and survives style resets.
  ohmap.on('zoomend viewreset', refreshAllFeatureTextures);
}

function refreshAllFeatureTextures() {
  if (typeof layerById === 'undefined' || typeof activeIds === 'undefined') {
    return;
  }
  for (let id of activeIds) {
    let lyr = layerById[id];
    if (lyr) {
      applyFeatureTexture(lyr);
    }
  }
}

function patternIdFor(texture, fillColor) {
  let colorKey = String(fillColor || 'none').replace(/[^a-zA-Z0-9]/g, '');
  if (colorKey.length === 0) {
    colorKey = 'none';
  }
  return 'ohmec-tex-' + texture + '-' + colorKey;
}

function knownTextureNames() {
  return Object.keys(OHMEC_TEXTURES);
}

function ensureTexturePattern(texture, fillColor, pathEl) {
  if (!(texture in OHMEC_TEXTURES)) {
    return null;
  }
  let defs = ensureTextureRoot(pathEl);
  if (!defs) {
    return null;
  }
  let id = patternIdFor(texture, fillColor);
  // Must exist in *this* SVG's defs (not a leftover from another root).
  if (defs.querySelector('#' + id)) {
    return id;
  }
  let NS = 'http://www.w3.org/2000/svg';
  let size = OHMEC_HATCH_PX;
  let pattern = document.createElementNS(NS, 'pattern');
  pattern.id = id;
  // Leaflet path coords are layer pixels at the current zoom, so a fixed
  // userSpaceOnUse tile size keeps hatch spacing constant on screen.
  pattern.setAttribute('patternUnits', 'userSpaceOnUse');
  pattern.setAttribute('width', String(size));
  pattern.setAttribute('height', String(size));

  let bg = document.createElementNS(NS, 'rect');
  bg.setAttribute('width', String(size));
  bg.setAttribute('height', String(size));
  bg.setAttribute('fill', fillColor || '#c0c0c0');
  pattern.appendChild(bg);

  let pathDs = OHMEC_TEXTURES[texture](size);
  for (let d of pathDs) {
    let line = document.createElementNS(NS, 'path');
    line.setAttribute('d', d);
    line.setAttribute('stroke', OHMEC_HATCH_STROKE);
    line.setAttribute('stroke-width', OHMEC_HATCH_STROKE_WIDTH);
    line.setAttribute('stroke-opacity', OHMEC_HATCH_STROKE_OPACITY);
    line.setAttribute('fill', 'none');
    pattern.appendChild(line);
  }

  defs.appendChild(pattern);
  return id;
}

// Back-compat alias used by earlier call sites / console debugging.
function ensureCrosshatchPattern(fillColor, pathEl) {
  return ensureTexturePattern('crosshatch', fillColor, pathEl);
}

function applyFeatureTexture(layer) {
  if (!layer || !layer.feature || !layer._path) {
    return;
  }
  if (layer.feature.geometry && layer.feature.geometry.type === 'Point') {
    return;
  }
  let texture = layer.feature.properties && layer.feature.properties.texture;
  if (!texture) {
    return;
  }
  if (!(texture in OHMEC_TEXTURES)) {
    if (!ohmecTextureWarned[texture]) {
      ohmecTextureWarned[texture] = true;
      console.warn(
        '[ohmec-texture] unknown texture "' + texture +
        '" (supported: ' + knownTextureNames().join(', ') + ')'
      );
    }
    return;
  }
  let fillColor = (layer.feature.style && layer.feature.style.fillColor) || '#c0c0c0';
  let id = ensureTexturePattern(texture, fillColor, layer._path);
  if (!id) {
    return;
  }
  // Local URL reference within the same SVG document.
  layer._path.setAttribute('fill', 'url(#' + id + ')');
}

/* ohmec module exports */
(function (g) {
  g.ensureTextureRoot = ensureTextureRoot;
  g.patternIdFor = patternIdFor;
  g.ensureTexturePattern = ensureTexturePattern;
  g.ensureCrosshatchPattern = ensureCrosshatchPattern;
  g.applyFeatureTexture = applyFeatureTexture;
  g.refreshAllFeatureTextures = refreshAllFeatureTextures;
  g.knownTextureNames = knownTextureNames;
  g.OHMEC_TEXTURES = OHMEC_TEXTURES;
})(typeof window !== 'undefined' ? window : globalThis);
