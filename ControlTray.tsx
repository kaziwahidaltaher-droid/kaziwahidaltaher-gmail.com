/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {LitElement, css, html} from 'lit';
import {customElement, property} from 'lit/decorators.js';

@customElement('axee-control-tray')
export class ControlTray extends LitElement {
  @property({type: Boolean}) isMuted = false;

  static styles = css`
    :host {
      --accent-color: #a0d0ff;
      --accent-color-light: #c0e0ff;
      --accent-color-translucent: rgba(160, 208, 255, 0.2);
      --bg-color-translucent: rgba(10, 25, 40, 0.5);
      --border-color: rgba(160, 208, 255, 0.2);
      display: block;
    }

    .control-tray {
      display: flex;
      background: var(--bg-color-translucent);
      border: 1px solid var(--border-color);
    }

    .control-button {
      font-family: 'Exo 2', sans-serif;
      background: transparent;
      border: none;
      color: var(--accent-color);
      padding: 0.8rem;
      cursor: pointer;
      font-size: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: opacity 0.3s, background 0.3s;
      border-left: 1px solid var(--border-color);
    }

    .control-button:hover {
      background: var(--accent-color-translucent);
      color: var(--accent-color-light);
    }

    .control-button svg {
      width: 24px;
      height: 24px;
      transition: filter 0.3s;
    }

    .control-button:hover svg {
      filter: drop-shadow(0 0 8px var(--accent-color));
    }
  `;

  private renderMuteIcon() {
    if (this.isMuted) {
      return html`<svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path
          d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"
        />
      </svg>`;
    } else {
      return html`<svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path
          d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
        />
      </svg>`;
    }
  }

  render() {
    return html`
      <div class="control-tray">
        <button
          class="control-button"
          @click=${() =>
            (this as unknown as EventTarget).dispatchEvent(
              new CustomEvent('toggle-mute'),
            )}
          title=${this.isMuted ? 'Unmute' : 'Mute'}
          aria-label=${this.isMuted ? 'Unmute' : 'Mute'}
        >
          ${this.renderMuteIcon()}
        </button>
      </div>
    `;
  }
}