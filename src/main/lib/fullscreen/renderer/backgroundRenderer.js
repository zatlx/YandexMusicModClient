"use strict";

function getBackgroundRendererCode() {
  return `
    const BackgroundRenderer = {
      container: null,
      canvas: null,
      settings: null,
      api: null,
      currentCoverUrl: null,
      
      imageCache: new Map(),
      videoCache: new Map(),
      MAX_CACHED_IMAGES: 10,
      MAX_CACHED_VIDEOS: 3,
      
      isTransitioning: false,
      previousBackgroundImg: null,
      previousBackgroundParams: null,
      
      hasPreloadedNext: false,
      isFallbackBackground: false,
      
      resizeHandler: null,
      parallaxHandler: null,
      throttledParallaxHandler: null,
      parallaxIntensity: 25,
      
      create(container, settings, api) {
        if (!container || !(container instanceof HTMLElement)) {
          throw new TypeError('container must be an HTMLElement');
        }
        
        const instance = Object.create(this);
        instance.container = container;
        instance.settings = settings || {};
        instance.api = api || {};
        instance.imageCache = new Map();
        instance.videoCache = new Map();
        instance.isTransitioning = false;
        instance.hasPreloadedNext = false;
        instance.isFallbackBackground = false;
        instance.previousBackgroundImg = null;
        instance.previousBackgroundParams = null;
        instance.currentCoverUrl = null;
        instance.resizeHandler = null;
        instance.parallaxHandler = null;
        instance.throttledParallaxHandler = null;
        instance.parallaxIntensity = 25;
        
        return instance;
      },
      
      init() {
        this.canvas = this.container.querySelector('#fsd-background');
        
        if (!this.canvas) {
          console.error('[BackgroundRenderer] Canvas element not found');
          return;
        }
        
        this.imageCache = new Map();
        this.videoCache = new Map();
        
        this.resizeHandler = () => {
          if (this.settings?.backgroundChoice === 'static_color' || 
              this.settings?.backgroundChoice === 'dynamic_color') {
            return;
          }
          
          if (this.previousBackgroundImg && 
              !this.canvas.parentElement.querySelector('video.fs-background-video')) {
            this._drawBackground(this.previousBackgroundImg, false);
          }
        };
        
        window.addEventListener('resize', this.resizeHandler);
        
        this.parallaxHandler = (event) => {
          const { clientX, clientY } = event;
          const { innerWidth, innerHeight } = window;
          const offsetX = clientX / innerWidth - 0.5;
          const offsetY = clientY / innerHeight - 0.5;
          const translateX = offsetX * this.parallaxIntensity;
          const translateY = offsetY * this.parallaxIntensity;
          
          requestAnimationFrame(() => {
            if (this.canvas) {
              this.canvas.style.transform = \`translate(\${translateX}px, \${translateY}px)\`;
            }
            
            const video = this.canvas?.parentElement?.querySelector('video.fs-background-video');
            if (video) {
              video.style.transform = \`translate(\${translateX}px, \${translateY}px)\`;
            }
          });
        };
        
        this.throttledParallaxHandler = this._throttle(this.parallaxHandler, 33);
        window.addEventListener('mousemove', this.throttledParallaxHandler);
        
        if (this.canvas) {
          this.canvas.style.transform = 'translate(0px, 0px)';
        }
        
        console.log('[BackgroundRenderer] Initialized');
      },
      
      async updateBackgroundForTrack(track) {
        if (!track) {
          console.warn('[BackgroundRenderer] No track provided');
          return;
        }
        
        this.isTransitioning = true;
        
        const backgroundChoice = this.settings?.backgroundChoice || 'album_art';
        const useBackgroundVideo = this.settings?.useBackgroundVideo ?? true;
        
        console.log('[BackgroundRenderer] Updating background:', { backgroundChoice, useBackgroundVideo });
        
        if (track.coverUri) {
          this.currentCoverUrl = 'https://' + track.coverUri.replace('%%', 'orig');
        }
        
        if (backgroundChoice === 'dynamic_color') {
          try {
            if (this.api.getDynamicColor) {
              const color = await this.api.getDynamicColor();
              if (color) {
                this._drawSolidBackground(color);
                setTimeout(() => {
                  this.isTransitioning = false;
                }, 500);
                return;
              }
            }
          } catch (error) {
            console.error('[BackgroundRenderer] Failed to get dynamic color:', error);
          }
        }
        
        if (backgroundChoice === 'static_color') {
          const staticColor = this.settings?.staticBackColor || '#000000';
          this._drawSolidBackground(staticColor);
          setTimeout(() => {
            this.isTransitioning = false;
          }, 500);
          return;
        }
        
        if (useBackgroundVideo && (backgroundChoice === 'album_art' || backgroundChoice === 'artist_art')) {
          try {
            if (this.api.getBackgroundVideo) {
              console.log('[BackgroundRenderer] Trying to get background video...');
              const videoUri = await this.api.getBackgroundVideo();
              console.log('[BackgroundRenderer] Got video URI:', videoUri);
              if (videoUri) {
                this._drawVideoBackground(videoUri);
                setTimeout(() => {
                  this.isTransitioning = false;
                }, 500);
                return;
              } else {
                console.log('[BackgroundRenderer] No video URI available, falling back to image');
              }
            }
          } catch (error) {
            console.error('[BackgroundRenderer] Failed to get background video:', error);
          }
        }
        
        let imageUrl;
        
        if (backgroundChoice === 'artist_art') {
          try {
            if (this.api.getArtistCover) {
              const artistCover = await this.api.getArtistCover('orig');
              imageUrl = artistCover || this.currentCoverUrl;
            } else {
              imageUrl = this.currentCoverUrl;
            }
          } catch (error) {
            console.error('[BackgroundRenderer] Failed to get artist cover:', error);
            imageUrl = this.currentCoverUrl;
          }
        } else {
          imageUrl = this.currentCoverUrl;
        }
        
        if (imageUrl) {
          this._loadAndCacheImage(imageUrl, (img) => {
            this._drawBackground(img);
            setTimeout(() => {
              this.isTransitioning = false;
            }, 500);
          });
        } else {
          setTimeout(() => {
            this.isTransitioning = false;
          }, 500);
        }
      },
      
      updateSettings(newSettings) {
        if (!newSettings) {
          return;
        }
        
        const oldSettings = this.settings || {};
        const blurChanged = oldSettings.blur !== newSettings.blur;
        const brightnessChanged = oldSettings.brightness !== newSettings.brightness;
        const backgroundChoiceChanged = oldSettings.backgroundChoice !== newSettings.backgroundChoice;
        
        this.settings = { ...this.settings, ...newSettings };
        
        console.log('[BackgroundRenderer] Settings updated:', { 
          blurChanged, 
          brightnessChanged, 
          backgroundChoiceChanged 
        });
        
        if (blurChanged || brightnessChanged) {
          if (this.previousBackgroundImg) {
            this._drawBackground(this.previousBackgroundImg, false);
          }
        }
        
        if (backgroundChoiceChanged) {
          console.log('[BackgroundRenderer] Background choice changed, external code should call updateBackgroundForTrack');
        }
      },
      
      async prefetchNextTrack(track) {
        if (!track) {
          console.log('[BackgroundRenderer] No next track to prefetch');
          return;
        }
        
        if (this.hasPreloadedNext) {
          return;
        }
        this.hasPreloadedNext = true;
        
        console.log('[BackgroundRenderer] Prefetching next track:', track.title);
        
        const backgroundChoice = this.settings?.backgroundChoice || 'album_art';
        const useBackgroundVideo = this.settings?.useBackgroundVideo ?? true;
        
        if (backgroundChoice === 'static_color' || backgroundChoice === 'dynamic_color') {
          console.log('[BackgroundRenderer] Static/dynamic color background, skipping prefetch');
          return;
        }
        
        if (useBackgroundVideo && track.backgroundVideoUri) {
          this._prefetchVideo(track.backgroundVideoUri);
        }
        
        let backgroundImageUrl;
        let coverImageUrl;
        
        if (backgroundChoice === 'artist_art' && track.artistCoverUri) {
          backgroundImageUrl = 'https://' + track.artistCoverUri.replace('%%', 'orig');
        } else if (track.coverUri) {
          backgroundImageUrl = 'https://' + track.coverUri.replace('%%', 'orig');
        }
        
        if (track.coverUri) {
          coverImageUrl = 'https://' + track.coverUri.replace('%%', 'orig');
        }
        
        if (backgroundImageUrl && coverImageUrl && backgroundImageUrl === coverImageUrl) {
          this._loadAndCacheImage(backgroundImageUrl, () => {
            console.log('[BackgroundRenderer] Image prefetched for next track');
          });
        } else {
          if (backgroundImageUrl) {
            this._loadAndCacheImage(backgroundImageUrl, () => {
              console.log('[BackgroundRenderer] Background image prefetched for next track');
            });
          }
          
          if (coverImageUrl && coverImageUrl !== backgroundImageUrl) {
            this._loadAndCacheImage(coverImageUrl, () => {
              console.log('[BackgroundRenderer] Cover image prefetched for next track');
            });
          }
        }
      },
      
      getIsTransitioning() {
        return this.isTransitioning;
      },
      
      cleanup() {
        const videos = this.container.querySelectorAll('video.fs-background-video');
        videos.forEach(video => {
          video.src = '';
          video.remove();
        });
        
        this.videoCache.forEach(video => {
          if (video.parentNode) {
            video.parentNode.removeChild(video);
          }
          video.src = '';
        });
        this.videoCache.clear();
        
        this.imageCache.clear();
        
        if (this.resizeHandler) {
          window.removeEventListener('resize', this.resizeHandler);
          this.resizeHandler = null;
        }
        
        if (this.throttledParallaxHandler) {
          window.removeEventListener('mousemove', this.throttledParallaxHandler);
          this.throttledParallaxHandler = null;
          this.parallaxHandler = null;
        }
        
        console.log('[BackgroundRenderer] Cleaned up');
      },
      
      _drawBackground(img, animate = true) {
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
      
      _drawVideoBackground(videoUri) {
        console.log('[BackgroundRenderer] Drawing video background:', videoUri);
        
        const existingVideo = this.canvas.parentElement.querySelector('video.fs-background-video');
        
        this.canvas.style.display = 'block';
        
        this._loadAndCacheImage(this.currentCoverUrl || '', (fallbackImg) => {
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
        const parallaxCompensation = 20;
        const topOffset = -blurCompensation - parallaxCompensation;
        const leftOffset = -blurCompensation - parallaxCompensation;
        const sizeIncrease = blurCompensation * 2 + parallaxCompensation * 2;
        
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
          transition: opacity 0.5s ease-in-out, transform 0.16s ease-out;
          will-change: transform;
          transform: translate(0px, 0px);
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
            console.log('[BackgroundRenderer] Video can play, fading in...');
            hasStartedPlaying = true;
            
            video.play().then(() => {
              video.style.opacity = '1';
              
              if (existingVideo) {
                setTimeout(() => {
                  existingVideo.remove();
                }, 500);
              }
            }).catch(err => {
              console.error('[BackgroundRenderer] Failed to play video:', err);
              video.remove();
              
              if (existingVideo) {
                existingVideo.remove();
              }
            });
          }
        });
        
        video.addEventListener('loadeddata', () => {
          console.log('[BackgroundRenderer] Video loaded successfully');
        });
        
        video.addEventListener('error', (e) => {
          console.error('[BackgroundRenderer] Video error:', e, video.error);
          video.remove();
          
          if (existingVideo) {
            existingVideo.remove();
          }
          
        });
      },
      
      _drawSolidBackground(color) {
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
        
        console.log('[BackgroundRenderer] Solid background drawn:', color);
      },
      
      _loadAndCacheImage(url, onLoad) {
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
            console.log('[BackgroundRenderer] Evicted oldest image from cache:', firstKey);
          }
          
          this.imageCache.set(url, img);
          console.log('[BackgroundRenderer] Image cached:', url, 'Cache size:', this.imageCache.size);
          
          if (onLoad) onLoad(img);
        };
        
        img.onerror = (error) => {
          console.error('[BackgroundRenderer] Failed to load image:', url, error);
        };
        
        img.src = url;
      },
      
      _prefetchVideo(videoUrl) {
        if (!videoUrl || this.videoCache.has(videoUrl)) {
          return;
        }
        
        console.log('[BackgroundRenderer] Prefetching video:', videoUrl);
        
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
          console.log('[BackgroundRenderer] Evicted oldest video from cache:', firstKey);
        }
        
        this.videoCache.set(videoUrl, video);
        this.container.appendChild(video);
        
        video.addEventListener('loadeddata', () => {
          console.log('[BackgroundRenderer] Video prefetched successfully:', videoUrl);
        });
        
        video.addEventListener('error', (e) => {
          console.error('[BackgroundRenderer] Failed to prefetch video:', e);
          this.videoCache.delete(videoUrl);
          if (video.parentNode) {
            video.parentNode.removeChild(video);
          }
        });
      },
      
      _handleResize() {
      },
      
      _throttle(func, limit) {
        let inThrottle;
        return function(...args) {
          if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
          }
        };
      }
    };
  `;
}

exports.getBackgroundRendererCode = getBackgroundRendererCode;
