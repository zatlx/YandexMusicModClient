"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

/**
 * Player API - получение информации о плеере
 * 
 * Использование:
 * 
 * // Получить полное состояние
 * const state = await window.playerAPI.getFullState();
 * 
 * // Получить конкретные данные
 * const title = await window.playerAPI.getTrackTitle();
 * const artists = await window.playerAPI.getTrackArtists();
 * const album = await window.playerAPI.getTrackAlbum();
 * const cover = await window.playerAPI.getTrackCover('400x400');
 * const lyrics = await window.playerAPI.getLyrics(trackId);
 * 
 * // Подписаться на изменения
 * const unsubscribe = window.playerAPI.onStateUpdate((data) => {
 *   console.log('Трек:', data.track?.title);
 * });
 */

const { Logger } = require("../packages/logger/Logger.js");
const playerApiLogger = new Logger("PlayerAPI");

let mainWindow = null;
let cachedPlayerState = null;

function initPlayerApi(window) {
  mainWindow = window;
  playerApiLogger.info("Player API initialized");
}

function updateCachedState(playerState) {
  cachedPlayerState = playerState;
}

async function getFullPlayerState() {
  if (!mainWindow) {
    playerApiLogger.warn("Main window not initialized");
    return null;
  }

  try {
    const state = await mainWindow.webContents.executeJavaScript(`
      (() => {
        try {
          const sonataState = window.sonataState;
          if (!sonataState) return null;
          
          const currentEntity = sonataState.queueState?.currentEntity?.observableValue?.value;
          const track = currentEntity?.entity?.data?.meta;
          
          if (!track) return null;
          
          let isLiked = false;
          const now = Date.now();
          
          if (!window.__likedTracksCache) {
            window.__likedTracksCache = { cache: null, time: 0 };
          }
          
          if (window.__likedTracksCache.cache && (now - window.__likedTracksCache.time) < 5000) {
            isLiked = window.__likedTracksCache.cache.has(track.id);
          } else {
            const likeStore = currentEntity?.entity?.likeStore;
            const items = likeStore?.tracks?.items;
            
            if (items?.has) {
              isLiked = items.has(track.id);
            } else if (items?.data_?.has) {
              isLiked = items.data_.has(track.id);
            }
            
            if (items?.data_) {
              window.__likedTracksCache.cache = new Set(items.data_.keys());
              window.__likedTracksCache.time = now;
            }
          }
          
          const playerState = sonataState.playerState;
          const status = playerState?.status?.observableValue?.value;
          const progress = playerState?.progress?.observableValue?.value;
          const volume = playerState?.exponentVolume?.observableValue?.value || playerState?.volume?.observableValue?.value;
          
          const queueState = sonataState.queueState;
          const shuffle = queueState?.shuffle?.observableValue?.value;
          const repeat = queueState?.repeat?.observableValue?.value;
          const index = queueState?.index?.observableValue?.value;
          
          const context = currentEntity?.context;
          
          return {
            track: {
              id: track.id,
              title: track.title,
              version: track.version,
              artists: track.artists || [],
              albums: track.albums || [],
              coverUri: track.coverUri,
              imageUrl: track.ogImage,
              durationMs: track.durationMs,
              liked: isLiked,
              available: track.available !== false,
              contentWarning: track.contentWarning,
              type: track.type,
              albumYear: track.albums?.[0]?.year,
              albumReleaseDate: track.albums?.[0]?.releaseDate,
              albumCoverUri: track.albums?.[0]?.coverUri
            },
            
            playback: {
              isPlaying: status === 'playing',
              status: status || 'idle',
              progress: progress?.position || 0,
              duration: progress?.duration || 0,
              canMoveNext: true,
              canMovePrevious: true
            },
            
            settings: {
              shuffle: shuffle || false,
              repeat: repeat || 'none',
              volume: volume || 1.0
            },
            
            context: context ? {
              type: context.type,
              id: context.id,
              uid: context.uid,
              from: context.from,
              title: context.title || context.description,
              name: (() => {
                switch (context.type) {
                  case 'album':
                    return track.albums?.[0]?.title || '';
                  case 'artist':
                    return track.artists?.[0]?.name || '';
                  case 'playlist':
                    return context.contextData?.meta?.title || '';
                  case 'vibe':
                    return '';
                  default:
                    return '';
                }
              })()
            } : null,
            
            queue: {
              currentIndex: index || 0,
              hasNext: true,
              hasPrevious: true
            }
          };
        } catch (e) {
          console.error('PlayerAPI error:', e, e.stack);
          return null;
        }
      })()
    `);
    
    return state;
  } catch (error) {
    playerApiLogger.error("Failed to get player state:", error);
    return null;
  }
}

