"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const config_js_1 = require("../config.js");
const store_js_1 = require("./store.js");
const getInitialTheme_js_1 = require("./getInitialTheme.js");
const deviceInfo_js_1 = require("./deviceInfo.js");
const theme_js_1 = require("../types/theme.js");
const hostnamePatterns_js_1 = require("../constants/hostnamePatterns.js");
const events_js_1 = require('../types/events.js');
const deviceInfo = (0, deviceInfo_js_1.getDeviceInfo)();

electron_1.contextBridge.exposeInMainWorld(
  "VERSION",
  String(config_js_1.config.buildInfo.VERSION),
);
electron_1.contextBridge.exposeInMainWorld(
  "MOD_VERSION",
  String(config_js_1.config.modification.version),
);
electron_1.contextBridge.exposeInMainWorld(
  "HOST_VERSION",
  String(config_js_1.config.modification.realYMVersion),
);
electron_1.contextBridge.exposeInMainWorld(
  "BRANCH",
  String(config_js_1.config.buildInfo.BRANCH),
);
electron_1.contextBridge.exposeInMainWorld("PLATFORM", deviceInfo.os);
electron_1.contextBridge.exposeInMainWorld("DEVICE_INFO", deviceInfo);
electron_1.contextBridge.exposeInMainWorld(
    "DEVICE_HOSTNAME",
    (0, deviceInfo_js_1.getDeviceHostname)(),
);
electron_1.contextBridge.exposeInMainWorld("desktopEvents", {
  send(name, ...args) {
    electron_1.ipcRenderer.send(name, ...args);
  },
  on(name, listener) {
    electron_1.ipcRenderer.on(name, listener);
  },
  off(name, listener) {
    // This function actually can't remove Listener because electron copies listener so function reference is different. Workaround https://github.com/electron/electron/issues/45224
    electron_1.ipcRenderer.off(name, listener);
  },
  invoke(name, ...args) {
    return electron_1.ipcRenderer.invoke(name, ...args);
  },
  emit(name, ...args) {
    return electron_1.ipcRenderer.emit(name, ...args);
  }
});
electron_1.contextBridge.exposeInMainWorld(
  "DISPLAY_MAX_FPS",
  store_js_1.getDisplayMaxFps(),
);
electron_1.contextBridge.exposeInMainWorld(
  "IS_DEVTOOLS_ENABLED",
  Boolean(store_js_1.getDevtoolsEnabled()),
);
electron_1.contextBridge.exposeInMainWorld(
  "ENABLE_YNISON_REMOTE_CONTROL",
  Boolean(store_js_1.getEnableYnisonRemoteControl()),
);
electron_1.contextBridge.exposeInMainWorld(
    "YNISON_INTERCEPT_PLAYBACK",
    Boolean(store_js_1.getYnisonInterceptPlayback()),
);
electron_1.contextBridge.exposeInMainWorld(
  "VIBE_ANIMATION_INTENSITY_COEFFICIENT",
  () =>
    store_js_1.getModFeatures()?.vibeAnimationEnhancement?.intensityCoefficient,
);
electron_1.contextBridge.exposeInMainWorld(
  "VIBE_ANIMATION_MAX_FPS",
  () => store_js_1.getModFeatures()?.vibeAnimationEnhancement?.maxFPS,
);
electron_1.contextBridge.exposeInMainWorld(
  "VIBE_ANIMATION_USE_DYNAMIC_ENERGY",
  () => store_js_1.getModFeatures()?.vibeAnimationEnhancement?.useDynamicEnergy,
);
electron_1.contextBridge.exposeInMainWorld(
"VIBE_ANIMATION_SMOOTH_DYNAMIC_ENERGY",
() => store_js_1.getModFeatures()?.vibeAnimationEnhancement?.smoothDynamicEnergy,
);
electron_1.contextBridge.exposeInMainWorld(
"VIBE_ANIMATION_SMOOTH_DYNAMIC_ENERGY_COEFFICIENT",
() => store_js_1.getModFeatures()?.vibeAnimationEnhancement?.smoothDynamicEnergyCoefficient,
);
electron_1.contextBridge.exposeInMainWorld(
  "VIBE_ANIMATION_PLAY_ON_ANY_ENTITY",
  () => store_js_1.getModFeatures()?.vibeAnimationEnhancement?.playOnAnyEntity,
);
electron_1.contextBridge.exposeInMainWorld(
  "VIBE_ANIMATION_DISABLE_RENDERING",
  () => store_js_1.getModFeatures()?.vibeAnimationEnhancement?.disableRendering,
);
electron_1.contextBridge.exposeInMainWorld(
  "SHOW_CODEC_INSTEAD_OF_QUALITY_MARK",
  () =>
    store_js_1.getModFeatures()?.playerBarEnhancement
      ?.showCodecInsteadOfQualityMark,
);
electron_1.contextBridge.exposeInMainWorld(
  "SHOW_DISLIKE_BUTTON",
  () => store_js_1.getModFeatures()?.playerBarEnhancement?.showDislikeButton,
);
electron_1.contextBridge.exposeInMainWorld(
  "SHOW_REPEAT_BUTTON_ON_VIBE",
  () =>
    store_js_1.getModFeatures()?.playerBarEnhancement?.showRepeatButtonOnVibe,
);
electron_1.contextBridge.exposeInMainWorld(
  "ALWAYS_SHOW_PLAYER_TIMESTAMPS",
  () =>
    store_js_1.getModFeatures()?.playerBarEnhancement
      ?.alwaysShowPlayerTimestamps,
);
electron_1.contextBridge.exposeInMainWorld(
  "INVERT_SLIDER_ON_SCROLL_DELTA",
  () =>
    store_js_1.getModFeatures()?.playerBarEnhancement
      ?.invertSliderOnScrollDelta,
);
electron_1.contextBridge.exposeInMainWorld(
  "DISABLE_PER_TRACK_COLORS",
  () =>
    store_js_1.getModFeatures()?.playerBarEnhancement?.disablePerTrackColors,
);
electron_1.contextBridge.exposeInMainWorld(
  "ALWAYS_WIDE_BAR",
  () => store_js_1.getModFeatures()?.playerBarEnhancement?.alwaysWideBar,
);
electron_1.contextBridge.exposeInMainWorld(
  "ENABLE_ENDLESS_MUSIC",
  () =>
    store_js_1.getModFeatures()?.vibeAnimationEnhancement?.enableEndlessMusic,
);
electron_1.contextBridge.exposeInMainWorld(
  "HIDE_PAYMENT_ALERT",
  () => store_js_1.getModFeatures()?.windowBehavior?.hidePaymentAlert,
);
electron_1.contextBridge.exposeInMainWorld("DEFAULT_EXPERIMENT_OVERRIDES", () =>
  store_js_1.getDefaultExperimentOverrides(),
);
electron_1.contextBridge.exposeInMainWorld("nativeSettings", {
  get(key) {
    return store_js_1.get(key);
  },
  set(key, value) {
    electron_1.ipcRenderer.send(events_js_1.Events.NATIVE_STORE_SET, key, value);
  },
  setPathWithNativeDialog(
    key,
    defaultPath = undefined,
    properties = undefined,
  ) {
    electron_1.ipcRenderer.invoke(
      "setPathWithNativeDialog",
      key,
      defaultPath,
      properties,
    );
  },
});
electron_1.contextBridge.exposeInMainWorld("openConfigFile", () =>
  electron_1.ipcRenderer.invoke("openConfigFile"),
);

