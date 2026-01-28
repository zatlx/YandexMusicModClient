'use strict';
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, '__esModule', { value: true });
exports.sendRefreshRepositoryMeta =
    exports.sendRefreshTracksAvailability =
    exports.sendAnalyticsOnFirstLaunch =
    exports.sendOpenDeeplink =
    exports.sendPlayerAction =
    exports.sendRefreshApplicationData =
    exports.sendUpdateAvailable =
    exports.sendLoadReleaseNotes =
    exports.sendProbabilityBucket =
    exports.handleApplicationEvents =
    exports.sendNativeStoreUpdate =
        void 0;
const electron_1 = require('electron');
const events_js_1 = require('./types/events.js');
const cookies_js_1 = require('./constants/cookies.js');
const Logger_js_1 = require('./packages/logger/Logger.js');
const updater_js_1 = require('./lib/updater.js');
const tray_js_1 = require('./lib/tray.js');
const appSuspension_js_1 = require('./lib/appSuspension.js');
const store_js_1 = require('./lib/store.js');
const state_js_1 = require('./lib/state.js');
const toggleWindowVisibility_js_1 = require('./lib/window/toggleWindowVisibility.js');
const toggleMaximize_js_1 = require('./lib/window/toggleMaximize.js');
const minimize_js_1 = require('./lib/window/minimize.js');
const handleDeeplink_js_1 = require('./lib/handlers/handleDeeplink.js');
const loadReleaseNotes_js_1 = require('./lib/loadReleaseNotes.js');
const deviceInfo_js_1 = require('./lib/deviceInfo.js');
const platform_js_1 = require('./types/platform.js');
const config_js_1 = require('./config.js');
const getSortedDescReleaseNotesKeys_js_1 = require('./lib/releaseNotes/getSortedDescReleaseNotesKeys.js');
const removeNewerReleaseNotes_js_1 = require('./lib/releaseNotes/removeNewerReleaseNotes.js');
const formatters_js_1 = require('./lib/i18n/formatters.js');
const stringToAST_js_1 = require('./lib/i18n/stringToAST.js');
const gt_js_1 = __importDefault(require('semver/functions/gt.js'));
const valid_js_1 = __importDefault(require('semver/functions/valid.js'));
const i18nKeys_js_1 = require('./constants/i18nKeys.js');
const dateToDDMonthYYYYProps_js_1 = require('./lib/date/dateToDDMonthYYYYProps.js');

const discordRichPresence_js_1 = require('./lib/discordRichPresence.js');
const trackDownloader_js_1 = require('./lib/trackDownloader/trackDownloader.js');
const { getFfmpegUpdater } = require("./lib/ffmpegInstaller.js");
const taskBarExtension_js_1 = require('./lib/taskBarExtension/taskBarExtension.js');
const isAccelerator = require('electron-is-accelerator');
const modUpdater_js_1 = require('./lib/modUpdater.js');
const miniPlayer_js_1 = require('./lib/miniplayer/miniplayer.js');
const scrobbleManager_js_1 = require('./lib/scrobble/index.js');
const playerActions_js_1 = require('./types/playerActions.js');
const { throttle } = require('./lib/utils.js');
const crypto = require('crypto');
const overlayManager = require('./lib/overlay/overlayManager.js');
const overlayWindow = require('./lib/overlay/overlayWindow.js');
const playerApi = require('./lib/playerApi.js');
const playerControl = require('./lib/playerControl.js');
const fullscreen = require('./lib/fullscreen/fullscreen.js');

const eventsLogger = new Logger_js_1.Logger('Events');
const isBoolean = (value) => {
    return typeof value === 'boolean';
};

const PROGRESS_BAR_THROTTLE_MS = 200;

let mainWindow = undefined;
let isPlayerReady = false;
let downloadQueue = Promise.resolve();

const MiniPlayer = miniPlayer_js_1.getMiniPlayer();

MiniPlayer.updateSettingsState(store_js_1.getModFeatures());

const fetchInitialPlayerState = async (window) => {
    try {
        const playerData = await window.webContents.executeJavaScript(`
            (() => {
                try {
                    const sonataState = window.sonataState;
                    if (!sonataState) return null;
                    
                    const currentEntity = sonataState.queueState?.currentEntity?.observableValue?.value;
                    const track = currentEntity?.entity?.data?.meta;
                    const status = sonataState.playerState?.status?.observableValue?.value;
                    const progress = sonataState.playerState?.progress?.observableValue?.value;
                    
                    if (!track) return null;
                    
                    return {
                        track: track,
                        isPlaying: status === 'playing',
                        progress: progress?.position || 0,
                        duration: progress?.duration || 0
                    };
                } catch (e) {
                    return null;
                }
            })()
        `);

        if (playerData && playerData.track) {
            overlayManager.handlePlayerState(playerData);
        }
    } catch (err) {
    }
};

