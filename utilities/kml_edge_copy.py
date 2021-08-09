#!/usr/bin/env python3

"""kml_edge_copy.py: read in two KML files and copy the boundary edge
   from one polygon to the other. With only KML arguments, the
   script will only print out common points between the two KML.
   With 7 arguments, it combines the edge from the first lat/lon
   pair to the second lat/lon pair, in the direction the edge should
   copy. For instance, if the two common points form a north/south
   border, the direction should be N or S.  Legal values are N|S|E|W.
   The algorithm looks at the edge between the two points and finds
   the next point that is either N, S etc to determine which direction
   to traverse. If the edge has next points both or neither as the
   direction (ie. a southern point with N or S guidance) then the
   script will error out.  Given longitudes and latitudes must match
   perfectly or the script will error out. If the given lat/lon are
   not found, the script will error out.

   Usage: kml_edge_copy.py from.kml to.kml [lon1 lat1 lon2 lat2 dir]
"""

__author__     = "OHMEC"
__copyright__  = "Copyright OHMEC contributors"
__license__    = "Apache License, Version 2.0"

import sys
import json
import re

def parse_kml(filename):
  '''parse a KML file and return array of coordinate arrays'''
  global one_color
  global one_style
  global one_name
  coord_array = []
  coordinates = []
  in_placemark = 0
  with open(filename) as fp:
    line = fp.readline()
    while line:
      if re.search("<Placemark>", line):
        in_placemark = 1
      elif re.search("</Placemark>", line):
        in_placemark = 0
      elif in_placemark:
        if(re.search("<coordinates>", line)):
          fm = re.search("<coordinates>", line)
          coordinates = []
        elif(re.search("^\s*([\d.-]+),([\d.-]+),0", line)):
          fm = re.search("^\s*([\d.-]+),([\d.-]+),0", line)
          coordinates.append([float(fm.group(1)), float(fm.group(2))])
        elif(re.search("</coordinates>", line)):
          coord_array.append(coordinates)
      elif(re.search("<name>.*<\/name>", line) and one_name == ''):
        fm = re.search("<name>(.*)<\/name>", line)
        one_name = fm.group(1)
      elif(re.search('<Style id=".*">', line) and one_style == ''):
        fm = re.search('<Style id="(.*)">', line)
        one_style = fm.group(1)
      elif(re.search('<color>ff.*<\/color>', line) and one_color == ''):
        fm = re.search('<color>ff(.*)<\/color>', line)
        one_color = fm.group(1)
      line = fp.readline()
  fp.close()
  return coord_array

def find_common_points(array_from, array_to):
  '''convert to precision 5 in order to account for miniscule differences'''
  exists1 = set()
  for arrayf in array_from:
    for coord in arrayf:
      comb = str(format(coord[0],'.5f')) + ',' + str(format(coord[1],'.5f'))
      exists1.add(comb)
  for arrayt in array_to:
    for coord in arrayt:
      comb = str(format(coord[0],'.5f')) + ',' + str(format(coord[1],'.5f'))
      if comb in exists1:
        print("found common point " + comb)

