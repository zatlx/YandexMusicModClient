"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

const { Logger } = require("../../packages/logger/Logger.js");
const { initFullscreenBridge } = require("./fullscreenBridge.js");
const fullscreenLogger = new Logger("Fullscreen");

let mainWindow = null;
let isInitialized = false;

function initFullscreen(window) {
  mainWindow = window;
  
  if (isInitialized) {
    fullscreenLogger.warn("Already initialized");
    return;
  }
  
  fullscreenLogger.info("Initializing fullscreen module");
  
  initFullscreenBridge(window);
  
  injectFullscreenCode();
  
  isInitialized = true;
  fullscreenLogger.info("Fullscreen module initialized");
}

function injectFullscreenCode() {
  if (!mainWindow) return;
  
  mainWindow.webContents.once('did-finish-load', () => {
    const rendererCode = getFullscreenRendererCode();
    
    mainWindow.webContents.executeJavaScript(rendererCode).catch(err => {
      fullscreenLogger.error("Failed to inject fullscreen code:", err);
    });
  });
  
  if (mainWindow.webContents.getURL()) {
    const rendererCode = getFullscreenRendererCode();
    
    mainWindow.webContents.executeJavaScript(rendererCode).catch(err => {
      fullscreenLogger.error("Failed to inject fullscreen code:", err);
    });
  }
}

function getFullscreenRendererCode() {
  const { getRendererCode } = require('./renderer/fullscreenRenderer.js');
  
  return `
    (function() {
      if (window.__FULLSCREEN_INITIALIZED__) return;
      window.__FULLSCREEN_INITIALIZED__ = true;
      
      console.log('[Fullscreen] Initializing...');
      
      ${getRendererCode()}
    })();
  `;
}

exports.initFullscreen = initFullscreen;
