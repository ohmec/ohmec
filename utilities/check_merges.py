#!/usr/bin/env python3

"""check_merges.py: read in a geojson file and merge all polygons valid
   during a given date, or for all dates. The output is the merged polygon/
   multi-polygon for the date, or one per date, with error messages printed
   out if there are merge failures.

   Usage: check_merges.py geojsonfile [yyyy:mm:dd]
"""

__author__     = "OHMEC"
__copyright__  = "Copyright OHMEC contributors"
__license__    = "Apache License, Version 2.0"

import sys
import json
import geojson
from functools import partial
from ctypes.util import find_library
find_library('geos_c')
import shapely.geometry
import shapely.ops
import re

if(len(sys.argv) < 2):
  sys.stderr.write("usage: check_merges.py filename [yyyy:mm:dd]\n")
  sys.exit(2)
alldates = 1
filename = sys.argv[1]
if(len(sys.argv) >= 3):
  datestr = sys.argv[2]
  alldates = 0

filehandle = open(filename, mode='r')
fullfile = filehandle.read()
filehandle.close()

entity = {}
entity["features"] = []
entity["type"] = "FeatureCollection"

def check_date(thisdate):
  sys.stderr.write("checking " + thisdate + "\n")
  first = 1
  for feature in fullstruct["features"]:
    props = feature["properties"]
    idname = feature["id"]
    if props["startdatestr"] <= thisdate and thisdate <= props["enddatestr"]:
      sys.stderr.write("for " + thisdate + ": merging id " + idname + " with dates " + props["startdatestr"] + " -> " + props["enddatestr"] + "\n")
      if first:
        merged_polygon = geoms[idname]
      else:
        merged_polygon = merged_polygon.union(geoms[idname])
      first = 0
  merged_feature = geojson.Feature(geometry=merged_polygon, properties={})
  merged_feature.id = "merged" + thisdate
  mergedGeoms = shapely.geometry.asShape(merged_feature["geometry"])
  if not mergedGeoms.is_valid:
    sys.stderr.write("merger for date " + thisdate + " is not valid\n")
  properties = {}
  properties["entity1type"] = "nation"
  properties["entity1name"] = "summalia"
  properties["entity2type"] = "merger"
  properties["entity2name"] = "for " + thisdate
  properties["startdatestr"] = thisdate
  properties["enddatestr"] = thisdate
  properties["fidelity"] = 3
  merged_feature["properties"] = properties
  entity["features"].append(merged_feature)

# geojson is created as a variable assignment, ie. dataRegion = { ... };
# json.loads wants just the structure, so we need to strip the variable
# name and the closing semicolon
fm = re.fullmatch("\s*(\w+)\s*=\s*(.*);\s*", fullfile, re.MULTILINE | re.DOTALL)
varname = fm.group(1)
varjson = fm.group(2)
fullstruct = json.loads(varjson)
geoms = {}
startdates = {}

for feature in fullstruct["features"]:
  geoms[feature["id"]] = shapely.geometry.asShape(feature["geometry"])
  if not geoms[feature["id"]].is_valid:
    sys.stderr.write(feature["id"] + " is not valid\n")
  props = feature["properties"]
  startdates[props["startdatestr"]] = 1

for thisdate in startdates:
  if alldates or thisdate == datestr:
    check_date(thisdate)

json.dump(entity, sys.stdout, indent=2)
