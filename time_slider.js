// Copyright OHMEC contributors.
// Licensed under the Apache License, Version 2.0, see LICENSE for details.
// SPDX-License-Identifier: Apache-2.0

let thisSlider;

function boundsIntersect(bounds1, bounds2) {
  return (bounds1.getWest()  <= bounds2.getEast()  &&
          bounds2.getWest()  <= bounds1.getEast()  &&
          bounds1.getSouth() <= bounds2.getNorth() &&
          bounds2.getSouth() <= bounds1.getNorth());
}

L.Control.TimeLineSlider = L.Control.extend({
  options: {
    position:           'bottomleft',
    timelineDateMin:    new Date(1,0,1),
    timelineDateMax:    new Date,
    timelineDateStart:  new Date(1776,6,4),
    sliderWidth:        "750px"
  },

  initialize: function (options) {
    L.setOptions(this, options);
  },

  updateButtons: function(smartstep) {
    let prefix = smartstep ? "" : "G";
    document.getElementById("stepFButton").value = prefix + "Step +";
    document.getElementById("stepRButton").value = prefix + "Step -";
  },

  onAdd: function() {
    thisSlider = this;

    this.sheet = document.createElement('style');
    document.body.appendChild(this.sheet);

    this.sliderContainer = L.DomUtil.create('div', 'slider_container');

    // Prevent click events propagation to map
    L.DomEvent.disableClickPropagation(this.sliderContainer);

    // Prevent right click event propagation to map
    L.DomEvent.on(this.sliderContainer, 'slider_container', function (ev) {
      L.DomEvent.stopPropagation(ev);
    });

    // Prevent scroll events propagation to map when cursor on the div
    L.DomEvent.disableScrollPropagation(this.sliderContainer);

    // Create html elements for range input, min/max labels, advance button and step buttons
    this.sliderDiv = L.DomUtil.create('div', 'range', this.sliderContainer);
    this.sliderDiv.innerHTML =
      '<input id="rangeinputslide" type="range" min="' +
      this.options.timelineDateMin.getTime() +
      '" max="' +
      this.options.timelineDateMax.getTime() +
      '" step="any" value="' +
      this.options.timelineDateMin.getTime() +
      '"></input>';
    this.rangeObject = L.DomUtil.get(this.sliderDiv).children[0];

    this.sliderYears = L.DomUtil.create('ul', 'slider-years', this.sliderContainer);
    let minYear = this.options.timelineDateMin.getFullYear();
    let maxYear = this.options.timelineDateMax.getFullYear();
    let absMinYear = minYear < 0 ? -1*minYear : minYear;
    let absMaxYear = maxYear < 0 ? -1*maxYear : maxYear;
    let minYearStr = absMinYear + ((minYear < 0) ? 'BC' : '');
    let maxYearStr = absMaxYear + ((maxYear < 0) ? 'BC' : '');
    this.sliderYears.innerHTML = "<li>" + minYearStr + "</li><li>" + maxYearStr + "</li>";

    this.advanceDiv = L.DomUtil.create('div', 'advance', this.sliderContainer);
    this.advanceDiv.innerHTML = '<input type="button" id="advButton" value="Advance"></input>';
    this.advButtonObject = L.DomUtil.get(this.advanceDiv).children[0];

    let prefix = thisSlider.options.smartStepFeature ? "" : "G";
    this.stepFDiv = L.DomUtil.create('div', 'stepF', this.sliderContainer);
    this.stepFDiv.innerHTML = '<input type="button" id="stepFButton" value="' + prefix + 'Step +"></input>';
    this.stepFButtonObject = L.DomUtil.get(this.stepFDiv).children[0];

    this.stepRDiv = L.DomUtil.create('div', 'stepR', this.sliderContainer);
    this.stepRDiv.innerHTML = '<input type="button" id="stepRButton" value="' + prefix + 'Step -"></input>';
    this.stepRButtonObject = L.DomUtil.get(this.stepRDiv).children[0];

    this.sheet.textContent = this.setupStartStyles();

    // When time slider gets changed, trigger updateTime function
    L.DomEvent.on(thisSlider.rangeObject, "input", function() {
      thisSlider.options.updateTime({dateValue: thisSlider.rangeObject.value});
    });

    // When advance/pause button gets pressed toggle advance/pause,
    // potentially "move time"

    thisSlider.advanceTime = function() {
      let incrTime = (thisSlider.options.timelineDateMax.getTime() - thisSlider.options.timelineDateMin.getTime())/240;
      let newTime = parseFloat(thisSlider.rangeObject.value) + parseFloat(incrTime);
      if(newTime >= thisSlider.options.timelineDateMax.getTime()) {
        newTime = thisSlider.options.timelineDateMax.getTime();
        clearInterval(thisSlider.intervalFunc);
        thisSlider.advButtonObject.value = "Advance";
      }
      thisSlider.rangeObject.value = newTime;
      thisSlider.options.updateTime({dateValue: thisSlider.rangeObject.value});
      thisSlider.options.clearInfobox();
    }

    thisSlider.affectAdvance = function() {
      if(thisSlider.advButtonObject.value == "Advance") {
        thisSlider.advButtonObject.value = "Stop";
        thisSlider.intervalFunc = setInterval(thisSlider.advanceTime, 250);
      } else {
        thisSlider.advButtonObject.value = "Advance";
        clearInterval(thisSlider.intervalFunc);
      }
    }

    L.DomEvent.on(thisSlider.advButtonObject, "click", thisSlider.affectAdvance);

    // step time forward once in datesOfInterest array
    // if "smartStep" feature is turned on, only step forward
    // if something in the field of view has changed for that step,
    // else skip to the next one

    thisSlider.affectStepF = function() {
      let curTime = thisSlider.rangeObject.value;
      for (let i=1;i<thisSlider.options.datesOfInterestSorted.length;i++) {
        if (curTime < thisSlider.options.datesOfInterestSorted[i].getTime()) {
          let useStep = true;
          if(thisSlider.options.smartStepFeature) {
            useStep = false;
            for(let id of thisSlider.options.idAddsPerDOI[i]) {
              if(boundsIntersect(thisSlider.options.mapBounds(), thisSlider.options.boundsHash[id])) {
                useStep = true;
              }
            }
            for(let id of thisSlider.options.idSubsPerDOI[i]) {
              if(boundsIntersect(thisSlider.options.mapBounds(), thisSlider.options.boundsHash[id])) {
                useStep = true;
              }
            }
          }
          if(useStep || !thisSlider.options.smartStepFeature) {
            // make sure we haven't stepped beyond the bounds of the slider
            if (thisSlider.options.datesOfInterestSorted[i].getTime() > thisSlider.options.timelineDateMax.getTime()) {
              thisSlider.rangeObject.value = thisSlider.options.timelineDateMax.getTime();
              thisSlider.options.updateTime({dateValue: thisSlider.rangeObject.value});
            } else {
              thisSlider.rangeObject.value = thisSlider.options.datesOfInterestSorted[i].getTime();
              thisSlider.options.updateTime({dateValue: thisSlider.rangeObject.value});
            }
            thisSlider.options.clearInfobox();
            return;
          }
        }
      }
    }

    // step time backward once in datesOfInterest array.
    // if "smartStep" feature is turned on, only step backward
    // if something in the field of view has changed for the next step
    // (indicating that something will be removed in this one) else skip
    // to the previous one

    thisSlider.affectStepR = function() {
      let curTime = thisSlider.rangeObject.value;
      for (let i=thisSlider.options.datesOfInterestSorted.length-2;i>=0;i--) {
        if (curTime > thisSlider.options.datesOfInterestSorted[i].getTime()) {
          let useStep = true;
          if(thisSlider.options.smartStepFeature) {
            useStep = false;
            for(let id of thisSlider.options.idAddsPerDOI[i+1]) {
              if(boundsIntersect(thisSlider.options.mapBounds(), thisSlider.options.boundsHash[id])) {
                useStep = true;
              }
            }
            for(let id of thisSlider.options.idSubsPerDOI[i+1]) {
              if(boundsIntersect(thisSlider.options.mapBounds(), thisSlider.options.boundsHash[id])) {
                useStep = true;
              }
            }
          }
          if(useStep || !thisSlider.options.smartStepFeature) {
            // make sure we haven't stepped beyond the bounds of the slider
            if (thisSlider.options.datesOfInterestSorted[i].getTime() < thisSlider.options.timelineDateMin.getTime()) {
              thisSlider.rangeObject.value = thisSlider.options.timelineDateMin.getTime();
              thisSlider.options.updateTime({dateValue: thisSlider.rangeObject.value});
            } else {
              thisSlider.rangeObject.value = thisSlider.options.datesOfInterestSorted[i].getTime();
              thisSlider.options.updateTime({dateValue: thisSlider.rangeObject.value});
            }
            thisSlider.options.clearInfobox();
            return;
          }
        }
      }
    }

    L.DomEvent.on(thisSlider.stepFButtonObject, "click", thisSlider.affectStepF);
    L.DomEvent.on(thisSlider.stepRButtonObject, "click", thisSlider.affectStepR);

    // Initialize input change at start
    let inputEvent = new Event('input');
    this.rangeObject.dispatchEvent(inputEvent);
    this.rangeObject.value = thisSlider.options.timelineDateStart.getTime();
    thisSlider.options.updateTime({dateValue: thisSlider.rangeObject.value});

    return this.sliderContainer;
  },

  onRemove: function() {
    // remove control html element
    L.DomUtil.remove(this.sliderContainer);
  },

  setupStartStyles: function() {
    let rangeWidth = (parseFloat(thisSlider.options.sliderWidth) - 15) + "px";
    let labelMargin = (parseFloat(thisSlider.options.sliderWidth)/2 - 10) + "px";
    let slider_style = `
      .slider_container {
        background-color: rgba(4,112,255,0.7);
        padding: 5px 15px 5px 15px;
        border-radius: 5px;
        border-style: solid;
        border-color: #0470ff;
        border-width: 1px;
        box-shadow: 5px 5px 5px #888;
      }
      .range {
        position: relative;
        left: -6px;
        height: 5px;
        width: ${thisSlider.options.sliderWidth};
      }
      .advance {
        position: relative;
        left: -40px;
        height: 30px;
        width: ${thisSlider.options.sliderWidth};
      }
      .stepF {
        position: relative;
        left: -40px;
        height: 0px;
        width: ${thisSlider.options.sliderWidth};
      }
      .stepR {
        position: relative;
        left: -40px;
        height: 0px;
        width: ${thisSlider.options.sliderWidth};
      }
      .range input {
        width: 100%;
        position: absolute;
      }
      .slider-years {
        margin: 10px -${labelMargin};
        padding: 0;
        list-style: none;
        color: #eee;
      }
      .slider-years li {
        width: ${rangeWidth};
        position: relative;
        float: left;
        text-align: center;
        cursor: pointer;
        font-size: 14px;
        font-weight: bold;
      }
      #advButton,#stepFButton,#stepRButton {
        position: relative;
        width: 80px;
        padding: 4px 0px;
        margin: -10px 0px -20px 0px;
        font-family: "Tahoma";
        font-size: 14px;
        color: #e0e0ff;
        text-decoration: none;
        background-color: #0470ff;
        border: none;
        align-items: center;
        border-radius: 6px;
      }
      #advButton {
        top: -10px;
        left: 50%;
      }
      #stepFButton {
        top: -19px;
        left: 65%;
      }
      #stepRButton {
        top: -19px;
        left: 35%;
      }
    `;
    return slider_style;
  },
});

L.control.timelineSlider = function(options) {
  return new L.Control.TimeLineSlider(options);
}
