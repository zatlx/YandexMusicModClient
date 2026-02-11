"use strict";

function getControlsCode() {
  return `
    const FullscreenControls = {
      container: null,
      canvas: null,
      coverImg: null,
      currentCoverUrl: null,
      previousBackgroundImg: null,
      previousBackgroundParams: null,
      progressBar: null,
      progressFill: null,
      currentTimeEl: null,
      totalTimeEl: null,
      playBtn: null,
      isPlaying: false,
      currentTrack: null,
      currentProgress: 0,
      progressUpdateInterval: null,
      imageCache: new Map(),
      MAX_CACHED_IMAGES: 10,
      videoCache: new Map(),
      MAX_CACHED_VIDEOS: 3,
      hasPreloadedNext: false,
      isTransitioning: false,
      
      init(container, settings) {
        this.container = container;
        this.settings = settings || {};
        this.canvas = container.querySelector('#fsd-background');
        this.coverArtEl = container.querySelector('#fsd-art-image');
        this.progressBar = container.querySelector('#fsd-progress-bar');
        this.progressFill = container.querySelector('#fsd-progress-bar-inner');
        this.progressThumb = container.querySelector('#progress-thumb');
        this.currentTimeEl = container.querySelector('#fsd-elapsed');
        this.totalTimeEl = container.querySelector('#fsd-duration');
        this.playBtn = container.querySelector('#fsd-play');
        this.playingIcon = container.querySelector('#playing-icon');
        this.pausedIcon = container.querySelector('#paused-icon');
        
        this.volumeContainer = container.querySelector('#fsd-volume-container');
        this.volumeBar = container.querySelector('#fsd-volume-bar');
        this.volumeFill = container.querySelector('#fsd-volume-bar-inner');
        this.volumeThumb = container.querySelector('#volume-thumb');
        this.volumeText = container.querySelector('#fsd-volume');
        this.volumeIcon = container.querySelector('#fsd-volume-icon');
        this.volumeTimer = null;
        this.isVolumeChanging = false;
        this.isMuted = false;
        this.volumeBeforeMute = 1.0;
        this.isDraggingProgress = false;
        this.hasLoadedBackground = false;
        this.isFallbackBackground = false;
        this.lyricsInitialized = false;
        
        this.eventHandlers = {
          keydown: null,
          mousemove: null,
          mouseup: null,
          documentMousemove: null,
          documentMouseup: null
        };
        
        this.coverImg = new Image();
        this.coverImg.crossOrigin = 'anonymous';
        
        this.attachEventListeners();
        this.startProgressUpdate();
        this.updateVolume();
        this.hideVolumeBar(3000);
      },
      
      fadeAnimation(element, animClass = 'fade-do') {
        element.classList.remove('fade-do', 'fade-up', 'fade-ri', 'fade-le');
        void element.offsetWidth;
        element.classList.add(animClass);
      },
      
      attachEventListeners() {
        this.playBtn.addEventListener('click', () => {
          this.fadeAnimation(this.playBtn);
          this.isPlaying = !this.isPlaying;
          this.updatePlayButton(false);
          window.desktopEvents.send('fs-toggle-play');
        });
        
        const prevBtn = this.container.querySelector('#fsd-back');
        prevBtn.addEventListener('click', () => {
          if (this.isTransitioning) return;
          this.fadeAnimation(prevBtn, 'fade-le');
          window.desktopEvents.send('fs-previous');
        });
        
        const nextBtn = this.container.querySelector('#fsd-next');
        nextBtn.addEventListener('click', () => {
          if (this.isTransitioning) return;
          this.fadeAnimation(nextBtn, 'fade-ri');
          window.desktopEvents.send('fs-next');
        });
        
        let isDragging = false;
        let dragStartX = 0;
        let lastSeekTime = 0;
        
        const handleProgressSeek = (e) => {
          const rect = this.progressBar.getBoundingClientRect();
          const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          const duration = this.currentTrack?.durationMs / 1000 || 0;
          
          this.progressFill.style.width = (percent * 100) + '%';
          this.currentTimeEl.textContent = this.formatTime(duration * percent);
          
          return duration * percent;
        };
        
        let seekThrottleTimeout = null;
        const throttledSeek = (seekTime) => {
          const now = Date.now();
          if (now - lastSeekTime >= 300) {
            lastSeekTime = now;
            window.desktopEvents.send('fs-seek', seekTime);
          } else {
            if (seekThrottleTimeout) clearTimeout(seekThrottleTimeout);
            seekThrottleTimeout = setTimeout(() => {
              lastSeekTime = Date.now();
              window.desktopEvents.send('fs-seek', seekTime);
            }, 300 - (now - lastSeekTime));
          }
        };
        
        this.progressBar.addEventListener('mousedown', (e) => {
          if (e.button === 0) {
            isDragging = true;
            this.isDraggingProgress = true;
            dragStartX = e.clientX;
            this.progressBar.classList.add('dragging');
            const seekTime = handleProgressSeek(e);
            lastSeekTime = Date.now();
            window.desktopEvents.send('fs-seek', seekTime);
          }
        });
        
        this.eventHandlers.documentMousemove = (e) => {
          if (isDragging) {
            const seekTime = handleProgressSeek(e);
            throttledSeek(seekTime);
          }
          
          if (this.isVolumeChanging && volumeDragData) {
            const volume = handleVolumeChange(e);
            debouncedSetVolume(volume);
          }
          
          if (e.clientY / window.innerHeight > 0.2 &&
              e.clientY / window.innerHeight < 0.75 &&
              e.clientX / window.innerWidth < 0.15) {
            this.hideVolumeBar(2000);
          }
        };
        
        this.eventHandlers.documentMouseup = (e) => {
          if (isDragging && e.button === 0) {
            isDragging = false;
            this.isDraggingProgress = false;
            this.progressBar.classList.remove('dragging');
            const seekTime = handleProgressSeek(e);
            if (seekThrottleTimeout) clearTimeout(seekThrottleTimeout);
            window.desktopEvents.send('fs-seek', seekTime);
          }
          
          if (this.isVolumeChanging && e.button === 0) {
            this.isVolumeChanging = false;
            this.volumeBar.classList.remove('dragging');
            this.volumeContainer.classList.remove('dragging');
            
            const volume = handleVolumeChange(e);
            window.desktopEvents.send('fs-set-volume', volume);
            
            volumeDragData = null;
          }
        };
        
        document.addEventListener('mousemove', this.eventHandlers.documentMousemove);
        document.addEventListener('mouseup', this.eventHandlers.documentMouseup);
        
        this.progressBar.addEventListener('click', (e) => {
          if (Math.abs(e.clientX - dragStartX) < 5) {
            const seekTime = handleProgressSeek(e);
            window.desktopEvents.send('fs-seek', seekTime);
          }
        });
        
        const shuffleBtn = this.container.querySelector('#fsd-shuffle');
        shuffleBtn.addEventListener('click', () => {
          this.fadeAnimation(shuffleBtn);
          const isActive = shuffleBtn.classList.contains('button-active');
          shuffleBtn.classList.toggle('button-active', !isActive);
          shuffleBtn.classList.toggle('dot-after', !isActive);
          window.desktopEvents.send('fs-toggle-shuffle');
          setTimeout(() => this.updateShuffleButton(false), 300);
        });
        
        const repeatBtn = this.container.querySelector('#fsd-repeat');
        repeatBtn.addEventListener('click', () => {
          this.fadeAnimation(repeatBtn);
          window.desktopEvents.send('fs-toggle-repeat');
          setTimeout(() => this.updateRepeatButton(false), 300);
        });
        
        const likeBtn = this.container.querySelector('#fsd-heart');
        likeBtn.addEventListener('click', () => {
          this.fadeAnimation(likeBtn);
          this.toggleLike();
        });
        
        const lyricsBtn = this.container.querySelector('#fsd-lyrics');
        if (lyricsBtn) {
          lyricsBtn.addEventListener('click', () => {
            this.fadeAnimation(lyricsBtn);
            this.toggleLyrics();
          });
        }
        
        this.container.querySelector('#ym-fs-exit').addEventListener('click', () => {
          FullscreenManager.deactivate();
        });
        
        this.eventHandlers.keydown = (e) => {
          if (!this.container.classList.contains('active')) return;
          
          switch(e.key) {
            case 'Escape':
              FullscreenManager.deactivate();
              break;
            case ' ':
              e.preventDefault();
              e.stopPropagation();
              this.fadeAnimation(this.playBtn);
              this.isPlaying = !this.isPlaying;
              this.updatePlayButton(false);
              window.desktopEvents.send('fs-toggle-play');
              break;
            case 'ArrowLeft':
              e.preventDefault();
              e.stopPropagation();
              if (this.isTransitioning) break;
              this.fadeAnimation(prevBtn, 'fade-le');
              window.desktopEvents.send('fs-previous');
              break;
            case 'ArrowRight':
              e.preventDefault();
              e.stopPropagation();
              if (this.isTransitioning) break;
              this.fadeAnimation(nextBtn, 'fade-ri');
              window.desktopEvents.send('fs-next');
              break;
            case 'l':
            case 'L':
              this.toggleLyrics();
              break;
          }
        };
        
        document.addEventListener('keydown', this.eventHandlers.keydown);
        
        let cursorTimeout;
        const hideCursor = () => {
          if (cursorTimeout) clearTimeout(cursorTimeout);
          this.container.classList.remove('hide-cursor');
          cursorTimeout = setTimeout(() => {
            this.container.classList.add('hide-cursor');
          }, 2000);
        };
        
        this.container.addEventListener('mousemove', hideCursor);
        hideCursor();
        
        let volumeDragData = null;
        
        const handleVolumeChange = (e) => {
          const rect = this.volumeBar.getBoundingClientRect();
          const sliderHeight = rect.height;
          
          let positionFromBottom;
          if (volumeDragData) {
            const moveY = volumeDragData.beginClient - e.clientY;
            const newPosY = Math.min(Math.max(volumeDragData.begin + moveY, 0), sliderHeight);
            positionFromBottom = newPosY;
          } else {
            positionFromBottom = rect.bottom - e.clientY;
          }
          
          const percent = Math.max(0, Math.min(1, positionFromBottom / sliderHeight));
          
          this.volumeFill.style.height = (percent * 100) + '%';
          this.volumeText.textContent = Math.round(percent * 100) + '%';
          this.updateVolumeIcon(percent);
          
          return percent;
        };
        
        let volumeDebounceTimeout = null;
        const debouncedSetVolume = (volume) => {
          if (volumeDebounceTimeout) clearTimeout(volumeDebounceTimeout);
          volumeDebounceTimeout = setTimeout(() => {
            window.desktopEvents.send('fs-set-volume', volume);
          }, 20);
        };
        
        this.volumeBar.addEventListener('mousedown', (e) => {
          if (e.button === 0) {
            this.isVolumeChanging = true;
            this.volumeBar.classList.add('dragging');
            this.volumeContainer.classList.add('dragging');
            
            const rect = this.volumeBar.getBoundingClientRect();
            const sliderHeight = rect.height;
            const positionFromBottom = rect.bottom - e.clientY;
            
            volumeDragData = {
              begin: positionFromBottom,
              positionCoord: positionFromBottom,
              beginClient: e.clientY,
              sliderDimen: sliderHeight
            };
            
            const volume = handleVolumeChange(e);
            debouncedSetVolume(volume);
          }
        });
        

        
        this.volumeIcon.addEventListener('click', () => {
          this.fadeAnimation(this.volumeIcon);
          
          if (!this.isMuted) {
            const currentVolume = parseFloat(this.volumeFill.style.height) / 100 || 0;
            if (currentVolume > 0) {
              this.volumeBeforeMute = currentVolume;
            }
            this.isMuted = true;
            this.volumeFill.style.height = '0%';
            this.volumeText.textContent = '0%';
            this.updateVolumeIcon(0);
            window.desktopEvents.send('fs-toggle-mute');
          } else {
            this.isMuted = false;
            const restoreVolume = this.volumeBeforeMute;
            this.volumeFill.style.height = (restoreVolume * 100) + '%';
            this.volumeText.textContent = Math.round(restoreVolume * 100) + '%';
            this.updateVolumeIcon(restoreVolume);
            window.desktopEvents.send('fs-toggle-mute');
          }
        });
        
        this.volumeContainer.addEventListener('wheel', (e) => {
          e.preventDefault();
          
          const currentVolume = parseFloat(this.volumeFill.style.height) / 100 || 0;
          const delta = e.deltaY > 0 ? -0.05 : 0.05;
          const newVolume = Math.max(0, Math.min(1, currentVolume + delta));
          
          this.volumeFill.style.height = (newVolume * 100) + '%';
          this.volumeText.textContent = Math.round(newVolume * 100) + '%';
          this.updateVolumeIcon(newVolume);
          
          if (this.isMuted && newVolume > 0) {
            this.isMuted = false;
          }
          
          debouncedSetVolume(newVolume);
          this.hideVolumeBar(2000);
        });
      },
      
      hideVolumeBar(timeout = 2000) {
        if (this.volumeTimer) clearTimeout(this.volumeTimer);
        this.volumeContainer.classList.remove('v-hidden');
        
        const volumeDisplay = this.settings?.volumeDisplay || 'smart';
        if (volumeDisplay === 'always') {
          return;
        }
        
        this.volumeTimer = setTimeout(() => {
          if (!this.isVolumeChanging) {
            this.volumeContainer.classList.add('v-hidden');
          }
        }, timeout);
      },
      
      updateVolumeIcon(volume) {
        if (volume === 0) {
          this.volumeIcon.innerHTML = '<svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor"><path d="M13.86 5.47a.75.75 0 00-1.061 0l-1.47 1.47-1.47-1.47A.75.75 0 008.8 6.53L10.269 8l-1.47 1.47a.75.75 0 101.06 1.06l1.47-1.47 1.47 1.47a.75.75 0 001.06-1.06L12.39 8l1.47-1.47a.75.75 0 000-1.06z"/><path d="M10.116 1.5A.75.75 0 008.991.85l-6.925 4a3.642 3.642 0 00-1.33 4.967 3.639 3.639 0 001.33 1.332l6.925 4a.75.75 0 001.125-.649v-1.906a4.73 4.73 0 01-1.5-.694v1.3L2.817 9.852a2.141 2.141 0 01-.781-2.92c.187-.324.456-.594.78-.782l5.8-3.35v1.3c.45-.313.956-.55 1.5-.694V1.5z"/></svg>';
        } else if (volume < 0.33) {
          this.volumeIcon.innerHTML = '<svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor"><path d="M9.741.85a.75.75 0 01.375.65v13a.75.75 0 01-1.125.65l-6.925-4a3.642 3.642 0 01-1.33-4.967 3.639 3.639 0 011.33-1.332l6.925-4a.75.75 0 01.75 0zm-6.924 5.3a2.139 2.139 0 000 3.7l5.8 3.35V2.8l-5.8 3.35zm8.683 4.29V5.56a2.75 2.75 0 010 4.88z"/></svg>';
        } else if (volume < 0.66) {
          this.volumeIcon.innerHTML = '<svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor"><path d="M9.741.85a.75.75 0 01.375.65v13a.75.75 0 01-1.125.65l-6.925-4a3.642 3.642 0 01-1.33-4.967 3.639 3.639 0 011.33-1.332l6.925-4a.75.75 0 01.75 0zm-6.924 5.3a2.139 2.139 0 000 3.7l5.8 3.35V2.8l-5.8 3.35zm8.683 4.29V5.56a2.75 2.75 0 010 4.88z"/><path d="M11.5 13.614a5.752 5.752 0 000-11.228v1.55a4.252 4.252 0 010 8.127v1.55z"/></svg>';
        } else {
          this.volumeIcon.innerHTML = '<svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor"><path d="M9.741.85a.75.75 0 01.375.65v13a.75.75 0 01-1.125.65l-6.925-4a3.642 3.642 0 01-1.33-4.967 3.639 3.639 0 011.33-1.332l6.925-4a.75.75 0 01.75 0zm-6.924 5.3a2.139 2.139 0 000 3.7l5.8 3.35V2.8l-5.8 3.35zm8.683 4.29V5.56a2.75 2.75 0 010 4.88z"/><path d="M11.5 13.614a5.752 5.752 0 000-11.228v1.55a4.252 4.252 0 010 8.127v1.55z"/></svg>';
        }
      },
      
      async updateTrackInfo() {
        try {
          const state = await window.desktopEvents.invoke('fs-get-player-state');
          
          if (!state || !state.track) return;
          
          const track = state.track;
          
          const trackChanged = !this.currentTrack || this.currentTrack.id !== track.id;
          
          this.currentTrack = track;
          this.isPlaying = state.playback?.isPlaying || false;
          
          const titleEl = this.container.querySelector('#fsd-title span');
          titleEl.textContent = track.title || '';
          titleEl.style.cursor = 'pointer';
          titleEl.onclick = () => {
            if (track.id) {
              const album = track.albums?.[0];
              if (album?.id) {
                window.desktopEvents.send('fs-navigate', \`/album/track?albumId=\${album.id}&trackId=\${track.id}\`);
                FullscreenManager.deactivate();
              }
            }
          };
          
          const artistEl = this.container.querySelector('#fsd-artist .fsd-artist-list');
          if (track.artists && track.artists.length > 0) {
            artistEl.innerHTML = track.artists.map(artist => 
              \`<span class="artist-link" data-id="\${artist.id}" style="cursor: pointer;">\${artist.name}</span>\`
            ).join(', ');
            
            artistEl.querySelectorAll('.artist-link').forEach(link => {
              link.onclick = () => {
                const artistId = link.getAttribute('data-id');
                if (artistId) {
                  window.desktopEvents.send('fs-navigate', \`/artist?artistId=\${artistId}\`);
                  FullscreenManager.deactivate();
                }
              };
            });
          } else {
            artistEl.textContent = '';
          }
          
          const album = track.albums?.[0];
          let albumText = album?.title || '';
          const showAlbum = this.settings?.showAlbum || 'date';
          if (showAlbum === 'date') {
            if (album?.releaseDate) {
              const date = new Date(album.releaseDate);
              const months = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
              const month = months[date.getMonth()];
              const year = date.getFullYear();
              albumText += \` · \${month} \${year}\`;
            } else if (album?.year) {
              albumText += ' · ' + album.year;
            }
          }
          const albumEl = this.container.querySelector('#fsd-album span');
          albumEl.textContent = albumText;
          if (album?.id) {
            albumEl.style.cursor = 'pointer';
            albumEl.onclick = () => {
              window.desktopEvents.send('fs-navigate', \`/album/track?albumId=\${album.id}&trackId=\${track.id}\`);
              FullscreenManager.deactivate();
            };
          }
          
          if (track.coverUri) {
            const coverUrl = 'https://' + track.coverUri.replace('%%', 'orig');
            
            if (trackChanged) {
              this.coverArtEl.style.opacity = '0.7';
            }
            
            this.coverImg.onload = () => {
              this.coverArtEl.style.backgroundImage = \`url("\${coverUrl}")\`;
              this.coverArtEl.style.opacity = '1';
            };
            
            if (this.coverImg.complete && this.coverImg.src === coverUrl) {
              this.coverArtEl.style.backgroundImage = \`url("\${coverUrl}")\`;
              this.coverArtEl.style.opacity = '1';
            }
            
            this.coverImg.src = coverUrl;
            this.currentCoverUrl = coverUrl;
            
            const isFirstLoad = !this.hasLoadedBackground;
            if (trackChanged || isFirstLoad) {
              this.hasLoadedBackground = true;
              this.hasPreloadedNext = false;
              this.isTransitioning = true;
              
              await this.updateBackgroundForTrack(track);
              
              setTimeout(() => {
                this.isTransitioning = false;
              }, 500);
              
              setTimeout(() => {
                this.prefetchNextTrack();
              }, 1000);
            }
          }
          
          this.updatePlayButton(false);
          
          const duration = track.durationMs / 1000;
          this.totalTimeEl.textContent = this.formatTime(duration);
          
          this.updateShuffleButton();
          this.updateRepeatButton();
          this.updateLikeButton();

          if (trackChanged || !this.lyricsInitialized) {
            await this.loadLyrics(track.id);
            this.lyricsInitialized = true;
          }
          
          await this.updateContext(state);
          
        } catch (error) {
          console.error('[Fullscreen] Failed to update track info:', error);
        }
      },
      
      async updateContext(state) {
        try {
          const context = state?.context;
          if (!context) return;
          
          const ctxContainer = this.container.querySelector('#fsd-ctx-container');
          const ctxIcon = this.container.querySelector('#fsd-ctx-icon');
          const ctxSource = this.container.querySelector('#fsd-ctx-source');
          const ctxName = this.container.querySelector('#fsd-ctx-name');
          
          if (!ctxContainer || !ctxIcon || !ctxSource || !ctxName) return;
          
          let icon = '';
          let sourceText = '';
          
          const contextName = context.name || '';
          
          console.log('[Fullscreen] Context:', context.type, 'Name:', contextName);
          
          switch (context.type) {
            case 'vibe':
              icon = \`<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.359 18.57C21.033 16.818 22 14.461 22 11.89s-.967-4.93-2.641-6.68c-.276-.292-.653-.26-.868-.023-.222.246-.176.591.085.868 1.466 1.535 2.272 3.593 2.272 5.835 0 2.241-.806 4.3-2.272 5.835-.261.268-.307.621-.085.86.215.245.592.276.868-.016zm-13.85.014c.222-.238.176-.59-.085-.86-1.474-1.535-2.272-3.593-2.272-5.834 0-2.242.798-4.3 2.272-5.835.261-.277.307-.622.085-.868-.215-.238-.592-.269-.868.023C2.967 6.96 2 9.318 2 11.89s.967 4.929 2.641 6.68c.276.29.653.26.868.014zm1.957-1.873c.223-.253.162-.583-.1-.867-.951-1.068-1.473-2.45-1.473-3.954 0-1.505.522-2.887 1.474-3.954.26-.284.322-.614.1-.876-.23-.26-.622-.26-.891.039-1.175 1.274-1.827 2.963-1.827 4.79 0 1.82.652 3.517 1.827 4.784.269.3.66.307.89.038zm9.958-.038c1.175-1.267 1.827-2.964 1.827-4.783 0-1.828-.652-3.517-1.827-4.791-.269-.3-.66-.3-.89-.039-.23.262-.162.592.092.876.96 1.067 1.481 2.449 1.481 3.954 0 1.504-.522 2.886-1.481 3.954-.254.284-.323.614-.092.867.23.269.621.261.89-.038zm-8.061-1.966c.23-.26.13-.568-.092-.883-.415-.522-.63-1.197-.63-1.934 0-.737.215-1.413.63-1.943.222-.307.322-.614.092-.875s-.653-.261-.906.054a4.385 4.385 0 00-.968 2.764 4.38 4.38 0 00.968 2.756c.253.322.675.322.906.061zm6.18-.061a4.38 4.38 0 00.968-2.756 4.385 4.385 0 00-.968-2.764c-.253-.315-.675-.315-.906-.054-.23.261-.138.568.092.875.415.53.63 1.206.63 1.943 0 .737-.215 1.412-.63 1.934-.23.315-.322.622-.092.883s.653.261.906-.061zm-3.547-.967c.96 0 1.789-.814 1.789-1.797s-.83-1.789-1.789-1.789c-.96 0-1.781.806-1.781 1.789 0 .983.821 1.797 1.781 1.797z" fill-rule="nonzero"/>
              </svg>\`;
              sourceText = 'Воспроизведение из Моей волны';
              break;
              
            case 'playlist':
              icon = \`<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9.732 19.241c1.077 0 2.688-.79 2.688-2.922V9.617c0-.388.074-.469.418-.542l3.347-.732a.48.48 0 00.403-.484V5.105c0-.388-.315-.637-.689-.563l-3.764.82c-.47.102-.725.359-.725.769l.014 8.144c.037.36-.132.594-.454.66l-1.164.241c-1.465.308-2.154 1.055-2.154 2.16 0 1.122.864 1.905 2.08 1.905z" fill-rule="nonzero"/>
              </svg>\`;
              sourceText = 'Воспроизведение из коллекции';
              break;
              
            case 'album':
              icon = \`<svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8z"/>
                <path d="M8 6.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM5 8a3 3 0 116 0 3 3 0 01-6 0z"/>
              </svg>\`;
              sourceText = 'Воспроизведение из альбома';
              break;
              
            case 'artist':
              icon = \`<svg width="48" height="48" viewBox="0 0 16 16" fill="currentColor">
                <path d="M6.233.371a4.388 4.388 0 015.002 1.052c.421.459.713.992.904 1.554.143.421.263 1.173.22 1.894-.078 1.322-.638 2.408-1.399 3.316l-.127.152a.75.75 0 00.201 1.13l2.209 1.275a4.75 4.75 0 012.375 4.114V16H.382v-1.143a4.75 4.75 0 012.375-4.113l2.209-1.275a.75.75 0 00.201-1.13l-.126-.152c-.761-.908-1.322-1.994-1.4-3.316-.043-.721.077-1.473.22-1.894a4.346 4.346 0 01.904-1.554c.411-.448.91-.807 1.468-1.052zM8 1.5a2.888 2.888 0 00-2.13.937 2.85 2.85 0 00-.588 1.022c-.077.226-.175.783-.143 1.323.054.921.44 1.712 1.051 2.442l.002.001.127.153a2.25 2.25 0 01-.603 3.39l-2.209 1.275A3.25 3.25 0 001.902 14.5h12.196a3.25 3.25 0 00-1.605-2.457l-2.209-1.275a2.25 2.25 0 01-.603-3.39l.127-.153.002-.001c.612-.73.997-1.52 1.052-2.442.032-.54-.067-1.097-.144-1.323a2.85 2.85 0 00-.588-1.022A2.888 2.888 0 008 1.5z"/>
              </svg>\`;
              sourceText = 'Воспроизведение со страницы исполнителя';
              break;
              
            default:
              icon = \`<svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor">
                <path d="M9.732 19.241c1.077 0 2.688-.79 2.688-2.922V9.617c0-.388.074-.469.418-.542l3.347-.732a.48.48 0 00.403-.484V5.105c0-.388-.315-.637-.689-.563l-3.764.82c-.47.102-.725.359-.725.769l.014 8.144c.037.36-.132.594-.454.66l-1.164.241c-1.465.308-2.154 1.055-2.154 2.16 0 1.122.864 1.905 2.08 1.905z"/>
              </svg>\`;
              sourceText = 'Воспроизведение';
          }
          
          ctxIcon.innerHTML = icon;
          ctxSource.textContent = sourceText;
          ctxName.textContent = contextName;
          
          if (!contextName) {
            ctxSource.classList.add('ctx-no-name');
            ctxName.style.display = 'none';
          } else {
            ctxSource.classList.remove('ctx-no-name');
            ctxName.style.display = '-webkit-box';
          }
          
          ctxName.style.cursor = 'pointer';
          ctxName.onclick = () => {
            let path = '';
            switch (context.type) {
              case 'album':
                const album = this.currentTrack?.albums?.[0];
                if (album?.id && this.currentTrack?.id) {
                  path = \`/album/track?albumId=\${album.id}&trackId=\${this.currentTrack.id}\`;
                }
                break;
              case 'artist':
                const artist = this.currentTrack?.artists?.[0];
                if (artist?.id) {
                  path = \`/artist?artistId=\${artist.id}\`;
                }
                break;
            }
            if (path) {
              window.desktopEvents.send('fs-navigate', path);
              FullscreenManager.deactivate();
            }
          };
          
        } catch (error) {
          console.error('[Fullscreen] Failed to update context:', error);
        }
      },
      
      updatePlayButton(animate = false) {
        const svg = this.isPlaying ? 
          '<path d="M2.7 1a.7.7 0 00-.7.7v12.6a.7.7 0 00.7.7h2.6a.7.7 0 00.7-.7V1.7a.7.7 0 00-.7-.7H2.7zm8 0a.7.7 0 00-.7.7v12.6a.7.7 0 00.7.7h2.6a.7.7 0 00.7-.7V1.7a.7.7 0 00-.7-.7h-2.6z"/>' :
          '<path d="M3 1.713a.7.7 0 011.05-.607l10.89 6.288a.7.7 0 010 1.212L4.05 14.894A.7.7 0 013 14.288V1.713z"/>';
        this.playBtn.querySelector('svg').innerHTML = svg;
        
        if (animate) {
          this.fadeAnimation(this.playBtn);
        }
        
        if (this.isPlaying) {
          this.pausedIcon.classList.add('hidden');
          this.playingIcon.classList.remove('hidden');
        } else {
          this.playingIcon.classList.add('hidden');
          this.pausedIcon.classList.remove('hidden');
        }
      },
      
      async updateVolume() {
        try {
          if (this.isVolumeChanging || this.isMuted) return;
          
          const state = await window.desktopEvents.invoke('fs-get-player-state');
          if (state && state.settings) {
            const volume = state.settings.volume || 0;
            const percent = Math.round(volume * 100);
            
            this.volumeFill.style.height = percent + '%';
            this.volumeText.textContent = percent + '%';
            this.updateVolumeIcon(volume);
            
            if (this.lastVolume !== undefined && this.lastVolume !== volume) {
              this.hideVolumeBar(2000);
            }
            this.lastVolume = volume;
          }
        } catch (error) {
        }
      },
      
      async updateProgress() {
        try {
          if (this.isDraggingProgress) return;
          
          const state = await window.desktopEvents.invoke('fs-get-player-state');
          
          if (state && state.playback) {
            const current = state.playback.progress || 0;
            const duration = state.playback.duration || 1;
            const percent = (current / duration) * 100;
            
            this.progressFill.style.width = percent + '%';
            this.currentTimeEl.textContent = this.formatTime(current);
            
            if (percent >= 80 && !this.hasPreloadedNext && duration > 30) {
              console.log('[Fullscreen] Track at 80%, prefetching next track');
              this.prefetchNextTrack();
            }
            
            this.currentProgress = current;
            
            const isPlaying = state.playback.isPlaying;
            if (this.isPlaying !== isPlaying) {
              this.isPlaying = isPlaying;
              this.updatePlayButton(false);
            }
          }
          
        } catch (error) {
        }
      },
      
      startProgressUpdate() {
        const updateLoop = () => {
          this.updateProgress();
          this.progressUpdateInterval = requestAnimationFrame(updateLoop);
        };
        this.progressUpdateInterval = requestAnimationFrame(updateLoop);
        
        window.desktopEvents?.on('track-changed', () => {
          this.updateTrackInfo();
        });
        
        window.desktopEvents?.on('playback-state-changed', (state) => {
          if (this.isPlaying !== state.isPlaying) {
            this.isPlaying = state.isPlaying;
            this.updatePlayButton(false);
          }
        });
      },
      
      stopProgressUpdate() {
        if (this.progressUpdateInterval) {
          cancelAnimationFrame(this.progressUpdateInterval);
          this.progressUpdateInterval = null;
        }
        if (this.volumeTimer) {
          clearTimeout(this.volumeTimer);
          this.volumeTimer = null;
        }
      },
      
      cleanup() {
        this.stopProgressUpdate();
        
        if (this.eventHandlers.keydown) {
          document.removeEventListener('keydown', this.eventHandlers.keydown);
          this.eventHandlers.keydown = null;
        }
        if (this.eventHandlers.documentMousemove) {
          document.removeEventListener('mousemove', this.eventHandlers.documentMousemove);
          this.eventHandlers.documentMousemove = null;
        }
        if (this.eventHandlers.documentMouseup) {
          document.removeEventListener('mouseup', this.eventHandlers.documentMouseup);
          this.eventHandlers.documentMouseup = null;
        }
      },
      
      formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return mins + ':' + (secs < 10 ? '0' : '') + secs;
      },
      
      async updateBackgroundForTrack(track) {
        const backgroundChoice = this.settings?.backgroundChoice || 'album_art';
        const useBackgroundVideo = this.settings?.useBackgroundVideo ?? true;
        
        console.log('[Fullscreen] Updating background:', { backgroundChoice, useBackgroundVideo });
        
        if (backgroundChoice === 'dynamic_color') {
          try {
            const color = await window.desktopEvents.invoke('fs-get-dynamic-color');
            if (color) {
              this.drawSolidBackground(color);
              return;
            }
          } catch (error) {
            console.error('[Fullscreen] Failed to get dynamic color:', error);
          }
        }
        
        if (backgroundChoice === 'static_color') {
          const staticColor = this.settings?.staticBackColor || '#000000';
          this.drawSolidBackground(staticColor);
          return;
        }
        
        if (useBackgroundVideo && (backgroundChoice === 'album_art' || backgroundChoice === 'artist_art')) {
          try {
            console.log('[Fullscreen] Trying to get background video...');
            const videoUri = await window.desktopEvents.invoke('fs-get-background-video');
            console.log('[Fullscreen] Got video URI:', videoUri);
            if (videoUri) {
              this.drawVideoBackground(videoUri);
              return;
            } else {
              console.log('[Fullscreen] No video URI available, falling back to image');
            }
          } catch (error) {
            console.error('[Fullscreen] Failed to get background video:', error);
          }
        }
        
        let imageUrl;
        if (backgroundChoice === 'artist_art') {
          try {
            const artistCover = await window.desktopEvents.invoke('fs-get-artist-cover', 'orig');
            imageUrl = artistCover || this.currentCoverUrl;
          } catch (error) {
            console.error('[Fullscreen] Failed to get artist cover:', error);
            imageUrl = this.currentCoverUrl;
          }
        } else {
          imageUrl = this.currentCoverUrl;
        }
        
        this.loadAndCacheImage(imageUrl, (img) => {
          this.drawBackground(img);
        });
      },
      
      loadAndCacheImage(url, onLoad) {
        if (this.imageCache.has(url)) {
          const cachedImg = this.imageCache.get(url);
          if (onLoad) onLoad(cachedImg);
          return;
        }
        
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          if (this.imageCache.size >= this.MAX_CACHED_IMAGES) {
            const firstKey = this.imageCache.keys().next().value;
            this.imageCache.delete(firstKey);
          }
          this.imageCache.set(url, img);
          
          if (onLoad) onLoad(img);
        };
        img.src = url;
      },
      
      prefetchVideo(videoUrl) {
        if (!videoUrl || this.videoCache.has(videoUrl)) {
          return;
        }
        
        console.log('[Fullscreen] Prefetching video:', videoUrl);
        
        const video = document.createElement('video');
        video.style.display = 'none';
        video.preload = 'auto';
        video.muted = true;
        video.src = videoUrl;
        
        if (this.videoCache.size >= this.MAX_CACHED_VIDEOS) {
          const firstKey = this.videoCache.keys().next().value;
          const oldVideo = this.videoCache.get(firstKey);
          if (oldVideo && oldVideo.parentNode) {
            oldVideo.parentNode.removeChild(oldVideo);
          }
          oldVideo.src = '';
          this.videoCache.delete(firstKey);
        }
        
        this.videoCache.set(videoUrl, video);
        this.container.appendChild(video);
        
        video.addEventListener('loadeddata', () => {
          console.log('[Fullscreen] Video prefetched successfully:', videoUrl);
        });
        
        video.addEventListener('error', (e) => {
          console.error('[Fullscreen] Failed to prefetch video:', e);
          this.videoCache.delete(videoUrl);
          if (video.parentNode) {
            video.parentNode.removeChild(video);
          }
        });
      },
      
      async prefetchNextTrack() {
        try {
          if (this.hasPreloadedNext) {
            return;
          }
          
          const nextTrack = await window.desktopEvents.invoke('fs-get-next-track');
          
          if (!nextTrack) {
            console.log('[Fullscreen] No next track to prefetch');
            return;
          }
          
          this.hasPreloadedNext = true;
          console.log('[Fullscreen] Prefetching next track:', nextTrack.title);
          
          const backgroundChoice = this.settings?.backgroundChoice || 'album_art';
          const useBackgroundVideo = this.settings?.useBackgroundVideo ?? true;
          
          if (backgroundChoice === 'static_color' || backgroundChoice === 'dynamic_color') {
            console.log('[Fullscreen] Static/dynamic color background, skipping prefetch');
            return;
          }
          
          if (useBackgroundVideo && nextTrack.backgroundVideoUri) {
            this.prefetchVideo(nextTrack.backgroundVideoUri);
          }
          
          let imageUrl;
          if (backgroundChoice === 'artist_art' && nextTrack.artistCoverUri) {
            imageUrl = 'https://' + nextTrack.artistCoverUri.replace('%%', 'orig');
          } else if (nextTrack.coverUri) {
            imageUrl = 'https://' + nextTrack.coverUri.replace('%%', 'orig');
          }
          
          if (imageUrl) {
            this.loadAndCacheImage(imageUrl, () => {
              console.log('[Fullscreen] Image prefetched for next track');
            });
          }
          
        } catch (error) {
          console.error('[Fullscreen] Failed to prefetch next track:', error);
        }
      },
      
      async updateBackground(imageUrl) {
        const backgroundChoice = this.settings?.backgroundChoice || 'album_art';
        
        if (backgroundChoice === 'dynamic_color') {
          try {
            const color = await window.desktopEvents.invoke('fs-get-dynamic-color');
            if (color) {
              this.drawSolidBackground(color);
              return;
            }
          } catch (error) {
            console.error('[Fullscreen] Failed to get dynamic color:', error);
          }
        }
        
        if (backgroundChoice === 'static_color') {
          const staticColor = this.settings?.staticBackColor || '#000000';
          this.drawSolidBackground(staticColor);
          return;
        }
        
        this.loadAndCacheImage(imageUrl, (img) => {
          this.drawBackground(img);
        });
        
        let resizeTimeout;
        window.addEventListener('resize', () => {
          if (resizeTimeout) clearTimeout(resizeTimeout);
          resizeTimeout = setTimeout(() => {
            const bgChoice = this.settings?.backgroundChoice || 'album_art';
            if (bgChoice === 'dynamic_color' || bgChoice === 'static_color') {
              this.updateBackground(imageUrl);
            } else if (img.complete) {
              this.drawBackground(img, false);
            }
          }, 100);
        });
      },
      
      drawVideoBackground(videoUri) {
        console.log('[Fullscreen] Drawing video background:', videoUri);
        
        const existingVideo = this.canvas.parentElement.querySelector('video.fs-background-video');
        
        this.canvas.style.display = 'block';
        
        this.loadAndCacheImage(this.currentCoverUrl, (fallbackImg) => {
          const ctx = this.canvas.getContext('2d');
          const width = window.innerWidth;
          const height = window.innerHeight;
          this.canvas.width = width;
          this.canvas.height = height;
          
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          
          const computedStyle = getComputedStyle(this.container);
          const blurStr = computedStyle.getPropertyValue('--background-blur').trim();
          const brightnessStr = computedStyle.getPropertyValue('--background-brightness').trim();
          const blur = blurStr ? parseInt(blurStr) : 40;
          const brightness = brightnessStr ? parseInt(brightnessStr) : 60;
          
          ctx.filter = \`brightness(\${brightness / 100}) blur(\${blur}px)\`;
          
          const scale = Math.max(width / fallbackImg.width, height / fallbackImg.height);
          const x = (width - fallbackImg.width * scale) / 2 - blur * 2;
          const y = (height - fallbackImg.height * scale) / 2 - blur * 2;
          const sizeX = fallbackImg.width * scale + blur * 4;
          const sizeY = fallbackImg.height * scale + blur * 4;
          
          if (this.previousBackgroundImg && existingVideo) {
            const prevImg = this.previousBackgroundImg;
            const prevParams = this.previousBackgroundParams || { x, y, sizeX, sizeY };
            const transitionTime = 500;
            let start;
            
            const animateFrame = (timestamp) => {
              if (!start) start = timestamp;
              const elapsed = timestamp - start;
              const factor = Math.min(elapsed / transitionTime, 1.0);
              
              ctx.globalAlpha = 1;
              ctx.drawImage(prevImg, prevParams.x, prevParams.y, prevParams.sizeX, prevParams.sizeY);
              
              ctx.globalAlpha = Math.sin((Math.PI / 2) * factor);
              ctx.drawImage(fallbackImg, x, y, sizeX, sizeY);
              
              if (factor < 1.0) {
                requestAnimationFrame(animateFrame);
              } else {
                this.previousBackgroundImg = fallbackImg;
                this.previousBackgroundParams = { x, y, sizeX, sizeY };
              }
            };
            
            requestAnimationFrame(animateFrame);
          } else {
            ctx.drawImage(fallbackImg, x, y, sizeX, sizeY);
            this.previousBackgroundImg = fallbackImg;
            this.previousBackgroundParams = { x, y, sizeX, sizeY };
          }
          
          this.isFallbackBackground = true;
        });
        
        const video = document.createElement('video');
        video.className = 'fs-background-video';
        
        const computedStyle = getComputedStyle(this.container);
        const brightnessStr = computedStyle.getPropertyValue('--background-brightness').trim();
        const blurStr = computedStyle.getPropertyValue('--background-blur').trim();
        const brightness = brightnessStr ? parseInt(brightnessStr) : 60;
        const blur = blurStr ? parseInt(blurStr) : 0;
        
        const blurCompensation = blur * 4;
        const topOffset = -blurCompensation;
        const leftOffset = -blurCompensation;
        const sizeIncrease = blurCompensation * 2;
        
        video.style.cssText = \`
          position: absolute;
          top: \${topOffset}px;
          left: \${leftOffset}px;
          width: calc(100% + \${sizeIncrease}px);
          height: calc(100% + \${sizeIncrease}px);
          object-fit: cover;
          z-index: -1;
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.5s ease-in-out;
        \`;
        video.src = videoUri;
        video.loop = true;
        video.muted = true;
        video.preload = 'auto';
        video.autoplay = true;
        
        video.style.filter = \`brightness(\${brightness / 100}) blur(\${blur}px)\`;
        
        this.canvas.parentElement.insertBefore(video, this.canvas);
        
        let hasStartedPlaying = false;
        
        video.addEventListener('canplay', () => {
          if (!hasStartedPlaying) {
            console.log('[Fullscreen] Video can play, fading in...');
            hasStartedPlaying = true;
            
            video.play().then(() => {
              video.style.opacity = '1';
              
              if (existingVideo) {
                setTimeout(() => {
                  existingVideo.remove();
                }, 500);
              }
            }).catch(err => {
              console.error('[Fullscreen] Failed to play video:', err);
              video.remove();
              
              if (existingVideo) {
                existingVideo.remove();
              }
            });
          }
        });
        
        video.addEventListener('loadeddata', () => {
          console.log('[Fullscreen] Video loaded successfully');
        });
        
        video.addEventListener('error', (e) => {
          console.error('[Fullscreen] Video error:', e, video.error);
          video.remove();
          
          if (existingVideo) {
            existingVideo.remove();
          }
        });
      },
      
      drawSolidBackground(color, animate = true) {
        const ctx = this.canvas.getContext('2d');
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.canvas.width = width;
        this.canvas.height = height;
        
        const computedStyle = getComputedStyle(this.container);
        const brightnessStr = computedStyle.getPropertyValue('--background-brightness').trim();
        const brightness = brightnessStr ? parseInt(brightnessStr) : 60;
        
        ctx.filter = \`brightness(\${brightness / 100})\`;
        
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, width, height);
        
        ctx.filter = 'none';
      },
      
      drawBackground(img, animate = true) {
        const existingVideo = this.canvas.parentElement.querySelector('video.fs-background-video');
        if (existingVideo) {
          existingVideo.remove();
        }
        
        this.canvas.style.display = 'block';
        
        const ctx = this.canvas.getContext('2d');
        const width = window.innerWidth;
        const height = window.innerHeight;
        this.canvas.width = width;
        this.canvas.height = height;
        
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        const computedStyle = getComputedStyle(this.container);
        const blurStr = computedStyle.getPropertyValue('--background-blur').trim();
        const brightnessStr = computedStyle.getPropertyValue('--background-brightness').trim();
        
        const blur = blurStr ? parseInt(blurStr) : 40;
        const brightness = brightnessStr ? parseInt(brightnessStr) : 60;
        
        ctx.filter = \`brightness(\${brightness / 100}) blur(\${blur}px)\`;
        
        const scale = Math.max(width / img.width, height / img.height);
        const x = (width - img.width * scale) / 2 - blur * 2;
        const y = (height - img.height * scale) / 2 - blur * 2;
        const sizeX = img.width * scale + blur * 4;
        const sizeY = img.height * scale + blur * 4;
        
        const wasFallback = this.isFallbackBackground;
        this.isFallbackBackground = false;
        
        if (!animate || !this.previousBackgroundImg || wasFallback) {
          ctx.globalAlpha = 1;
          ctx.drawImage(img, x, y, sizeX, sizeY);
          this.previousBackgroundImg = img;
          this.previousBackgroundParams = { x, y, sizeX, sizeY };
          return;
        }
        
        const prevImg = this.previousBackgroundImg;
        const prevParams = this.previousBackgroundParams || { x, y, sizeX, sizeY };
        const transitionTime = 500;
        let start;
        let done = false;
        
        const animateFrame = (timestamp) => {
          if (!start) start = timestamp;
          const elapsed = timestamp - start;
          const factor = Math.min(elapsed / transitionTime, 1.0);
          
          ctx.globalAlpha = 1;
          ctx.drawImage(prevImg, prevParams.x, prevParams.y, prevParams.sizeX, prevParams.sizeY);
          
          ctx.globalAlpha = Math.sin((Math.PI / 2) * factor);
          ctx.drawImage(img, x, y, sizeX, sizeY);
          
          if (factor === 1.0) {
            done = true;
            this.previousBackgroundImg = img;
            this.previousBackgroundParams = { x, y, sizeX, sizeY };
          }
          
          if (!done) {
            requestAnimationFrame(animateFrame);
          }
        };
        
        requestAnimationFrame(animateFrame);
      },
      
      async toggleLike() {
        try {
          const btn = this.container.querySelector('#fsd-heart');
          if (btn) {
            const isLiked = btn.classList.contains('button-active');
            btn.classList.toggle('button-active', !isLiked);
            
            if (!isLiked) {
              btn.querySelector('svg').innerHTML = '<path d="M15.724 4.22A4.313 4.313 0 0012.192.814a4.269 4.269 0 00-3.622 1.13.837.837 0 01-1.14 0 4.272 4.272 0 00-6.21 5.855l5.916 7.05a1.128 1.128 0 001.727 0l5.916-7.05a4.228 4.228 0 00.945-3.577z"/>';
            } else {
              btn.querySelector('svg').innerHTML = '<path d="M1.69 2A4.582 4.582 0 018 2.023 4.583 4.583 0 0111.88.817h.002a4.618 4.618 0 013.782 3.65v.003a4.543 4.543 0 01-1.011 3.84L9.35 14.629a1.765 1.765 0 01-2.093.464 1.762 1.762 0 01-.605-.463L1.348 8.309A4.582 4.582 0 011.689 2zm3.158.252A3.082 3.082 0 002.49 7.337l.005.005L7.8 13.664a.264.264 0 00.311.069.262.262 0 00.09-.069l5.312-6.33a3.043 3.043 0 00.68-2.573 3.118 3.118 0 00-2.551-2.463 3.079 3.079 0 00-2.612.816l-.007.007a1.501 1.501 0 01-2.045 0l-.009-.008a3.082 3.082 0 00-2.121-.861z"/>';
            }
          }
          
          window.desktopEvents.send('fs-toggle-like');
          setTimeout(() => this.updateLikeButton(false), 300);
        } catch (error) {
          console.error('[Fullscreen] Failed to toggle like:', error);
        }
      },
      
      async updateShuffleButton(animate = false) {
        try {
          const state = await window.desktopEvents.invoke('fs-get-player-state');
          const shuffle = state?.settings?.shuffle || false;
          const btn = this.container.querySelector('#fsd-shuffle');
          if (btn) {
            const wasActive = btn.classList.contains('button-active');
            if (animate && wasActive !== shuffle) {
              this.fadeAnimation(btn);
            }
            btn.classList.toggle('button-active', shuffle);
            btn.classList.toggle('dot-after', shuffle);
          }
        } catch (error) {}
      },
      
      async updateRepeatButton(animate = false) {
        try {
          const state = await window.desktopEvents.invoke('fs-get-player-state');
          const repeat = state?.settings?.repeat || 'none';
          const btn = this.container.querySelector('#fsd-repeat');
          if (btn) {
            const isActive = repeat !== 'none';
            const wasActive = btn.classList.contains('button-active');
            if (animate && wasActive !== isActive) {
              this.fadeAnimation(btn);
            }
            btn.classList.toggle('button-active', isActive);
            btn.classList.toggle('dot-after', isActive);
            
            if (repeat === 'one') {
              btn.querySelector('svg').innerHTML = '<path d="M0 4.75A3.75 3.75 0 013.75 1h8.5A3.75 3.75 0 0116 4.75v5a3.75 3.75 0 01-3.75 3.75H9.81l1.018 1.018a.75.75 0 11-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 111.06 1.06L9.811 12h2.439a2.25 2.25 0 002.25-2.25v-5a2.25 2.25 0 00-2.25-2.25h-8.5A2.25 2.25 0 001.5 4.75v5A2.25 2.25 0 003.75 12H5v1.5H3.75A3.75 3.75 0 010 9.75v-5z"/><text x="8" y="10.5" text-anchor="middle" font-size="9" font-weight="bold" fill="currentColor">1</text>';
            } else {
              btn.querySelector('svg').innerHTML = '<path d="M0 4.75A3.75 3.75 0 013.75 1h8.5A3.75 3.75 0 0116 4.75v5a3.75 3.75 0 01-3.75 3.75H9.81l1.018 1.018a.75.75 0 11-1.06 1.06L6.939 12.75l2.829-2.828a.75.75 0 111.06 1.06L9.811 12h2.439a2.25 2.25 0 002.25-2.25v-5a2.25 2.25 0 00-2.25-2.25h-8.5A2.25 2.25 0 001.5 4.75v5A2.25 2.25 0 003.75 12H5v1.5H3.75A3.75 3.75 0 010 9.75v-5z"/>';
            }
          }
        } catch (error) {}
      },
      
      async updateLikeButton(animate = false) {
        try {
          const state = await window.desktopEvents.invoke('fs-get-player-state');
          const liked = state?.track?.liked || false;
          const btn = this.container.querySelector('#fsd-heart');
          if (btn) {
            const wasActive = btn.classList.contains('button-active');
            if (animate && wasActive !== liked) {
              this.fadeAnimation(btn);
            }
            btn.classList.toggle('button-active', liked);
            
            if (liked) {
              btn.querySelector('svg').innerHTML = '<path d="M15.724 4.22A4.313 4.313 0 0012.192.814a4.269 4.269 0 00-3.622 1.13.837.837 0 01-1.14 0 4.272 4.272 0 00-6.21 5.855l5.916 7.05a1.128 1.128 0 001.727 0l5.916-7.05a4.228 4.228 0 00.945-3.577z"/>';
            } else {
              btn.querySelector('svg').innerHTML = '<path d="M1.69 2A4.582 4.582 0 018 2.023 4.583 4.583 0 0111.88.817h.002a4.618 4.618 0 013.782 3.65v.003a4.543 4.543 0 01-1.011 3.84L9.35 14.629a1.765 1.765 0 01-2.093.464 1.762 1.762 0 01-.605-.463L1.348 8.309A4.582 4.582 0 011.689 2zm3.158.252A3.082 3.082 0 002.49 7.337l.005.005L7.8 13.664a.264.264 0 00.311.069.262.262 0 00.09-.069l5.312-6.33a3.043 3.043 0 00.68-2.573 3.118 3.118 0 00-2.551-2.463 3.079 3.079 0 00-2.612.816l-.007.007a1.501 1.501 0 01-2.045 0l-.009-.008a3.082 3.082 0 00-2.121-.861z"/>';
            }
          }
        } catch (error) {
        }
      },
      
      async loadLyrics(trackId) {
        try {
          console.log('[Fullscreen] Loading lyrics for track:', trackId);
          
          if (typeof LyricsModule !== 'undefined') {
            await LyricsModule.fetchAndApplyLyrics(trackId);
          } else {
            console.warn('[Fullscreen] LyricsModule not available');
          }
        } catch (error) {
          console.error('[Fullscreen] Failed to load lyrics:', error);
        }
      },
      
      toggleLyrics() {
        if (typeof LyricsModule !== 'undefined') {
          const isVisible = LyricsModule.toggleVisibility();

          const btn = this.container.querySelector('#fsd-lyrics');
          if (btn) {
            btn.classList.toggle('button-active', isVisible);
          }

          this.container.classList.toggle('lyrics-visible', isVisible);
          this.container.classList.toggle('lyrics-active', isVisible);
          
          console.log('[Fullscreen] Lyrics toggled:', isVisible);
        } else {
          console.warn('[Fullscreen] LyricsModule not available');
        }
      }
    };
  `;
}

exports.getControlsCode = getControlsCode;
