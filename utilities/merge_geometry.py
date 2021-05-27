#!/usr/bin/env python3

"""merge_geometry.py: read in a geojson file and merge two or more geometries.
   Geometries could be Polygons or MultiPolygons. The output is purely the
   geometry section of the geojson, since the properties etc. can not be
   gleaned from the input.

   Usage: merge_geometry.py geojsonfile idname1 idname2 [idname3 ...]
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

if(len(sys.argv) < 3):
  print("usage: merge_geometry.py filename ID0 ID1 [ID2 ...]")
  sys.exit(2)
filename = sys.argv[1]
ids_to_merge = sys.argv[2:]

filehandle = open(filename, mode='r')
fullfile = filehandle.read()
filehandle.close()

# geojson is created as a variable assignment, ie. dataRegion = { ... };
# json.loads wants just the structure, so we need to strip the variable
# name and the closing semicolon
fm = re.fullmatch("\s*(\w+)\s*=\s*(.*);\s*", fullfile, re.MULTILINE | re.DOTALL)
varname = fm.group(1)
varjson = fm.group(2)
fullstruct = json.loads(varjson)
geoms = {}

for feature in fullstruct["features"]:
  geoms[feature["id"]] = shapely.geometry.asShape(feature["geometry"])
  if not geoms[feature["id"]].is_valid:
    print(feature["id"] + " is not valid")

first = 1
for idname in ids_to_merge:
  print("merging " + idname)
  if first:
    merged_polygon = geoms[idname]
  else:
    merged_polygon = merged_polygon.union(geoms[idname])
  first = 0

geojson_out = geojson.Feature(geometry=merged_polygon, properties={})
json.dump(geojson_out.geometry, sys.stdout, indent=2)
