"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toggleWindowState = void 0;
const electron_1 = require("electron");
const state_js_1 = require("../state.js");
const tray_js_1 = require("../tray.js");
const taskBarExtension_js_1 = require("../taskBarExtension/taskBarExtension.js");
const toggleWindowVisibility_js_1 = require("./toggleWindowVisibility.js");
const toggleWindowState = (window) => {

    if (window && !window.isDestroyed()) {
        if (typeof window.isClosable === 'function' && !window.isClosable()) {
            const allWindows = electron_1.BrowserWindow.getAllWindows();
            const mainWindow = allWindows.find(win => 
                !win.isDestroyed() && 
                typeof win.isClosable === 'function' &&
                win.isClosable()
            );
            if (mainWindow) {
                window = mainWindow;
            } else {
                return;
            }
        }
    }
    
    if (state_js_1.state.isWindowHidden) {
        (0, toggleWindowVisibility_js_1.toggleWindowVisibility)(window, true);
    }
    else if (window.isMinimized()) {
        window.restore();
        taskBarExtension_js_1.onPlayerStateChange(window, undefined);
        state_js_1.state.isMinimized = false;
    }
    else {
        window.minimize();
        state_js_1.state.isMinimized = true;
    }
    (0, tray_js_1.updateTrayMenu)(window);
};
exports.toggleWindowState = toggleWindowState;
