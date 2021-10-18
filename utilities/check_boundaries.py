#!/usr/bin/env python3

"""check_boundaries.py: read in a geojson file and compare all features
   against other features in the database. If they overlap in time, then
   check if they intersect in space. If they don't intersect, or if the
   intersections are clean line strings, then continue. If they overlap,
   or (eventually) if they intersection in anthing other than a linestring,
   then indicate the intersection as a possible error. Allow an overlap
   or double intersection waiver to be in the properties of the database.

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
borderless = {}
overlap_waiver = {}
double_waiver = {}
point_waiver = {}
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
  a seam; or d) overlap (most likely an error, though some are acceptable).
  properties.borderless or Indigenous types are skipped'''
  if idA in borderless or idB in borderless:
    return 0
  if not geoms[idA].intersects(geoms[idB]):
    return 0
  intAB = geoms[idA].intersection(geoms[idB])
  if geoms[idA].overlaps(geoms[idB]):
    if not idA in overlap_waiver and not idB in overlap_waiver:
      print("ERR:  intersection of " + idA + " with " + idB + " resulted in overlap")
      print("  " + str(intAB))
      return 2
  else:
    intABtype = intAB.geom_type
    if intABtype == 'Point' or intABtype == 'MultiPoint':
      if idA in point_waiver or idB in point_waiver:
        return 1
      else:
        print("ERR: intersection of " + idA + " with " + idB + " resulted in " + intABtype + ":")
        print("  " + str(intAB))
        return 4
    if intABtype == 'LineString':
      return 1
    if intABtype == 'MultiLineString':
      # this coule be harmless, or could be a double-touch. the way to find out
      # is to get its boundary, and check if length 2 or not
      bound = intAB.boundary
      if len(bound) == 2:
        return 1
      elif idA in double_waiver or idB in double_waiver:
        return 1
      else:
        print("ERR: intAB for " + idA + " with " + idB + " is a MultiLine String. Here is its boundary")
        print("  " + str(bound) + " of length " + str(len(bound)))
        return 3
    if not idA in double_waiver and not idB in double_waiver:
      print("ERR:  intersection of " + idA + " with " + idB + " resulted in " + intABtype + ":")
      print("  " + str(intAB))
      return 3
  return 1

def conv_date(datestr,is_start):
  if datestr == 'present':
    return '2100:01:01'
  args = datestr.split(':')
  if len(args) == 2:
    return datestr
  if len(args) == 1:
    if is_start:
      return datestr + ':01'
    return datestr + ':31'
  if is_start:
    return datestr + ':01:01'
  return datestr + ':12:31'

def check_props(feat):
  idf = feat["id"]
  propsf = feat["properties"]
  if 'waive_overlap' in propsf:
    overlap_waiver[idf] = 1
  if 'waive_double' in propsf:
    double_waiver[idf] = 1
  if 'waive_point' in propsf:
    point_waiver[idf] = 1
  if 'borderless' in propsf:
    borderless[idf] = propsf['borderless']
  elif propsf['entity1name'] == 'Indigenous' and propsf['entity2type'] == 'tribe':
    borderless[idf] = 1

# Go through each feature with other features. Only check one vs the other
# if it shares a common date.
boundary_count = 0
overlap_count = 0
gap_count = 0
point_count = 0

for feat1 in fullstruct["features"]:
  id1 = feat1["id"]
  props1 = feat1["properties"]
  if id1 not in geoms:
    geoms[id1] = shapely.geometry.asShape(feat1["geometry"])
    check_props(feat1)
    if not geoms[id1].is_valid:
      sys.stderr.write(id1 + " is not valid\n")
  start1 = conv_date(props1["startdatestr"],1)
  end1 = conv_date(props1["enddatestr"],0)
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
          check_props(feat2)
          if not geoms[id2].is_valid:
            sys.stderr.write(id2 + " is not valid\n")
        start2 = conv_date(props2["startdatestr"],1)
        end2 = conv_date(props2["enddatestr"],0)
        if date_overlap(start1,end1,start2,end2):
          res = compare_features(idA,idB)
          if res >= 1:
            boundary_count += 1
          if res == 2:
            overlap_count += 1
          if res == 3:
            gap_count += 1
          if res == 4:
            point_count += 1
      already_handled[idAB] = 1

print("completed checking " + str(boundary_count) + " boundaries, with " + str(overlap_count) + " overlaps, " + str(gap_count) + " gaps and " + str(point_count) + " points")
