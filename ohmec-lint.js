// Copyright OHMEC contributors.
// Licensed under the Apache License, Version 2.0, see LICENSE for details.
// SPDX-License-Identifier: Apache-2.0

// Part of the OHMEC viewer; loaded before ohmec.js bootstrap.

function recordGeoLintError(message) {
  let text = (typeof message === 'string') ? message :
    (message && message.message) ? message.message : String(message);
  geoLintErrors.push(text);
  console.error('[geo_lint] ' + text);
}

function showGeoLintWarnings() {
  if (geoLintErrors.length === 0) {
    return;
  }
  let el = document.querySelector('#geolintwarn');
  if (!el) {
    return;
  }
  el.hidden = false;
  let summary = document.querySelector('#geolintwarn-summary');
  let detail = document.querySelector('#geolintwarn-detail');
  if (summary) {
    summary.textContent = 'Skipped ' + geoLintErrors.length +
      ' data issue' + (geoLintErrors.length === 1 ? '' : 's') +
      ' so the map could still load. See console for the full log.';
  }
  if (detail) {
    detail.textContent = geoLintErrors.join('\n');
  }
}

function geo_lint(dataset, convertFromNativeLands, replaceIndigenous, applyCherokeeExample) {
  let id_set = new Set();
  let newFeatureList = [];
  if(dataset.type !== "FeatureCollection") {
    recordGeoLintError("expected dataset type === FeatureCollection, got " + dataset.type);
    dataset.features = [];
    return;
  }
  if("viewpoint" in dataset) {
    try {
      if("startdatestr" in dataset.viewpoint && !timelineDateMinOverride) {
        timelineDateMinOverride = str2date(dataset.viewpoint.startdatestr,false);
      }
      if("curdatestr" in dataset.viewpoint && timelineDateStart === timelineDateStartDefault) {
        timelineDateStart = str2date(dataset.viewpoint.curdatestr,false);
      }
      if("enddatestr" in dataset.viewpoint && !timelineDateMaxOverride) {
        timelineDateMaxOverride = str2date(dataset.viewpoint.enddatestr,true);
      }
    } catch (e) {
      recordGeoLintError("viewpoint date error: " + e);
    }
    if("defaultLat" in dataset.viewpoint && latSettingStart === latSettingDefault) {
      latSettingStart = dataset.viewpoint.defaultLat;
    }
    if("defaultLon" in dataset.viewpoint && lonSettingStart === lonSettingDefault) {
      lonSettingStart = dataset.viewpoint.defaultLon;
    }
    if("defaultZ" in dataset.viewpoint && zoomSettingStart === zoomSettingDefault) {
      zoomSettingStart = dataset.viewpoint.defaultZ;
    }
  }
  if("popups" in dataset) {
    for(let p of dataset.popups) {
      try {
        let pentry = {};
        pentry.text = p.text;
        pentry.startDate = str2date(p.startdatestr,false);
        pentry.endDate = str2date(p.enddatestr,false);
        pentry.coordinates = p.coordinates;
        pentry.done = false;
        pentry.popup = null;
        if("style" in p) {
          pentry.style = p.style;
        }
        popupList.push(pentry);
      } catch (e) {
        recordGeoLintError("popup error: " + e);
      }
    }
  }
  ohmap.setView([latSettingStart, lonSettingStart],zoomSettingStart);
  if(!("features" in dataset)) {
    recordGeoLintError("no features in dataset");
    dataset.features = [];
    return;
  }
  for(let f of dataset.features) {
    let acceptedId = null;
    try {
      let removeFeature = false;
      if(f.type !== "Feature") {
        throw "feature type not Feature, got " + f.type;
      }
      if(id_set.has(f.id)) {
        throw "got duplicate dataset ID " + f.id;
      }
      id_set.add(f.id);
      acceptedId = f.id;
      fHash[f.id] = f;
      if(!("geometry" in f)) {
        throw "no geometry in feature " + f.id;
      }
      let g = f.geometry;
      if((g.type !== "Polygon") && (g.type !== "MultiPolygon") && (g.type !== "Point") && (g.type !== "LineString")) {
        throw "feature " + f.id + " should have geometry of Polygon, MultiPolygon, LineString or Point, got " + g.type;
      }
      if("properties" in f) {
        let p = f.properties;
        if(convertFromNativeLands) {
          // make sure the feature lands in NA. NOTE this is clearly intended for
          // adding to the NA database and not others, but this can be extended
          // and formalized when other databases are considered.
          // make sure this feature is in North America before adding
          let bounds = L.polygon(f.geometry.coordinates).getBounds();
          // roughly compare against Panama in the south (7N) and Greenland on the east (21W)
          // geoJson has order [lon,lat] so oddly this flips the definitions of south and east
          let boundsE = bounds.getSouth();
          let boundsW = bounds.getNorth();
          let boundsS = bounds.getWest();
          let boundsN = bounds.getEast();
          let is_na = (boundsE <= -21) && (boundsS >= 7);
          // there are still some in NW South America, clip those too
          if(is_na && (boundsN < 12.68) && (boundsW > -77)) {
            is_na = false;
          }
          if(is_na) {
            // convert the format from nativelands.ca into extended GeoJSON format
            for(let required of ["Name", "color"]) {
              if(!(required in p)) {
                throw "feature " + f.id + " missing property " + required;
              }
            }
            p.entity1type = "nation";
            p.entity1name = "Indigenous";
            p.entity2type = "tribe";
            // for larger labels, put a carriage return for each parenthetical
            p.entity2name = p.Name.replace(/ \(/g,'\n(');
            p.fidelity = 4;
            p.startdatestr = "700";   // arbitrary, and to be rectified with more research
            p.enddatestr   = "1768";  // arbitrary, and to be rectified with more research
            p.startDate = str2date(p.startdatestr,false);
            p.endDate = str2date(p.enddatestr,true);
            if("description" in p) {
              p.source = p.description;
            }
          } else {
            removeFeature = true;
          }
        } else {
          for(let required of ["entity1type", "entity1name", "fidelity",
              "startdatestr", "enddatestr"]) {
            if(!(required in p)) {
              throw "feature " + f.id + " missing property " + required;
            }
          }
          if(!("source" in p) && !("sources" in p)) {
            throw "feature " + f.id + " requires either `source` or `sources` property";
          }
          p.startDate = str2date(p.startdatestr,false);
          if(p.enddatestr == 'present') {
            p.endDate = today;
          } else {
            p.endDate = str2date(p.enddatestr,true);
          }
          let fid = p.fidelity;
          if(fid < 1 || fid > 5) {
            throw "fidelity for " + f.id + " should be between 1 (lowest) and 5 (highest), got " + fid;
          }
          if("texture" in p) {
            let knownTextures = {
              crosshatch: true,
              diagonal: true,
              horizontal: true,
              vertical: true,
              dot: true,
              x: true
            };
            if(!(p.texture in knownTextures)) {
              throw "feature " + f.id + " has unknown texture \"" + p.texture +
                "\" (supported: " + Object.keys(knownTextures).join(', ') + ")";
            }
          }
          // if nativelands.ca is used, don't add homegrown indigenous
          if(replaceIndigenous && p.entity1name === 'Indigenous') {
            removeFeature = true;
          }
          if(applyCherokeeExample && p.entity1name === 'Indigenous') {
            removeFeature = true;
          }
          if(!applyCherokeeExample && p.entity1type === 'tribe' && p.entity1name.match(/Cherokee/)) {
            removeFeature = true;
          }
          if("coordinate_copy" in f.geometry) {
            if(f.geometry.coordinate_copy in fHash) {
              if(f.geometry.coordinate_copy === f.id) {
                throw "can't copy coordinates from self (id " + f.id + ")";
              } else if(fHash[f.geometry.coordinate_copy].geometry.type === f.geometry.type) {
                f.geometry.coordinates = fHash[f.geometry.coordinate_copy].geometry.coordinates;
              } else {
                throw "can't copy coordinates from " + f.geometry.coordinate_copy + " type " +
                  fHash[f.geometry.coordinate_copy].geometry.type + " to " + f.id + " type " + f.geometry.type;
              }
            } else {
              throw "can't copy coordinates from " + f.geometry.coordinate_copy + " for " + f.id;
            }
          }
          if("coordinate_copies" in f.geometry) {
            f.geometry.coordinates = [];
            for(let copyid of f.geometry.coordinate_copies) {
              if(copyid in fHash) {
                if(f.geometry.type !== 'MultiPolygon') {
                  throw "can't copy multiple coordinates to " + f.id + " type " + f.geometry.type;
                } else if(fHash[copyid].geometry.type === 'Polygon') {
                  f.geometry.coordinates.push(fHash[copyid].geometry.coordinates);
                } else if(fHash[copyid].geometry.type === 'MultiPolygon') {
                  for(let c=0;c<fHash[copyid].geometry.coordinates.length;c++) {
                    f.geometry.coordinates.push(fHash[copyid].geometry.coordinates[c]);
                  }
                } else {
                  throw "can't copy coordinates from " + copyid + " type " + fHash[copyid].geometry.type;
                }
              } else {
                throw "can't copy coordinates from " + copyid + " for " + f.id;
              }
            }
          }
        }
      } else {
        throw "no properties in feature " + f.id;
      }
      // capture the style from the style list.
      // apply styles as matching in order, starting with default
      // be careful to not override given styles, so hold those and
      // reapply at the end
      if(convertFromNativeLands) {
        f.style = {};
        f.style.strokeColor = f.properties.color;
        f.style.fillColor = f.properties.color;
        f.style.strokeDash = 1;
        f.style.strokeOn = true;
        f.style.strokeOpacity = 1;
        f.style.strokeWeight = 0.5;
        f.style.fontname = "New Tegomin";
        f.style.fontcolor = "#105010";
        f.style.fillOn = true;
        f.style.fillOpacity = 0.1;
        f.style.borderless = false;
        f.style.layerDepth = "default";
      } else if("styles" in dataset) {
        if("style" in f) {
          f.stylehold = f.style;
        }
        f.style = {};
        for(let s of dataset.styles) {
          if(s.type === "default" && "style" in s) {
            for(let e in s.style) {
              f.style[e] = s.style[e];
            }
          } else if(s.type === "match") {
            for(let m in s.match) {
              let v = s.match[m];
              // geometry type is special, rest are for properties
              if(m === "geometryType") {
                if(f.geometry.type === v) {
                  for(let e in s.style) {
                    f.style[e] = s.style[e];
                  }
                }
              } else {
                let match = 1;
                for(let m in s.match) {
                  let v = s.match[m];
                  if(f.properties[m] !== v) {
                    match = 0;
                  }
                }
                if(match) {
                  for(let e in s.style) {
                    f.style[e] = s.style[e];
                  }
                  if("emblem" in s) {
                    f.emblem = s.emblem;
                  }
                }
              }
            }
          }
        }
      }
      if("stylehold" in f) {
        for(let e in f.stylehold) {
          f.style[e] = f.stylehold[e];
        }
      }
      // go through potential period data structures
      if("periods" in dataset) {
        for(let p of dataset.periods) {
          let match = 1;
          for(let m in p.match) {
            let v = p.match[m];
            if(f.properties[m] !== v) {
              match = 0;
            }
          }
          if(match) {
            f.periodList = p.periods;
          }
        }
      }
      if(!removeFeature) {
        timelineDateMinDefault = dateMin(timelineDateMinDefault, f.properties.endDate);
        timelineDateMaxDefault = dateMax(timelineDateMaxDefault, f.properties.startDate);
        datesOfInterest.push(f.properties.startDate);
        polygonCount += 1;
        if("animateTo" in f.properties) {
          animationHash[f.id] = f.properties.animateTo;
        }
        newFeatureList.push(f);
      }
    } catch (e) {
      recordGeoLintError(e);
      // Only roll back state committed for this feature (not a prior owner of the same id).
      if (acceptedId !== null) {
        id_set.delete(acceptedId);
        delete fHash[acceptedId];
        delete animationHash[acceptedId];
      }
    }
  }
  dataset.features = newFeatureList;
}

// prepare animations by keeping track of which coordinates change
// to reduce compute time

function prepare_animations() {
  for(let id_from of Object.keys(animationHash)) {
    try {
      if(!(id_from in fHash)) {
        throw "can't find animate-from id " + id_from + " in fHash";
      }
      let fromF = fHash[id_from];
      if(!(animationHash[id_from] in fHash)) {
        throw "can't find animate-to id " + animationHash[id_from] + " in fHash";
      }
      // find the list of differing coordinates
      let destF = fHash[animationHash[id_from]];
      if(fromF.geometry.type === 'MultiPolygon') {
        let fromLen = fromF.geometry.coordinates.length;
        let destLen = destF.geometry.coordinates.length;
        let maxPoly = fromLen < destLen ? fromLen : destLen;
        fromF.pairDiffs = [];
        for(let outer=0;outer<maxPoly;outer++) {
          let fromC = fromF.geometry.coordinates[outer][0];
          let destC = destF.geometry.coordinates[outer][0];
          if (fromC.length != destC.length) {
            throw "can't animate from " + id_from + " to " + animationHash[id_from] + " since coordinate lengths differ (" + fromC.length + " vs " + destC.length + ") for polygon " + outer;
          }
          fromF.pairDiffs[outer] = [];
          for(let i in fromC) {
            if(fromC[i][0] !== destC[i][0] || fromC[i][1] !== destC[i][1]) {
              fromF.pairDiffs[outer].push(i);
            }
          }
        }
      } else if(fromF.geometry.type === 'Polygon') {
        let fromC, destC;
        if("coordinates" in fromF.geometry) {
          fromC = fromF.geometry.coordinates[0];
        } else {
          throw "can't animate from " + id_from + " to " + animationHash[id_from] + " since no coordinates for " + id_from;
        }
        if("coordinates" in destF.geometry) {
          if (!destF.geometry.coordinates) {
            throw "can't animate from " + id_from + " to " + animationHash[id_from] + " since no coordinates for " + animationHash[id_from];
          }
          destC = destF.geometry.coordinates[0];
        } else {
          throw "can't animate from " + id_from + " to " + animationHash[id_from] + " since no coordinates for " + animationHash[id_from];
        }
        if (fromC.length != destC.length) {
          throw "can't animate from " + id_from + " to " + animationHash[id_from] + " since coordinate lengths differ (" + fromC.length + " vs " + destC.length + ")";
        }
        fromF.pairDiffs = [];
        for(let i in fromC) {
          if(fromC[i][0] !== destC[i][0] || fromC[i][1] !== destC[i][1]) {
            fromF.pairDiffs.push(i);
          }
        }
      } else if(fromF.geometry.type === 'LineString') {
        let fromC = fromF.geometry.coordinates;
        let destC = destF.geometry.coordinates;
        // figure out the animation length, ie. the length of new
        // line that must be grown. this isn't precise - it should
        // take into consideration the latitude - but should be
        // close enough for decent animation
        fromF.animLength = 0;
        for(let i=fromC.length;i<destC.length;i++) {
          fromF.animLength += distComp(destC[i-1],destC[i]);
        }
        if(destC.length < (fromC.length)) {
          throw "for now can only animate from " + id_from + " to " + animationHash[id_from] + " if length is same or growing, got (" + fromC.length + " vs " + destC.length + ")";
        }
      }
    } catch (e) {
      recordGeoLintError(e);
      // Keep the feature as a static shape; drop the broken animation link.
      delete animationHash[id_from];
      if (id_from in fHash && fHash[id_from].properties) {
        delete fHash[id_from].properties.animateTo;
      }
    }
  }
}

function distComp(ptA, ptB) {
  return Math.sqrt(((ptA[0]-ptB[0])**2)+((ptA[1]-ptB[1])**2));
}

/* ohmec module exports */
(function (g) {
  g.recordGeoLintError = recordGeoLintError;
  g.showGeoLintWarnings = showGeoLintWarnings;
  g.geo_lint = geo_lint;
  g.prepare_animations = prepare_animations;
  g.distComp = distComp;
})(typeof window !== "undefined" ? window : globalThis);
