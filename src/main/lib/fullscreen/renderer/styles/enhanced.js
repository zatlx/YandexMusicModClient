"use strict";

function getEnhancedStyles() {
  return `

    #ym-fullscreen-container.enhanced-mode,
    #ym-fullscreen-container.enhanced-mode.lyrics-unavailable {
      --fsd-foreground-transform: 50%;
      --fsd-art-max-width: 600px;
      --fsd-items-max-width: 580px;
      --fsd-title-size: 50px;
      --fsd-sec-size: 28px;
    }

    #ym-fullscreen-container.enhanced-mode.lyrics-visible {
      --fsd-foreground-transform: 0px;
      --fsd-art-max-width: 500px;
      --fsd-items-max-width: 480px;
      --fsd-title-size: 40px;
      --fsd-sec-size: 23px;
    }

    .enhanced-mode #fsd-foreground {
      transform: translateX(var(--fsd-foreground-transform));
      width: 50%;
      flex-direction: column;
      text-align: center;
    }

    .enhanced-mode #fsd-art {
      width: calc(100vh - 300px);
      max-width: var(--fsd-art-max-width);
      min-width: 300px;
      transition: all var(--transition-duration) var(--transition-function);
      margin: 0 auto;
    }
    
    .enhanced-mode #fsd-art-image {
      position: relative;
      width: 100%;
      height: 0;
      padding-bottom: 100%;
      border-radius: 8px;
      background-size: cover;
      background-position: center;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    }

    .enhanced-mode #fsd-details {
      padding-top: 30px;
      line-height: initial;
      max-width: var(--fsd-items-max-width);
      color: var(--primary-color);
      transition: all var(--transition-duration) var(--transition-function);
      margin: 0 auto;
      width: 100%;
    }
    
    .enhanced-mode #fsd-title {
      margin-bottom: 8px;
      line-height: 1.2;
    }
    
    .enhanced-mode #fsd-artist {
      margin-bottom: 6px;
      line-height: 1.3;
    }
    
    .enhanced-mode #fsd-album {
      margin-bottom: 0;
      line-height: 1.3;
    }
    
    .enhanced-mode #fsd-title span,
    .enhanced-mode #fsd-album span,
    .enhanced-mode #fsd-artist span {
      display: inline;
    }

    .enhanced-mode #fsd-status {
      display: flex;
      width: 28vw;
      max-width: var(--fsd-items-max-width);
      align-items: center;
      justify-content: space-between;
      flex-direction: row;
      transition: all var(--transition-duration) var(--transition-function);
    }
    
    .enhanced-mode #fsd-status.active {
      margin: 5px auto 0;
      gap: 10px;
    }
    
    .enhanced-mode .fsd-controls {
      margin-top: 10px;
      margin-bottom: 5px;
    }
    
    .enhanced-mode .fsd-controls-left {
      width: 30%;
      justify-content: flex-start;
    }
    
    .enhanced-mode .fsd-controls-center {
      width: 40%;
      justify-content: center;
      margin: 10px auto 5px;
    }
    
    .enhanced-mode .fsd-controls-right {
      width: 30%;
      justify-content: flex-end;
    }

    .enhanced-mode #fsd-progress-parent {
      width: 28vw;
      max-width: var(--fsd-items-max-width);
      transition: all var(--transition-duration) var(--transition-function);
    }

    .enhanced-mode #fsd-title svg {
      width: 35px;
      height: 35px;
    }
    
    .enhanced-mode.lyrics-active #fsd-title svg {
      width: 30px;
      height: 30px;
    }
    
    .enhanced-mode #playing-icon {
      margin-right: 7px;
    }
    
    .enhanced-mode.lyrics-active #playing-icon {
      margin-right: 2px;
    }
    
    .enhanced-mode #fsd-artist svg,
    .enhanced-mode #fsd-album svg {
      width: calc(var(--fsd-sec-size) - 6px);
      height: calc(var(--fsd-sec-size) - 6px);
      margin-right: 5px;
    }

    @media (max-width: 1400px) {
      #ym-fullscreen-container.enhanced-mode,
      #ym-fullscreen-container.enhanced-mode.lyrics-unavailable {
        --fsd-foreground-transform: 50%;
        --fsd-art-max-width: 550px;
        --fsd-items-max-width: 530px;
        --fsd-title-size: 45px;
        --fsd-sec-size: 26px;
      }
      
      #ym-fullscreen-container.enhanced-mode.lyrics-visible {
        --fsd-foreground-transform: 0px;
        --fsd-art-max-width: 450px;
        --fsd-items-max-width: 430px;
        --fsd-title-size: 38px;
        --fsd-sec-size: 20px;
      }
    }

    @media (max-width: 1200px) {
      #ym-fullscreen-container.enhanced-mode,
      #ym-fullscreen-container.enhanced-mode.lyrics-unavailable {
        --fsd-foreground-transform: 50%;
        --fsd-art-max-width: 500px;
        --fsd-items-max-width: 480px;
        --fsd-title-size: 40px;
        --fsd-sec-size: 23px;
      }
      
      #ym-fullscreen-container.enhanced-mode.lyrics-visible {
        --fsd-foreground-transform: 0px;
        --fsd-art-max-width: 400px;
        --fsd-items-max-width: 380px;
        --fsd-title-size: 38px;
        --fsd-sec-size: 20px;
      }
    }

    @media (max-width: 992px) {
      #ym-fullscreen-container.enhanced-mode,
      #ym-fullscreen-container.enhanced-mode.lyrics-unavailable {
        --fsd-foreground-transform: 50%;
        --fsd-art-max-width: 450px;
        --fsd-items-max-width: 430px;
        --fsd-title-size: 38px;
        --fsd-sec-size: 21px;
      }
      
      #ym-fullscreen-container.enhanced-mode.lyrics-visible {
        --fsd-foreground-transform: 0px;
        --fsd-art-max-width: 350px;
        --fsd-items-max-width: 330px;
        --fsd-title-size: 36px;
        --fsd-sec-size: 20px;
      }
    }

    @media (max-width: 768px) {
      #ym-fullscreen-container.enhanced-mode,
      #ym-fullscreen-container.enhanced-mode.lyrics-unavailable {
        --fsd-foreground-transform: 50%;
        --fsd-art-max-width: 400px;
        --fsd-items-max-width: 380px;
        --fsd-title-size: 40px;
        --fsd-sec-size: 23px;
      }
      
      #ym-fullscreen-container.enhanced-mode.lyrics-visible {
        --fsd-foreground-transform: 0px;
        --fsd-art-max-width: 300px;
        --fsd-items-max-width: 280px;
        --fsd-title-size: 36px;
        --fsd-sec-size: 20px;
      }
    }

    @media (max-width: 900px), (max-height: 900px) {
      .enhanced-mode #fsd-title {
        font-size: 35px;
        font-weight: 600;
      }
    }

    .enhanced-mode #fsd-status {
      margin-top: 8px;
    }
    
    .enhanced-mode #fsd-progress-parent {
      margin-top: 12px;
    }

    .enhanced-mode #fsd-art,
    .enhanced-mode #fsd-details,
    .enhanced-mode #fsd-status,
    .enhanced-mode #fsd-progress-parent {
      align-self: center;
    }

    .enhanced-mode .fs-button svg {
      width: 20px;
      height: 20px;
    }
    
    .enhanced-mode #fsd-play svg {
      width: 22px;
      height: 22px;
    }

    .enhanced-mode .fsd-song-meta:hover {
      opacity: 0.9;
    }
  `;
}

exports.getEnhancedStyles = getEnhancedStyles;
