#!/usr/bin/env python3
# Copyright OHMEC contributors.
# Licensed under the Apache License, Version 2.0, see LICENSE for details.
# SPDX-License-Identifier: Apache-2.0
"""Validate OHMEC study GeoJSON files parse and have basic structure.

Usage:
  validate_geojson.py [file ...]
  With no args, validates all ohmec_data_*.geojson in the repo root.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))
from load_ohmec_geojson import load_ohmec_geojson  # noqa: E402


def validate_file(path: Path) -> list[str]:
  errors: list[str] = []
  try:
    text = path.read_text(encoding="utf-8")
    data, _ = load_ohmec_geojson(text)
  except Exception as exc:  # noqa: BLE001 - report any parse/load failure
    return [f"{path.name}: failed to parse ({exc})"]

  if not isinstance(data, dict):
    return [f"{path.name}: top-level value must be an object"]

  if data.get("type") != "FeatureCollection":
    errors.append(f"{path.name}: expected type FeatureCollection, got {data.get('type')!r}")

  features = data.get("features")
  if not isinstance(features, list):
    errors.append(f"{path.name}: missing features array")
    return errors

  if len(features) == 0:
    errors.append(f"{path.name}: features array is empty")

  ids = set()
  for i, feat in enumerate(features):
    if not isinstance(feat, dict):
      errors.append(f"{path.name}: features[{i}] is not an object")
      continue
    if feat.get("type") != "Feature":
      errors.append(f"{path.name}: features[{i}] type is {feat.get('type')!r}, expected Feature")
    fid = feat.get("id")
    if fid is None or fid == "":
      errors.append(f"{path.name}: features[{i}] missing id")
    elif fid in ids:
      errors.append(f"{path.name}: duplicate feature id {fid!r}")
    else:
      ids.add(fid)
    if "geometry" not in feat:
      errors.append(f"{path.name}: feature {fid!r} missing geometry")
    if "properties" not in feat:
      errors.append(f"{path.name}: feature {fid!r} missing properties")

  return errors


def main(argv: list[str]) -> int:
  if len(argv) > 1:
    files = [Path(a) for a in argv[1:]]
  else:
    files = sorted(ROOT.glob("ohmec_data_*.geojson"))

  if not files:
    print("no GeoJSON files to validate", file=sys.stderr)
    return 2

  all_errors: list[str] = []
  for path in files:
    if not path.is_file():
      all_errors.append(f"{path}: not a file")
      continue
    errs = validate_file(path)
    if errs:
      all_errors.extend(errs)
    else:
      print(f"OK {path.name}")

  if all_errors:
    print("\n".join(all_errors), file=sys.stderr)
    print(f"{len(all_errors)} validation error(s)", file=sys.stderr)
    return 1

  print(f"validated {len(files)} file(s)")
  return 0


if __name__ == "__main__":
  sys.exit(main(sys.argv))
