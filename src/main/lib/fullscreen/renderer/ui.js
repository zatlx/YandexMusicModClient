"use strict";

function getUICode() {
  return `
    const FullscreenUI = {
      createContainer() {
        const container = document.createElement('div');
        container.id = 'ym-fullscreen-container';
        container.classList.add('themed-buttons');
        return container;
      },
      
      createHTML(mode) {
        return \`
          <canvas id="fsd-background"></canvas>
          
          <button id="ym-fs-exit">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
          
          <div id="fsd-ctx-container">
            <div id="fsd-ctx-icon"></div>
            <div id="fsd-ctx-details">
              <div id="fsd-ctx-source"></div>
              <div id="fsd-ctx-name"></div>
            </div>
          </div>
          
          <div id="fad-lyrics-plus-container"></div>
          
          <div id="fsd-volume-container" class="v-hidden">
            <div id="fsd-volume">100%</div>
            <div id="fsd-volume-bar">
              <div id="fsd-volume-bar-inner">
                <div id="volume-thumb"></div>
              </div>
            </div>
            <button class="fs-button" id="fsd-volume-icon">
              <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
                <path d="M9.741.85a.75.75 0 01.375.65v13a.75.75 0 01-1.125.65l-6.925-4a3.642 3.642 0 01-1.33-4.967 3.639 3.639 0 011.33-1.332l6.925-4a.75.75 0 01.75 0zm-6.924 5.3a2.139 2.139 0 000 3.7l5.8 3.35V2.8l-5.8 3.35zm8.683 4.29V5.56a2.75 2.75 0 010 4.88z"/>
                <path d="M11.5 13.614a5.752 5.752 0 000-11.228v1.55a4.252 4.252 0 010 8.127v1.55z"/>
              </svg>
            </button>
          </div>
          
          <div id="fsd-foreground">
            <div id="fsd-art">
              <div id="fsd-art-image" class="fsd-background-fade">
              </div>
            </div>
            
            <div id="fsd-details">
              <div id="fsd-title" class="fsd-song-meta">
                <svg id="playing-icon" width="28" height="28" viewBox="0 0 22 24" fill="currentColor">
                  <defs>
                    <style>
                      #playing-icon { fill: currentColor; }
                      @keyframes play {
                        0% { transform: scaleY(1); }
                        3.3% { transform: scaleY(.9583); }
                        6.6% { transform: scaleY(.9166); }
                        9.9% { transform: scaleY(.8333); }
                        13.3% { transform: scaleY(.7083); }
                        16.6% { transform: scaleY(.5416); }
                        19.9% { transform: scaleY(.4166); }
                        23.3% { transform: scaleY(.25); }
                        26.6% { transform: scaleY(.1666); }
                        29.9% { transform: scaleY(.125); }
                        33.3% { transform: scaleY(.125); }
                        36.6% { transform: scaleY(.1666); }
                        39.9% { transform: scaleY(.1666); }
                        43.3% { transform: scaleY(.2083); }
                        46.6% { transform: scaleY(.2916); }
                        49.9% { transform: scaleY(.375); }
                        53.3% { transform: scaleY(.5); }
                        56.6% { transform: scaleY(.5833); }
                        59.9% { transform: scaleY(.625); }
                        63.3% { transform: scaleY(.6666); }
                        66.6% { transform: scaleY(.6666); }
                        69.9% { transform: scaleY(.6666); }
                        73.3% { transform: scaleY(.6666); }
                        76.6% { transform: scaleY(.7083); }
                        79.9% { transform: scaleY(.75); }
                        83.3% { transform: scaleY(.8333); }
                        86.6% { transform: scaleY(.875); }
                        89.9% { transform: scaleY(.9166); }
                        93.3% { transform: scaleY(.9583); }
                        96.6% { transform: scaleY(1); }
                      }
                      #bar1 { transform-origin: bottom; animation: play .9s -.51s infinite; }
                      #bar2 { transform-origin: bottom; animation: play .9s infinite; }
                      #bar3 { transform-origin: bottom; animation: play .9s -.15s infinite; }
                      #bar4 { transform-origin: bottom; animation: play .9s -.75s infinite; }
                    </style>
                  </defs>
                  <rect id="bar1" width="2" height="24"/>
                  <rect id="bar2" x="6" width="2" height="24"/>
                  <rect id="bar3" x="12" width="2" height="24"/>
                  <rect id="bar4" x="18" width="2" height="24"/>
                </svg>
                <svg id="paused-icon" width="28" height="28" viewBox="5 4 16 16" fill="currentColor" class="hidden">
                  <path d="M9.732 19.241c1.077 0 2.688-.79 2.688-2.922V9.617c0-.388.074-.469.418-.542l3.347-.732a.48.48 0 00.403-.484V5.105c0-.388-.315-.637-.689-.563l-3.764.82c-.47.102-.725.359-.725.769l.014 8.144c.037.36-.132.594-.454.66l-1.164.241c-1.465.308-2.154 1.055-2.154 2.16 0 1.122.864 1.905 2.08 1.905z"/>
                </svg>
                <span></span>
              </div>
              <div id="fsd-artist">
                <svg height="22" width="22" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M6.233.371a4.388 4.388 0 015.002 1.052c.421.459.713.992.904 1.554.143.421.263 1.173.22 1.894-.078 1.322-.638 2.408-1.399 3.316l-.127.152a.75.75 0 00.201 1.13l2.209 1.275a4.75 4.75 0 012.375 4.114V16H.382v-1.143a4.75 4.75 0 012.375-4.113l2.209-1.275a.75.75 0 00.201-1.13l-.126-.152c-.761-.908-1.322-1.994-1.4-3.316-.043-.721.077-1.473.22-1.894a4.346 4.346 0 01.904-1.554c.411-.448.91-.807 1.468-1.052zM8 1.5a2.888 2.888 0 00-2.13.937 2.85 2.85 0 00-.588 1.022c-.077.226-.175.783-.143 1.323.054.921.44 1.712 1.051 2.442l.002.001.127.153a2.25 2.25 0 01-.603 3.39l-2.209 1.275A3.25 3.25 0 001.902 14.5h12.196a3.25 3.25 0 00-1.605-2.457l-2.209-1.275a2.25 2.25 0 01-.603-3.39l.127-.153.002-.001c.612-.73.997-1.52 1.052-2.442.032-.54-.067-1.097-.144-1.323a2.85 2.85 0 00-.588-1.022A2.888 2.888 0 008 1.5z"/>
                </svg>
                <span class="fsd-artist-list"></span>
              </div>
              <div id="fsd-album" class="fsd-song-meta">
                <svg height="22" width="22" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8z"/>
                  <path d="M8 6.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM5 8a3 3 0 116 0 3 3 0 01-6 0z"/>
                </svg>
                <span></span>
              </div>
              
              <div id="fsd-status" class="active">
                <div class="fsd-controls fsd-controls-left extra-controls">
                  <button class="fs-button" id="fsd-heart">
                    <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M1.69 2A4.582 4.582 0 018 2.023 4.583 4.583 0 0111.88.817h.002a4.618 4.618 0 013.782 3.65v.003a4.543 4.543 0 01-1.011 3.84L9.35 14.629a1.765 1.765 0 01-2.093.464 1.762 1.762 0 01-.605-.463L1.348 8.309A4.582 4.582 0 011.689 2zm3.158.252A3.082 3.082 0 002.49 7.337l.005.005L7.8 13.664a.264.264 0 00.311.069.262.262 0 00.09-.069l5.312-6.33a3.043 3.043 0 00.68-2.573 3.118 3.118 0 00-2.551-2.463 3.079 3.079 0 00-2.612.816l-.007.007a1.501 1.501 0 01-2.045 0l-.009-.008a3.082 3.082 0 00-2.121-.861z"/>
                    </svg>
                  </button>
                  <button class="fs-button" id="fsd-shuffle">
                    <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M13.151.922a.75.75 0 10-1.06 1.06L13.109 3H11.16a3.75 3.75 0 00-2.873 1.34l-6.173 7.356A2.25 2.25 0 01.39 12.5H0V14h.391a3.75 3.75 0 002.873-1.34l6.173-7.356a2.25 2.25 0 011.724-.804h1.947l-1.017 1.018a.75.75 0 001.06 1.06L15.98 3.75 13.15.922zM.391 3.5H0V2h.391c1.109 0 2.16.49 2.873 1.34L4.89 5.277l-.979 1.167-1.796-2.14A2.25 2.25 0 00.39 3.5z"/>
                      <path d="M7.5 10.723l.98-1.167.957 1.14a2.25 2.25 0 001.724.804h1.947l-1.017-1.018a.75.75 0 111.06-1.06l2.829 2.828-2.829 2.828a.75.75 0 11-1.06-1.06L13.109 13H11.16a3.75 3.75 0 01-2.873-1.34l-.787-.938z"/>
                    </svg>
                  </button>
                </div>
                
                <div class="fsd-controls fsd-controls-center">
                  <button class="fs-button" id="fsd-back">
                    <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M3.3 1a.7.7 0 01.7.7v5.15l9.95-5.744a.7.7 0 011.05.606v12.575a.7.7 0 01-1.05.607L4 9.149V14.3a.7.7 0 01-.7.7H1.7a.7.7 0 01-.7-.7V1.7a.7.7 0 01.7-.7h1.6z"/>
                    </svg>
                  </button>
                  
                  <button class="fs-button" id="fsd-play">
                    <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M3 1.713a.7.7 0 011.05-.607l10.89 6.288a.7.7 0 010 1.212L4.05 14.894A.7.7 0 013 14.288V1.713z"/>
                    </svg>
                  </button>
                  
                  <button class="fs-button" id="fsd-next">
                    <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M12.7 1a.7.7 0 00-.7.7v5.15L2.05 1.107A.7.7 0 001 1.712v12.575a.7.7 0 001.05.607L12 9.149V14.3a.7.7 0 00.7.7h1.6a.7.7 0 00.7-.7V1.7a.7.7 0 00-.7-.7h-1.6z"/>
                    </svg>
                  </button>
                </div>
                
                <div class="fsd-controls fsd-controls-right extra-controls">
                  <button class="fs-button" id="fsd-repeat">
                    <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M0 4.75A3.75 3.75 0 013.75 1h8.5A3.75 3.75 0 0116 4.75v5a3.75 3.75 0 01-3.75 3.75H9.81l1.018 1.018a.75.75 0 11-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 111.06 1.06L9.811 12h2.439a2.25 2.25 0 002.25-2.25v-5a2.25 2.25 0 00-2.25-2.25h-8.5A2.25 2.25 0 001.5 4.75v5A2.25 2.25 0 003.75 12H5v1.5H3.75A3.75 3.75 0 010 9.75v-5z"/>
                    </svg>
                  </button>
                  <button class="fs-button" id="fsd-lyrics">
                    <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M13.426 2.574a2.831 2.831 0 00-4.797 1.55l3.247 3.247a2.831 2.831 0 001.55-4.797zM10.5 8.118l-2.619-2.62A63303.13 63303.13 0 004.74 9.075L2.065 12.12a1.287 1.287 0 001.816 1.816l3.06-2.688 3.56-3.129zM7.12 4.094a4.331 4.331 0 114.786 4.786l-3.974 3.493-3.06 2.689a2.787 2.787 0 01-3.933-3.933l2.676-3.045 3.505-3.99z"/>
                    </svg>
                  </button>
                </div>
              </div>
              
              <div id="fsd-progress-parent">
                <div id="fsd-progress-container">
                  <span class="progress-number" id="fsd-elapsed">0:00</span>
                  <div id="fsd-progress-bar">
                    <div id="fsd-progress-bar-inner">
                      <div id="progress-thumb"></div>
                    </div>
                  </div>
                  <span class="progress-number" id="fsd-duration">0:00</span>
                </div>
              </div>
            </div>
          </div>
        \`;
      }
    };
  `;
}

exports.getUICode = getUICode;

