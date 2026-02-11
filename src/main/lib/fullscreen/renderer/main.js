"use strict";

function getMainCode() {
  return `
    const FullscreenManager = {
      container: null,
      isActive: false,
      mode: 'enhanced',
      originalFullscreenButtons: [],
      
      init() {
        console.log('[Fullscreen] Initializing manager...');
        
        const styleEl = document.createElement('style');
        styleEl.textContent = FULLSCREEN_STYLES;
        document.head.appendChild(styleEl);
        
        this.container = FullscreenUI.createContainer();
        document.body.appendChild(this.container);
        
        this.waitForSettings();
        
        this.interceptFullscreenButtons();
        
        console.log('[Fullscreen] Manager initialized');
      },
      
      waitForSettings() {
        const checkSettings = () => {
          if (window.nativeSettings) {
            this.updateMode();
            this.watchSettings();
          } else {
            setTimeout(checkSettings, 500);
          }
        };
        checkSettings();
      },
      
      watchSettings() {
        let lastStyle = window.nativeSettings.get('modFeatures.fullscreenPlayerStyle');
        
        setInterval(() => {
          const currentStyle = window.nativeSettings.get('modFeatures.fullscreenPlayerStyle');
          
          if (currentStyle !== lastStyle) {
            lastStyle = currentStyle;
            this.updateMode();
            
            if (this.isActive) {
              this.deactivate();
              setTimeout(() => this.activate(), 100);
            }
          }
        }, 1000);
      },
      
      reloadSettings() {
        if (!this.isActive) return;
        
        console.log('[Fullscreen] Reloading settings...');
        
        this.applySettings();
        
        if (FullscreenControls.currentCoverUrl) {
          FullscreenControls.updateBackground(FullscreenControls.currentCoverUrl);
        }
      },
      
      getSettingsHash() {
        if (!this.mode || !window.nativeSettings) return '';
        
        const settings = [
          'showIcons', 'progressBarDisplay', 'playerControls', 'extraControls',
          'showAlbum', 'contextDisplay', 'volumeDisplay', 'backgroundChoice',
          'useBackgroundVideo', 'staticBackColor', 'backgroundBlur', 'backgroundBrightness',
          'invertColors'
        ];
        
        return settings.map(key => {
          const fullKey = \`modFeatures.fullscreen.\${this.mode}.\${key}\`;
          return window.nativeSettings.get(fullKey);
        }).join('|');
      },
      
      updateMode() {
        const style = window.nativeSettings?.get('modFeatures.fullscreenPlayerStyle') || 'default';
        
        if (style === 'tv') {
          this.mode = 'tv';
        } else if (style === 'enhanced') {
          this.mode = 'enhanced';
        } else {
          this.mode = null;
        }
        
        console.log('[Fullscreen] Mode updated:', this.mode);
      },
      
      interceptFullscreenButtons() {
        const interceptClick = (e) => {
          const target = e.target.closest('[data-test-id="FULLSCREEN_PLAYER_BUTTON"], [data-test-id="PLAYERBAR_DESKTOP_SYNC_LYRICS_BUTTON"]');
          
          if (target && this.mode) {
            e.preventDefault();
            e.stopPropagation();
            
            const showLyrics = target.getAttribute('data-test-id') === 'PLAYERBAR_DESKTOP_SYNC_LYRICS_BUTTON';
            
            this.activate(showLyrics);
          }
        };
        
        document.addEventListener('click', interceptClick, true);
        
        let clickCount = 0;
        let clickTimer = null;
        
        const handlePlayerBarDoubleClick = (e) => {
          if (!this.mode || this.isActive) return;
          
          const playerBar = e.target.closest('[data-test-id="PLAYERBAR_DESKTOP"]');
          if (!playerBar) return;
          
          const isClickable = e.target.closest('button, a, input, [role="button"], [role="slider"], [class*="CoverStack"], [class*="TrackInfo"]');
          if (isClickable) return;
          
          clickCount++;
          
          if (clickCount === 1) {
            clickTimer = setTimeout(() => clickCount = 0, 300);
          } else if (clickCount === 2) {
            clearTimeout(clickTimer);
            clickCount = 0;
            
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            
            const trackModalCloseButton = document.querySelector('[data-test-id="TRACK_PAGE_CLOSE_BUTTON"]');
            if (trackModalCloseButton) {
              trackModalCloseButton.click();
            }
            
            this.activate();
          }
        };
        
        document.addEventListener('click', handlePlayerBarDoubleClick, true);
      },
      
      activate(showLyrics = false) {
        if (this.isActive || !this.mode) return;
        
        console.log('[Fullscreen] Activating...', this.mode);
        
        this.container.className = 'active ' + this.mode + '-mode';
        
        this.applySettings();
        
        this.container.innerHTML = FullscreenUI.createHTML(this.mode);
        
        FullscreenControls.init(this.container, this.settings);
        
        this.setupMouseMoveHandlers();

        if (typeof LyricsModule !== 'undefined') {
          LyricsModule.init();

          if (showLyrics) {
            const currentState = LyricsModule.getState();
            if (!currentState.isVisible) {
              LyricsModule.toggleVisibility();
            }
          }
          
          const lyricsState = LyricsModule.getState();
          if (lyricsState.isVisible) {
            this.container.classList.add('lyrics-visible', 'lyrics-active');
          }
        }

        FullscreenControls.updateTrackInfo();
        
        setTimeout(() => {
          FullscreenControls.updateShuffleButton();
          FullscreenControls.updateRepeatButton();
          FullscreenControls.updateLikeButton();
        }, 100);
        
        this.isActive = true;
        
        document.body.style.overflow = 'hidden';
        
        window.reloadFullscreenSettings = () => this.reloadSettings();
      },
      
      applySettings() {
        if (!this.mode || !window.nativeSettings) return;
        
        const getSetting = (key, defaultValue) => {
          const fullKey = \`modFeatures.fullscreen.\${this.mode}.\${key}\`;
          const value = window.nativeSettings.get(fullKey);
          return value !== undefined ? value : defaultValue;
        };
        
        const defaults = {
          enhanced: {
            showIcons: false,
            progressBarDisplay: 'always',
            playerControls: 'always',
            extraControls: 'always',
            showAlbum: 'date',
            contextDisplay: 'mousemove',
            volumeDisplay: 'smart',
            backgroundChoice: 'album_art',
            useBackgroundVideo: true,
            staticBackColor: '#000000',
            backgroundBlur: 32,
            backgroundBrightness: 70,
            themedButtons: true,
            themedIcons: false,
            invertColors: 'never'
          },
          tv: {
            showIcons: true,
            progressBarDisplay: 'never',
            playerControls: 'never',
            extraControls: 'never',
            showAlbum: 'date',
            contextDisplay: 'always',
            volumeDisplay: 'smart',
            backgroundChoice: 'artist_art',
            useBackgroundVideo: true,
            staticBackColor: '#000000',
            backgroundBlur: 0,
            backgroundBrightness: 40,
            themedButtons: true,
            themedIcons: true,
            invertColors: 'never'
          }
        };
        
        const modeDefaults = defaults[this.mode] || defaults.enhanced;
        
        const showIcons = getSetting('showIcons', modeDefaults.showIcons);
        const progressBarDisplay = getSetting('progressBarDisplay', modeDefaults.progressBarDisplay);
        const playerControls = getSetting('playerControls', modeDefaults.playerControls);
        const extraControls = getSetting('extraControls', modeDefaults.extraControls);
        const showAlbum = getSetting('showAlbum', modeDefaults.showAlbum);
        const contextDisplay = getSetting('contextDisplay', modeDefaults.contextDisplay);
        const volumeDisplay = getSetting('volumeDisplay', modeDefaults.volumeDisplay);
        const backgroundChoice = getSetting('backgroundChoice', modeDefaults.backgroundChoice);
        const useBackgroundVideo = getSetting('useBackgroundVideo', modeDefaults.useBackgroundVideo);
        const staticBackColor = getSetting('staticBackColor', modeDefaults.staticBackColor);
        const backgroundBlur = getSetting('backgroundBlur', modeDefaults.backgroundBlur);
        const backgroundBrightness = getSetting('backgroundBrightness', modeDefaults.backgroundBrightness);
        const invertColors = getSetting('invertColors', modeDefaults.invertColors);
        
        this.container.classList.toggle('hide-icons', !showIcons);
        this.container.classList.toggle('hide-progress-bar', progressBarDisplay === 'never');
        this.container.classList.toggle('hide-player-controls', playerControls === 'never');
        this.container.classList.toggle('hide-extra-controls', extraControls === 'never');
        this.container.classList.toggle('hide-album', showAlbum === 'never');
        this.container.classList.toggle('show-album-date', showAlbum === 'date');
        this.container.classList.toggle('hide-context', contextDisplay === 'never');
        this.container.classList.toggle('hide-volume', volumeDisplay === 'never');
        this.container.classList.toggle('invert-colors-always', invertColors === 'always');
        this.container.classList.toggle('invert-colors-auto', invertColors === 'auto');
        
        this.container.style.setProperty('--background-blur', backgroundBlur + 'px');
        this.container.style.setProperty('--background-brightness', backgroundBrightness + '%');
        this.container.style.setProperty('--background-choice', backgroundChoice);
        
        this.settings = {
          contextDisplay,
          playerControls,
          extraControls,
          progressBarDisplay,
          volumeDisplay,
          showAlbum,
          backgroundChoice,
          useBackgroundVideo,
          staticBackColor
        };
        
        console.log('[Fullscreen] Settings applied:', {
          showIcons, progressBarDisplay, playerControls, extraControls,
          showAlbum, contextDisplay, volumeDisplay, backgroundChoice, useBackgroundVideo,
          backgroundBlur, backgroundBrightness, invertColors
        });
      },
      
      setupMouseMoveHandlers() {
        if (this.mouseMoveHandler) {
          this.container.removeEventListener('mousemove', this.mouseMoveHandler);
        }
        
        if (this.contextTimer) clearTimeout(this.contextTimer);
        if (this.controlsTimer) clearTimeout(this.controlsTimer);
        if (this.extraControlsTimer) clearTimeout(this.extraControlsTimer);
        if (this.progressTimer) clearTimeout(this.progressTimer);
        
        this.mouseMoveHandler = () => {
          const settings = this.settings || {};
          
          if (settings.contextDisplay === 'mousemove') {
            const ctxContainer = this.container.querySelector('#fsd-ctx-container');
            if (ctxContainer) {
              ctxContainer.style.opacity = '1';
              if (this.contextTimer) clearTimeout(this.contextTimer);
              this.contextTimer = setTimeout(() => {
                ctxContainer.style.opacity = '0';
              }, 3000);
            }
          }
          
          if (settings.playerControls === 'mousemove') {
            const controls = this.container.querySelectorAll('.fsd-controls-center');
            controls.forEach(el => {
              el.style.opacity = '1';
            });
            if (this.controlsTimer) clearTimeout(this.controlsTimer);
            this.controlsTimer = setTimeout(() => {
              controls.forEach(el => {
                el.style.opacity = '0';
              });
            }, 3000);
          }
          
          if (settings.extraControls === 'mousemove') {
            const extraControls = this.container.querySelectorAll('.extra-controls');
            extraControls.forEach(el => {
              el.style.opacity = '1';
            });
            if (this.extraControlsTimer) clearTimeout(this.extraControlsTimer);
            this.extraControlsTimer = setTimeout(() => {
              extraControls.forEach(el => {
                el.style.opacity = '0';
              });
            }, 3000);
          }
          
          if (settings.progressBarDisplay === 'mousemove') {
            const progressContainer = this.container.querySelector('#fsd-progress-container');
            if (progressContainer) {
              progressContainer.style.opacity = '1';
              if (this.progressTimer) clearTimeout(this.progressTimer);
              this.progressTimer = setTimeout(() => {
                progressContainer.style.opacity = '0';
              }, 3000);
            }
          }
        };
        
        this.container.addEventListener('mousemove', this.mouseMoveHandler);
        
        this.mouseMoveHandler();
      },
      
      deactivate() {
        if (!this.isActive) return;
        
        console.log('[Fullscreen] Deactivating...');
        
        FullscreenControls.cleanup();

        if (typeof LyricsModule !== 'undefined') {
          LyricsModule.cleanup();
        }
        
        this.container.classList.remove('active');
        
        document.body.style.overflow = '';
        
        this.isActive = false;
      }
    };
    
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        FullscreenManager.init();
      });
    } else {
      FullscreenManager.init();
    }
  `;
}

exports.getMainCode = getMainCode;
