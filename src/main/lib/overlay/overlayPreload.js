"use strict";

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("overlayAPI", {
  onUpdateTrack: (callback) => {
    ipcRenderer.on("update-track", (event, data) => callback(data));
  },
  
  onUpdateLyrics: (callback) => {
    ipcRenderer.on("update-lyrics", (event, data) => callback(data));
  },
  
  onUpdateLyricsProgress: (callback) => {
    ipcRenderer.on("update-lyrics-progress", (event, data) => callback(data));
  },
  
  onUpdateSettings: (callback) => {
    ipcRenderer.on("update-settings", (event, data) => callback(data));
  },

  onUpdateScale: (callback) => {
    ipcRenderer.on("update-scale", (event, data) => callback(data));
  },
  
  notifyDragStart: (x, y) => {
    ipcRenderer.send("overlay-drag-start", x, y);
  },
  
  notifyDragMove: (x, y) => {
    ipcRenderer.send("overlay-drag-move", x, y);
  },
  
  notifyDragEnd: () => {
    ipcRenderer.send("overlay-drag-end");
  },
  
  getPlayerDynamicColor: () => {
    return ipcRenderer.invoke("overlay-get-dynamic-color");
  },
});