def export_header():
  """print out the KML header for this conversion"""
  # for each ID, create its color, which is just the MD5 of the string.
  # this way it is somewhat random but repeatable
  print("""<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Imported KML</name>""")
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
    </StyleMap>""".format(one_name,one_color,one_color,one_style,one_style,one_style))

def export_polygon(pnum, coordinates):
  """export the KML for this entity given a geometry of Polygon or MultiPolygon"""
  print("    <Placemark>")
  print("      <name>[" + one_name + "] Polygon " + str(pnum) + "</name>")
  print("      <styleUrl>#StyleMap" + one_style + "</styleUrl>")
  print("      <Polygon>")
  print("        <outerBoundaryIs>")
  print("          <LinearRing>")
  print("            <tessellate>1</tessellate>")
  print("            <coordinates>")
  for pair in coordinates:
    print("            " + str(pair[0]) + "," + str(pair[1]) + ",0")
  print("            </coordinates>")
  print("          </LinearRing>")
  print("        </outerBoundaryIs>")
  print("      </Polygon>")
  print("    </Placemark>")

def export_footer():
  """close the KML file"""
  print("  </Document>")
  print("</kml>")

def stitch(array_from, array_to, lon1, lat1, lon2, lat2, direction):
  acf1, ccf1 = find_coord(array_from, lon1, lat1)
  acf2, ccf2 = find_coord(array_from, lon2, lat2)
  act1, cct1 = find_coord(array_to,   lon1, lat1)
  act2, cct2 = find_coord(array_to,   lon2, lat2)
  if acf1 != acf2:
    sys.stderr.write("odd that the coordinates are in different polygons, dying\n")
    sys.exit(2)
  if act1 != act2:
    sys.stderr.write("odd that the coordinates are in different polygons, dying\n")
    sys.exit(2)
  arrayf = array_from[acf1]
  arrayt = array_to[act1]
  # within array_from[acf1], determine if we're copying in pos or neg direction
  # this is a function of the given direction. check the next one and prev one in
  # the array and see if one matches the direction. corner case is if ccf is 0
  # in which case we need to go to the coordinate n-2 to go "negative"
  ccf1n = ccf1 - 1 if ccf1 > 0 else len(arrayf)-2
  coordf1 = arrayf[ccf1]
  coordf1p = arrayf[ccf1+1]
  coordf1n = arrayf[ccf1n]
  cct1n = cct1 - 1 if cct1 > 0 else len(arrayt)-2
  coordt1 = arrayt[cct1]
  coordt1p = arrayt[cct1+1]
  coordt1n = arrayt[cct1n]
  if direction == 'N' or direction == 'S':
    if coordf1p[1] >= coordf1[1] and coordf1n[1] < coordf1[1]:
      dirf = 1
    elif coordf1p[1] > coordf1[1] and coordf1n[1] <= coordf1[1]:
      dirf = 1
    elif coordf1p[1] <= coordf1[1] and coordf1n[1] > coordf1[1]:
      dirf = 0
    elif coordf1p[1] < coordf1[1] and coordf1n[1] >= coordf1[1]:
      dirf = 0
    else:
      sys.stderr.write("asking for direction " + direction + " but fails on kml_from, comparing " + str(coordf1n[1]) + " vs " + str(coordf1[1]) + " vs " + str(coordf1p[1]) + "\n")
      sys.exit(2)
    if coordt1p[1] >= coordt1[1] and coordt1n[1] < coordt1[1]:
      dirt = 1
    elif coordt1p[1] > coordt1[1] and coordt1n[1] <= coordt1[1]:
      dirt = 1
    elif coordt1p[1] <= coordt1[1] and coordt1n[1] > coordt1[1]:
      dirt = 0
    elif coordt1p[1] < coordt1[1] and coordt1n[1] >= coordt1[1]:
      dirt = 0
    else:
      sys.stderr.write("asking for direction " + direction + " but fails on kml_to, comparing " + str(coordt1n[1]) + " vs " + str(coordt1[1]) + " vs " + str(coordt1p[1]) + "\n")
      sys.exit(2)
    if direction == 'S':
      dirf = 1-dirf
      dirt = 1-dirt
  else:
    if coordf1p[0] >= coordf1[0] and coordf1n[0] < coordf1[0]:
      dirf = 1
    elif coordf1p[0] > coordf1[0] and coordf1n[0] <= coordf1[0]:
      dirf = 1
    elif coordf1p[0] <= coordf1[0] and coordf1n[0] > coordf1[0]:
      dirf = 0
    elif coordf1p[0] < coordf1[0] and coordf1n[0] >= coordf1[0]:
      dirf = 0
    else:
      sys.stderr.write("asking for direction " + direction + " but fails on kml_from, comparing " + str(coordf1n[0]) + " vs " + str(coordf1[0]) + " vs " + str(coordf1p[0]) + "\n")
      sys.exit(2)
    if coordt1p[0] >= coordt1[0] and coordt1n[0] < coordt1[0]:
      dirt = 1
    elif coordt1p[0] > coordt1[0] and coordt1n[0] <= coordt1[0]:
      dirt = 1
    elif coordt1p[0] <= coordt1[0] and coordt1n[0] > coordt1[0]:
      dirt = 0
    elif coordt1p[0] < coordt1[0] and coordt1n[0] >= coordt1[0]:
      dirt = 0
    else:
      sys.stderr.write("asking for direction " + direction + " but fails on kml_to, comparing " + str(coordt1n[0]) + " vs " + str(coordt1[0]) + " vs " + str(coordt1p[0]) + "\n")
      sys.exit(2)
    if direction == 'W':
      dirf = 1-dirf
      dirt = 1-dirt
  sys.stderr.write("INFO: copying in pos/neg direction " + str(dirf) + " on from, and pos/neg direction " + str(dirt) + " on to\n")
  # now we have our directions, start from point1 in 'from', go until point1
  # then start from point2 in 'to', go until point1. wrap from 'n-2' to 0, skipping
  # 'n-1' which is a repeat of 0
  new_array = []
  while ccf1 != ccf2:
    new_array.append(arrayf[ccf1])
    if dirf and ccf1 == (len(arrayf)-2):
      ccf1 = 0
    elif not dirf and ccf1 == 0:
      ccf1 = len(arrayf)-2
    elif dirf:
      ccf1 += 1
    else:
      ccf1 -= 1
  while cct2 != cct1:
    new_array.append(arrayt[cct2])
    if dirt and cct2 == (len(arrayt)-2):
      cct2 = 0
    elif not dirt and cct2 == 0:
      cct2 = len(arrayt)-2
    elif dirt:
      cct2 += 1
    else:
      cct2 -= 1
  new_array.append([float(lon1),float(lat1)])
  # now we have our new array, just need to write out all of the polygons that
  # were not touched, plus this new one as Polygon 0
  return new_array,acf1,act1

def find_coord(arraya, lon, lat):
  from_ac = -1
  from_cc = -1
  for ac in range(len(arraya)):
    arrayc = arraya[ac]
    for cc in range(len(arrayc)):
      coord = arrayc[cc]
      if str(format(coord[0],'.5f')) == format(float(lon),'.5f') and str(format(coord[1],'.5f')) == format(float(lat),'.5f'):
        return (ac,cc)
  sys.stderr.write("never found lon/lat " + lon + "/" + lat + " in kml\n")
  sys.exit(2)

if(len(sys.argv) != 3 and len(sys.argv) != 8):
  sys.stderr.write("usage: kml_edge_copy.py from.kml to.kml [lon1 lat1 lon2 lat2 dir]\n");
  sys.exit(2)
filename_from = sys.argv[1]
filename_to   = sys.argv[2]
if(len(sys.argv) == 8):
  lon1 = sys.argv[3]
  lat1 = sys.argv[4]
  lon2 = sys.argv[5]
  lat2 = sys.argv[6]
  direction = sys.argv[7]

one_name  = ''
one_color = ''
one_style = ''
coord_array_from = parse_kml(filename_from)
coord_array_to   = parse_kml(filename_to)

if(len(sys.argv) == 3):
  find_common_points(coord_array_from, coord_array_to)
  sys.exit(0)

stitch_array,afptr,atptr = stitch(coord_array_from, coord_array_to, lon1, lat1, lon2, lat2, direction)
export_header()
export_polygon(0,stitch_array)
pnum = 1
for afnum in range(len(coord_array_from)):
  if afnum != afptr:
    export_polygon(pnum,coord_array_from[afnum])
    pnum += 1
for atnum in range(len(coord_array_to)):
  if atnum != atptr:
    export_polygon(pnum,coord_array_to[atnum])
    pnum += 1
export_footer()
