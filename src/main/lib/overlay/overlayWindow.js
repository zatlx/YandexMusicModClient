"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const { BrowserWindow, screen } = require("electron");
const path = require("path");
const fs = require("fs");
const { get: getStore } = require("../store.js");

let overlayWindow = null;

const OVERLAY_CONFIG = {
  DEFAULT_WIDTH: 400,
  DEFAULT_HEIGHT: 110,
  LYRICS_HEIGHT: 200,
  MIN_WIDTH: 200,
  MAX_WIDTH: 1200,
  BASE_RESOLUTION: {
    width: 2560,
    height: 1440,
  },
};

function calculateScale(screenWidth, screenHeight) {
  const scaleX = screenWidth / OVERLAY_CONFIG.BASE_RESOLUTION.width;
  const scaleY = screenHeight / OVERLAY_CONFIG.BASE_RESOLUTION.height;
  return Math.min(scaleX, scaleY);
}

function createOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    const settings = getStore("modFeatures.overlay") || {};
    sendToOverlay("update-settings", settings);
    return overlayWindow;
  }

  try {
    const settings = getStore("modFeatures.overlay") || {};
    const savedPosition = settings.position || { x: 20, y: 20 };

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;

    const scale = calculateScale(screenWidth, screenHeight);

    const baseWidth = settings.minWidth || OVERLAY_CONFIG.DEFAULT_WIDTH;
    const baseHeight = OVERLAY_CONFIG.DEFAULT_HEIGHT + (settings.showLyrics ? OVERLAY_CONFIG.LYRICS_HEIGHT : 0);

    const windowWidth = Math.round(Math.max(OVERLAY_CONFIG.MIN_WIDTH, Math.min(baseWidth, OVERLAY_CONFIG.MAX_WIDTH)) * scale);
    const windowHeight = Math.round(baseHeight * scale);

    overlayWindow = new BrowserWindow({
      width: windowWidth,
      height: windowHeight,
      x: Math.max(0, Math.min(savedPosition.x, screenWidth - windowWidth)),
      y: Math.max(0, Math.min(savedPosition.y, screenHeight - windowHeight)),
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      movable: true,
      minimizable: false,
      maximizable: false,
      closable: false,
      focusable: false,
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        enableRemoteModule: false,
        webSecurity: true,
        preload: path.join(__dirname, "overlayPreload.js"),
      },
    });

    overlayWindow.setMenu(null);

    const draggable = settings.draggable !== false;
    overlayWindow.setIgnoreMouseEvents(!draggable, { forward: true });

    const htmlPath = path.join(__dirname, "../../../app/overlay/overlay.html");

    if (fs.existsSync(htmlPath)) {
      overlayWindow.loadFile(htmlPath);
    } else {
      overlayWindow.loadURL("about:blank");
    }

    overlayWindow.on("closed", () => {
      overlayWindow = null;
    });

    overlayWindow.webContents.on("did-finish-load", () => {
      const currentSettings = getStore("modFeatures.overlay") || {};
      sendToOverlay("update-settings", currentSettings);
      sendToOverlay("update-scale", scale);
    });

    return overlayWindow;
  } catch (error) {
    return null;
  }
}

function getOverlayWindow() {
  return overlayWindow;
}

function showOverlay() {
  if (!overlayWindow || overlayWindow.isDestroyed()) {
    createOverlayWindow();
  }

  if (overlayWindow && !overlayWindow.isVisible()) {
    overlayWindow.show();
    overlayWindow.moveTop();
  }
}

function closeOverlayWindow() {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    overlayWindow.destroy();
    overlayWindow = null;
  }
}

function setOverlaySize(width, height) {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    const scale = calculateScale(screenWidth, screenHeight);

    const clampedWidth = Math.max(OVERLAY_CONFIG.MIN_WIDTH, Math.min(width, OVERLAY_CONFIG.MAX_WIDTH));
    const scaledWidth = Math.round(clampedWidth * scale);
    const scaledHeight = Math.round(height * scale);

    overlayWindow.setSize(scaledWidth, scaledHeight);
  }
}

function sendToOverlay(channel, ...args) {
  if (overlayWindow && !overlayWindow.isDestroyed() && overlayWindow.webContents) {
    overlayWindow.webContents.send(channel, ...args);
  }
}

exports.createOverlayWindow = createOverlayWindow;
exports.getOverlayWindow = getOverlayWindow;
exports.showOverlay = showOverlay;
exports.closeOverlayWindow = closeOverlayWindow;
exports.setOverlaySize = setOverlaySize;
exports.sendToOverlay = sendToOverlay;
