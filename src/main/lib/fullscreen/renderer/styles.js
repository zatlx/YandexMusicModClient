"use strict";

const { getBaseStyles } = require('./styles/base.js');
const { getEnhancedStyles } = require('./styles/enhanced.js');
const { getTVStyles } = require('./styles/tv.js');
const { getLyricsStyles } = require('./styles/lyrics.js');

function getStylesCode() {
  return `
    const FULLSCREEN_STYLES = \`
      ${getBaseStyles()}
      ${getEnhancedStyles()}
      ${getTVStyles()}
      ${getLyricsStyles()}
    \`;
  `;
}

exports.getStylesCode = getStylesCode;
