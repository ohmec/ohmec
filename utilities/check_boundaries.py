#!/usr/bin/env python3

"""check_boundaries.py: read in a geojson file and compare all features
   against other features in the database. If they overlap in time, then
   check if they intersect in space. If they don't intersect, or if the
   intersections are clean line strings, then continue. If they overlap,
   or (eventually) if they intersection in anthing other than a linestring,
   then indicate the intersection as a possible error. Allow an overlap
   waiver to be in the properties of the database.

   Usage: check_boundaries.py geojsonfile
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

geoms = {}
overlap_waiver = {}
already_handled = {}

if(len(sys.argv) < 2):
  sys.stderr.write("usage: check_boundaries.py filename\n")
  sys.exit(2)
filename = sys.argv[1]

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

def date_overlap(startA, endA, startB, endB):
  if startA <= startB and endA >= startB:
    return 1
  if startA <= endB and endA >= endB:
    return 1
  if startB <= startA and endB >= startA:
    return 1
  if startB <= endA and endB >= endA:
    return 1
  return 0

def compare_features(idA, idB):
  '''Check if features A and B have a) no intersection (skip);
  b) has "clean" intersection (defined as a single LineString); c) has
  a double intersection (>= 2 LineStrings), could be OK but most likely
  a seam; or d) overlap (most likely an error, though some are acceptable).'''
  if not geoms[idA].intersects(geoms[idB]):
    return 0
  print("checking result of intersection with " + idA + " and " + idB)
  intAB = geoms[idA].intersection(geoms[idB])
  if geoms[idA].overlaps(geoms[idB]):
    if not idA in overlap_waiver and not idB in overlap_waiver:
      print("overlap problem with " + idA + " vs " + idB + " resulting in:")
      print("  " + str(intAB))
      return 2
  return 1

def conv_date(datestr):
  if datestr == 'present':
    return '2100:01:01'
  return datestr

# Go through each feature with other features. Only check one vs the other
# if it shares a common date.
boundary_count = 0
overlap_count = 0
gap_count = 0

for feat1 in fullstruct["features"]:
  id1 = feat1["id"]
  props1 = feat1["properties"]
  if id1 not in geoms:
    geoms[id1] = shapely.geometry.asShape(feat1["geometry"])
    if 'waive_overlap' in props1:
      overlap_waiver[id1] = 1
    if not geoms[id1].is_valid:
      sys.stderr.write(id1 + " is not valid\n")
  start1 = conv_date(props1["startdatestr"])
  end1 = conv_date(props1["enddatestr"])
  for feat2 in fullstruct["features"]:
    id2 = feat2["id"]
    if id1 != id2:
      idA = id1 if id1 < id2 else id2
      idB = id1 if id1 > id2 else id2
      idAB = idA + ':' + idB
      if idAB not in already_handled:
        props2 = feat2["properties"]
        if id2 not in geoms:
          geoms[id2] = shapely.geometry.asShape(feat2["geometry"])
          if 'waive_overlap' in props2:
            overlap_waiver[id2] = 1
          if not geoms[id2].is_valid:
            sys.stderr.write(id2 + " is not valid\n")
        start2 = conv_date(props2["startdatestr"])
        end2 = conv_date(props2["enddatestr"])
        if date_overlap(start1,end1,start2,end2):
          res = compare_features(idA,idB)
          if res >= 1:
            boundary_count += 1
          if res == 2:
            overlap_count += 1
      already_handled[idAB] = 1

print("completed checking " + str(boundary_count) + " boundaries, with " + str(overlap_count) + " overlaps and " + str(gap_count) + " gaps")
