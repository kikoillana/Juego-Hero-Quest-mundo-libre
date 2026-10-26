/**
 * @fileoverview Modal de Gestión de Partidas Guardadas y Salón de la Fama conectado a SQLite.
 * Permite elegir en qué ranura (1, 2 o 3) guardar la partida actual o qué partida guardada (0-3) cargar.
 * Capa 5: Depende de constants.js, EventBus.js y SaveManager.js.
 */

import { EVENTS } from '../config/constants.js';
import { eventBus } from '../core/EventBus.js';
import { SaveManager } from '../core/SaveManager.js';

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escapa texto libre (nombres de partida/héroe guardados en BBDD) antes de insertarlo con innerHTML. */
function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

export class SaveModal {
    /**
     * @param {Object} app - Instancia de HeroQuestApp
     */
    constructor(app) {
        this.app = app;
        this.modalEl = document.getElementById('save-modal');
        this.slotsContainerEl = document.getElementById('save-slots-grid');
        this.hofContainerEl = document.getElementById('save-hof-list');
        this.backendBadgeEl = document.getElementById('save-backend-badge');
        this.feedbackEl = document.getElementById('save-feedback-msg');
        this.customNameInput = document.getElementById('save-custom-name');
        this.closeBtn = document.getElementById('save-close-btn');

        this.isOpen = false;
        this.canSave = true;
        this._bindEvents();
    }

    _bindEvents() {
        this.closeBtn?.addEventListener('click', () => {
            eventBus.emit(EVENTS.TOGGLE_SAVE_MODAL);
        });
    }

    /**
     * Abre el modal de partidas y consulta las ranuras en la BBDD SQLite.
     * @param {boolean} [canSave=true]
     */
    async open(canSave = true) {
        if (!this.modalEl) return;
        this.isOpen = true;
        this.canSave = canSave;
        this.modalEl.classList.remove('hidden');

        if (this.customNameInput && this.app?.player && !this.customNameInput.value) {
            const disc = this.app.board
                ? this.app.board.rooms.filter((r) => r.discovered).length
                : 1;
            this.customNameInput.placeholder = `Ej: ${this.app.player.name} — Sala ${disc}/7 (${this.app.player.gold} Oro)`;
        }

        await this.refreshView();
    }

    close() {
        if (!this.modalEl) return;
        this.isOpen = false;
        this.modalEl.classList.add('hidden');
    }