// TEMPORARY: Set up Last.fm login IPC handler. Mostly for example.
electron_1.contextBridge.exposeInMainWorld("scrobble", {
  login: () => electron_1.ipcRenderer.invoke("scrobble-login"),
  logout: () => electron_1.ipcRenderer.invoke("scrobble-logout"),
  lastfmLogin: () => electron_1.ipcRenderer.invoke("scrobble-lastfm-login"),
  lastfmLogout: () => electron_1.ipcRenderer.invoke("scrobble-lastfm-logout"),
  lastfmGetUser: () =>
    electron_1.ipcRenderer.invoke("scrobble-lastfm-get-user"),
  lastfmGetResnet: (user) =>
    electron_1.ipcRenderer.invoke(
      "scrobble-lastfm-get-current-playing-track",
      user,
    ),
});

electron_1.contextBridge.exposeInMainWorld("zoomControl", {
  zoomIn: () => electron_1.ipcRenderer.invoke("zoom-in"),
  zoomOut: () => electron_1.ipcRenderer.invoke("zoom-out"),
  resetZoom: () => electron_1.ipcRenderer.invoke("reset-zoom"),
  getZoomLevel: () => electron_1.ipcRenderer.invoke("get-zoom-level"),
  setZoomLevel: (level) =>
    electron_1.ipcRenderer.invoke("set-zoom-level", level),
});

