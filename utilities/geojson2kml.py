#!/usr/bin/env python3

"""geojson2kml.py: Convert geometry data from a JSON format into KML
   format suitable for editing in Google Maps KML viewer. The user
   can provide one or more JSON feature IDs as arguments to the
   script, and each geometric entity will be exported into the KML
   file.

   Usage: geojson2kml.py filename ID0 [ID1 ID2 ...]
"""

__author__     = "OHMEC"
__copyright__  = "Copyright OHMEC contributors"
__license__    = "Apache License, Version 2.0"

import sys
import json
import re
import hashlib
from hashlib import md5

if(len(sys.argv) < 3):
  print("usage: geojson2kml.py filename ID0 [ID1 ID2 ...]")
  sys.exit(2)
filename = sys.argv[1]
ids_to_print = sys.argv[2:]

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

def export_header(ids):
  """print out the KML header for this conversion"""
  # for each ID, create its color, which is just the MD5 of the string.
  # this way it is somewhat random but repeatable
  print("""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Imported KML</name>""")
  for idname in ids:
    obj = hashlib.md5(idname.encode())
    md5hash = obj.hexdigest()
    colorhex = md5hash[0:6]
    print("""    <Style id="Style{}">')
      <LineStyle>
        <color>ff{}</color>
        <width>2</width>
      </LineStyle>
      <PolyStyle>
        <color>4d{}</color>
        <fill>1</fill>
        <outline>1</outline>
      </PolyStyle>
    </Style>
    <StyleMap id="StyleMap{}">
      <Pair>
        <key>normal</key>
        <styleUrl>#Style{}</styleUrl>
      </Pair>
      <Pair>
        <key>highlight</key>
        <styleUrl>#Style{}</styleUrl>
      </Pair>
    </StyleMap>""".format(idname,colorhex,colorhex,idname,idname,idname))

def export_footer():
  """close the KML file"""
  print("  </Document>")
  print("</kml>")

def export_entity(idname, entity_name, geometry):
  """export the KML for this entity given a geometry of Polygon or MultiPolygon"""
  if(geometry["type"] == "Polygon"):
    print("    <Placemark>")
    print("      <name>[" + idname + "] " + entity_name + "</name>")
    print("      <styleUrl>#StyleMap" + idname + "</styleUrl>")
    print("      <Polygon>")
    print("        <outerBoundaryIs>")
    print("          <LinearRing>")
    print("            <tessellate>1</tessellate>")
    print("            <coordinates>")
    for pair in geometry["coordinates"][0]:
      print("            " + str(pair[0]) + "," + str(pair[1]) + ",0")
    print("            </coordinates>")
    print("          </LinearRing>")
    print("        </outerBoundaryIs>")
    print("      </Polygon>")
    print("    </Placemark>")
  elif(geometry["type"] == "MultiPolygon"):
    pcnt = 0
    for polygon in geometry["coordinates"]:
      print("    <Placemark>")
      print("      <name>[" + idname + "] " + entity_name + " Polygon " + str(pcnt) + "</name>")
      pcnt+=1
      print("      <styleUrl>#StyleMap" + idname + "</styleUrl>")
      print("      <Polygon>")
      print("        <outerBoundaryIs>")
      print("          <LinearRing>")
      print("            <tessellate>1</tessellate>")
      print("            <coordinates>")
      for pair in polygon[0]:
        print("            " + str(pair[0]) + "," + str(pair[1]) + ",0")
      print("            </coordinates>")
      print("          </LinearRing>")
      print("        </outerBoundaryIs>")
      print("      </Polygon>")
      print("    </Placemark>")

if("features" in fullstruct):
  export_header(ids_to_print)
  for feature in fullstruct["features"]:
    thisid = feature["id"]
    if(thisid in ids_to_print):
      properties = feature["properties"]
      entity2name = properties["entity2name"]
      export_entity(thisid, entity2name, feature["geometry"])
  export_footer()
else:
  print("missing features in geojson")
  sys.exit(2)
