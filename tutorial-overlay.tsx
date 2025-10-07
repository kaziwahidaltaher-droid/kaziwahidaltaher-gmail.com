/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {LitElement, css, html, nothing} from 'lit';
import {customElement, property, state} from 'lit/decorators.js';
import {styleMap} from 'lit/directives/style-map.js';

export interface TutorialStep {
  elementId?: string;
  title: string;
  text: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  showSample?: boolean;
}

@customElement('tutorial-overlay')
export class TutorialOverlay extends LitElement {
  @property({type: Number}) step = 0;
  @property({type: Array}) steps: TutorialStep[] = [];
  
  @state() private highlightRect: DOMRect | null = null;

  static styles = css`
    :host {
      --accent-color: #61faff;
      --glow-color: rgba(97, 250, 255, 0.5);
      --bg-color: #010206;
      --panel-bg: rgba(1, 2, 6, 0.85);
      --border-color: rgba(97, 250, 255, 0.4);
      --text-color: #c0f0ff;
    }
    .overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1000;
      pointer-events: all;
    }
    .highlight-box {
      position: absolute;
      border: 2px solid var(--accent-color);
      box-shadow: 0 0 15px var(--glow-color), inset 0 0 15px var(--glow-color), 0 0 0 9999px rgba(0, 0, 0, 0.7);
      border-radius: 4px;
      transition: all 0.5s ease-in-out;
      pointer-events: none;
    }
    .message-box {
      position: absolute;
      background: var(--panel-bg);
      border: 1px solid var(--border-color);
      backdrop-filter: blur(10px);
      padding: 1.5rem;
      border-radius: 4px;
      max-width: 350px;
      color: var(--text-color);
      box-shadow: 0 5px 25px rgba(0,0,0,0.5);
      transition: all 0.5s ease-in-out;
      animation: fadeIn 0.5s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    h4 {
      margin: 0 0 1rem 0;
      color: var(--accent-color);
      font-weight: 400;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }
    p {
      margin: 0 0 1.5rem 0;
      line-height: 1.6;
      font-size: 0.95rem;
      opacity: 0.9;
    }
    .buttons {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .buttons button {
      font-family: inherit;
      background: none;
      border: 1px solid var(--border-color);
      color: var(--text-color);
      padding: 0.6rem 1.2rem;
      font-size: 0.9rem;
      letter-spacing: 0.1em;
      cursor: pointer;
      transition: all 0.3s ease;
    }
    .buttons button:hover {
      background: var(--glow-color);
      border-color: var(--accent-color);
      color: var(--bg-color);
    }
    .buttons button.skip {
      border: none;
      opacity: 0.7;
    }
    .buttons button.skip:hover {
      opacity: 1;
      background: none;
      color: var(--text-color);
      text-decoration: underline;
    }
    button.sample-prompt {
        margin-top: -0.5rem;
        margin-bottom: 1.5rem;
        width: 100%;
        text-align: left;
        font-style: italic;
        background: rgba(97, 250, 255, 0.1);
    }
  `;

  protected updated(changedProperties: Map<string | number | symbol, unknown>): void {
      if (changedProperties.has('step')) {
          this.updateHighlight();
      }
  }
  
  private updateHighlight() {
    const stepData = this.steps[this.step];
    if (!stepData || !stepData.elementId) {
        this.highlightRect = null;
        return;
    }
    
    // Allow DOM to update before getting rect
    setTimeout(() => {
      const root = document.querySelector('axee-interface');
      if (!root) return;
      
      const element = root.querySelector(`#${stepData.elementId}`);
      if (element) {
          this.highlightRect = element.getBoundingClientRect();
      } else {
          this.highlightRect = null;
      }
    }, 50);
  }

  private _onNext() {
    const isLastStep = this.step >= this.steps.length - 1;
    // FIX: Cast `this` to `EventTarget` to dispatch the event.
    (this as unknown as EventTarget).dispatchEvent(new CustomEvent(isLastStep ? 'skip' : 'next'));
  }

  private _onSkip() {
    // FIX: Cast `this` to `EventTarget` to dispatch the event.
    (this as unknown as EventTarget).dispatchEvent(new CustomEvent('skip'));
  }

  private _onUseSample() {
    // FIX: Cast `this` to `EventTarget` to dispatch the event.
    (this as unknown as EventTarget).dispatchEvent(new CustomEvent('use-sample-prompt'));
  }

  render() {
    if (this.step >= this.steps.length) return nothing;

    const stepData = this.steps[this.step];
    const messageStyles: any = {};
    const highlightStyles: any = {};
    const padding = 10;

    if (this.highlightRect) {
        highlightStyles.top = `${this.highlightRect.top - padding}px`;
        highlightStyles.left = `${this.highlightRect.left - padding}px`;
        highlightStyles.width = `${this.highlightRect.width + padding * 2}px`;
        highlightStyles.height = `${this.highlightRect.height + padding * 2}px`;

        switch(stepData.position) {
            case 'top':
                messageStyles.bottom = `${window.innerHeight - this.highlightRect.top + padding + 10}px`;
                messageStyles.left = `${this.highlightRect.left}px`;
                break;
            case 'bottom':
                messageStyles.top = `${this.highlightRect.bottom + padding + 10}px`;
                messageStyles.left = `${this.highlightRect.left}px`;
                break;
            case 'left':
                messageStyles.top = `${this.highlightRect.top}px`;
                messageStyles.right = `${window.innerWidth - this.highlightRect.left + padding + 10}px`;
                break;
            case 'right':
                messageStyles.top = `${this.highlightRect.top}px`;
                messageStyles.left = `${this.highlightRect.right + padding + 10}px`;
                break;
        }
    } else { // Center if no highlight
        messageStyles.top = '50%';
        messageStyles.left = '50%';
        messageStyles.transform = 'translate(-50%, -50%)';
    }

    const isLastStep = this.step >= this.steps.length - 1;

    return html`
      <div class="overlay">
        ${this.highlightRect ? html`<div class="highlight-box" style=${styleMap(highlightStyles)}></div>` : nothing}
        <div class="message-box" style=${styleMap(messageStyles)}>
          <h4>${stepData.title}</h4>
          <p>${stepData.text}</p>
          ${stepData.showSample ? html`<button class="sample-prompt" @click=${this._onUseSample}>Use Sample Prompt</button>` : nothing}
          <div class="buttons">
            <button class="skip" @click=${this._onSkip}>Skip Tutorial</button>
            <button @click=${this._onNext}>${isLastStep ? 'Finish' : 'Next'}</button>
          </div>
        </div>
      </div>
    `;
  }
}