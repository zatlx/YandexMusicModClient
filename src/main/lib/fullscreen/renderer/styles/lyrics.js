"use strict";

function getLyricsStyles() {
  return `
    #fad-lyrics-plus-container {
      transition: transform var(--transition-duration) var(--transition-function);
      position: absolute;
      right: 50px;
      width: 50%;
      top: 7.5vh;
    }

    #ym-fullscreen-container.lyrics-unavailable #fad-lyrics-plus-container,
    #ym-fullscreen-container:not(.lyrics-active) #fad-lyrics-plus-container {
      transform: translateX(1000px) scale3d(0.1, 0.1, 0.1) rotate(45deg);
    }

    #fad-lyrics-plus-container .lyrics-lyricsContainer {
      --lyrics-color-active: var(--primary-color) !important;
      --lyrics-color-inactive: var(--tertiary-color) !important;
      --lyrics-highlight-background: rgba(var(--contrast-color), 0.7) !important;
      --lyrics-align-text: right !important;
      --animation-tempo: 0.2s !important;
      height: 85vh !important;
    }

    .tv-mode #fad-lyrics-plus-container {
      width: 45%;
    }

    .tv-mode.lyrics-active #fsd-foreground {
      width: max-content;
      max-width: 60%;
    }
  `;
}

exports.getLyricsStyles = getLyricsStyles;
