// Copyright OHMEC contributors.
// Licensed under the Apache License, Version 2.0, see LICENSE for details.
// SPDX-License-Identifier: Apache-2.0

// Date parsing/formatting and safe URL helpers for the OHMEC viewer.

function dateStr(dateInput,slash) {
  let year = dateInput.getFullYear();
  if(year < 0) {
    return fixInt(-1*year,4) + 'BC';
  }
  return fixInt(year,4) + slash +
         fixInt(dateInput.getMonth()+1,2) + slash +
         fixInt(dateInput.getDate(),2);
}

function dateMin(minDate, newDate) {
  return (minDate < newDate) ? minDate : newDate;
}

function dateMax(maxDate, newDate) {
  return (maxDate > newDate) ? maxDate : newDate;
}

function uniqueDateSort(inArray) {
  if (inArray.length === 0) {
    return inArray;
  }
  let sortedArray = inArray.sort(function(a,b) { return a.getTime() - b.getTime(); });
  let returnArray = [ sortedArray[0] ];
  for (let i=1;i<sortedArray.length;i++) {
    if (sortedArray[i-1].toDateString() !== sortedArray[i].toDateString()) {
      returnArray.push(sortedArray[i]);
    }
  }
  return returnArray;
}

function str2date(datestr,roundLate) {
  // if roundLate is true, we'll set it for the next day, then subtract
  // one second after completion.
  let yr,mo,dy;
  let stripBC = datestr.replace("BC",'');
  let isBC = (datestr === stripBC) ? false : true;
  let info = stripBC.split(':');
  // if datestr only contained one member (year), consider it 1st day of the year,
  // either next year (if roundLate) or this.
  // if only contains two (year, month), consider it 1st day of month,
  // either next month (if roundLate) or this.
  if(info.length==3) {
    yr = info[0] * (isBC ? -1 : 1);
    mo = info[1]-1;
    dy = info[2];
  } else if(info.length==2) {
    yr = info[0] * (isBC ? -1 : 1);
    mo = info[1]-1;
    dy = 1;
    if(roundLate) {
      if(info[1] == 12) {
        mo = 0;
        yr++;
      } else {
        mo++;
      }
    }
  } else if(info.length==1) {
    yr = info[0] * (isBC ? -1 : 1);
    mo = 0;
    dy = 1;
    if(roundLate) {
      yr++;
    }
  } else {
    throw "bad date format for date: " + datestr;
  }
  let newdate = new Date(yr,mo,dy);
  newdate.setFullYear(yr);  // fixes "feature" for dates from 1-99
  if(roundLate) {
    if(info.length==3) {
      newdate.setDate(newdate.getDate());
    } else {
      newdate.setDate(newdate.getDate()-1);
    }
    newdate.setHours(23);
    newdate.setMinutes(59);
    newdate.setSeconds(59);
  }
  return newdate;
}

function fixInt(numstr, length) {
  return numstr.toLocaleString('en-US', {minimumIntegerDigits: length, useGrouping:false});
}

function safeHttpUrl(url) {
  if (typeof url !== 'string' || url.length === 0) {
    return null;
  }
  try {
    let parsed = new URL(url, location.href);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.href;
    }
  } catch (e) {
    // ignore invalid URLs
  }
  return null;
}

function safeEmblemPath(name) {
  if (typeof name !== 'string' || !/^[\w.-]+$/.test(name)) {
    return null;
  }
  return 'emblems/' + name;
}

