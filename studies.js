// Copyright OHMEC contributors.
// Licensed under the Apache License, Version 2.0, see LICENSE for details.
// SPDX-License-Identifier: Apache-2.0

// Study registry for the unified index.html (?study=…).
// Keep blurbs and data file lists here so study pages stay thin.

(function (global) {
  const STUDIES = {
    na: {
      id: 'na',
      tab: 'home',
      arena: 'data in the North American arena',
      data: ['ohmec_data_na.js'],
      flags: {}
    },
    meso: {
      id: 'meso',
      tab: 'meso',
      arena: 'historical data in Mesoamerica',
      data: ['ohmec_data_meso.js'],
      flags: { useMeso: true },
      blurb:
        'This Mesoamerican study focuses on the time period between ' +
        '1800 BC and 1600, about 100 years after the first Western ' +
        'incursion into the hemisphere. The geographical arena of the ' +
        'study is roughly the modern Mexico and Central American ' +
        'regions. Clearly the farther back into history the data is, ' +
        'the lower the fidelity and confidence. That said, the ' +
        'Mesoamerican region is rich with advanced civilizations ' +
        'that left many architectural and written records. In addition, ' +
        'there were many eyewitnesses to the stark encounters of the ' +
        'early Spanish entrants into the homeland of the Aztec, Mayan ' +
        'and other existing Mesoamerican civilizations.',
      focusLinks: [
        {
          label: '100 Years of the Aztec Alliance',
          query: 'startdatestr=1427&enddatestr=1526&curdatestr=1427&lat=19&lon=-97&z=7.0'
        },
        {
          label: "Columbus's Voyages to the New World",
          query: 'startdatestr=1492&enddatestr=1504&curdatestr=1492&lat=20&lon=-77&z=5.5'
        },
        {
          label: 'Fernando Cortés march on Tenochtitlan',
          query: 'startdatestr=1519:04:01&enddatestr=1519:12:31&curdatestr=1519:04:21&lat=19&lon=-97.4&z=7.5'
        }
      ]
    },
    nl: {
      id: 'nl',
      tab: 'nl',
      arena: 'data in the North American arena',
      data: ['ohmec_data_na.js', 'ohmec_data_nl.js'],
      flags: { useNativeLands: true },
      blurb:
        'This Native Lands study swaps out the OHMEC Native tribal ' +
        'locations and uses data from the organization ' +
        '<a href="http://native-land.ca">Native Land Digital</a>. This ' +
        'is a richer dataset that has boundaries that encompass all ' +
        "of the tribes' known homelands throughout their history. OHMEC " +
        'would like to work with Native Land Digital to attempt to ' +
        'represent movements of the tribes akin to the Cherokee study.'
    },
    aa: {
      id: 'aa',
      tab: 'aa',
      arena: 'data in the North American arena',
      data: ['ohmec_data_ancient_americas.js'],
      flags: { useAA: true },
      blurb:
        'This Ancient Americas study focuses on the ancient prehistoric ' +
        'movements of peoples into the Americas, as best we know through ' +
        'modern scholarship. The study at this time focuses on the ' +
        'years 22000BC to 10000BC, following the movements of the ' +
        'Ancient North Eurasians into Beringia, then the split of the ' +
        'Southern Native Americans (SNA) along the Pacific Coast, and ' +
        'the Northern Native Americans (NNA, aka Clovis Culture) through ' +
        'the parting of the Canadian ice sheets. The fidelity of the ' +
        'mapping is highly speculative and is shown for educational ' +
        'visualization purposes.'
    },
    cherokee: {
      id: 'cherokee',
      tab: 'cherokee',
      arena: 'data in the North American arena',
      data: ['ohmec_data_na.js'],
      flags: { cherokeeExample: true },
      blurb:
        'This Cherokee study highlights the movements of the Proto- ' +
        'Cherokee and Cherokee tribes through the period 800BC to ' +
        'present. All other Native tribes are absent in this study. ' +
        'Eventually it is desired to have information on all Native ' +
        'tribes in this fashion, but this was made possible by a 1990s ' +
        'archaeological study.'
    },
    viking: {
      id: 'viking',
      tab: 'viking',
      arena: 'historical data in the northern European arena',
      data: ['ohmec_data_eur.js'],
      flags: { useEurope: true },
      blurb:
        'This Viking study shows a brief highlight of pre-Viking peoples ' +
        'in the northern European arena from roughly 15000BC to 6000BC. ' +
        'This was an early experiement with modeling tribal movements ' +
        'as well as the effect of geographical changes in the form of ' +
        'receding ice sheets.'
    },
    ma: {
      id: 'ma',
      tab: null,
      arena: 'historical data in the Middle American arena',
      data: ['ohmec_data_ma.js'],
      flags: {},
      blurb:
        'This Middle American Native study focuses on the time period between ' +
        '10000BC and 1600AD in the USA region. It is intended to be a bridge ' +
        'between the Ancient Americas study and the modern North American map ' +
        'study for the indigenous tribes of the area. Initially it is focused ' +
        'on the USA region given our ' +
        '<a href="https://www.davidrumsey.com/luna/servlet/detail/RUMSEY~8~1~341338~90109479:Cultural-complexities-before-5000-B">source material</a> ' +
        'but will be extended to the extent of North America with more research.'
    },
    aciv: {
      id: 'aciv',
      tab: null,
      arena: 'Early Civilizations throughout the world',
      data: ['ohmec_data_aciv.js'],
      flags: { useAciv: true },
      blurb:
        'This Ancient Civilization study focuses on the early ' +
        '(primarily) farming-based civilizations that developed ' +
        '5+ millenia ago throughout the world. It begins with some ' +
        'back-history in the form of existing neolithic cultures ' +
        'in the Mesopotamia and European regions. It then follows ' +
        'the rise of Sumer, the first historically recorded ' +
        'civilization, and will continue to add details on other ' +
        'civilizations as it moves through time. The goal is to ' +
        'track the history of farming, to some extent language, ' +
        'and the rise and fall of the related ancient civilizations. ' +
        'This will include pre-civilization cultures in the Indian ' +
        'and eastern Asia region as well, and then their nascent ' +
        'civilizations of Harappa and Xia, and their successors.'
    }
  };

  // Legacy bare query tokens previously redirected to index_*.html
  const LEGACY_BARE = [
    { re: /^(viking|easter)$/i, study: 'viking' },
    { re: /^aa$/i, study: 'aa' },
    { re: /^nl$/i, study: 'nl' },
    { re: /cher/i, study: 'cherokee' }
  ];

  // Old filenames used before ?study= unification
  const PAGE_TO_STUDY = {
    'index.html': 'na',
    'index_meso.html': 'meso',
    'index_nl.html': 'nl',
    'index_aa.html': 'aa',
    'index_cherokee.html': 'cherokee',
    'index_viking.html': 'viking',
    'index_ma.html': 'ma',
    'index_aciv.html': 'aciv'
  };

  function pageName() {
    let hrefText = location.href;
    let urlText = hrefText.split('?')[0];
    let splits = urlText.split('/');
    return splits[splits.length - 1] || 'index.html';
  }

  function resolveStudyId() {
    let params = new URLSearchParams(location.search);
    let fromParam = params.get('study');
    if (fromParam && STUDIES[fromParam]) {
      return fromParam;
    }

    // Legacy: index.html?viking or ?aa&… etc.
    for (let param of location.search.substring(1).split('&')) {
      if (!param || param.indexOf('=') !== -1) {
        continue;
      }
      for (let legacy of LEGACY_BARE) {
        if (legacy.re.test(param)) {
          return legacy.study;
        }
      }
    }

    let fromPage = PAGE_TO_STUDY[pageName()];
    if (fromPage) {
      return fromPage;
    }
    return 'na';
  }

  function getStudy(id) {
    return STUDIES[id] || STUDIES.na;
  }

  function writeDataScripts(study) {
    for (let src of study.data) {
      document.write('<script type="text/javascript" src="' + src + '"><\/script>');
    }
  }

  function applyStudyChrome(study) {
    let arena = document.querySelector('#studyarena');
    if (arena) {
      arena.textContent = study.arena;
    }

    let blurb = document.querySelector('#studyblurb');
    if (blurb) {
      if (study.blurb) {
        blurb.innerHTML = study.blurb;
        blurb.hidden = false;
      } else {
        blurb.innerHTML = '';
        blurb.hidden = true;
      }
    }

    let focus = document.querySelector('#studyfocus');
    if (focus) {
      focus.innerHTML = '';
      if (study.focusLinks && study.focusLinks.length) {
        focus.appendChild(document.createTextNode('A few closer focus links are shown here:'));
        focus.appendChild(document.createElement('br'));
        for (let link of study.focusLinks) {
          focus.appendChild(document.createTextNode('\u00a0\u00a0'));
          let a = document.createElement('a');
          a.href = 'index.html?study=' + study.id + '&' + link.query;
          a.textContent = link.label;
          focus.appendChild(a);
          focus.appendChild(document.createElement('br'));
        }
        focus.hidden = false;
      } else {
        focus.hidden = true;
      }
    }
  }

  function studyUrl(studyId, keepQuery) {
    let params = keepQuery ? new URLSearchParams(location.search) : new URLSearchParams();
    if (studyId && studyId !== 'na') {
      params.set('study', studyId);
    } else {
      params.delete('study');
    }
    // Drop legacy bare tokens when building clean study URLs
    let cleaned = new URLSearchParams();
    params.forEach(function (value, key) {
      cleaned.set(key, value);
    });
    let qs = cleaned.toString();
    return 'index.html' + (qs ? '?' + qs : '');
  }

  let studyId = resolveStudyId();
  let study = getStudy(studyId);

  global.OHMEC_STUDIES = STUDIES;
  global.OHMEC_STUDY_ID = studyId;
  global.OHMEC_STUDY = study;
  global.OHMEC = {
    STUDIES: STUDIES,
    resolveStudyId: resolveStudyId,
    getStudy: getStudy,
    writeDataScripts: writeDataScripts,
    applyStudyChrome: applyStudyChrome,
    studyUrl: studyUrl,
    pageName: pageName
  };
})(typeof window !== 'undefined' ? window : this);
