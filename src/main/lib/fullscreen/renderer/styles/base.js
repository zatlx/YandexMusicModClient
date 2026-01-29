"use strict";

function getBaseStyles() {
  return `
    #ym-fullscreen-container {
      display: none;
      z-index: 99999;
      position: fixed;
      width: 100%;
      height: 100%;
      cursor: default;
      left: 0;
      top: 0;
      --transition-duration: 0.8s;
      --transition-function: ease-in-out;
      --main-color: 255, 255, 255;
      --contrast-color: 0, 0, 0;
      --primary-color: rgba(var(--main-color), 1);
      --secondary-color: rgba(var(--main-color), 0.7);
      --tertiary-color: rgba(var(--main-color), 0.5);
      --theme-color: 175, 175, 175;
      --theme-background-color: rgba(175, 175, 175, 0.6);
      --theme-hover-color: rgba(175, 175, 175, 0.3);
      --theme-main-color: rgba(var(--theme-color), 1);
    }

    #ym-fullscreen-container.active {
      display: block;
    }

    #ym-fullscreen-container.themed-buttons {
      --theme-background-color: rgba(var(--theme-color), 0.6);
      --theme-hover-color: rgba(var(--theme-color), 0.3);
    }

    #fsd-background {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      z-index: -2;
      transition: opacity 0.8s ease-in-out;
    }

    #fsd-background.animated {
      transform: scale(3, 3.5);
      transform-origin: left top;
    }

    .fsd-background-fade {
      transition: background-image var(--fs-transition, 0.8s) linear;
    }

    #fsd-foreground {
      position: relative;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--primary-color);
      transition: all var(--transition-duration) var(--transition-function);
    }

    #fsd-details {
      transition: opacity 0.5s ease, transform 0.5s ease;
    }

    #fsd-art-image {
      transition: opacity 0.5s ease, background-image 0.5s ease;
    }

    .hidden {
      display: none !important;
    }

    #fsd-title {
      font-size: var(--fsd-title-size, 50px);
      font-weight: 700;
      transition: all var(--transition-duration) var(--transition-function);
      color: var(--primary-color);
      line-height: 1.2;
      z-index: 15;
      position: relative;
    }

    #fsd-title span {
      word-break: break-word;
    }

    #fsd-artist {
      font-size: var(--fsd-sec-size, 28px);
      font-weight: 500;
      color: var(--secondary-color);
      transition: all var(--transition-duration) var(--transition-function);
      line-height: 1.3;
      z-index: 15;
      position: relative;
    }

    #fsd-artist span {
      word-break: break-word;
    }

    #fsd-album {
      font-size: var(--fsd-sec-size, 28px);
      font-weight: 400;
      color: var(--tertiary-color);
      transition: all var(--transition-duration) var(--transition-function);
      line-height: 1.3;
      z-index: 15;
      position: relative;
    }

    #fsd-album span {
      word-break: break-word;
    }

    .fsd-song-meta span:hover,
    .fsd-artist-list span:hover,
    .artist-link:hover,
    #fsd-title span:hover,
    #fsd-album span:hover {
      cursor: pointer;
      text-decoration: underline;
      opacity: 0.9;
    }

    .artist-link {
      transition: opacity 0.2s ease;
    }

    #fsd-title svg,
    #fsd-artist svg,
    #fsd-album svg {
      transition: all var(--transition-duration) var(--transition-function);
      display: inline-block;
      vertical-align: middle;
      margin-right: 8px;
      fill: currentColor;
    }

    #ym-fullscreen-container.hide-icons #fsd-title svg,
    #ym-fullscreen-container.hide-icons #fsd-artist svg,
    #ym-fullscreen-container.hide-icons #fsd-album svg {
      display: none;
    }

    #ym-fullscreen-container.hide-progress-bar #fsd-progress-parent {
      display: none;
    }

    #ym-fullscreen-container.hide-player-controls .fsd-controls-center {
      display: none;
    }

    #ym-fullscreen-container.hide-extra-controls .extra-controls {
      display: none;
    }

    #ym-fullscreen-container.hide-album #fsd-album {
      display: none;
    }

    #ym-fullscreen-container.hide-context #fsd-ctx-container {
      display: none;
    }

    #ym-fullscreen-container.hide-volume #fsd-volume-container {
      display: none;
    }

    #ym-fullscreen-container.invert-colors-always {
      --main-color: 0, 0, 0;
      --contrast-color: 255, 255, 255;
    }

    #ym-fullscreen-container.invert-colors-auto {
    }

    #playing-icon,
    #paused-icon {
      width: 28px !important;
      height: 28px !important;
      margin-right: 7px;
      cursor: pointer;
    }

    #playing-icon:hover,
    #paused-icon:hover {
      opacity: 0.8;
    }

    .fsd-controls {
      display: flex;
      flex-direction: row;
      transition: opacity 1s ease-in-out;
      column-gap: 10px;
    }

    .fs-button {
      background: transparent;
      border: 0;
      border-radius: 8px;
      color: var(--primary-color);
      padding: 3px 5px 0 5px;
      cursor: pointer;
      position: relative;
      transition: all 0.3s var(--transition-function), transform 0.1s var(--transition-function);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      min-height: 32px;
      z-index: 15;
    }

    .fs-button:hover {
      transform: scale(1.2);
      filter: saturate(1.5) contrast(1.5) !important;
      background: var(--theme-hover-color);
    }

    .fs-button.button-active {
      background: var(--theme-background-color) !important;
      filter: saturate(1.5) contrast(1.5) !important;
    }

    .fs-button svg {
      width: 20px;
      height: 20px;
    }

    #fsd-foreground svg {
      fill: var(--primary-color);
      transition: all 0.3s var(--transition-function);
    }

    #ym-fullscreen-container.themed-icons #fsd-foreground svg {
      fill: var(--theme-main-color);
      filter: saturate(1.5) contrast(1.5);
    }

    #ym-fullscreen-container.themed-icons .fs-button svg {
      fill: var(--theme-main-color);
    }

    #ym-fullscreen-container.themed-icons.themed-buttons .fs-button.button-active svg {
      fill: var(--primary-color) !important;
    }

    .fs-button.unavailable {
      color: var(--tertiary-color) !important;
      pointer-events: none !important;
      opacity: 0.5 !important;
      background: transparent !important;
    }

    button.dot-after {
      padding-bottom: 11px !important;
    }

    .dot-after:after {
      background-color: currentColor;
      border-radius: 50%;
      bottom: 3px;
      content: "";
      display: block;
      height: 4px;
      left: 50%;
      position: absolute;
      transform: translateX(-50%);
      width: 4px;
    }

    #fsd-progress-container {
      width: 100%;
      display: flex;
      align-items: center;
      transition: opacity 1s ease-in-out;
      --theme-main-color: rgba(var(--main-color), 1);
    }

    #ym-fullscreen-container.themed-buttons #fsd-progress-container,
    #ym-fullscreen-container.themed-icons #fsd-progress-container {
      --theme-main-color: rgba(var(--theme-color), 1);
    }

    #fsd-progress-bar {
      width: 100%;
      height: 6px;
      border-radius: 4px;
      background: rgba(var(--main-color), 0.35);
      cursor: pointer;
      margin: 10px auto;
      display: flex;
      align-items: center;
      position: relative;
    }

    #fsd-progress-bar:hover #fsd-progress-bar-inner,
    #fsd-progress-bar:hover #progress-thumb {
      background: var(--theme-main-color);
      filter: saturate(1.5) contrast(1.5);
    }

    #fsd-progress-bar:hover #progress-thumb {
      display: block;
    }

    #fsd-progress-bar.dragging #fsd-progress-bar-inner,
    #fsd-progress-bar.dragging #progress-thumb {
      background: var(--theme-main-color);
      filter: saturate(1.5) contrast(1.5);
    }

    #fsd-progress-bar.dragging #progress-thumb {
      display: block;
      transform: scale(1.4);
    }

    #fsd-progress-bar.dragging #fsd-progress-bar-inner {
      transition: none !important;
    }

    #fsd-progress-bar-inner {
      height: 100%;
      border-radius: 4px;
      background: var(--primary-color);
      width: 0%;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      transition: width 0.1s linear;
    }

    #progress-thumb {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--primary-color);
      position: relative;
      right: -6px;
      display: none;
      pointer-events: none;
      transition: transform 0.1s ease;
    }

    .progress-number {
      min-width: 40px;
      text-align: center;
      font-size: 14px;
      color: var(--secondary-color);
      user-select: none;
    }

    #fsd-elapsed {
      margin-right: 12px;
    }

    #fsd-duration {
      margin-left: 12px;
      cursor: pointer;
      transition: color 0.2s ease;
    }

    #fsd-duration:hover {
      color: var(--primary-color);
    }

    #ym-fs-exit {
      position: absolute;
      top: 24px;
      right: 24px;
      background: rgba(255,255,255,0.1);
      border: none;
      border-radius: 50%;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      color: var(--primary-color);
      z-index: 10;
      transition: all 0.2s;
    }

    #ym-fs-exit:hover {
      background: rgba(255,255,255,0.2);
      transform: scale(1.1);
    }

    #ym-fs-exit svg {
      width: 24px;
      height: 24px;
      fill: currentColor;
    }

    #fsd-ctx-container {
      background-color: transparent;
      color: var(--secondary-color);
      position: fixed;
      float: left;
      top: 30px;
      left: 50px;
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: center;
      text-align: left;
      z-index: 50;
      transition: all 1s ease-in-out;
      opacity: 1;
      max-width: 40%;
    }

    #fsd-ctx-details {
      padding-left: 18px;
      line-height: initial;
      font-size: 18px;
      overflow: hidden;
    }

    #fsd-ctx-icon {
      width: 48px;
      height: 48px;
      flex-shrink: 0;
    }

    #fsd-ctx-icon svg {
      fill: var(--primary-color) !important;
    }

    #fsd-ctx-source {
      text-transform: uppercase;
      font-size: 14px;
      opacity: 0.8;
    }

    #fsd-ctx-name {
      font-weight: 700;
      font-size: 20px;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      overflow: hidden;
      line-height: 1.3;
      margin-top: 4px;
    }

    .ctx-no-name {
      padding-bottom: 2px;
      font-size: 24px;
      font-weight: 600;
    }

    #fsd-upnext-container {
      float: right;
      width: 600px;
      height: 102px;
      max-width: 40%;
      position: fixed;
      top: 40px;
      right: 20px;
      display: flex;
      border-radius: 10px;
      flex-direction: row;
      text-align: right;
      z-index: 50;
      transition: transform 0.75s ease-in-out;
      transform: translateX(600px);
      cursor: pointer;
    }

    #fsd-upnext-container:hover {
      opacity: 0.9;
    }

    #fsd_next_art_image {
      background-size: cover;
      background-position: center;
      width: 100px;
      height: 100px;
      border-radius: 15px;
      flex-shrink: 0;
    }

    #fsd_next_details {
      padding-right: 18px;
      padding-top: 17px;
      line-height: initial;
      width: calc(100% - 115px);
      color: rgba(255, 255, 255, 1);
      font-size: 19px;
      overflow: hidden;
    }

    #fsd_next_tit_art {
      padding-top: 9px;
      font-size: 22px;
      font-weight: 700;
      white-space: nowrap;
      text-overflow: ellipsis;
      overflow: hidden;
    }

    #fad-lyrics-plus-container {
      transition: transform var(--transition-duration) var(--transition-function);
      position: absolute;
      right: 50px;
      width: 50%;
      top: 7.5vh;
    }

    #ym-fullscreen-container.lyrics-unavailable #fad-lyrics-plus-container,
    #ym-fullscreen-container:not(.lyrics-active) #fad-lyrics-plus-container {
      transform: translateX(1000px) scale3d(0.1, 0.1, 0.1) rotate(45deg);
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: scale(0.95);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes fadeUp {
      0% {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeDo {
      0% {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes fadeRi {
      0% {
        opacity: 0;
        transform: translateX(10px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    @keyframes fadeLe {
      0% {
        opacity: 0;
        transform: translateX(-10px);
      }
      to {
        opacity: 1;
        transform: translateX(0);
      }
    }

    .fade-do {
      animation: fadeDo 0.5s cubic-bezier(0.3, 0, 0, 1);
    }

    .fade-up {
      animation: fadeUp 0.5s cubic-bezier(0.3, 0, 0, 1);
    }

    .fade-ri {
      animation: fadeRi 0.5s cubic-bezier(0.3, 0, 0, 1);
    }

    .fade-le {
      animation: fadeLe 0.5s cubic-bezier(0.3, 0, 0, 1);
    }

    #ym-fullscreen-container.active {
      animation: fadeIn 0.3s ease;
    }

    #ym-fullscreen-container.hide-cursor {
      cursor: none;
    }

    #ym-fullscreen-container.hide-cursor * {
      cursor: none !important;
    }

    #ym-fullscreen-container button,
    #ym-fullscreen-container .progress-number,
    #ym-fullscreen-container #fsd-progress-bar {
      transition: all 0.2s ease;
    }

    #ym-fullscreen-container {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }

    #ym-fullscreen-container {
      user-select: none;
      -webkit-user-select: none;
      -moz-user-select: none;
      -ms-user-select: none;
    }

    #fsd-title span,
    #fsd-artist span,
    #fsd-album span {
      user-select: text;
      -webkit-user-select: text;
      -moz-user-select: text;
      -ms-user-select: text;
    }

    #fsd-volume-container {
      position: fixed;
      left: 30px;
      top: 30%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      z-index: 100;
      height: 250px;
      max-height: 33vh;
      transition: transform 0.6s var(--transition-function);
      transform: translateX(0) scale(1);
    }

    #fsd-volume-container.v-hidden {
      transform: translateX(-100px) scale(0.1);
    }

    #fsd-volume-container.dragging,
    #fsd-volume-container:hover {
      transform: translateX(0) scale(1);
    }

    #fsd-volume {
      width: 50px;
      text-align: center;
      color: var(--primary-color);
      font-size: 18px;
      font-weight: 500;
      user-select: none;
    }

    #fsd-volume-bar {
      width: 8px;
      height: 100%;
      border-radius: 4px;
      background: rgba(var(--main-color), 0.35);
      cursor: pointer;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      justify-content: flex-end;
      margin: 8px 0;
    }

    #fsd-volume-bar:hover #fsd-volume-bar-inner,
    #fsd-volume-bar:hover #volume-thumb {
      background: var(--theme-main-color);
      filter: saturate(1.5) contrast(1.5);
      transition: none;
    }

    #fsd-volume-bar:hover #volume-thumb {
      display: block;
    }

    #fsd-volume-bar.dragging #fsd-volume-bar-inner,
    #fsd-volume-bar.dragging #volume-thumb {
      background: var(--theme-main-color);
      filter: saturate(1.5) contrast(1.5);
      transition: none;
    }

    #fsd-volume-bar.dragging #volume-thumb {
      display: block;
      transform: scale(1.1);
    }

    #fsd-volume-bar-inner {
      width: 100%;
      border-radius: 4px;
      background: var(--primary-color);
      height: 100%;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-start;
      pointer-events: none;
      transition: height 0.1s var(--transition-function);
    }

    #volume-thumb {
      width: 13px;
      height: 13px;
      border-radius: 50%;
      background: var(--primary-color);
      position: relative;
      left: -2px;
      top: -5px;
      display: none;
      pointer-events: none;
    }

    #fsd-volume-icon {
      margin: 0;
    }

    #fsd-volume-icon svg {
      fill: var(--primary-color) !important;
    }

    #fsd-volume-container.unavailable #fsd-volume-bar {
      pointer-events: none;
    }

    #fsd-volume-container.unavailable #fsd-volume-bar-inner {
      height: 100%;
      background: var(--tertiary-color);
    }

    @media (max-width: 600px) {
      #ym-fullscreen-container {
        --fsd-title-size: 32px !important;
        --fsd-sec-size: 18px !important;
      }

      #fsd-ctx-container,
      #fsd-upnext-container {
        display: none;
      }

      #ym-fs-exit {
        top: 16px;
        right: 16px;
        width: 40px;
        height: 40px;
      }
    }

    @media (prefers-contrast: high) {
      #ym-fullscreen-container {
        --main-color: 255, 255, 255;
        --contrast-color: 0, 0, 0;
      }

      .fs-button {
        border: 1px solid var(--primary-color);
      }
    }

    #fsd-ctx-container {
      background-color: transparent;
      color: var(--secondary-color);
      position: fixed;
      float: left;
      top: 30px;
      left: 50px;
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: center;
      text-align: left;
      z-index: 50;
      transition: all 1s ease-in-out;
      opacity: 1;
      max-width: 40%;
    }

    #ym-fullscreen-container.hide-context #fsd-ctx-container {
      display: none;
    }

    #fsd-ctx-details {
      padding-left: 18px;
      line-height: initial;
      font-size: 18px;
      overflow: hidden;
    }

    #fsd-ctx-icon {
      width: 48px;
      height: 48px;
      flex-shrink: 0;
    }

    #fsd-ctx-icon svg {
      fill: var(--primary-color) !important;
    }

    #ym-fullscreen-container.themed-icons #fsd-ctx-icon svg {
      fill: var(--theme-main-color) !important;
      filter: saturate(1.5) contrast(1.5);
    }

    #fsd-ctx-source {
      text-transform: uppercase;
    }

    #fsd-ctx-name {
      font-weight: 700;
      font-size: 20px;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      overflow: hidden;
    }

    #fsd-ctx-name:hover {
      text-decoration: underline;
      cursor: pointer;
    }

    .ctx-no-name {
      padding-bottom: 2px;
      font-size: 24px;
      font-weight: 600;
    }

    @media (prefers-reduced-motion: reduce) {
      #ym-fullscreen-container,
      #ym-fullscreen-container * {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }

      #playing-icon #bar1,
      #playing-icon #bar2,
      #playing-icon #bar3,
      #playing-icon #bar4 {
        animation: none !important;
      }
    }
  `;
}

exports.getBaseStyles = getBaseStyles;
