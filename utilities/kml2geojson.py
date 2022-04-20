#!/usr/bin/env python3

"""kml2geojson.py: Convert geometry data from a KML format into the
   geo JSON format used by OHMEC. The assumption is that the KML was
   written out with one or more polygons, and one or more collections.
   Style information is ignored, and only Placemarks are recognized.
   The <name> of the Placemark indicates the geojson ID and entity2name.
   All other information besides those and the coordinates must be hand-entered
   by the editor afterwards. The format of the Placemark name is
   <name>[ID] entity2name {Polygon n}</name>. The {Polygon n} is optional,
   but indicates a MultiPolygon set of coordinates for the Placemark.
   If the <name> has any other format, it is used as the ID and the
   entity2name is unknown.

   Usage: kml2geojson.py kmlfilename
"""

__author__     = "OHMEC"
__copyright__  = "Copyright OHMEC contributors"
__license__    = "Apache License, Version 2.0"

import sys
import json
import re

if(len(sys.argv) != 2):
  print("usage: kml2geojson.py kmlfilename")
  sys.exit(2)
filename = sys.argv[1]

coords = {}
multicoords = {}
entity2name = {}
SIGDIGITS = 3

def parse_kml(filename):
  in_placemark = 0
  with open(filename) as fp:
    line = fp.readline()
    while line:
      if re.search("<Placemark>", line):
        in_placemark = 1
      elif re.search("</Placemark>", line):
        in_placemark = 0
      elif in_placemark:
        if(re.search(r"<name>\[(.*?)\].*Polygon.*</name>", line)):
          fm = re.search(r"<name>\[(.*)\]\s+(.*)\s+Polygon.*</name>", line)
          idname = fm.group(1)
          entity2name[idname] = fm.group(2)
          ismulti = 1
          if(idname not in multicoords):
            multicoords[idname] = []
        elif(re.search(r"<name>\[(.*)\]\s+(.*)</name>", line)):
          fm = re.search(r"<name>\[(.*)\]\s+(.*)</name>", line)
          idname = fm.group(1)
          entity2name[idname] = fm.group(2)
          ismulti = 0
        elif(re.search("<name>(.*)</name>", line)):
          fm = re.search("<name>(.*)</name>", line)
          idname = fm.group(1)
          entity2name[idname] = ""
          ismulti = 0
        elif(re.search("<coordinates>", line)):
          fm = re.search("<coordinates>", line)
          coordinates = []
        elif(re.search("^\s*([\d.-]+),([\d.-]+),0", line)):
          fm = re.search("^\s*([\d.-]+),([\d.-]+),0", line)
          coordinates.append([round(float(fm.group(1)),SIGDIGITS), round(float(fm.group(2)),SIGDIGITS)])
        elif(re.search("</coordinates>", line)):
          if(ismulti):
            multicoords[idname].append([coordinates])
          else:
            coords[idname] = coordinates
      line = fp.readline()
  fp.close()

def export_coords(coords):
  for idname in coords:
    sys.stderr.write("converting " + idname + "\n")
    if(entity2name[idname] != ""):
      ename = entity2name[idname]
    else:
      ename = "XXXX"
    cstr = str(coords[idname]).replace(" ","")
    print('''    { "type":"Feature",
      "id":"''' + idname + '''",
      "properties":{
        "entity1type":"XXXX",
        "entity1name":"XXXX",
        "entity2type":"XXXX",
        "entity2name":"''' + ename + '''",
        "fidelity":"XXXX",
        "editdate":"XXXX",
        "source":"XXXX",
        "startdatestr":"XXXX",
        "enddatestr":"XXXX"},
      "geometry":{
        "type":"Polygon",
        "coordinates":[
          ''' + cstr + ']}},')

def export_multi_coords(coords):
  for idname in coords:
    sys.stderr.write("converting " + idname + "\n")
    if(entity2name[idname] != ""):
      ename = entity2name[idname]
    else:
      ename = "XXXX"
    cstr = str(coords[idname]).replace(" ","")
    print('''    { "type":"Feature",
      "id":"''' + idname + '''",
      "properties":{
        "entity1type":"XXXX",
        "entity1name":"XXXX",
        "entity2type":"XXXX",
        "entity2name":"''' + ename + '''",
        "fidelity":"XXXX",
        "editdatestr":"XXXX",
        "source":"XXXX",
        "startdatestr":"XXXX",
        "enddatestr":"XXXX"},
      "geometry":{
        "type":"MultiPolygon",
        "coordinates":
          ''' + cstr + '}},')

parse_kml(filename)
export_coords(coords)
export_multi_coords(multicoords)
