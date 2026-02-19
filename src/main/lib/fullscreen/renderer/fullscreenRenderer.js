"use strict";

const { getStylesCode } = require('./styles.js');
const { getUICode } = require('./ui.js');
const { getBackgroundRendererCode } = require('./backgroundRenderer.js');
const { getControlsCode } = require('./controls.js');
const { getLyricsCode } = require('./lyrics.js');
const { getMainCode } = require('./main.js');

function getRendererCode() {
  return `
    ${getStylesCode()}
    ${getUICode()}
    ${getBackgroundRendererCode()}
    ${getControlsCode()}
    ${getLyricsCode()}
    ${getMainCode()}
  `;
}

exports.getRendererCode = getRendererCode;