async function getCurrentTrack() {
  const state = await getFullPlayerState();
  return state?.track || null;
}

async function getPlaybackState() {
  const state = await getFullPlayerState();
  return state?.playback || null;
}

async function getPlayerSettings() {
  const state = await getFullPlayerState();
  return state?.settings || null;
}

async function getCurrentContext() {
  const state = await getFullPlayerState();
  return state?.context || null;
}

async function getQueueInfo() {
  const state = await getFullPlayerState();
  return state?.queue || null;
}

async function isTrackLiked(trackId) {
  if (!mainWindow) return null;
  
  try {
    const liked = await mainWindow.webContents.executeJavaScript(`
      (() => {
        try {
          const sonataState = window.sonataState;
          const currentEntity = sonataState?.queueState?.currentEntity?.observableValue?.value;
          const track = currentEntity?.entity?.data?.meta;
          
          if (track && track.id === '${trackId}') {
            return currentEntity?.entity?.likeStore?.liked || false;
          }
          
          return null;
        } catch (e) {
          return null;
        }
      })()
    `);
    
    return liked;
  } catch (error) {
    playerApiLogger.error("Failed to check if track is liked:", error);
    return null;
  }
}

async function getTrackLyrics(trackId) {
  if (!mainWindow) {
    playerApiLogger.warn("Main window not initialized");
    return null;
  }

  try {
    const token = await mainWindow.webContents.executeJavaScript(`
      (() => {
        try {
          return JSON.parse(localStorage.getItem("oauth"))?.value;
        } catch (e) {
          return null;
        }
      })()
    `);

    if (!token) {
      playerApiLogger.warn("No OAuth token available");
      return null;
    }

    const { TracksApiWrapper } = require("./trackDownloader/tracksApiWrapper.js");
    const userAgent = mainWindow.webContents.getUserAgent();
    const tracksApi = new TracksApiWrapper(token, userAgent);

    const lyricsData = await tracksApi.getSyncLyrics(trackId, { format: "LRC" });

    if (lyricsData && lyricsData.lrc) {
      return parseLRC(lyricsData.lrc);
    }

    return null;
  } catch (error) {
    playerApiLogger.error("Failed to get lyrics:", error);
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

function getCoverUrl(coverUri, size = '400x400') {
  if (!coverUri) return null;
  return `https://${coverUri}`.replace('%%', size);
}

function getCachedState() {
  return cachedPlayerState;
}

async function getTrackProperty(property) {
  const track = await getCurrentTrack();
  return track ? track[property] : null;
}

async function getTrackTitle() {
  return await getTrackProperty('title');
}

async function getTrackArtists() {
  return await getTrackProperty('artists');
}

async function getTrackAlbum() {
  const track = await getCurrentTrack();
  return track?.albums?.[0] || null;
}

async function getAlbumYear() {
  const track = await getCurrentTrack();
  return track?.albumYear || null;
}

async function getAlbumReleaseDate() {
  const track = await getCurrentTrack();
  return track?.albumReleaseDate || null;
}

async function getAlbumCover(size = '400x400') {
  const track = await getCurrentTrack();
  return track?.albumCoverUri ? getCoverUrl(track.albumCoverUri, size) : null;
}

async function getTrackCover(size = '400x400') {
  const track = await getCurrentTrack();
  return track?.coverUri ? getCoverUrl(track.coverUri, size) : null;
}

async function getArtistCover(size = '400x400', artistIndex = 0) {
  if (!mainWindow) return null;
  
  try {
    const coverUri = await mainWindow.webContents.executeJavaScript(`
      (() => {
        try {
          const sonataState = window.sonataState;
          const currentEntity = sonataState?.queueState?.currentEntity?.observableValue?.value;
          const track = currentEntity?.entity?.data?.meta;
          
          if (!track?.artists || track.artists.length === 0) return null;
          
          const artist = track.artists[${artistIndex}];
          return artist?.cover?.uri || null;
        } catch (e) {
          return null;
        }
      })()
    `);
    
    return coverUri ? getCoverUrl(coverUri, size) : null;
  } catch (error) {
    playerApiLogger.error("Failed to get artist cover:", error);
    return null;
  }
}

async function getTrackBackgroundVideo() {
  if (!mainWindow) return null;
  
  try {
    const videoUri = await mainWindow.webContents.executeJavaScript(`
      (() => {
        try {
          const sonataState = window.sonataState;
          const currentEntity = sonataState?.queueState?.currentEntity?.observableValue?.value;
          const track = currentEntity?.entity?.data?.meta;
          
          return track?.backgroundVideoUri || null;
        } catch (e) {
          return null;
        }
      })()
    `);
    
    return videoUri;
  } catch (error) {
    playerApiLogger.error("Failed to get track background video:", error);
    return null;
  }
}

async function getTrackDuration() {
  const track = await getCurrentTrack();
  return track?.durationMs ? track.durationMs / 1000 : null;
}

async function getCurrentProgress() {
  const playback = await getPlaybackState();
  return playback?.progress || 0;
}

async function getCurrentVolume() {
  const settings = await getPlayerSettings();
  return settings?.volume || 0;
}

async function isShuffleEnabled() {
  const settings = await getPlayerSettings();
  return settings?.shuffle || false;
}

async function getRepeatMode() {
  const settings = await getPlayerSettings();
  return settings?.repeat || 'none';
}

async function isPlaying() {
  const playback = await getPlaybackState();
  return playback?.isPlaying || false;
}

async function executeJS(code) {
  if (!mainWindow) return null;
  
  try {
    return await mainWindow.webContents.executeJavaScript(code);
  } catch (error) {
    playerApiLogger.error("Failed to execute JS:", error);
    return null;
  }
}

async function getCurrentPlaylistName() {
  const context = await getCurrentContext();
  if (!context) return null;
  
  return context.title || null;
}

function invalidateLikedTracksCache() {
  if (!mainWindow) return;
  
  try {
    mainWindow.webContents.executeJavaScript(`
      if (window.__likedTracksCache) {
        window.__likedTracksCache.cache = null;
        window.__likedTracksCache.time = 0;
      }
    `);
  } catch (error) {
    playerApiLogger.error("Failed to invalidate liked tracks cache:", error);
  }
}

exports.initPlayerApi = initPlayerApi;
exports.updateCachedState = updateCachedState;
exports.invalidateLikedTracksCache = invalidateLikedTracksCache;
exports.getFullPlayerState = getFullPlayerState;
exports.getCurrentTrack = getCurrentTrack;
exports.getPlaybackState = getPlaybackState;
exports.getPlayerSettings = getPlayerSettings;
exports.getCurrentContext = getCurrentContext;
exports.getQueueInfo = getQueueInfo;
exports.isTrackLiked = isTrackLiked;
exports.getTrackLyrics = getTrackLyrics;
exports.getCoverUrl = getCoverUrl;
exports.getCachedState = getCachedState;

exports.getTrackProperty = getTrackProperty;
exports.getTrackTitle = getTrackTitle;
exports.getTrackArtists = getTrackArtists;
exports.getTrackAlbum = getTrackAlbum;
exports.getTrackCover = getTrackCover;
exports.getTrackDuration = getTrackDuration;
exports.getCurrentProgress = getCurrentProgress;
exports.getCurrentVolume = getCurrentVolume;
exports.isShuffleEnabled = isShuffleEnabled;
exports.getRepeatMode = getRepeatMode;
exports.isPlaying = isPlaying;
exports.getCurrentPlaylistName = getCurrentPlaylistName;
exports.getAlbumYear = getAlbumYear;
exports.getAlbumReleaseDate = getAlbumReleaseDate;
exports.getAlbumCover = getAlbumCover;
exports.getArtistCover = getArtistCover;
exports.getTrackBackgroundVideo = getTrackBackgroundVideo;
