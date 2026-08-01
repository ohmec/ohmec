# Copyright OHMEC contributors.
# Licensed under the Apache License, Version 2.0, see LICENSE for details.
# SPDX-License-Identifier: Apache-2.0
"""Load OHMEC dataset files as Python dicts.

Accepts either plain GeoJSON/JSON, or the older JS assignment form:
  dataRegion = { ... };
"""

import json
import re


def load_ohmec_geojson(text):
  """Return (struct, varname_or_None) from file text."""
  text = text.strip()
  fm = re.fullmatch(r"(\w+)\s*=\s*(.*);\s*", text, re.MULTILINE | re.DOTALL)
  if fm:
    return json.loads(fm.group(2)), fm.group(1)
  return json.loads(text), None
