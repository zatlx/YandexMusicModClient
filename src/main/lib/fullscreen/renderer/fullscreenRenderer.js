"use strict";

const { getStylesCode } = require('./styles.js');
const { getUICode } = require('./ui.js');
const { getControlsCode } = require('./controls.js');
const { getLyricsCode } = require('./lyrics.js');
const { getMainCode } = require('./main.js');

function getRendererCode() {
  return `
    ${getStylesCode()}
    ${getUICode()}
    ${getControlsCode()}
    ${getLyricsCode()}
    ${getMainCode()}
  `;
}

exports.getRendererCode = getRendererCode;
