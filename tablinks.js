// Copyright OHMEC contributors.
// Licensed under the Apache License, Version 2.0, see LICENSE for details.
// SPDX-License-Identifier: Apache-2.0

function addButton(div,name,title,text,primary) {
  let b = document.createElement("button");
  b.innerHTML = text;
  b.name = name;
  if(primary) {
    b.setAttribute("class","tablinks active");
  } else {
    b.setAttribute("class","tablinks");
  }
  b.setAttribute("title",title);
  b.onclick = function() { setTab(name); }
  div.appendChild(b);
}

function currentStudyId() {
  if (typeof OHMEC_STUDY_ID !== 'undefined' && OHMEC_STUDY_ID) {
    return OHMEC_STUDY_ID;
  }
  if (typeof OHMEC !== 'undefined' && OHMEC.resolveStudyId) {
    return OHMEC.resolveStudyId();
  }
  return 'na';
}

function addTabLinks() {
  let tabDiv = document.querySelector('#tablinks');
  if (!tabDiv) {
    return;
  }
  let hrefText = location.href;
  let splits = hrefText.split('?');
  let urlText = splits[0];
  splits = urlText.split('/');
  let pagename = splits[splits.length-1];
  let studyId = currentStudyId();
  let onViewer = (pagename === 'index.html' || pagename === '' || /^index_/.test(pagename));
  let onAbout = pagename === 'about.html';

  addButton(tabDiv,'home',     'primary',                        'Home',             onViewer && studyId === 'na');
  addButton(tabDiv,'meso',     'Mesoamerica',                    'Mesoamerica',      onViewer && studyId === 'meso');
  addButton(tabDiv,'nl',       'uses Native Lands database',     'Native Lands',     onViewer && studyId === 'nl');
  addButton(tabDiv,'aa',       'Ancient Americas animation',     'Ancient Americas', onViewer && studyId === 'aa');
  addButton(tabDiv,'cherokee', 'Cherokee migration animation',   'Cherokee',         onViewer && studyId === 'cherokee');
  addButton(tabDiv,'viking',   'Viking migration animation',     'Viking',           onViewer && studyId === 'viking');
  addButton(tabDiv,'about',    'more about project and webpage', 'About',            onAbout);
}

function setTab(title) {
  if (title === 'about') {
    open('about.html', '_self');
    return;
  }
  let studyId = (title === 'home') ? 'na' : title;
  let newTarget = (typeof OHMEC !== 'undefined' && OHMEC.studyUrl)
    ? OHMEC.studyUrl(studyId, false)
    : (studyId === 'na' ? 'index.html' : 'index.html?study=' + studyId);
  open(newTarget, '_self');
}

addTabLinks();
