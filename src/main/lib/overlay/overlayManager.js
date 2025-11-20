"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const { TracksApiWrapper } = require("../trackDownloader/tracksApiWrapper.js");
const { get: getStore } = require("../store.js");
const overlayWindow = require("./overlayWindow.js");

let currentTrack = null;
let currentLyrics = null;
let tracksApi = null;
let progressUpdateInterval = null;
let lastPlayerData = null;

function initTracksApi(token, userAgent) {
  if (!token) {
    return;
  }

  tracksApi = new TracksApiWrapper(token, userAgent);
}

async function fetchLyrics(trackId) {
  if (!tracksApi) {
    return null;
  }

  try {
    const lyricsData = await tracksApi.getSyncLyrics(trackId, { format: "LRC" });

    if (lyricsData && lyricsData.lrc) {
      const parsed = parseLRC(lyricsData.lrc);
      return parsed;
    }

    return null;
  } catch (error) {
    return null;
  }
}

function parseLRC(lrcText) {
  const lines = [];
  const lrcLines = lrcText.split("\n");

  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/g;

  for (const line of lrcLines) {
    const matches = [...line.matchAll(timeRegex)];

    if (matches.length > 0) {
      const text = line.replace(timeRegex, "").trim();

      if (text) {
        for (const match of matches) {
          const minutes = parseInt(match[1], 10);
          const seconds = parseInt(match[2], 10);
          const milliseconds = parseInt(match[3].padEnd(3, "0"), 10);
          const timeMs = (minutes * 60 + seconds) * 1000 + milliseconds;

          lines.push({ time: timeMs, text });
        }
      }
    }
  }

  lines.sort((a, b) => a.time - b.time);
  return lines;
}



function updateOverlaySettings(settings) {
  overlayWindow.sendToOverlay("update-settings", settings);

  const showLyrics = settings.showLyrics !== false;
  const height = 110 + (showLyrics ? 200 : 0);

  if (settings.minWidth) {
    overlayWindow.setOverlaySize(settings.minWidth, height);
  }

  const draggable = settings.draggable !== false;
  const win = overlayWindow.getOverlayWindow();
  if (win && !win.isDestroyed()) {
    win.setIgnoreMouseEvents(!draggable, { forward: true });
  }
}

function handlePlayerState(playerData) {
  const settings = getStore("modFeatures.overlay") || {};

  if (!settings.enable || !playerData || !playerData.track) {
    return;
  }

  lastPlayerData = playerData;

  const track = playerData.track;
  const isNewTrack = !currentTrack || currentTrack.id !== track.id;

  if (isNewTrack) {
    currentTrack = track;
    currentLyrics = null;

    overlayWindow.sendToOverlay("update-track", {
      id: track.id,
      title: track.title || "Неизвестный трек",
      artists: track.artists || [],
      coverUri: track.coverUri || null,
    });

    if (settings.showLyrics !== false) {
      overlayWindow.sendToOverlay("update-lyrics", {
        lyrics: null,
        hasLyrics: false,
        loading: true,
        message: "Загрузка текста..."
      });

      fetchLyrics(track.id).then((lyrics) => {
        currentLyrics = lyrics;

        if (lyrics && lyrics.length > 0) {
          overlayWindow.sendToOverlay("update-lyrics", {
            lyrics,
            hasLyrics: true,
            loading: false
          });

          const currentProgress = lastPlayerData?.progress || 0;
          overlayWindow.sendToOverlay("update-lyrics-progress", {
            progress: currentProgress,
            allLyrics: lyrics,
          });

          if (lastPlayerData?.isPlaying) {
            startProgressTracking(currentProgress, lastPlayerData.duration || 0);
          }
        } else {
          overlayWindow.sendToOverlay("update-lyrics", {
            lyrics: null,
            hasLyrics: false,
            loading: false,
            message: "Текст песни недоступен"
          });
        }
      }).catch(error => {
        overlayWindow.sendToOverlay("update-lyrics", {
          lyrics: null,
          hasLyrics: false,
          loading: false,
          message: "Ошибка загрузки текста: " + error.message
        });
      });
    }

    const win = overlayWindow.getOverlayWindow();
    if (!win || !win.isVisible()) {
      overlayWindow.showOverlay();
    }

    if (settings.dynamicColor) {
      overlayWindow.sendToOverlay("update-settings", settings);
    }
  }

  if (currentLyrics && currentLyrics.length > 0) {
    const progress = playerData.progress || 0;
    const duration = playerData.duration || 0;

    overlayWindow.sendToOverlay("update-lyrics-progress", {
      progress: progress,
      allLyrics: currentLyrics,
    });

    if (playerData.isPlaying) {
      if (!progressUpdateInterval) {
        startProgressTracking(progress, duration);
      }
    } else {
      stopProgressTracking();
    }
  } else {
    stopProgressTracking();
  }
}

function startProgressTracking(initialProgress, duration) {
  stopProgressTracking();

  let currentProgress = initialProgress;
  const startTime = Date.now();

  progressUpdateInterval = setInterval(() => {
    const elapsed = Date.now() - startTime;
    currentProgress = initialProgress + elapsed;

    if (currentProgress >= duration) {
      stopProgressTracking();
      return;
    }

    if (currentLyrics && currentLyrics.length > 0) {
      overlayWindow.sendToOverlay("update-lyrics-progress", {
        progress: currentProgress,
        allLyrics: currentLyrics,
      });
    }
  }, 100);
}

function stopProgressTracking() {
  if (progressUpdateInterval) {
    clearInterval(progressUpdateInterval);
    progressUpdateInterval = null;
  }
}

function cleanup() {
  stopProgressTracking();
  currentTrack = null;
  currentLyrics = null;
  overlayWindow.closeOverlayWindow();
}

exports.initTracksApi = initTracksApi;
exports.fetchLyrics = fetchLyrics;
exports.updateOverlaySettings = updateOverlaySettings;
exports.handlePlayerState = handlePlayerState;
exports.cleanup = cleanup;