const updateGlobalShortcuts = () => {
    eventsLogger.info('(GlobalShortcuts) Update triggered.');
    electron_1.globalShortcut.unregisterAll();

    const modFeatures = store_js_1.getModFeatures();

    eventsLogger.info('(GlobalShortcuts) modFeatures.globalShortcuts:', modFeatures?.globalShortcuts);

    if (modFeatures?.globalShortcuts?.enable) {
        const shortcuts = Object.entries(modFeatures.globalShortcuts);
        shortcuts.forEach((shortcut) => {
            if (shortcut[0] === 'enable') return;

            if (shortcut[1] && isAccelerator(shortcut[1])) {
                electron_1.globalShortcut.register(shortcut[1], () => {
                    const commands = shortcut[0].split(' ');
                    commands.forEach((command) => {
                        const [action, value] = command.split('|');
                        sendPlayerAction(mainWindow, playerActions_js_1.PlayerActions[action], value);
                    });
                });
            } else {
                eventsLogger.warn(`(GlobalShortcuts) ${shortcut[0]} is not registered. Invalid accelerator: ${shortcut[1]}`);
            }
        });
        eventsLogger.info('(GlobalShortcuts) Registered.');
    } else {
        eventsLogger.info('(GlobalShortcuts) Unregistered all.');
    }
};

