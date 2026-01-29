"use strict";

function getLyricsCode() {
  return `
    const LyricsModule = (() => {
      let lyricsState = {
        data: null,
        currentTrackId: null,
        isVisible: false,
        currentProgress: 0,
        scrollPosition: 0,
        lastActiveLineIndex: -1
      };

      let isInitialized = false;
      let animationFrameId = null;
      let lastFrameTime = performance.now();
      let lastKnownProgress = 0;
      let lastProgressUpdateTime = performance.now();

      let lyricsContainer = null;
      let lyricsContent = null;

      const LyricsObject = {
        Types: {
          Syllable: { Lines: [] },
          Line: { Lines: [] },
          Static: { Lines: [] }
        }
      };
      
      let currentLyricsType = null;
      let blurringLastLine = null;

      let isUserScrolling = false;
      let lastUserScrollTime = 0;
      let lastScrolledLineIndex = -1;

      const timeOffset = 0;
      const BlurMultiplier = 1.25;
      const USER_SCROLL_COOLDOWN = 750;

      function init() {
        if (isInitialized) {
          console.log('[Lyrics] Already initialized, restoring state');
          console.log('[Lyrics] Current state:', lyricsState);
          restoreState();
          return;
        }
        
        console.log('[Lyrics] Initializing lyrics module...');
        console.log('[Lyrics] Initial state:', lyricsState);
        
        const containerCreated = createLyricsContainer();
        if (!containerCreated) {
          console.error('[Lyrics] Failed to create lyrics container');
          return;
        }
        
        setupEventListeners();
        restoreState();
        
        isInitialized = true;
        console.log('[Lyrics] Lyrics module initialized');
      }
      
      function createLyricsContainer() {
        lyricsContainer = document.getElementById('fad-lyrics-plus-container');
        if (!lyricsContainer) {
          console.error('[Lyrics] Container #fad-lyrics-plus-container not found');
          return false;
        }

        if (!lyricsContainer.querySelector('.lyrics-wrapper')) {
          lyricsContainer.innerHTML = \`
            <div class="lyrics-wrapper">
              <div class="lyrics-content"></div>
            </div>
          \`;
        }
        
        lyricsContent = lyricsContainer.querySelector('.lyrics-content');
        return true;
      }
      
      function restoreState() {
        if (!lyricsContainer) return;
        
        console.log('[Lyrics] Restoring state:', lyricsState);
        console.log('[Lyrics] Container parent:', lyricsContainer.parentElement);
        console.log('[Lyrics] Container parent classes:', lyricsContainer.parentElement?.className);

        if (lyricsState.isVisible) {
          lyricsContainer.parentElement.classList.add('lyrics-active');
          console.log('[Lyrics] Added lyrics-active class');
          console.log('[Lyrics] Container parent classes after:', lyricsContainer.parentElement?.className);
          
          const btn = document.querySelector('#fsd-lyrics');
          if (btn) {
            btn.classList.add('button-active');
            console.log('[Lyrics] Added button-active class to lyrics button');
          } else {
            console.log('[Lyrics] Lyrics button not found');
          }
        }

        console.log('[Lyrics] State restored, waiting for track data');
      }
      
      function saveState() {
        if (lyricsContent) {
          lyricsState.scrollPosition = lyricsContent.scrollTop;
        }
        lyricsState.currentProgress = FullscreenControls.currentProgress || 0;
      }
      
      function setupEventListeners() {
        if (window.desktopEvents) {
          window.desktopEvents.on('track-changed', handleTrackChange);
        }

        if (lyricsContent) {
          lyricsContent.addEventListener('click', handleLyricsClick);

          lyricsContent.addEventListener('wheel', handleUserScroll);
          lyricsContent.addEventListener('touchmove', handleUserScroll);
        }
      }
      
      function handleUserScroll() {
        if (!isUserScrolling) {
          isUserScrolling = true;
          if (lyricsContent) {
            lyricsContent.classList.add('HideLineBlur');
          }
        }
        lastUserScrollTime = performance.now();

        saveState();
      }

      async function handleTrackChange() {
        console.log('[Lyrics] Track changed, checking state...');
        
        if (!window.desktopEvents) return;
        
        const state = await window.desktopEvents.invoke('fs-get-player-state');
        if (!state || !state.track) {
          clearLyrics();
          return;
        }
        
        const trackId = state.track.id;
        console.log('[Lyrics] Current track ID:', trackId, 'State track ID:', lyricsState.currentTrackId);

        if (trackId === lyricsState.currentTrackId && lyricsState.data) {
          console.log('[Lyrics] Same track, restoring from state:', trackId);
          applyLyricsFromState();

          setTimeout(() => {
            if (lyricsContent && lyricsState.scrollPosition > 0) {
              lyricsContent.scrollTop = lyricsState.scrollPosition;
            }

            if (FullscreenControls.currentProgress) {
              updateLyricsState();
              animateLyrics(0);
            }
            
            startAnimation();
          }, 100);
          return;
        }

        if (lyricsState.currentTrackId && lyricsState.currentTrackId !== trackId) {
          console.log('[Lyrics] Different track, saving state for:', lyricsState.currentTrackId);
          saveState();
        }
        
        console.log('[Lyrics] Fetching lyrics for new track:', trackId);
        await fetchAndApplyLyrics(trackId);
      }

      async function fetchAndApplyLyrics(trackId) {
        try {
          console.log('[Lyrics] fetchAndApplyLyrics called for track:', trackId);
          console.log('[Lyrics] Current state trackId:', lyricsState.currentTrackId);
          console.log('[Lyrics] Has data in state:', !!lyricsState.data);

          if (trackId === lyricsState.currentTrackId && lyricsState.data) {
            console.log('[Lyrics] Restoring lyrics from state for track:', trackId);
            applyLyricsFromState();

            setTimeout(() => {
              if (lyricsContent && lyricsState.scrollPosition > 0) {
                console.log('[Lyrics] Restoring scroll position:', lyricsState.scrollPosition);
                lyricsContent.scrollTop = lyricsState.scrollPosition;
              }

              if (FullscreenControls.currentProgress) {
                updateLyricsState();
                animateLyrics(0);
              }
              
              startAnimation();
            }, 100);
            return;
          }
          
          if (!window.desktopEvents) {
            console.error('[Lyrics] desktopEvents not available');
            showErrorMessage();
            return;
          }
          
          console.log('[Lyrics] Fetching lyrics for track:', trackId);
          const lyrics = await window.desktopEvents.invoke('fs-get-track-lyrics', trackId);
          console.log('[Lyrics] Received lyrics:', lyrics);
          
          if (!lyrics || lyrics.length === 0) {
            console.log('[Lyrics] No lyrics available');
            showNoLyricsMessage();
            lyricsState.data = null;
            lyricsState.currentTrackId = trackId;
            return;
          }
          
          lyricsState.data = parseLyrics(lyrics);
          lyricsState.currentTrackId = trackId;
          console.log('[Lyrics] Parsed lyrics data:', lyricsState.data);
          applyLyricsFromState();
          startAnimation();
          
        } catch (error) {
          console.error('[Lyrics] Failed to fetch lyrics:', error);
          showErrorMessage();
          lyricsState.data = null;
          lyricsState.currentTrackId = trackId;
        }
      }
      
      function parseLyrics(lrcLines) {
        const lines = lrcLines.map((line, index) => {
          const startTime = line.time / 1000;
          const nextLine = lrcLines[index + 1];
          const endTime = nextLine ? nextLine.time / 1000 : startTime + 5;
          
          return {
            StartTime: startTime,
            EndTime: endTime,
            Text: line.text,
            HTMLElement: null,
            Status: 'NotSung'
          };
        });
        
        return {
          Type: 'Line',
          Lines: lines
        };
      }

      function applyLyricsFromState() {
        if (!lyricsState.data || !lyricsContent) {
          console.error('[Lyrics] Cannot apply lyrics - missing data or content element');
          return;
        }
        
        console.log('[Lyrics] Applying lyrics from state, type:', lyricsState.data.Type);

        const type = lyricsState.data.Type;
        const lines = lyricsState.data.Lines;
        
        clearLyricsContent();
        
        currentLyricsType = type;
        
        if (type === 'Line') {
          applyLineLyrics(lines);
        } else if (type === 'Static') {
          applyStaticLyrics(lines);
        }
        
        console.log('[Lyrics] Lyrics applied successfully');
      }
      
      function applyLineLyrics(lines) {
        console.log('[Lyrics] Applying line lyrics, count:', lines.length);
        const fragment = document.createDocumentFragment();

        LyricsObject.Types.Line.Lines = [];
        
        lines.forEach((line, index) => {
          const lineElement = document.createElement('div');
          lineElement.className = 'line NotSung';
          lineElement.textContent = line.Text;
          lineElement.dataset.index = index;
          
          line.HTMLElement = lineElement;
          LyricsObject.Types.Line.Lines.push(line);
          
          fragment.appendChild(lineElement);
        });
        
        lyricsContent.appendChild(fragment);
        lyricsContainer.classList.add('lyrics-loaded');

        const containerStyle = window.getComputedStyle(lyricsContainer);
        console.log('[Lyrics] Container transform:', containerStyle.transform);
        console.log('[Lyrics] Container display:', containerStyle.display);
        console.log('[Lyrics] Line lyrics rendered');
      }
      
      function applyStaticLyrics(lines) {
        const fragment = document.createDocumentFragment();
        
        lines.forEach(line => {
          const lineElement = document.createElement('div');
          lineElement.className = 'line static';
          lineElement.textContent = line.Text;
          
          fragment.appendChild(lineElement);
        });
        
        lyricsContent.appendChild(fragment);
        lyricsContainer.classList.add('lyrics-loaded');
      }

      function startAnimation() {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
        
        animate();
      }
      
      function animate() {
        const now = performance.now();
        const deltaTime = (now - lastFrameTime) / 1000;

        lastFrameTime = now;

        updateLyricsState();
        animateLyrics(deltaTime);
        
        animationFrameId = requestAnimationFrame(animate);
      }
      
      function updateLyricsState() {
        if (!currentLyricsType || currentLyricsType === 'Static') return;

        const position = FullscreenControls.currentProgress || 0;
        const processedPosition = position + timeOffset;
        
        const lines = LyricsObject.Types[currentLyricsType].Lines;
        
        lines.forEach(line => {
          if (processedPosition < line.StartTime) {
            line.Status = 'NotSung';
          } else if (processedPosition > line.EndTime) {
            line.Status = 'Sung';
          } else {
            line.Status = 'Active';
          }
        });
      }
      
      let lastActiveLineIndex = -1;
      
      function animateLyrics(deltaTime) {
        if (!currentLyricsType || currentLyricsType === 'Static') return;
        
        const now = performance.now();

        const controlsProgress = FullscreenControls.currentProgress || 0;

        if (controlsProgress !== lastKnownProgress) {
          lastKnownProgress = controlsProgress;
          lastProgressUpdateTime = now;
        }

        let position = lastKnownProgress;
        if (FullscreenControls.isPlaying) {
          const timeSinceUpdate = (now - lastProgressUpdateTime) / 1000;
          position = lastKnownProgress + timeSinceUpdate;
        }
        
        const processedPosition = position + timeOffset;
        
        const lines = LyricsObject.Types[currentLyricsType].Lines;

        let activeLineIndex = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].Status === 'Active') {
            activeLineIndex = i;
            break;
          }
        }

        if (activeLineIndex !== -1 && blurringLastLine !== activeLineIndex) {
          applyBlur(lines, activeLineIndex);
          blurringLastLine = activeLineIndex;
        }

        if (activeLineIndex !== -1) {
          const line = lines[activeLineIndex];
          if (line.HTMLElement) {
            const progress = (processedPosition - line.StartTime) / (line.EndTime - line.StartTime);
            const clampedProgress = Math.max(0, Math.min(1, progress));
            const gradientPos = -20 + 120 * clampedProgress;

            line.HTMLElement.style.setProperty('--gradient-position', gradientPos + '%');
          }
        }

        if (activeLineIndex !== lastActiveLineIndex) {
          lines.forEach((line) => {
            if (!line.HTMLElement) return;
            
            line.HTMLElement.classList.remove('NotSung', 'Active', 'Sung');
            line.HTMLElement.classList.add(line.Status);

            if (line.Status === 'NotSung') {
              line.HTMLElement.style.setProperty('--gradient-position', '-20%');
            } else if (line.Status === 'Sung') {
              line.HTMLElement.style.setProperty('--gradient-position', '100%');
            }
          });
          
          lastActiveLineIndex = activeLineIndex;
          lyricsState.lastActiveLineIndex = activeLineIndex;
        }

        if (activeLineIndex !== -1) {
          scrollToActiveLine(lines, activeLineIndex, now);
        }
      }
      
      function applyBlur(lines, activeIndex) {
        if (!lines[activeIndex]) return;

        lines[activeIndex].HTMLElement.style.setProperty('--blur-amount', '0px');

        const max = BlurMultiplier * 5 + BlurMultiplier * 0.465;

        for (let i = activeIndex + 1; i < lines.length; i++) {
          const blurAmount = BlurMultiplier * (i - activeIndex);
          lines[i].HTMLElement.style.setProperty(
            '--blur-amount',
            (blurAmount >= max ? max : blurAmount) + 'px'
          );
        }

        for (let i = activeIndex - 1; i >= 0; i--) {
          const blurAmount = BlurMultiplier * (activeIndex - i);
          lines[i].HTMLElement.style.setProperty(
            '--blur-amount',
            (blurAmount >= max ? max : blurAmount) + 'px'
          );
        }
      }
      
      function scrollToActiveLine(lines, activeLineIndex, now) {
        if (!lyricsContent) return;
        
        const lineElement = lines[activeLineIndex].HTMLElement;
        if (!lineElement) return;
        
        const timeSinceLastScroll = now - lastUserScrollTime;

        const lineRect = lineElement.getBoundingClientRect();
        const containerRect = lyricsContent.getBoundingClientRect();
        
        const visibleTop = Math.max(lineRect.top, containerRect.top);
        const visibleBottom = Math.min(lineRect.bottom, containerRect.bottom);
        const visibleHeight = Math.max(0, visibleBottom - visibleTop);
        const isLineInViewport = visibleHeight >= 5;
        
        const isSameLine = lastScrolledLineIndex === activeLineIndex;

        if (timeSinceLastScroll > USER_SCROLL_COOLDOWN && isLineInViewport) {
          isUserScrolling = false;

          if (lyricsContent) {
            lyricsContent.classList.remove('HideLineBlur');
          }

          if (!isSameLine) {
            lastScrolledLineIndex = activeLineIndex;
            scrollToCenterView(lineElement);
          }
        }
      }
      
      function scrollToCenterView(lineElement) {
        if (!lineElement || !lyricsContent) return;
        
        const containerRect = lyricsContent.getBoundingClientRect();
        const lineRect = lineElement.getBoundingClientRect();

        const offset = -30;
        const targetScroll = lineRect.top - containerRect.top - (containerRect.height / 2) + (lineRect.height / 2) + offset;
        
        lyricsContent.scrollBy({
          top: targetScroll,
          behavior: 'smooth'
        });
      }

      function handleLyricsClick(e) {
        const lineElement = e.target.closest('.line');
        if (!lineElement) return;
        
        const index = parseInt(lineElement.dataset.index);
        if (isNaN(index)) return;
        
        const lines = LyricsObject.Types[currentLyricsType].Lines;
        const line = lines[index];
        
        if (line && line.StartTime !== undefined && window.desktopEvents) {
          window.desktopEvents.send('fs-seek', line.StartTime);
        }
      }

      function showNoLyricsMessage() {
        if (!lyricsContent) return;
        
        clearLyricsContent();
        lyricsContent.innerHTML = \`
          <div class="lyrics-message">
            <p>No lyrics available for this track</p>
          </div>
        \`;
      }
      
      function showErrorMessage() {
        if (!lyricsContent) return;
        
        clearLyricsContent();
        lyricsContent.innerHTML = \`
          <div class="lyrics-message error">
            <p>Failed to load lyrics</p>
          </div>
        \`;
      }

      function clearLyricsContent() {
        if (lyricsContent) {
          lyricsContent.innerHTML = '';
        }
        
        LyricsObject.Types.Syllable.Lines = [];
        LyricsObject.Types.Line.Lines = [];
        LyricsObject.Types.Static.Lines = [];
        
        currentLyricsType = null;
        blurringLastLine = null;
        isUserScrolling = false;
        lastUserScrollTime = 0;
        lastScrolledLineIndex = -1;
        
        lyricsContainer?.classList.remove('lyrics-loaded');
      }
      
      function clearLyrics() {
        clearLyricsContent();
        lyricsState.data = null;
        lyricsState.currentTrackId = null;
        lyricsState.scrollPosition = 0;
        lyricsState.lastActiveLineIndex = -1;
      }
      
      function cleanup() {
        console.log('[Lyrics] Cleaning up...');

        saveState();
        
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
        
        if (lyricsContent) {
          lyricsContent.removeEventListener('click', handleLyricsClick);
          lyricsContent.removeEventListener('wheel', handleUserScroll);
          lyricsContent.removeEventListener('touchmove', handleUserScroll);
        }

        lastKnownProgress = 0;
        lastProgressUpdateTime = performance.now();
        lastActiveLineIndex = -1;
        isUserScrolling = false;
        lastUserScrollTime = 0;
        lastScrolledLineIndex = -1;
        
        isInitialized = false;
        console.log('[Lyrics] Cleanup complete, state preserved');
      }

      function toggleVisibility() {
        lyricsState.isVisible = !lyricsState.isVisible;
        
        if (lyricsContainer) {
          lyricsContainer.parentElement.classList.toggle('lyrics-active', lyricsState.isVisible);
          
          const btn = document.querySelector('#fsd-lyrics');
          if (btn) {
            btn.classList.toggle('button-active', lyricsState.isVisible);
          }
        }
        
        console.log('[Lyrics] Visibility toggled:', lyricsState.isVisible);
        return lyricsState.isVisible;
      }
      
      function getState() {
        return { ...lyricsState };
      }
      
      return {
        init,
        cleanup,
        fetchAndApplyLyrics,
        clearLyrics,
        toggleVisibility,
        getState
      };
    })();

    if (typeof FullscreenControls !== 'undefined') {
      LyricsModule.init();
    }
  `;
}

exports.getLyricsCode = getLyricsCode;
