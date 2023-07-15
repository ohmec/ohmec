#!/usr/bin/env python3

"""make_point.py: Convert a variety of lat/lon input strings into geojson
   Point features. Most of the other properties are left blank for the
   user to fill in.

   Example of accepted formats, others can be added:

      37°15′11″N 115°29′05″W
      28°41′25.21521″S 144°42′09.1521″E
      15° 44′ 29″ N 99° 55′ 44″ W
      45°22′46.12126″S, 85°49′14.8621″E
      49°07′S 158°40′E
      79°8.2512′N 44°42.1512512′W
      6.12371°S 15.9281281°E
      56.9521°N 171.14129°W
      -26.6129, 100.582571
      26.9121,-99.124867
      S72° 41.1219 E101° 51.21912
      S72° 51.6189 W99° 4.51216

   Usage: make_point.py [filename]   <<-- STDIN can also be used
"""

__author__     = "OHMEC"
__copyright__  = "Copyright OHMEC contributors"
__license__    = "Apache License, Version 2.0"

import sys
import re
from datetime import date

today = date.today()
edate = today.strftime("%Y:%0m:%0d")

SIGDIGITS = 5

for line in sys.stdin:
  parse_pass = 1
  sigformat = '{0:.' + str(SIGDIGITS) + 'f}'
  sigformat = '{0:.5f}'
  if re.search(r"^\s*\d+°\d+′[\d.]+″[NS]\s+\d+°\d+′[\d.]+″[EW]\s*$", line):
    fm = re.search(r"^\s*(\d+)°(\d+)′([\d.]+)″([NS])\s+(\d+)°(\d+)′([\d.]+)″([EW])\s*$", line)
    latmul = 1 if (fm.group(4) == 'N') else -1
    lonmul = 1 if (fm.group(8) == 'E') else -1
    lon = str.format(sigformat, lonmul*(float(fm.group(5))+float(fm.group(6))/60+float(fm.group(7))/3600))
    lat = str.format(sigformat, latmul*(float(fm.group(1))+float(fm.group(2))/60+float(fm.group(3))/3600))
  elif re.search(r"^\s*\d+°\s*\d+′\s*[\d.]+″\s*[NS],*\s+\d+°\s*\d+′\s*[\d.]+″\s*[EW]\s*$", line):
    fm = re.search(r"^\s*(\d+)°\s*(\d+)′\s*([\d.]+)″\s*([NS]),*\s+(\d+)°\s*(\d+)′\s*([\d.]+)″\s*([EW])\s*$", line)
    latmul = 1 if (fm.group(4) == 'N') else -1
    lonmul = 1 if (fm.group(8) == 'E') else -1
    lon = str.format(sigformat, lonmul*(float(fm.group(5))+float(fm.group(6))/60+float(fm.group(7))/3600))
    lat = str.format(sigformat, latmul*(float(fm.group(1))+float(fm.group(2))/60+float(fm.group(3))/3600))
  elif re.search(r"^\s*\d+°[\d+.]+′[NS]\s+\d+°[\d+.]+′[EW]\s*$", line):
    fm = re.search(r"^\s*(\d+)°([\d+.]+)′([NS])\s+(\d+)°([\d+.]+)′([EW])\s*$", line)
    lonmul = 1 if (fm.group(6) == 'E') else -1
    latmul = 1 if (fm.group(3) == 'N') else -1
    lon = str.format(sigformat, lonmul*(float(fm.group(4))+float(fm.group(5))/60))
    lat = str.format(sigformat, latmul*(float(fm.group(1))+float(fm.group(2))/60))
  elif re.search(r"^\s*\d+\.\d+°[NS]\s+\d+\.\d+°[WE]\s*$", line):
    fm = re.search(r"^\s*(\d+\.\d+)°([NS])\s+(\d+\.\d+)°([WE])\s*$", line)
    lonmul = 1 if (fm.group(4) == 'E') else -1
    latmul = 1 if (fm.group(2) == 'N') else -1
    lon = str.format(sigformat, lonmul*float(fm.group(3)))
    lat = str.format(sigformat, latmul*float(fm.group(1)))
  elif re.search(r"^\s*-?\d+\.\d+,\s*-?\d+\.\d+\s*$", line):
    fm = re.search(r"^\s*(-?\d+\.\d+),\s*(-?\d+\.\d+)\s*$", line)
    lon = str.format(sigformat, float(fm.group(2)))
    lat = str.format(sigformat, float(fm.group(1)))
  elif re.search(r"^\s*[NS]\d+°\s+\d+\.\d+\s+[WE]\d+°\s+\d+\.\d+\s*$", line):
    fm = re.search(r"^\s*([NS])(\d+)°\s+(\d+\.\d+)\s+([WE])(\d+)°\s+(\d+\.\d+)\s*$", line)
    lonmul = 1 if (fm.group(4) == 'E') else -1
    latmul = 1 if (fm.group(1) == 'N') else -1
    lon = str.format(sigformat, lonmul*(float(fm.group(5))+(float(fm.group(6))/60)))
    lat = str.format(sigformat, latmul*(float(fm.group(2))+(float(fm.group(3))/60)))
  else:
    sys.stderr.write("ERROR: loctext not match: " + line)
    parse_pass = 0
  if parse_pass:
    print('''    { "type":"Feature",
      "id":"PTXXXX",
      "properties":{
        "entity1type":"XXXX",
        "entity1name":"XXXX",
        "entity2type":"XXXX",
        "entity2name":"XXXX",
        "fidelity":"XXXX",
        "source":"XXXX",
        "editdatestr":"''' + edate + '''",
        "startdatestr":"XXXX",
        "enddatestr":"XXXX"},
      "geometry":{
        "type":"Point",
        "coordinates":
          [''' + str(lon) + ',' + str(lat) + ']}},')
