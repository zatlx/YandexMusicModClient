"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * Player Control - управление плеером
 * 
 * Использование:
 * 
 * // Воспроизведение
 * await window.playerControl.play();
 * await window.playerControl.pause();
 * await window.playerControl.next();
 * await window.playerControl.previous();
 * 
 * // Позиция и громкость
 * await window.playerControl.seek(30);        // перемотать на 30 сек
 * await window.playerControl.setVolume(0.5);  // 50% громкости
 * await window.playerControl.toggleMute();    // переключить mute/unmute
 * 
 * // Настройки
 * await window.playerControl.setShuffle(true);
 * await window.playerControl.setRepeat('one'); // 'none'/'context'/'one'
 * 
 * // Лайки
 * await window.playerControl.like();
 * await window.playerControl.unlike();
 */

const { Logger } = require("../packages/logger/Logger.js");
const { Events } = require("../types/events.js");
const { PlayerActions } = require("../types/playerActions.js");
const playerControlLogger = new Logger("PlayerControl");

let mainWindow = null;

function initPlayerControl(window) {
  mainWindow = window;
  playerControlLogger.info("Player Control initialized");
}

function sendAction(action) {
  if (!mainWindow) {
    playerControlLogger.warn("Main window not initialized");
    return false;
  }

  try {
    mainWindow.webContents.send(Events.PLAYER_ACTION, action, Date.now());
    playerControlLogger.info("Player action sent:", action);
    return true;
  } catch (error) {
    playerControlLogger.error(`Failed to send action: ${action}`, error);
    return false;
  }
}

async function executeJS(code) {
  if (!mainWindow) {
    playerControlLogger.warn("Main window not initialized");
    return null;
  }

  try {
    return await mainWindow.webContents.executeJavaScript(code);
  } catch (error) {
    playerControlLogger.error("Failed to execute JS:", error);
    return null;
  }
}

async function togglePlay() {
  return sendAction(PlayerActions.TOGGLE_PLAY);
}

async function play() {
  const actionResult = sendAction(PlayerActions.PLAY);

  if (!actionResult) {
    const result = await executeJS(`
      (() => {
        try {
          const mediaPlayer = window.sonataState?.currentMediaPlayer?.observableValue?.value;
          if (!mediaPlayer || !mediaPlayer.play) return false;
          mediaPlayer.play();
          return true;
        } catch (e) {
          console.error('Play error:', e);
          return false;
        }
      })()
    `);
    return result === true;
  }
  
  return actionResult;
}

async function pause() {
  const actionResult = sendAction(PlayerActions.PAUSE);
  
  if (!actionResult) {
    const result = await executeJS(`
      (() => {
        try {
          const mediaPlayer = window.sonataState?.currentMediaPlayer?.observableValue?.value;
          if (!mediaPlayer || !mediaPlayer.pause) return false;
          mediaPlayer.pause();
          return true;
        } catch (e) {
          console.error('Pause error:', e);
          return false;
        }
      })()
    `);
    return result === true;
  }
  
  return actionResult;
}

async function next() {
  return sendAction(PlayerActions.MOVE_FORWARD);
}

async function previous() {
  return sendAction(PlayerActions.MOVE_BACKWARD);
}

async function seek(positionSeconds) {
  if (typeof positionSeconds !== 'number' || positionSeconds < 0) {
    playerControlLogger.warn("Invalid seek position:", positionSeconds);
    return false;
  }
  
  const result = await executeJS(`
    (() => {
      try {
        const mediaPlayer = window.sonataState?.currentMediaPlayer?.observableValue?.value;
        if (!mediaPlayer || !mediaPlayer.setProgress) return false;
        mediaPlayer.setProgress(${positionSeconds});
        return true;
      } catch (e) {
        console.error('Seek error:', e);
        return false;
      }
    })()
  `);
  
  return result === true;
}

async function setVolume(volume) {
  if (typeof volume !== 'number' || volume < 0 || volume > 1) {
    playerControlLogger.warn("Invalid volume value:", volume);
    return false;
  }
  
  const result = await executeJS(`
    (() => {
      try {
        const mediaPlayer = window.sonataState?.currentMediaPlayer?.observableValue?.value;
        if (!mediaPlayer) return false;
        
        if (mediaPlayer.setExponentVolume) {
          mediaPlayer.setExponentVolume(${volume});
          return true;
        }
        
        if (mediaPlayer.setVolume) {
          mediaPlayer.setVolume(${volume});
          return true;
        }
        
        return false;
      } catch (e) {
        console.error('Volume error:', e);
        return false;
      }
    })()
  `);
  
  return result === true;
}