// Player API
electron_1.contextBridge.exposeInMainWorld("playerAPI", {
  getFullState: () => electron_1.ipcRenderer.invoke("player-api-get-full-state"),
  
  getTrack: () => electron_1.ipcRenderer.invoke("player-api-get-track"),
  getPlayback: () => electron_1.ipcRenderer.invoke("player-api-get-playback"),
  getSettings: () => electron_1.ipcRenderer.invoke("player-api-get-settings"),
  getContext: () => electron_1.ipcRenderer.invoke("player-api-get-context"),
  getQueue: () => electron_1.ipcRenderer.invoke("player-api-get-queue"),
  
  isLiked: (trackId) => electron_1.ipcRenderer.invoke("player-api-is-liked", trackId),
  
  getLyrics: (trackId) => electron_1.ipcRenderer.invoke("player-api-get-lyrics", trackId),

  getCached: () => electron_1.ipcRenderer.invoke("player-api-get-cached"),

  getTrackTitle: () => electron_1.ipcRenderer.invoke("player-api-get-track-title"),
  getTrackArtists: () => electron_1.ipcRenderer.invoke("player-api-get-track-artists"),
  getTrackAlbum: () => electron_1.ipcRenderer.invoke("player-api-get-track-album"),
  getTrackCover: (size) => electron_1.ipcRenderer.invoke("player-api-get-track-cover", size),
  getTrackDuration: () => electron_1.ipcRenderer.invoke("player-api-get-track-duration"),
  getCurrentProgress: () => electron_1.ipcRenderer.invoke("player-api-get-current-progress"),
  getCurrentVolume: () => electron_1.ipcRenderer.invoke("player-api-get-current-volume"),
  isShuffleEnabled: () => electron_1.ipcRenderer.invoke("player-api-is-shuffle-enabled"),
  getRepeatMode: () => electron_1.ipcRenderer.invoke("player-api-get-repeat-mode"),
  isPlaying: () => electron_1.ipcRenderer.invoke("player-api-is-playing"),
  getCurrentPlaylistName: () => electron_1.ipcRenderer.invoke("player-api-get-current-playlist-name"),

  getAlbumYear: () => electron_1.ipcRenderer.invoke("player-api-get-album-year"),
  getAlbumReleaseDate: () => electron_1.ipcRenderer.invoke("player-api-get-album-release-date"),
  getAlbumCover: (size) => electron_1.ipcRenderer.invoke("player-api-get-album-cover", size),

  getArtistCover: (size, artistIndex) => electron_1.ipcRenderer.invoke("player-api-get-artist-cover", size, artistIndex),

  getTrackBackgroundVideo: () => electron_1.ipcRenderer.invoke("player-api-get-track-background-video"),

  onStateUpdate: (callback) => {
    const listener = (event, data) => callback(data);
    electron_1.ipcRenderer.on(events_js_1.Events.PLAYER_STATE, listener);
    return () => electron_1.ipcRenderer.off(events_js_1.Events.PLAYER_STATE, listener);
  }
});

// Player Control
electron_1.contextBridge.exposeInMainWorld("playerControl", {
  togglePlay: () => electron_1.ipcRenderer.invoke("player-control-toggle-play"),
  play: () => electron_1.ipcRenderer.invoke("player-control-play"),
  pause: () => electron_1.ipcRenderer.invoke("player-control-pause"),
  next: () => electron_1.ipcRenderer.invoke("player-control-next"),
  previous: () => electron_1.ipcRenderer.invoke("player-control-previous"),

  seek: (positionSeconds) => electron_1.ipcRenderer.invoke("player-control-seek", positionSeconds),

  setVolume: (volume) => electron_1.ipcRenderer.invoke("player-control-set-volume", volume),

  toggleShuffle: () => electron_1.ipcRenderer.invoke("player-control-toggle-shuffle"),
  setShuffle: (enabled) => electron_1.ipcRenderer.invoke("player-control-set-shuffle", enabled),

  toggleRepeat: () => electron_1.ipcRenderer.invoke("player-control-toggle-repeat"),
  setRepeat: (mode) => electron_1.ipcRenderer.invoke("player-control-set-repeat", mode),

  toggleLike: () => electron_1.ipcRenderer.invoke("player-control-toggle-like"),
  like: () => electron_1.ipcRenderer.invoke("player-control-like"),
  unlike: () => electron_1.ipcRenderer.invoke("player-control-unlike"),
  dislike: () => electron_1.ipcRenderer.invoke("player-control-dislike"),

  playTrack: (trackId, albumId) => electron_1.ipcRenderer.invoke("player-control-play-track", trackId, albumId),
  playAlbum: (albumId) => electron_1.ipcRenderer.invoke("player-control-play-album", albumId),
  playPlaylist: (uid, kind) => electron_1.ipcRenderer.invoke("player-control-play-playlist", uid, kind)
});



electron_1.contextBridge.exposeInMainWorld('loadWorker', (workerName) => {
  const fs = require('fs');
  const path = require('path');
  const workerPath = path.join(__dirname, 'workers',`${path.parse(workerName).name}.js`);
  const code = fs.readFileSync(workerPath);
  return code.toString('utf-8');
});


window.document.addEventListener("DOMContentLoaded", () => {
  const theme = (0, getInitialTheme_js_1.getInitialTheme)();
  if (
    hostnamePatterns_js_1.applicationHostnamePattern.test(
      window.location.hostname,
    )
  ) {
    window.document.documentElement.style.backgroundColor =
      theme === theme_js_1.Theme.Light ? "#FFFFFF" : "#000000";
  }

  const hidePaymentAlert = store_js_1.getModFeatures()?.windowBehavior?.hidePaymentAlert;
  if (hidePaymentAlert) {
    const style = document.createElement('style');
    style.id = 'hide-payment-alert-style';
    style.textContent = '.RedAlert_wrapper__rGvGN { display: none !important; }';
    document.head.appendChild(style);
  }
});
