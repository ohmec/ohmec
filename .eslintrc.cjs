// Copyright OHMEC contributors.
// Licensed under the Apache License, Version 2.0, see LICENSE for details.
// SPDX-License-Identifier: Apache-2.0

// Light lint rules: catch real breakage without forcing a style rewrite.
module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'script'
  },
  globals: {
    L: 'readonly',
    // Study datasets assigned by studies.js before ohmec.js runs
    dataNA: 'writable',
    dataNL: 'writable',
    dataMeso: 'writable',
    dataAA: 'writable',
    dataEur: 'writable',
    dataACiv: 'writable',
    OHMEC: 'readonly',
    OHMEC_STUDY: 'readonly',
    OHMEC_STUDY_ID: 'readonly',
    OHMEC_MAPBOX_TOKEN: 'readonly'
  },
  rules: {
    'no-undef': 'error',
    'no-duplicate-case': 'error',
    'no-dupe-keys': 'error',
    'no-unreachable': 'error',
    'no-constant-condition': ['error', { checkLoops: false }],
    'no-unsafe-finally': 'error',
    'no-sparse-arrays': 'error'
  }
};