async function toggleMute() {
  const result = await executeJS(`
    (() => {
      try {
        const muteBtn = document.querySelector('.ChangeVolume_button__4HLEr') || 
                        document.querySelector('button[aria-label*="звук"]');
        
        if (!muteBtn) {
          console.error('Mute button not found');
          return false;
        }
        
        muteBtn.click();
        return true;
      } catch (e) {
        console.error('Toggle mute error:', e);
        return false;
      }
    })()
  `);
  
  return result === true;
}

async function toggleShuffle() {
  return sendAction(PlayerActions.TOGGLE_SHUFFLE);
}

async function setShuffle(enabled) {
  const currentState = await executeJS(`
    (() => {
      try {
        const store = window.__NEXT_DATA__?.props?.pageProps?.serverState;
        return store?.sonataState?.playerState?.playerState?.shuffle || false;
      } catch (e) {
        return null;
      }
    })()
  `);
  
  if (currentState === null) return false;
  
  if (currentState !== enabled) {
    return sendAction(PlayerActions.TOGGLE_SHUFFLE);
  }
  
  return true;
}

async function toggleRepeat() {
  return sendAction(PlayerActions.TOGGLE_REPEAT);
}

async function setRepeat(mode) {
  if (!['none', 'context', 'one'].includes(mode)) {
    playerControlLogger.warn("Invalid repeat mode:", mode);
    return false;
  }
  
  const actionMap = {
    'none': PlayerActions.REPEAT_NONE,
    'context': PlayerActions.REPEAT_CONTEXT,
    'one': PlayerActions.REPEAT_ONE
  };
  
  return sendAction(actionMap[mode]);
}

async function likeTrack() {
  return sendAction(PlayerActions.LIKE);
}

async function unlikeTrack() {
  return sendAction(PlayerActions.LIKE_NONE);
}

async function toggleLike() {
  const result = await sendAction(PlayerActions.TOGGLE_LIKE);
  const playerApi = require('./playerApi.js');
  playerApi.invalidateLikedTracksCache();
  return result;
}

async function dislikeTrack() {
  return sendAction(PlayerActions.DISLIKE);
}

async function playTrack(trackId, albumId = null) {
  const result = await executeJS(`
    (() => {
      try {
        const externalAPI = window.externalAPI;
        if (!externalAPI || !externalAPI.play) return false;
        
        const playOptions = {
          type: 'track',
          id: '${trackId}'
        };
        
        ${albumId ? `playOptions.context = 'album/${albumId}';` : ''}
        
        externalAPI.play(playOptions);
        return true;
      } catch (e) {
        console.error('Play track error:', e);
        return false;
      }
    })()
  `);
  
  return result === true;
}

async function playAlbum(albumId) {
  const result = await executeJS(`
    (() => {
      try {
        const externalAPI = window.externalAPI;
        if (!externalAPI || !externalAPI.play) return false;
        
        externalAPI.play({
          type: 'album',
          id: '${albumId}'
        });
        return true;
      } catch (e) {
        console.error('Play album error:', e);
        return false;
      }
    })()
  `);
  
  return result === true;
}

async function playPlaylist(playlistUid, playlistKind) {
  const result = await executeJS(`
    (() => {
      try {
        const externalAPI = window.externalAPI;
        if (!externalAPI || !externalAPI.play) return false;
        
        externalAPI.play({
          type: 'playlist',
          uid: '${playlistUid}',
          kind: '${playlistKind}'
        });
        return true;
      } catch (e) {
        console.error('Play playlist error:', e);
        return false;
      }
    })()
  `);
  
  return result === true;
}

exports.initPlayerControl = initPlayerControl;
exports.togglePlay = togglePlay;
exports.play = play;
exports.pause = pause;
exports.next = next;
exports.previous = previous;
exports.seek = seek;
exports.setVolume = setVolume;
exports.toggleMute = toggleMute;
exports.toggleShuffle = toggleShuffle;
exports.setShuffle = setShuffle;
exports.toggleRepeat = toggleRepeat;
exports.setRepeat = setRepeat;
exports.likeTrack = likeTrack;
exports.unlikeTrack = unlikeTrack;
exports.toggleLike = toggleLike;
exports.dislikeTrack = dislikeTrack;
exports.playTrack = playTrack;
exports.playAlbum = playAlbum;
exports.playPlaylist = playPlaylist;
