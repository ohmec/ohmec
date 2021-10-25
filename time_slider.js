// Copyright OHMEC contributors.
// Licensed under the Apache License, Version 2.0, see LICENSE for details.
// SPDX-License-Identifier: Apache-2.0

let holdThis;
let useSmartStep = 0;
let stepTmout = 0;

function boundsIntersect(bounds1, bounds2) {
  return (bounds1.getWest()  <= bounds2.getEast()  &&
          bounds2.getWest()  <= bounds1.getEast()  &&
          bounds1.getSouth() <= bounds2.getNorth() &&
          bounds2.getSouth() <= bounds1.getNorth());
}

L.Control.TimeLineSlider = L.Control.extend({
  options: {
    position: 'bottomleft',
    timelineMin: new Date(1,0,1),
    timelineMax: new Date,
    timelineStart: new Date(1776,6,4),
    sliderWidth: "750px",
  },

  initialize: function (options) {
    L.setOptions(this, options);
  },

  onAdd: function() {
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
      this.options.timelineMin.getTime() +
      '" max="' +
      this.options.timelineMax.getTime() +
      '" step="any" value="' +
      this.options.timelineMin.getTime() +
      '"></input>';
    this.rangeObject = L.DomUtil.get(this.sliderDiv).children[0];

    this.sliderYears = L.DomUtil.create('ul', 'slider-years', this.sliderContainer);
    this.sliderYears.innerHTML = "<li>" + this.options.timelineMin.getFullYear() + "</li><li>" + this.options.timelineMax.getFullYear() + "</li>";


    this.advanceDiv = L.DomUtil.create('div', 'advance', this.sliderContainer);
    this.advanceDiv.innerHTML = '<input type="button" id="advButton" value="Advance"></input>';
    this.advButtonObject = L.DomUtil.get(this.advanceDiv).children[0];

    this.stepFDiv = L.DomUtil.create('div', 'stepF', this.sliderContainer);
    this.stepFDiv.innerHTML = '<input type="button" id="stepFButton" value="Step +"></input>';
    this.stepFButtonObject = L.DomUtil.get(this.stepFDiv).children[0];

    this.stepRDiv = L.DomUtil.create('div', 'stepR', this.sliderContainer);
    this.stepRDiv.innerHTML = '<input type="button" id="stepRButton" value="Step -"></input>';
    this.stepRButtonObject = L.DomUtil.get(this.stepRDiv).children[0];

    holdThis = this;

    this.sheet.textContent = this.setupStartStyles();

    // When time slider gets changed, trigger updateTime function
    L.DomEvent.on(holdThis.rangeObject, "input", function() {
      holdThis.options.updateTime({dateValue: holdThis.rangeObject.value});
    });

    // When advance/pause button gets pressed toggle advance/pause,
    // potentially "move time"

    holdThis.advanceTime = function() {
      let incrTime = (holdThis.options.timelineMax.getTime() - holdThis.options.timelineMin.getTime())/240;
      let newTime = parseFloat(holdThis.rangeObject.value) + parseFloat(incrTime);
      if(newTime >= holdThis.options.timelineMax.getTime()) {
        newTime = holdThis.options.timelineMax.getTime();
        clearInterval(holdThis.intervalFunc);
        holdThis.advButtonObject.value = "Advance";
      }
      holdThis.rangeObject.value = newTime;
      holdThis.options.updateTime({dateValue: holdThis.rangeObject.value});
    }

    L.DomEvent.on(holdThis.advButtonObject, "click", function() {
      if(holdThis.advButtonObject.value == "Advance") {
        holdThis.advButtonObject.value = "Stop";
        holdThis.intervalFunc = setInterval(holdThis.advanceTime, 250);
      } else {
        holdThis.advButtonObject.value = "Advance";
        clearInterval(holdThis.intervalFunc);
      }
    });

    L.DomEvent.on(holdThis.stepFButtonObject, "click", function() {
      // step time forward once in datesOfInterest array
      // if "useSmartStep" is turned on, only step forward
      // if something in the field of view has changed for that step,
      // else skip to the next one
      let curTime = holdThis.rangeObject.value;
      for (let i=1;i<datesOfInterestSorted.length;i++) {
        if (curTime < datesOfInterestSorted[i].getTime()) {
          let useStep = false;
          let addSet = new Set();
          let removeSet = new Set();
          let modifySet = new Set();
          for(let id of idAddsPerDOI[i]) {
            if(!useSmartStep || boundsIntersect(ohmap.getBounds(), boundsHash[id])) {
              addSet.add(enameHash[id]);
              useStep = true;
            }
          }
          for(let id of idSubsPerDOI[i]) {
            if(!useSmartStep || boundsIntersect(ohmap.getBounds(), boundsHash[id])) {
              if(addSet.has(enameHash[id])) {
                modifySet.add(enameHash[id]);
                addSet.delete(enameHash[id]);
              } else {
                removeSet.add(enameHash[id]);
              }
              useStep = true;
            }
          }
          let stepText = '';
          for(let ename of removeSet) {
            stepText += "  removed " + ename + "<br/>";
          }
          for(let ename of modifySet) {
            stepText += "  modified " + ename + "<br/>";
          }
          for(let ename of addSet) {
            stepText += "  added " + ename + "<br/>";
          }
          if(useStep) {
            stepbox.update(stepText);
            // a little random, but clear after 4 seconds
            if(stepTmout) {
              clearTimeout(stepTmout);
            }
            stepTmout = setTimeout(() => { stepbox.update(''); }, 4000);
            // make sure we haven't stepped beyond the bounds of the slider
            if (datesOfInterestSorted[i].getTime() > holdThis.options.timelineMax.getTime()) {
              holdThis.rangeObject.value = holdThis.options.timelineMax.getTime();
              holdThis.options.updateTime({dateValue: holdThis.rangeObject.value});
            } else {
              holdThis.rangeObject.value = datesOfInterestSorted[i].getTime();
              holdThis.options.updateTime({dateValue: holdThis.rangeObject.value});
            }
            return;
          }
        }
      }
    });

    L.DomEvent.on(holdThis.stepRButtonObject, "click", function() {
      // step time backward once in datesOfInterest array
      // if "useSmartStep" is turned on, only step backward
      // if something in the field of view has changed for that step,
      // else skip to the previous one
      let curTime = holdThis.rangeObject.value;
      for (let i=datesOfInterestSorted.length-2;i>=0;i--) {
        if (curTime > datesOfInterestSorted[i].getTime()) {
          let useStep = false;
          let addSet = new Set();
          let removeSet = new Set();
          let modifySet = new Set();
          for(let id of idAddsPerDOI[i+1]) {
            if(!useSmartStep || boundsIntersect(ohmap.getBounds(), boundsHash[id])) {
              removeSet.add(enameHash[id]);
              useStep = true;
              console.log("setting useStep true for " + i);
            }
          }
          for(let id of idSubsPerDOI[i+1]) {
            if(!useSmartStep || boundsIntersect(ohmap.getBounds(), boundsHash[id])) {
              if(removeSet.has(enameHash[id])) {
                modifySet.add(enameHash[id]);
                removeSet.delete(enameHash[id]);
              } else {
                addSet.add(enameHash[id]);
              }
              useStep = true;
            }
          }
          let stepText = '';
          for(let ename of removeSet) {
            stepText += "  removed " + ename + "<br/>";
          }
          for(let ename of modifySet) {
            stepText += "  modified " + ename + "<br/>";
          }
          for(let ename of addSet) {
            stepText += "  added " + ename + "<br/>";
          }
          if(useStep) {
            stepbox.update(stepText);
            // a little random, but clear after 4 seconds
            if(stepTmout) {
              clearTimeout(stepTmout);
            }
            stepTmout = setTimeout(() => { stepbox.update(''); }, 4000);
            // make sure we haven't stepped beyond the bounds of the slider
            if (datesOfInterestSorted[i].getTime() < holdThis.options.timelineMin.getTime()) {
              holdThis.rangeObject.value = holdThis.options.timelineMin.getTime();
              holdThis.options.updateTime({dateValue: holdThis.rangeObject.value});
            } else {
              holdThis.rangeObject.value = datesOfInterestSorted[i].getTime();
              holdThis.options.updateTime({dateValue: holdThis.rangeObject.value});
            }
            return;
          }
        }
      }
    });

    // Initialize input change at start
    let inputEvent = new Event('input');
    this.rangeObject.dispatchEvent(inputEvent);
    this.rangeObject.value = holdThis.options.timelineStart.getTime();
    holdThis.options.updateTime({dateValue: holdThis.rangeObject.value});

    return this.sliderContainer;
  },

  onRemove: function() {
    // remove control html element
    L.DomUtil.remove(this.sliderContainer);
  },

  setupStartStyles: function() {
    let rangeWidth = (parseFloat(holdThis.options.sliderWidth) - 15) + "px";
    let labelMargin = (parseFloat(holdThis.options.sliderWidth)/2 - 10) + "px";
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
        width: ${holdThis.options.sliderWidth};
      }
      .advance {
        position: relative;
        left: -40px;
        height: 30px;
        width: ${holdThis.options.sliderWidth};
      }
      .stepF {
        position: relative;
        left: -40px;
        height: 0px;
        width: ${holdThis.options.sliderWidth};
      }
      .stepR {
        position: relative;
        left: -40px;
        height: 0px;
        width: ${holdThis.options.sliderWidth};
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