const handleApplicationEvents = (window) => {
    mainWindow = window;
    const updater = (0, updater_js_1.getUpdater)();
    const trackDownloader = new trackDownloader_js_1.TrackDownloader(window);

    playerApi.initPlayerApi(window);
    playerControl.initPlayerControl(window);

    fullscreen.initFullscreen(window);

    updateGlobalShortcuts();

    electron_1.ipcMain.on(events_js_1.Events.DOWNLOAD_CURRENT_TRACK, async (event, trackId) => {
        let callback = (progressRenderer, progressWindow) => {
            sendProgressBarChange(window, 'trackDownloadCurrent', progressRenderer * 100);
            window.setProgressBar(progressWindow);
        };

        eventsLogger.info('Event received', events_js_1.Events.DOWNLOAD_CURRENT_TRACK);
        await trackDownloader.downloadSingleTrack(trackId, throttle(callback, PROGRESS_BAR_THROTTLE_MS));
    });

    electron_1.ipcMain.on(events_js_1.Events.DOWNLOAD_TRACK, async (event, trackId, trackName = '') => {
        sendBasicToastCreate(window, `trackDownload|${trackId}`, trackName ? 'Загрузка трека: ' + trackName : 'Загрузка трека...', false);

        let callback = (progressRenderer, progressWindow) => {
            sendProgressBarChange(window, `trackDownload|${trackId}`, progressRenderer * 100);
            window.setProgressBar(progressWindow);
        };

        eventsLogger.info('Event received', events_js_1.Events.DOWNLOAD_TRACK);
        await trackDownloader.downloadSingleTrack(trackId, throttle(callback, PROGRESS_BAR_THROTTLE_MS));
        setTimeout(() => sendBasicToastDismiss(window, `trackDownload|${trackId}`), 2000);
    });

    electron_1.ipcMain.on(events_js_1.Events.DOWNLOAD_TRACKS, (event, trackIds, dirType = undefined, dirName = undefined) => {

        if (!trackIds?.length) return;

        const hash = crypto
            .createHash('md5')
            .update([dirType, ...trackIds].join('|'))
            .digest('hex');

        let message = 'Загрузка треков...';
        if (dirName) {
            switch (dirType) {
                case 'album':
                    message = `Загрузка альбома | #s | ${dirName}`;
                    break;
                case 'playlist':
                    message = `Загрузка плейлиста | #s | ${dirName}`;
                    break;
                case 'single':
                    message = `Загрузка сингла | #s | ${dirName}`;
                    break;
                case 'podcast':
                    message = `Загрузка подкаста | #s | ${dirName}`;
                    break;
                case 'audiobook':
                    message = `Загрузка аудиокниги | #s | ${dirName}`;
                    break;
                default:
                    message = `Загрузка треков | #s | ${dirName}`;
            }
        }

        sendBasicToastCreate(window, `trackDownload|${hash}`, message, false);

        eventsLogger.info('Event received', events_js_1.Events.DOWNLOAD_TRACKS);

        const callback = (progressRenderer, progressWindow, statusLabel) => {
            sendProgressBarChange(window, `trackDownload|${hash}`, progressRenderer * 100, statusLabel);
            window.setProgressBar(progressWindow);
        };

        downloadQueue = downloadQueue
            .then(async () => {
                try {
                    await trackDownloader.downloadMultipleTracks(trackIds, dirName, throttle(callback, PROGRESS_BAR_THROTTLE_MS));
                } catch (e) {
                    eventsLogger.error('Error downloading multiple tracks:', e, e.stack);
                } finally {
                    setTimeout(() => {
                        sendBasicToastDismiss(window, `trackDownload|${hash}`);
                    }, 2000);
                }
            })
            .catch((err) => {
                // защита от "сломавшейся" очереди
                eventsLogger.error('Download queue error:', err);
            });
    });

    electron_1.app.on('will-quit', () => {
        electron_1.globalShortcut.unregisterAll();
        overlayManager.cleanup();
    });

    electron_1.app.on('child-process-gone', (event, { type, reason }) => {
        if (type === 'GPU') mainWindow?.webContents.send(events_js_1.Events.GPU_STALL, reason);
    });

    electron_1.ipcMain.on(events_js_1.Events.APPLICATION_RESTART, () => {
        eventsLogger.info('Event received', events_js_1.Events.APPLICATION_RESTART);
        electron_1.app.relaunch();
        electron_1.app.exit();
    });
    electron_1.ipcMain.on(events_js_1.Events.WINDOW_MINIMIZE, () => {
        eventsLogger.info('Event received', events_js_1.Events.WINDOW_MINIMIZE);
        (0, minimize_js_1.minimize)(window);
    });
    electron_1.ipcMain.on(events_js_1.Events.WINDOW_MAXIMIZE, () => {
        eventsLogger.info('Event received', events_js_1.Events.WINDOW_MAXIMIZE);
        (0, toggleMaximize_js_1.toggleMaximize)(window);
    });
    electron_1.ipcMain.on(events_js_1.Events.WINDOW_CLOSE, () => {
        eventsLogger.info('Event received', events_js_1.Events.WINDOW_CLOSE);
        if ([platform_js_1.Platform.WINDOWS, platform_js_1.Platform.LINUX].includes(deviceInfo_js_1.devicePlatform)) {
            if (store_js_1.getModFeatures()?.windowBehavior?.minimizeToTrayOnWindowClose ?? state_js_1.state.player.isPlaying) {
                (0, toggleWindowVisibility_js_1.toggleWindowVisibility)(window, false);
            } else {
                electron_1.app.quit();
            }
        } else {
            electron_1.app.quit();
        }
    });
    electron_1.ipcMain.on(events_js_1.Events.INSTALL_UPDATE, () => {
        eventsLogger.info('Event received', events_js_1.Events.INSTALL_UPDATE);
        updater.install();
    });
    electron_1.ipcMain.on(events_js_1.Events.APPLICATION_READY, async (event, language) => {
        eventsLogger.info('Event received', events_js_1.Events.APPLICATION_READY);
        (0, deviceInfo_js_1.logHardwareInfo)();

        try {
            const token = await window.webContents.executeJavaScript(
                'JSON.parse(localStorage.getItem("oauth")).value;'
            );
            if (token) {
                const userAgent = window.webContents.getUserAgent();
                overlayManager.initTracksApi(token, userAgent);
            }
        } catch (error) {
        }

        const overlaySettings = store_js_1.getModFeatures()?.overlay || {};
        if (overlaySettings.enable) {
            overlayWindow.createOverlayWindow();
            await fetchInitialPlayerState(window);
        }

        isPlayerReady = false;

        (0, deviceInfo_js_1.logHardwareInfo)();
        if (state_js_1.state.deeplink) {
            (0, handleDeeplink_js_1.navigateToDeeplink)(window, state_js_1.state.deeplink);
        }
        if (updater.latestAvailableVersion) {
            (0, exports.sendUpdateAvailable)(window, updater.latestAvailableVersion);
        }
        if ((0, store_js_1.isFirstLaunch)()) {
            (0, exports.sendAnalyticsOnFirstLaunch)(window);
        }
        (0, exports.sendProbabilityBucket)(window, updater.getProbabilityBucket());

        const version = electron_1.app.getVersion();
        const releaseNotes = await (0, loadReleaseNotes_js_1.loadReleaseNotes)(language);
        if (!releaseNotes) {
            return;
        }
        const { [`${i18nKeys_js_1.KEY_DESKTOP_RELEASE_NOTES_DEFAULT}`]: defaultReleaseNote, ...otherNotes } = releaseNotes;
        let translationsReleaseNotes = (0, removeNewerReleaseNotes_js_1.removeNewerReleaseNotes)(otherNotes, version);
        const sortedDescReleaseNotesKeys = (0, getSortedDescReleaseNotesKeys_js_1.getSortedDescReleaseNotesKeys)(translationsReleaseNotes);
        const latestVersion = sortedDescReleaseNotesKeys[0];
        if (!latestVersion) {
            return;
        }
        const extractedVersion = (0, getSortedDescReleaseNotesKeys_js_1.extractVersion)(latestVersion);
        if (
            (0, valid_js_1.default)(extractedVersion) &&
            (0, valid_js_1.default)(version) &&
            (0, gt_js_1.default)(version, extractedVersion) &&
            Array.isArray(defaultReleaseNote)
        ) {
            const dateString = `<date>${(0, formatters_js_1.formatDate)({
                date: config_js_1.config.buildInfo.BUILD_TIME,
                options: (0, dateToDDMonthYYYYProps_js_1.dateToDDMonthYYYYProps)(),
                language,
            })}</date>\n`;
            const dateAST = (0, stringToAST_js_1.stringToAST)(dateString);
            translationsReleaseNotes = {
                ...translationsReleaseNotes,
                [`${i18nKeys_js_1.RELEASE_NOTES_KEY_PREFIX}${version}`]: [...dateAST, ...defaultReleaseNote],
            };
            sortedDescReleaseNotesKeys.unshift(`${i18nKeys_js_1.RELEASE_NOTES_KEY_PREFIX}${version}`);
        }
        (0, exports.sendLoadReleaseNotes)({
            window,
            needToShowReleaseNotes: (0, store_js_1.needToShowReleaseNotes)(),
            sortedDescReleaseNotesKeys,
            translationsReleaseNotes,
        });

        const ffmpegInstaller = getFfmpegUpdater();

        if (!await ffmpegInstaller.isInstalled()) {

            sendBasicToastCreate(window, 'ffmpeg', 'Обновление компонента: ffmpeg', false);

            let callback = (progressRenderer, progressWindow) => {
                sendProgressBarChange(window, 'ffmpeg', progressRenderer * 100);
                window.setProgressBar(progressWindow);
            };
            ffmpegInstaller.ensureInstalled(throttle(callback, PROGRESS_BAR_THROTTLE_MS))
            .then(()=>{
                sendBasicToastDismiss(window, 'ffmpeg');
            }).catch((err) => {
                sendProgressBarChange(window, 'ffmpeg', -1);
                eventsLogger.error(err);
                setTimeout(()=>{sendBasicToastDismiss(window, 'ffmpeg')}, 2500)
            });

        }

    });
    electron_1.ipcMain.on(events_js_1.Events.APPLICATION_THEME, (event, backgroundColor) => {
        eventsLogger.info('Event received', events_js_1.Events.APPLICATION_THEME);
        window.setBackgroundColor(backgroundColor);
    });
    electron_1.ipcMain.on(events_js_1.Events.TRACKS_AVAILABILITY_UPDATED, (event) => {
        const [, setTracksAvailabilityUpdatedAt] = store_js_1.tracksAvailabilityUpdatedAt;
        eventsLogger.info('Event received', events_js_1.Events.TRACKS_AVAILABILITY_UPDATED);
        setTracksAvailabilityUpdatedAt(Date.now());
    });
    electron_1.ipcMain.on(events_js_1.Events.REPOSITORY_META_UPDATED, (event) => {
        const [, setRepositoryMetaUpdatedAtStoreValue] = store_js_1.repositoryMetaUpdatedAt;
        eventsLogger.info('Event received', events_js_1.Events.REPOSITORY_META_UPDATED);
        setRepositoryMetaUpdatedAtStoreValue(Date.now());
    });
    electron_1.ipcMain.on(events_js_1.Events.PLAYER_STATE, (event, data) => {
        eventsLogger.info(`Event received`, events_js_1.Events.PLAYER_STATE, data.status, data.canMoveBackward, data.canMoveForward);
        playerApi.updateCachedState(data);
        if (isBoolean(data.isPlaying)) {
            state_js_1.state.player.isPlaying = data.isPlaying;
            (0, appSuspension_js_1.toggleAppSuspension)(
                data.isPlaying,
                (store_js_1.getModFeatures()?.windowBehavior?.preventDisplaySleep ?? false) && window.isVisible(),
            );
        }
        if (isBoolean(data.canMoveBackward)) {
            state_js_1.state.player.canMoveBackward = data.canMoveBackward;
        }
        if (isBoolean(data.canMoveForward)) {
            state_js_1.state.player.canMoveForward = data.canMoveForward;
        }
        (0, tray_js_1.updateTrayMenu)(window);
        (0, taskBarExtension_js_1.onPlayerStateChange)(window, data);
        (0, scrobbleManager_js_1.handlePlayingStateEvent)(data);
        if (isPlayerReady && data.status !== 'idle') {
            (0, discordRichPresence_js_1.discordRichPresence)(data);
        } else {
            if (data.status === 'idle' && data.track) {
                if (store_js_1.getModFeatures()?.vibeAnimationEnhancement?.autoLaunchOnAppStartup) {
                    exports.sendPlayerAction(window, playerActions_js_1.PlayerActions.TOGGLE_PLAY);
                }
                isPlayerReady = true;
            }
        }
        MiniPlayer.updatePlayerState(data);
        const progressSeconds = data.progress?.position || data.progress;
        const durationSeconds = data.progress?.duration || data.duration || data.track?.durationMs / 1000;

        const overlayData = {
            track: data.track,
            isPlaying: data.isPlaying,
            progress: progressSeconds ? progressSeconds * 1000 : 0,
            duration: durationSeconds ? durationSeconds * 1000 : (data.track?.durationMs || 0),
            status: data.status
        };

        overlayManager.handlePlayerState(overlayData)
    });
    electron_1.ipcMain.on(events_js_1.Events.YNISON_STATE, (event, data) => {
        eventsLogger.info(`Event received`, events_js_1.Events.YNISON_STATE);
        (0, discordRichPresence_js_1.fromYnisonState)(data);
        (0, scrobbleManager_js_1.handlePlayingStateEventFromYnison)(data);
    });
    electron_1.ipcMain.on(events_js_1.Events.DOWNLOAD_MOD_UPDATE, async (event, data) => {
        eventsLogger.info(`Event received`, events_js_1.Events.DOWNLOAD_MOD_UPDATE);

        let callback = (progressRenderer, progressWindow) => {
            sendProgressBarChange(window, 'modUpdateToast', progressRenderer * 100);
            window.setProgressBar(progressWindow);
        };
        await (0, modUpdater_js_1.getModUpdater)().onUpdateDownload(throttle(callback, PROGRESS_BAR_THROTTLE_MS));
    });

    electron_1.ipcMain.on(events_js_1.Events.INSTALL_MOD_UPDATE, async (event, data) => {
        eventsLogger.info(`Event received`, events_js_1.Events.INSTALL_MOD_UPDATE);
        await (0, modUpdater_js_1.getModUpdater)().onInstallUpdate();
    });

    electron_1.ipcMain.on(events_js_1.Events.NATIVE_STORE_SET, (event, key, value) => {
        eventsLogger.info(`Event received`, events_js_1.Events.NATIVE_STORE_SET, key, value);
        store_js_1.set(key, value);
        if (key === 'modFeatures.globalShortcuts.enable') {
            updateGlobalShortcuts();
        }
        MiniPlayer.updateSettingsState(store_js_1.getModFeatures());

        if (key === "modFeatures.overlay.enable") {
            if (value) {
                overlayWindow.createOverlayWindow();
                overlayWindow.showOverlay();
                overlayManager.restoreLastState();
            } else {
                overlayWindow.closeOverlayWindow();
            }
        }

        if (key.startsWith("modFeatures.overlay")) {
            const settings = store_js_1.getModFeatures()?.overlay || {};
            overlayManager.updateOverlaySettings(settings);
        }
    });

    electron_1.ipcMain.on(events_js_1.Events.TOGGLE_MINIPLAYER, (event) => {
        eventsLogger.info(`Event received`, events_js_1.Events.TOGGLE_MINIPLAYER);
        MiniPlayer.toggle();
    });

    electron_1.ipcMain.handle(events_js_1.Events.GET_PASSPORT_LOGIN, async () => {
        eventsLogger.info('Event handle', events_js_1.Events.GET_PASSPORT_LOGIN);
        try {
            const cookie = await electron_1.session.defaultSession.cookies.get({
                name: cookies_js_1.PASSPORT_LOGIN,
                domain: cookies_js_1.PASSPORT_LOGIN_DOMAIN,
            });
            return cookie?.[0]?.value;
        } catch (error) {
            eventsLogger.error(`${events_js_1.Events.GET_PASSPORT_LOGIN} event failed.`, error);
            return;
        }
    });
    electron_1.ipcMain.handle(events_js_1.Events.GET_YANDEX_UID, async () => {
        eventsLogger.info('Event handle', events_js_1.Events.GET_YANDEX_UID);
        try {
            const cookie = await electron_1.session.defaultSession.cookies.get({
                name: cookies_js_1.YANDEX_ID,
                domain: cookies_js_1.PASSPORT_LOGIN_DOMAIN,
            });
            return cookie?.[0]?.value;
        } catch (error) {
            eventsLogger.error(`${events_js_1.Events.GET_YANDEX_UID} event failed.`, error);
            return;
        }
    });

    electron_1.ipcMain.on("overlay-drag-start", (event, x, y) => {
        const win = overlayWindow.getOverlayWindow();
        if (win) {
            const [winX, winY] = win.getPosition();
            win._dragOffset = { x: x - winX, y: y - winY };
        }
    });

    electron_1.ipcMain.on("overlay-drag-move", (event, x, y) => {
        const win = overlayWindow.getOverlayWindow();
        if (win && win._dragOffset) {
            win.setPosition(x - win._dragOffset.x, y - win._dragOffset.y);
        }
    });

    electron_1.ipcMain.on("overlay-drag-end", () => {
        const win = overlayWindow.getOverlayWindow();
        if (win) {
            delete win._dragOffset;
            const [x, y] = win.getPosition();
            const currentSettings = store_js_1.getModFeatures()?.overlay || {};
            store_js_1.set("modFeatures.overlay", { ...currentSettings, position: { x, y } });
        }
    });

    electron_1.ipcMain.handle("overlay-get-dynamic-color", async () => {
        try {
            const color = await window.webContents.executeJavaScript(`
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
            return null;
        }
    });

    electron_1.ipcMain.handle("overlay-get-lyrics", async (event, trackId) => {
        eventsLogger.info("Event handle", "overlay-get-lyrics", trackId);
        try {
            const lyrics = await overlayManager.fetchLyrics(trackId);
            return lyrics;
        } catch (error) {
            eventsLogger.error("Error fetching lyrics:", error);
            return null;
        }
    });

    electron_1.ipcMain.handle("overlay-get-current-state", async () => {
        eventsLogger.info("Event handle", "overlay-get-current-state");
        try {
            return overlayManager.getCurrentState();
        } catch (error) {
            eventsLogger.error("Error getting overlay state:", error);
            return null;
        }
    });

    // Player API handlers
    electron_1.ipcMain.handle("player-api-get-full-state", async () => {
        eventsLogger.info("Event handle", "player-api-get-full-state");
        return await playerApi.getFullPlayerState();
    });

    electron_1.ipcMain.handle("player-api-get-track", async () => {
        eventsLogger.info("Event handle", "player-api-get-track");
        return await playerApi.getCurrentTrack();
    });

    electron_1.ipcMain.handle("player-api-get-playback", async () => {
        eventsLogger.info("Event handle", "player-api-get-playback");
        return await playerApi.getPlaybackState();
    });

    electron_1.ipcMain.handle("player-api-get-settings", async () => {
        eventsLogger.info("Event handle", "player-api-get-settings");
        return await playerApi.getPlayerSettings();
    });

    electron_1.ipcMain.handle("player-api-get-context", async () => {
        eventsLogger.info("Event handle", "player-api-get-context");
        return await playerApi.getCurrentContext();
    });

    electron_1.ipcMain.handle("player-api-get-queue", async () => {
        eventsLogger.info("Event handle", "player-api-get-queue");
        return await playerApi.getQueueInfo();
    });

    electron_1.ipcMain.handle("player-api-is-liked", async (event, trackId) => {
        eventsLogger.info("Event handle", "player-api-is-liked", trackId);
        return await playerApi.isTrackLiked(trackId);
    });

    electron_1.ipcMain.handle("player-api-get-lyrics", async (event, trackId) => {
        eventsLogger.info("Event handle", "player-api-get-lyrics", trackId);
        return await playerApi.getTrackLyrics(trackId);
    });

    electron_1.ipcMain.handle("player-api-get-cached", async () => {
        return playerApi.getCachedState();
    });

    electron_1.ipcMain.handle("player-api-get-track-title", async () => {
        return await playerApi.getTrackTitle();
    });

    electron_1.ipcMain.handle("player-api-get-track-artists", async () => {
        return await playerApi.getTrackArtists();
    });

    electron_1.ipcMain.handle("player-api-get-track-album", async () => {
        return await playerApi.getTrackAlbum();
    });

    electron_1.ipcMain.handle("player-api-get-track-cover", async (event, size) => {
        return await playerApi.getTrackCover(size);
    });

    electron_1.ipcMain.handle("player-api-get-track-duration", async () => {
        return await playerApi.getTrackDuration();
    });

    electron_1.ipcMain.handle("player-api-get-current-progress", async () => {
        return await playerApi.getCurrentProgress();
    });

    electron_1.ipcMain.handle("player-api-get-current-volume", async () => {
        return await playerApi.getCurrentVolume();
    });

    electron_1.ipcMain.handle("player-api-is-shuffle-enabled", async () => {
        return await playerApi.isShuffleEnabled();
    });

    electron_1.ipcMain.handle("player-api-get-repeat-mode", async () => {
        return await playerApi.getRepeatMode();
    });

    electron_1.ipcMain.handle("player-api-is-playing", async () => {
        return await playerApi.isPlaying();
    });

    electron_1.ipcMain.handle("player-api-get-current-playlist-name", async () => {
        return await playerApi.getCurrentPlaylistName();
    });

    electron_1.ipcMain.handle("player-api-get-album-year", async () => {
        return await playerApi.getAlbumYear();
    });

    electron_1.ipcMain.handle("player-api-get-album-release-date", async () => {
        return await playerApi.getAlbumReleaseDate();
    });

    electron_1.ipcMain.handle("player-api-get-album-cover", async (event, size) => {
        return await playerApi.getAlbumCover(size);
    });

    electron_1.ipcMain.handle("player-api-get-artist-cover", async (event, size, artistIndex) => {
        return await playerApi.getArtistCover(size, artistIndex);
    });

    electron_1.ipcMain.handle("player-api-get-track-background-video", async () => {
        return await playerApi.getTrackBackgroundVideo();
    });

    // Player Control handlers
    electron_1.ipcMain.handle("player-control-toggle-play", async () => {
        eventsLogger.info("Event handle", "player-control-toggle-play");
        return await playerControl.togglePlay();
    });

    electron_1.ipcMain.handle("player-control-play", async () => {
        eventsLogger.info("Event handle", "player-control-play");
        return await playerControl.play();
    });

    electron_1.ipcMain.handle("player-control-pause", async () => {
        eventsLogger.info("Event handle", "player-control-pause");
        return await playerControl.pause();
    });

    electron_1.ipcMain.handle("player-control-next", async () => {
        eventsLogger.info("Event handle", "player-control-next");
        return await playerControl.next();
    });

    electron_1.ipcMain.handle("player-control-previous", async () => {
        eventsLogger.info("Event handle", "player-control-previous");
        return await playerControl.previous();
    });

    electron_1.ipcMain.handle("player-control-seek", async (event, position) => {
        eventsLogger.info("Event handle", "player-control-seek", position);
        return await playerControl.seek(position);
    });

    electron_1.ipcMain.handle("player-control-set-volume", async (event, volume) => {
        eventsLogger.info("Event handle", "player-control-set-volume", volume);
        return await playerControl.setVolume(volume);
    });

    electron_1.ipcMain.handle("player-control-toggle-shuffle", async () => {
        eventsLogger.info("Event handle", "player-control-toggle-shuffle");
        return await playerControl.toggleShuffle();
    });

    electron_1.ipcMain.handle("player-control-set-shuffle", async (event, enabled) => {
        eventsLogger.info("Event handle", "player-control-set-shuffle", enabled);
        return await playerControl.setShuffle(enabled);
    });

    electron_1.ipcMain.handle("player-control-toggle-repeat", async () => {
        eventsLogger.info("Event handle", "player-control-toggle-repeat");
        return await playerControl.toggleRepeat();
    });

    electron_1.ipcMain.handle("player-control-set-repeat", async (event, mode) => {
        eventsLogger.info("Event handle", "player-control-set-repeat", mode);
        return await playerControl.setRepeat(mode);
    });

    electron_1.ipcMain.handle("player-control-toggle-like", async () => {
        eventsLogger.info("Event handle", "player-control-toggle-like");
        return await playerControl.toggleLike();
    });

    electron_1.ipcMain.handle("player-control-like", async () => {
        eventsLogger.info("Event handle", "player-control-like");
        return await playerControl.likeTrack();
    });

    electron_1.ipcMain.handle("player-control-unlike", async () => {
        eventsLogger.info("Event handle", "player-control-unlike");
        return await playerControl.unlikeTrack();
    });

    electron_1.ipcMain.handle("player-control-dislike", async () => {
        eventsLogger.info("Event handle", "player-control-dislike");
        return await playerControl.dislikeTrack();
    });

    electron_1.ipcMain.handle("player-control-play-track", async (event, trackId, albumId) => {
        eventsLogger.info("Event handle", "player-control-play-track", trackId, albumId);
        return await playerControl.playTrack(trackId, albumId);
    });

    electron_1.ipcMain.handle("player-control-play-album", async (event, albumId) => {
        eventsLogger.info("Event handle", "player-control-play-album", albumId);
        return await playerControl.playAlbum(albumId);
    });

    electron_1.ipcMain.handle("player-control-play-playlist", async (event, uid, kind) => {
        eventsLogger.info("Event handle", "player-control-play-playlist", uid, kind);
        return await playerControl.playPlaylist(uid, kind);
    });
};
exports.handleApplicationEvents = handleApplicationEvents;
electron_1.ipcMain.handle('openConfigFile', async () => {
    return await electron_1.shell.openPath(electron_1.app.getPath('userData') + '/config.json');
});

electron_1.ipcMain.handle('setPathWithNativeDialog', async (event, key, defaultPath = undefined, properties = undefined) => {
    const { canceled, filePaths } = await electron_1.dialog.showOpenDialog({
        defaultPath: defaultPath,
        properties: properties,
    });
    if (canceled || !filePaths) return;

    store_js_1.set(key, filePaths[0]);
});

electron_1.ipcMain.handle('scrobble-login', () => {
    scrobbleManager_js_1.scrobblerManager.getScrobblers().forEach((scrobbler) => {
        scrobbler.login();
    });
});
electron_1.ipcMain.handle('scrobble-logout', () => {
    scrobbleManager_js_1.scrobblerManager.getScrobblers().forEach((scrobbler) => {
        scrobbler.logout();
    });
});
electron_1.ipcMain.handle('scrobble-lastfm-login', () => {
    scrobbleManager_js_1.scrobblerManager.getScrobblerByType('Last.fm').login();
});

electron_1.ipcMain.handle('scrobble-lastfm-logout', () => {
    scrobbleManager_js_1.scrobblerManager.getScrobblerByType('Last.fm').logout();
});

electron_1.ipcMain.handle('scrobble-lastfm-get-user', () => {
    return scrobbleManager_js_1.scrobblerManager.getScrobblerByType('Last.fm').api.getUserInfo();
});

electron_1.ipcMain.handle('scrobble-lastfm-get-current-playing-track', (event, user) => {
    return scrobbleManager_js_1.scrobblerManager.getScrobblerByType('Last.fm').api.getCurrentPlayingTrack(user);
});

const sendNativeStoreUpdate = (key, value, window = undefined) => {
    (window ?? mainWindow)?.webContents.send(events_js_1.Events.NATIVE_STORE_UPDATE, key, value);
    MiniPlayer.updateSettingsState(store_js_1.getModFeatures());
    if (window ?? mainWindow) {
        eventsLogger.info('Event send', events_js_1.Events.NATIVE_STORE_UPDATE, key, value);
    } else {
        eventsLogger.warn('Event not send, window is undefined', events_js_1.Events.NATIVE_STORE_UPDATE, key, value);
    }
};
exports.sendNativeStoreUpdate = sendNativeStoreUpdate;

const sendLastFmUserInfoUpdated = (window = mainWindow, userinfo) => {
    window.webContents.send(events_js_1.Events.LASTFM_USERINFO_UPDATE, userinfo);
    eventsLogger.info('Event sent', events_js_1.Events.LASTFM_USERINFO_UPDATE, userinfo);
};

exports.sendLastFmUserInfoUpdated = sendLastFmUserInfoUpdated;
const sendProbabilityBucket = (window, bucket) => {
    window.webContents.send(events_js_1.Events.PROBABILITY_BUCKET, bucket);
    eventsLogger.info('Event sent', events_js_1.Events.PROBABILITY_BUCKET, bucket);
};
exports.sendProbabilityBucket = sendProbabilityBucket;
const sendLoadReleaseNotes = ({ window, needToShowReleaseNotes, sortedDescReleaseNotesKeys, translationsReleaseNotes }) => {
    window.webContents.send(events_js_1.Events.LOAD_RELEASE_NOTES, {
        needToShowReleaseNotes,
        sortedDescReleaseNotesKeys,
        translationsReleaseNotes,
    });
    eventsLogger.info('Event sent', events_js_1.Events.LOAD_RELEASE_NOTES);
};
exports.sendLoadReleaseNotes = sendLoadReleaseNotes;
const sendUpdateAvailable = (window, version) => {
    window.webContents.send(events_js_1.Events.UPDATE_AVAILABLE, version);
    eventsLogger.info('Event sent', events_js_1.Events.UPDATE_AVAILABLE, version);
};
exports.sendUpdateAvailable = sendUpdateAvailable;
const sendModUpdateAvailable = (window, currVersion, newVersion) => {
    window.webContents.send(events_js_1.Events.MOD_UPDATE_AVAILABLE, currVersion, newVersion, Date.now());
    eventsLogger.info('Event sent', events_js_1.Events.MOD_UPDATE_AVAILABLE, currVersion, newVersion);
};
exports.sendModUpdateAvailable = sendModUpdateAvailable;
const sendBasicToastCreate = (window, toastID, message, dismissable) => {
    window.webContents.send(events_js_1.Events.BASIC_TOAST_CREATE, toastID, message, dismissable, Date.now());
    eventsLogger.info('Event sent', events_js_1.Events.BASIC_TOAST_CREATE, toastID, message);
};
const sendBasicToastDismiss = (window, toastID) => {
    window.webContents.send(events_js_1.Events.BASIC_TOAST_DISMISS, toastID, Date.now());
    eventsLogger.info('Event sent', events_js_1.Events.BASIC_TOAST_DISMISS, toastID);
};
const sendProgressBarChange = (window, elementType, progress, statusLabel) => {
    window.webContents.send(events_js_1.Events.PROGRESS_BAR_CHANGE, elementType, progress, Date.now(), statusLabel);
    eventsLogger.info('Event sent', events_js_1.Events.PROGRESS_BAR_CHANGE, elementType, progress);
};
exports.sendProgressBarChange = sendProgressBarChange;
const sendShowReleaseNotes = (window) => {
    window.webContents.send(events_js_1.Events.SHOW_RELEASE_NOTES);
    eventsLogger.info('Event sent', events_js_1.Events.SHOW_RELEASE_NOTES);
};
exports.sendShowReleaseNotes = sendShowReleaseNotes;
const sendRefreshApplicationData = (window) => {
    window.webContents.send(events_js_1.Events.REFRESH_APPLICATION_DATA);
    eventsLogger.info('Event sent', events_js_1.Events.REFRESH_APPLICATION_DATA);
};
exports.sendRefreshApplicationData = sendRefreshApplicationData;
const sendPlayerAction = (window, action, value) => {
    window.webContents.send(events_js_1.Events.PLAYER_ACTION, action, value, Date.now());
    eventsLogger.info('Event sent', events_js_1.Events.PLAYER_ACTION, action, value, Date.now());
};
exports.sendPlayerAction = sendPlayerAction;
const sendOpenDeeplink = (window, pathname) => {
    window.webContents.send(events_js_1.Events.OPEN_DEEPLINK, pathname);
    eventsLogger.info('Event sent', events_js_1.Events.OPEN_DEEPLINK);
};
exports.sendOpenDeeplink = sendOpenDeeplink;
const sendAnalyticsOnFirstLaunch = (window) => {
    window.webContents.send(events_js_1.Events.FIRST_LAUNCH);
    eventsLogger.info('Event send', events_js_1.Events.FIRST_LAUNCH);
};
exports.sendAnalyticsOnFirstLaunch = sendAnalyticsOnFirstLaunch;
const sendRefreshTracksAvailability = (window) => {
    window.webContents.send(events_js_1.Events.REFRESH_TRACKS_AVAILABILITY);
    eventsLogger.info('Event sent', events_js_1.Events.REFRESH_TRACKS_AVAILABILITY);
};
exports.sendRefreshTracksAvailability = sendRefreshTracksAvailability;
const sendRefreshRepositoryMeta = (window) => {
    window.webContents.send(events_js_1.Events.REFRESH_REPOSITORY_META);
    eventsLogger.info('Event send', events_js_1.Events.REFRESH_REPOSITORY_META);
};
exports.sendRefreshRepositoryMeta = sendRefreshRepositoryMeta;

const zoomIn = () => {
    eventsLogger.info('Event handle', 'zoom-in');
    return (mainWindow.webContents.zoomFactor = Math.min(mainWindow.webContents.zoomFactor + 0.05, 2.0));
};

exports.zoomIn = zoomIn;

const zoomOut = () => {
    eventsLogger.info('Event handle', 'zoom-out');
    return (mainWindow.webContents.zoomFactor = Math.max(mainWindow.webContents.zoomFactor - 0.05, 0.75));
};
exports.zoomOut = zoomOut;

const resetZoom = () => {
    eventsLogger.info('Event handle', 'reset-zoom');
    return (mainWindow.webContents.zoomFactor = 1.0);
};

exports.resetZoom = resetZoom;

const getZoomLevel = () => {
    eventsLogger.info('Event handle', 'get-zoom-level');
    return mainWindow.webContents.zoomFactor;
};

exports.getZoomLevel = getZoomLevel;

const setZoomLevel = (event, level) => {
    eventsLogger.info('Event handle', 'set-zoom-level', level);
    return (mainWindow.webContents.zoomFactor = Math.min(Math.max(level ?? 1.0, 0.75), 2.0));
};

exports.setZoomLevel = setZoomLevel;

electron_1.ipcMain.handle('zoom-in', zoomIn);
electron_1.ipcMain.handle('zoom-out', zoomOut);
electron_1.ipcMain.handle('reset-zoom', resetZoom);
electron_1.ipcMain.handle('get-zoom-level', getZoomLevel);
electron_1.ipcMain.handle('set-zoom-level', setZoomLevel);

MiniPlayer.onPlayerAction((action, value) => {
    sendPlayerAction(mainWindow, action, value);
});
