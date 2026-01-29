"use strict";

function getLyricsStyles() {
  return `
    @property --gradient-position {
      syntax: '<percentage>';
      inherits: false;
      initial-value: -20%;
    }

    #fad-lyrics-plus-container {
      transition: transform 0.5s cubic-bezier(0.4, 0, 0.2, 1);
      position: absolute;
      right: 50px;
      width: 50%;
      top: 7.5vh;
      height: 85vh;
      overflow: hidden;
      pointer-events: auto;
      z-index: 10;
    }

    #ym-fullscreen-container.lyrics-unavailable #fad-lyrics-plus-container,
    #ym-fullscreen-container:not(.lyrics-active) #fad-lyrics-plus-container {
      transform: translateX(1000px) scale3d(0.1, 0.1, 0.1) rotate(45deg);
      pointer-events: none;
    }

    .tv-mode #fad-lyrics-plus-container {
      width: 45%;
    }

    .tv-mode.lyrics-active #fsd-foreground {
      width: max-content;
      max-width: 60%;
    }

    #fad-lyrics-plus-container .lyrics-wrapper {
      width: 100%;
      height: 100%;
      position: relative;
      overflow: hidden;
    }

    #fad-lyrics-plus-container .lyrics-content {
      width: 100%;
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 20vh 2rem 20vh 2rem;
      box-sizing: border-box;
      scroll-behavior: smooth;

      -webkit-mask-image: linear-gradient(
        to bottom,
        transparent 0%,
        black 10%,
        black 90%,
        transparent 100%
      );
      mask-image: linear-gradient(
        to bottom,
        transparent 0%,
        black 10%,
        black 90%,
        transparent 100%
      );
    }

    #fad-lyrics-plus-container .lyrics-content::-webkit-scrollbar {
      width: 6px;
      background: transparent;
    }

    #fad-lyrics-plus-container .lyrics-content::-webkit-scrollbar-track {
      background: transparent;
    }

    #fad-lyrics-plus-container .lyrics-content::-webkit-scrollbar-thumb {
      background: transparent;
      border-radius: 3px;
      transition: background 0.2s ease;
    }

    #fad-lyrics-plus-container:hover .lyrics-content::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.3);
    }

    #fad-lyrics-plus-container:hover .lyrics-content::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.5);
    }

    #ym-fullscreen-container.hide-cursor #fad-lyrics-plus-container .lyrics-content::-webkit-scrollbar-thumb {
      background: transparent !important;
    }

    #fad-lyrics-plus-container .line {
      font-size: 2.5rem;
      font-weight: 700;
      line-height: 1.6;
      margin: 0.5rem 0;
      padding: 0.5rem 0;

      white-space: normal;
      text-align: center;
      max-width: 100%;
      overflow-wrap: anywhere;
      word-break: break-word;
      
      cursor: pointer;
      user-select: none;
      position: relative;

      transform-origin: center center;

      --blur-amount: 0px;
      filter: blur(var(--blur-amount));
      
      will-change: opacity, filter;

      --gradient-position: -20%;
      --gradient-alpha: 0.85;
      --gradient-alpha-end: 0.35;
      --gradient-degrees: 180deg;
      
      background-image: linear-gradient(
        var(--gradient-degrees),
        rgba(255, 255, 255, var(--gradient-alpha)) var(--gradient-position),
        rgba(255, 255, 255, var(--gradient-alpha-end)) calc(var(--gradient-position) + 20%)
      );
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      color: rgba(255, 255, 255, var(--gradient-alpha-end));

      -webkit-transform: translateZ(0);
      -webkit-font-smoothing: subpixel-antialiased;

      text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
    }

    #fad-lyrics-plus-container .line:hover {
      transform: translateX(-5px);
    }

    #fad-lyrics-plus-container .line.NotSung {
      --gradient-position: -20%;
      opacity: 0.51;
      transform: scale(0.95);
      text-shadow: 0 0 var(--blur-amount) rgba(255, 255, 255, 0.35);
    }

    #fad-lyrics-plus-container .line.Active {
      --blur-amount: 0px;
      opacity: 1;
      transform: scale(1.05);
      font-weight: 700;
    }

    #fad-lyrics-plus-container .line.Sung {
      --gradient-position: 100%;
      opacity: 0.497;
      transform: scale(1);
      text-shadow: 0 0 var(--blur-amount) rgba(255, 255, 255, 0.85);
    }

    #fad-lyrics-plus-container .line.static {
      color: rgba(255, 255, 255, 0.9);
      opacity: 1;
      transform: none;
      cursor: default;
    }

    #fad-lyrics-plus-container .line.static:hover {
      transform: none;
    }

    #fad-lyrics-plus-container .lyrics-message {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      color: rgba(255, 255, 255, 0.5);
      font-size: 1.5rem;
      font-weight: 600;
    }

    #fad-lyrics-plus-container .lyrics-message.error {
      color: rgba(255, 100, 100, 0.7);
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    #fad-lyrics-plus-container.lyrics-loaded .line {
      animation: fadeIn 0.5s ease-out backwards;
    }

    #fad-lyrics-plus-container.lyrics-loaded .line:nth-child(1) { animation-delay: 0.05s; }
    #fad-lyrics-plus-container.lyrics-loaded .line:nth-child(2) { animation-delay: 0.1s; }
    #fad-lyrics-plus-container.lyrics-loaded .line:nth-child(3) { animation-delay: 0.15s; }
    #fad-lyrics-plus-container.lyrics-loaded .line:nth-child(4) { animation-delay: 0.2s; }
    #fad-lyrics-plus-container.lyrics-loaded .line:nth-child(5) { animation-delay: 0.25s; }

    @media (max-width: 1400px) {
      #fad-lyrics-plus-container .line {
        font-size: 2rem;
      }
    }

    @media (max-width: 1000px) {
      #fad-lyrics-plus-container {
        width: 60%;
        right: 30px;
      }
      
      #fad-lyrics-plus-container .line {
        font-size: 1.75rem;
      }
    }

    .tv-mode #fad-lyrics-plus-container {
      width: 45%;
    }
    
    .tv-mode #fad-lyrics-plus-container .line {
      font-size: 3rem;
      text-align: center;
    }

    .tv-mode #fad-lyrics-plus-container .line.Active {
      transform: scale(1.08) translateY(-3px);
    }
    
    .tv-mode.lyrics-active #fsd-foreground {
      width: max-content;
      max-width: 60%;
    }

    #fad-lyrics-plus-container .line {
      contain: paint style;
      content-visibility: auto;
    }

    #fad-lyrics-plus-container .line {
      transition: 
        filter 0.3s ease,
        transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
        opacity 0.3s ease;
    }

    #fad-lyrics-plus-container .lyrics-content.HideLineBlur .line {
      --blur-amount: 0px !important;
      filter: blur(0px) !important;
    }
  `;
}

exports.getLyricsStyles = getLyricsStyles;
