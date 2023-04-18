// Copyright OHMEC contributors.
// Licensed under the Apache License, Version 2.0, see LICENSE for details.
// SPDX-License-Identifier: Apache-2.0

// check for URL override

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

function addTabLinks() {
  let tabDiv = document.querySelector('#tablinks');
  let hrefText = location.href;
  let splits = hrefText.split('?');
  let urlText = splits[0];
  splits = urlText.split('/');
  let pagename = splits[splits.length-1];
  addButton(tabDiv,'home',     'primary',                        'Home',             pagename==='index.html');
  addButton(tabDiv,'meso',     'Mesoamerica',                    'Mesoamerica',      pagename==='index_meso.html');
  addButton(tabDiv,'nl',       'uses Native Lands database',     'Native Lands',     pagename==='index_nl.html');
  addButton(tabDiv,'aa',       'Ancient Americas animation',     'Ancient Americas', pagename==='index_aa.html');
  addButton(tabDiv,'cherokee', 'Cherokee migration animation',   'Cherokee',         pagename==='index_cherokee.html');
  addButton(tabDiv,'viking',   'Viking migration animation',     'Viking',           pagename==='index_viking.html');
  addButton(tabDiv,'about',    'more about project and webpage', 'About',            pagename==='about.html');
}

function setTab(title) {
  let newTarget =
    title ===  'home' ? 'index.html' :
    title === 'about' ? 'about.html' :
     'index_' + title + '.html';
  console.log(newTarget);
  open(newTarget,"_self");
}

addTabLinks();
