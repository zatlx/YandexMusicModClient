"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const { ipcMain } = require("electron");
const { Logger } = require("../../packages/logger/Logger.js");
const playerApi = require("../playerApi.js");
const playerControl = require("../playerControl.js");

const bridgeLogger = new Logger("FullscreenBridge");

let mainWindow = null;

function initFullscreenBridge(window) {
  mainWindow = window;
  
  bridgeLogger.info("Initializing fullscreen bridge...");
  
  ipcMain.handle('fs-get-player-state', async () => {
    try {
      const state = await playerApi.getFullPlayerState();
      return state;
    } catch (error) {
      bridgeLogger.error("Failed to get player state:", error);
      return null;
    }
  });
  
  ipcMain.handle('fs-get-track-lyrics', async (event, trackId) => {
    try {
      const lyrics = await playerApi.getTrackLyrics(trackId);
      return lyrics;
    } catch (error) {
      bridgeLogger.error("Failed to get lyrics:", error);
      return null;
    }
  });
  
  ipcMain.handle('fs-get-dynamic-color', async () => {
    try {
      const color = await mainWindow.webContents.executeJavaScript(`
        (() => {
          try {
            const playerBar = document.querySelector('[data-test-id="PLAYERBAR_DESKTOP"]');
            
            if (playerBar) {
              const style = getComputedStyle(playerBar);
              const playerColor = style.getPropertyValue('--player-average-color-background');
              
              if (playerColor && playerColor.trim()) {
                return playerColor.trim();
              }
            }
            
            const playerSelectors = [
              '[class*="PlayerBar_root"]',
              '[class*="PlayerBarDesktop"]',
              '.PlayerBar_root__cXUnU'
            ];
            
            for (const selector of playerSelectors) {
              const element = document.querySelector(selector);
              
              if (element) {
                const style = getComputedStyle(element);
                const playerColor = style.getPropertyValue('--player-average-color-background');
                
                if (playerColor && playerColor.trim()) {
                  return playerColor.trim();
                }
              }
            }
            
            return null;
          } catch (e) {
            return null;
          }
        })()
      `);
      return color;
    } catch (error) {
      bridgeLogger.error("Failed to get dynamic color:", error);
      return null;
    }
  });
  
  ipcMain.handle('fs-get-artist-cover', async (event, size = '600x600') => {
    try {
      const state = await playerApi.getFullPlayerState();
      if (state && state.track && state.track.artistCoverUri) {
        return playerApi.getCoverUrl(state.track.artistCoverUri, size);
      }
      return null;
    } catch (error) {
      bridgeLogger.error("Failed to get artist cover:", error);
      return null;
    }
  });
  
  ipcMain.handle('fs-get-background-video', async () => {
    try {
      const state = await playerApi.getFullPlayerState();
      const videoUri = state?.track?.backgroundVideoUri;
      
      if (videoUri) {
        bridgeLogger.info("Background video URL:", videoUri);
        return videoUri;
      }
      
      return null;
    } catch (error) {
      bridgeLogger.error("Failed to get background video:", error);
      return null;
    }
  });
  
  ipcMain.handle('fs-get-next-track', async () => {
    try {
      const nextTrack = await playerApi.getNextTrack();
      return nextTrack;
    } catch (error) {
      bridgeLogger.error("Failed to get next track:", error);
      return null;
    }
  });
  
  ipcMain.on('fs-play', () => {
    playerControl.play();
  });
  
  ipcMain.on('fs-pause', () => {
    playerControl.pause();
  });
  
  ipcMain.on('fs-toggle-play', () => {
    playerControl.togglePlay();
  });
  
  ipcMain.on('fs-next', () => {
    playerControl.next();
    setTimeout(() => checkAndNotifyTrackChange(), 100);
  });
  
  ipcMain.on('fs-previous', () => {
    playerControl.previous();
    setTimeout(() => checkAndNotifyTrackChange(), 100);
  });
  
  ipcMain.on('fs-seek', (event, position) => {
    playerControl.seek(position);
  });
  
  ipcMain.on('fs-set-volume', (event, volume) => {
    playerControl.setVolume(volume);
  });
  
  ipcMain.on('fs-toggle-mute', async () => {
    await playerControl.toggleMute();
  });
  
  ipcMain.on('fs-toggle-shuffle', () => {
    playerControl.toggleShuffle();
  });
  
  ipcMain.on('fs-toggle-repeat', () => {
    playerControl.toggleRepeat();
  });
  
  ipcMain.on('fs-toggle-like', () => {
    playerControl.toggleLike();
  });
  
  ipcMain.on('fs-navigate', (event, path) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.executeJavaScript(`
        (() => {
          const existingLink = document.querySelector('a[href*="${path}"]');
          if (existingLink) {
            existingLink.click();
          }
        })();
      `).catch(() => {
      });
    }
  });
  
  setupPlayerEventForwarding();
  
  bridgeLogger.info("Fullscreen bridge initialized");
}

let lastTrackId = null;

async function checkAndNotifyTrackChange() {
  try {
    const state = await playerApi.getFullPlayerState();
    if (state && state.track && state.track.id !== lastTrackId) {
      lastTrackId = state.track.id;
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('track-changed');
      }
    }
  } catch (error) {
  }
}

function setupPlayerEventForwarding() {
  if (playerApi.on) {
    playerApi.on('track-changed', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('track-changed');
      }
    });
    
    playerApi.on('playback-state-changed', (state) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('playback-state-changed', state);
      }
    });
  }
  
  setInterval(checkAndNotifyTrackChange, 300);
}

exports.initFullscreenBridge = initFullscreenBridge;
