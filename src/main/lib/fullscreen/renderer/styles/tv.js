"use strict";

function getTVStyles() {
  return `
    .tv-mode #fsd-foreground {
      flex-direction: row;
      text-align: left;
      justify-content: left;
      align-items: flex-end;
      position: absolute;
      top: auto;
      bottom: 75px;
    }
    
    .tv-mode #fsd-art {
      width: calc(100vw - 840px);
      min-width: 180px;
      max-width: 220px;
      margin-left: 65px;
      flex-shrink: 0;
    }
    
    .tv-mode #fsd-art-image {
      position: relative;
      width: 100%;
      height: 0;
      padding-bottom: 100%;
      border-radius: 8px;
      background-size: cover;
      background-position: center;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
    }
    
    .tv-mode #fsd-details {
      padding-left: 30px;
      line-height: initial;
      width: 80%;
      color: var(--primary-color);
      flex: 1;
      min-width: 0;
    }
    
    .tv-mode #fsd-title,
    .tv-mode #fsd-album,
    .tv-mode #fsd-artist {
      display: flex;
      justify-content: flex-start;
      align-items: baseline;
      gap: 5px;
      margin-bottom: 4px;
    }
    
    .tv-mode #fsd-title span,
    .tv-mode #fsd-album span,
    .tv-mode #fsd-artist > span {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
      word-break: break-word;
    }
    
    .tv-mode #fsd-title span {
      -webkit-line-clamp: 3;
    }
    
    .tv-mode #fsd-title svg,
    .tv-mode #fsd-artist svg,
    .tv-mode #fsd-album svg {
      flex: 0 0 auto;
      align-self: flex-start;
    }
    
    .tv-mode #fsd-title {
      font-size: 62px;
      font-weight: 700;
    }
    
    .tv-mode #fsd-artist,
    .tv-mode #fsd-album {
      font-size: 28px;
    }
    
    .tv-mode #fsd-title svg {
      width: 35px;
      height: 45px;
    }
    
    .tv-mode #playing-icon {
      width: 30px !important;
      height: 40px !important;
      margin-right: 5px;
    }
    
    .tv-mode #fsd-artist svg,
    .tv-mode #fsd-album svg {
      margin-right: 15px;
      width: 22px;
      height: 22px;
    }
    
    .tv-mode #fsd-progress-parent {
      width: 100%;
      max-width: 450px;
    }
    
    .tv-mode .fsd-controls + #fsd-progress-parent {
      padding-left: 10px;
    }
    
    .tv-mode #fsd-status {
      display: flex;
      flex-direction: row;
      min-width: 450px;
      max-width: 450px;
      align-items: center;
      justify-content: space-between;
    }
    
    .tv-mode #fsd-status.active {
      column-gap: 10px;
      margin: 10px 0;
    }
    
    .tv-mode #fad-lyrics-plus-container {
      width: 45%;
    }
    
    .tv-mode.lyrics-active #fsd-foreground {
      width: max-content;
      max-width: 60%;
    }
    
    @media (max-width: 900px), (max-height: 800px) {
      .tv-mode #fsd-title {
        font-size: 40px;
        font-weight: 600;
      }
      
      .tv-mode #fsd-artist,
      .tv-mode #fsd-album {
        font-size: 20px;
      }
      
      .tv-mode #fsd-art {
        min-width: 150px;
        max-width: 180px;
        margin-left: 40px;
      }
      
      .tv-mode #fsd-details {
        padding-left: 20px;
      }
    }
    
    .tv-mode #fsd-title {
      margin-bottom: 8px;
    }
    
    .tv-mode #fsd-artist {
      margin-bottom: 6px;
    }
    
    .tv-mode #fsd-album {
      margin-bottom: 12px;
    }
    
    .tv-mode .fs-button svg {
      width: 20px;
      height: 20px;
    }
    
    .tv-mode #fsd-play svg {
      width: 22px;
      height: 22px;
    }
    
    .tv-mode #fsd-foreground {
      padding: 0 40px;
      box-sizing: border-box;
    }
    
    .tv-mode #fsd-title,
    .tv-mode #fsd-artist,
    .tv-mode #fsd-album {
      max-width: 100%;
    }
  `;
}

exports.getTVStyles = getTVStyles;
