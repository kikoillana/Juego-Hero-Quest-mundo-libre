/**
 * @fileoverview Caja de diálogo RPG inferior con efecto máquina de escribir y retrato vectorial dinámico.
 * Capa 5: Depende de constants.js, EventBus.js y PortraitRenderer.js.
 */

import { EVENTS } from '../config/constants.js';
import { eventBus } from '../core/EventBus.js';
import { PortraitRenderer } from '../render/PortraitRenderer.js';

export class DialogBanner {
    constructor() {
        this.bannerEl = document.getElementById('dialog-banner');
        this.portraitCanvas = document.getElementById('dialog-portrait-canvas');
        this.speakerEl = document.getElementById('dialog-speaker-name');
        this.titleEl = document.getElementById('dialog-title');
        this.textEl = document.getElementById('dialog-text');
        this.closeBtn = document.getElementById('dialog-close-btn');

        this.fullText = '';
        this.visibleChars = 0;
        this.charsPerSecond = 52;
        this.autoHideTimer = 0;
        this.isActive = false;

        this._bindEvents();
    }

    _bindEvents() {
        eventBus.on(EVENTS.DIALOG_SHOW, (payload) => {
            if (!payload) return;
            this.show(payload);
        });

        eventBus.on(EVENTS.DIALOG_HIDE, () => {
            this.hide();
        });

        this.closeBtn?.addEventListener('click', () => {
            if (this.visibleChars < this.fullText.length) {
                this.visibleChars = this.fullText.length;
                if (this.textEl) this.textEl.textContent = this.fullText;
            } else {
                this.hide();
            }
        });

        this.bannerEl?.addEventListener('click', (e) => {
            if (e.target === this.closeBtn) return;
            if (this.visibleChars < this.fullText.length) {
                this.visibleChars = this.fullText.length;
                if (this.textEl) this.textEl.textContent = this.fullText;
            }
        });
    }

    /**
     * Muestra la caja de diálogo con retrato vectorial y efecto máquina de escribir.
     * @param {{ speakerId?: string, speakerName?: string, title?: string, text: string, duration?: number }} cfg
     */
    show({ speakerId = 'mentor', speakerName = 'Mentor', title = 'Crónicas de Loretome', text = '', duration = 6.5 }) {
        if (!this.bannerEl) return;

        this.isActive = true;
        this.fullText = text;
        this.visibleChars = 0;
        this._shownChars = -1;
        this.autoHideTimer = duration;

        if (this.speakerEl) this.speakerEl.textContent = speakerName;
        if (this.titleEl) this.titleEl.textContent = title;
        if (this.textEl) this.textEl.textContent = '';

        if (this.portraitCanvas) {
            PortraitRenderer.renderToCanvas(this.portraitCanvas, speakerId);
        }

        this.bannerEl.classList.remove('hidden');
    }

    /**
     * Oculta el banner de diálogo.
     */
    hide() {
        this.isActive = false;
        this.bannerEl?.classList.add('hidden');
    }

    /**
     * Actualiza el efecto máquina de escribir y el temporizador de cierre automático.
     * @param {number} dt
     */
    update(dt) {
        if (!this.isActive) return;

        if (this.visibleChars < this.fullText.length) {
            this.visibleChars = Math.min(
                this.fullText.length,
                this.visibleChars + this.charsPerSecond * dt
            );
            // Solo tocar el DOM cuando aparece un carácter nuevo (no en cada frame)
            const shown = Math.floor(this.visibleChars);
            if (this.textEl && shown !== this._shownChars) {
                this._shownChars = shown;
                this.textEl.textContent = this.fullText.slice(0, shown);
            }
        } else {
            this.autoHideTimer -= dt;
            if (this.autoHideTimer <= 0) {
                this.hide();
            }
        }
    }
}