    async refreshView() {
        if (!this.slotsContainerEl) return;

        // Si llegan dos refrescos solapados, solo el último pinta (evita tarjetas duplicadas)
        const token = this._renderToken = (this._renderToken || 0) + 1;
        const { slots, backend } = await SaveManager.listSlots();
        if (token !== this._renderToken) return;
        const slotMap = new Map(slots.map((s) => [Number(s.slot_id), s]));

        if (this.backendBadgeEl) {
            this.backendBadgeEl.textContent = `Motor BBDD: ${backend}`;
        }

        this.slotsContainerEl.innerHTML = '';

        // Mostrar primero las 3 Ranuras manuales (1, 2, 3) para decidir dónde guardar y luego la Ranura 0 (Autoguardado)
        const displayOrder = [1, 2, 3, 0];

        for (const slotId of displayOrder) {
            const data = slotMap.get(slotId);
            const isAuto = slotId === 0;
            const slotTitle = isAuto ? 'Ranura 0 (Autoguardado)' : `Ranura de Guardado ${slotId}`;

            const card = document.createElement('div');
            card.className = 'shop-card save-slot-card';

            if (data) {
                const dateStr = new Date(data.updated_at).toLocaleString('es-ES');
                const customLabel = data.save_name || slotTitle;
                card.innerHTML = `
                    <div class="shop-card-header">
                        <span class="shop-card-icon">${isAuto ? '🔄' : '💾'}</span>
                        <div>
                            <h4 class="shop-card-title">${slotTitle}</h4>
                            <div style="color:#fde68a; font-size:0.84rem; font-weight:700;">${esc(customLabel)}</div>
                            <span class="shop-card-cost">${esc(data.hero_name)} — 🪙 ${esc(data.gold)} Oro</span>
                        </div>
                    </div>
                    <div class="save-slot-meta">
                        <span>❤️ Vida: ${data.hp}/${data.max_hp}</span>
                        <span>🚪 Salas: ${data.rooms_discovered}/${data.total_rooms}</span>
                        <span>💀 Bajas: ${data.kills}</span>
                        <span>⚔️ Equipo: Nv.${data.weapon_level} / Nv.${data.armor_level}</span>
                    </div>
                    <small class="save-slot-date">Guardado en BBDD: ${dateStr}</small>
                    <div class="save-slot-actions">
                        <button class="hq-btn hq-btn-primary btn-slot-load">📂 Cargar Partida</button>
                        ${!isAuto && this.canSave ? `<button class="hq-btn btn-slot-save">💾 Guardar en Ranura ${slotId}</button>` : ''}
                        <button class="hq-btn hq-btn-sm btn-slot-delete" title="Borrar ranura">🗑️</button>
                    </div>
                `;
            } else {
                card.innerHTML = `
                    <div class="shop-card-header">
                        <span class="shop-card-icon">📭</span>
                        <div>
                            <h4 class="shop-card-title">${slotTitle}</h4>
                            <span class="shop-card-cost" style="color:#94a3b8;">Ranura Disponible (Vacía)</span>
                        </div>
                    </div>
                    <p class="shop-card-desc">
                        ${isAuto
                            ? 'Se guarda automáticamente cada vez que descubres una nueva sala de la mazmorra.'
                            : `Haz clic abajo para guardar tu partida actual en la Ranura ${slotId} de la Base de Datos SQLite.`}
                    </p>
                    <div class="save-slot-actions">
                        ${!isAuto && this.canSave
                            ? `<button class="hq-btn hq-btn-primary btn-slot-save" style="width:100%;">💾 Guardar Aquí (Ranura ${slotId})</button>`
                            : '<button class="hq-btn" disabled style="width:100%;">Sin datos guardados (Inicia partida para guardar)</button>'}
                    </div>
                `;
            }

            const btnSave = card.querySelector('.btn-slot-save');
            btnSave?.addEventListener('click', async () => {
                if (btnSave.disabled) return;
                btnSave.disabled = true; // evita guardados concurrentes por doble clic
                try {
                    const rawCustom = this.customNameInput?.value?.trim();
                    const disc = this.app?.board
                        ? this.app.board.rooms.filter((r) => r.discovered).length
                        : 1;
                    const saveLabel = rawCustom || `Ranura ${slotId} — ${this.app.player.name} (Sala ${disc}/7)`;
                    await SaveManager.saveToSlot(slotId, this.app, saveLabel);
                    this._showFeedback(`✅ Partida guardada en la Ranura ${slotId}: «${saveLabel}».`, '#4ade80');
                    await this.refreshView();
                } finally {
                    btnSave.disabled = false;
                }
            });

            const btnLoad = card.querySelector('.btn-slot-load');
            btnLoad?.addEventListener('click', async () => {
                const loaded = await SaveManager.loadFromSlot(slotId);
                if (loaded && loaded.worldState) {
                    this._showFeedback(`📂 Cargando partida de la Ranura ${slotId}...`, '#fde047');
                    this.app.restoreFromSaveData(loaded);
                } else {
                    this._showFeedback(`⚠️ No se encontraron datos válidos en la Ranura ${slotId}.`, '#f87171');
                }
            });

            const btnDelete = card.querySelector('.btn-slot-delete');
            btnDelete?.addEventListener('click', async () => {
                await SaveManager.deleteSlot(slotId);
                this._showFeedback(`🗑️ Ranura ${slotId} eliminada de la BBDD SQLite.`, '#f87171');
                await this.refreshView();
            });

            this.slotsContainerEl.appendChild(card);
        }

        // Renderizar Salón de la Fama (Hall of Fame)
        if (this.hofContainerEl) {
            const records = await SaveManager.getHallOfFame();
            if (token !== this._renderToken) return;
            if (records.length === 0) {
                this.hofContainerEl.innerHTML = '<p style="color:#94a3b8;font-size:0.82rem;">Aún no hay crónicas registradas en el Salón de la Fama.</p>';
            } else {
                this.hofContainerEl.innerHTML = records
                    .slice(0, 6)
                    .map((r) => `
                        <div class="hof-row">
                            <span>${r.victory ? '🏆 Victoria' : '💀 Caído'} — <strong>${esc(r.hero_name)}</strong></span>
                            <span>🪙 ${esc(r.gold)} Oro | ⚔️ ${esc(r.kills)} Bajas | 🚪 ${esc(r.rooms_discovered)}/7 Salas</span>
                        </div>
                    `)
                    .join('');
            }
        }
    }

    _showFeedback(msg, color = '#fde047') {
        if (!this.feedbackEl) return;
        this.feedbackEl.textContent = msg;
        this.feedbackEl.style.color = color;
    }
}
