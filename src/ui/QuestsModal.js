/**
 * @fileoverview Controlador del Modal del Diario Real de Misiones Secundarias y Rescate de los 4 Héroes (#quests-modal).
 * Permite consultar qué héroes siguen cautivos y en qué mazmorra, revisar el progreso de las 6 Misiones Secundarias,
 * aceptar encargos o reclamar directamente sus recompensas (Nuevas Armas, Habilidades u Oro).
 */

import { EVENTS, ZONE_ID } from '../config/constants.js';
import { getRescueStatusList } from '../config/questsData.js';
import { eventBus } from '../core/EventBus.js';

export class QuestsModal {
    /**
     * @param {import('../main.js').HeroQuestApp} app
     */
    constructor(app) {
        this.app = app;
        this.modalEl = document.getElementById('quests-modal');
        this.partyPillEl = document.getElementById('quests-party-pill');
        this.feedbackEl = document.getElementById('quests-feedback-msg');
        this.heroesGridEl = document.getElementById('quests-heroes-grid');
        this.questsGridEl = document.getElementById('quests-list-grid');
        this.campBtnEl = document.getElementById('quests-camp-btn');
        this.closeBtnEl = document.getElementById('quests-close-btn');

        this._bindEvents();
    }

    _bindEvents() {
        this.closeBtnEl?.addEventListener('click', () => {
            eventBus.emit(EVENTS.TOGGLE_QUESTS);
        });

        this.campBtnEl?.addEventListener('click', () => {
            eventBus.emit(EVENTS.TOGGLE_QUESTS);
            eventBus.emit(EVENTS.ZONE_CHANGE_REQUEST, {
                targetZoneId: ZONE_ID.OVERWORLD,
                fromZoneId: this.app.currentZoneId,
                teleportToCamp: true
            });
        });
    }

    show() {
        this.render();
        this.modalEl?.classList.remove('hidden');
    }

    hide() {
        this.modalEl?.classList.add('hidden');
    }

    render(customFeedback = null) {
        if (!this.app.player) return;

        const leaderId = this.app.player.heroId;
        const rescuedIds = this.app.rescuedHeroIds || [];
        const partyCount = 1 + rescuedIds.length;

        if (this.partyPillEl) {
            this.partyPillEl.textContent = `${partyCount} / 4 Héroes (${
                partyCount >= 4 ? '🔓 ¡Reto Final Desbloqueado!' : `Faltan ${4 - partyCount} para el Reto Final`
            })`;
            this.partyPillEl.style.color = partyCount >= 4 ? '#4ade80' : '#38bdf8';
        }

        if (customFeedback && this.feedbackEl) {
            this.feedbackEl.textContent = customFeedback;
        }

        // 1. Renderizar las 4 tarjetas de estado de Rescate de Héroes
        if (this.heroesGridEl) {
            this.heroesGridEl.innerHTML = '';
            const statusList = getRescueStatusList(leaderId, rescuedIds);

            for (const h of statusList) {
                const card = document.createElement('div');
                card.className = 'shop-card';

                let badgeHtml = '';
                let borderCol = 'rgba(212, 175, 55, 0.45)';
                if (h.status === 'leader') {
                    badgeHtml = `<span style="color:#facc15; font-weight:700;">👑 Héroe Líder (En Juego)</span>`;
                    borderCol = '#facc15';
                } else if (h.status === 'rescued') {
                    badgeHtml = `<span style="color:#4ade80; font-weight:700;">✅ ¡Rescatado! (En tu Grupo)</span>`;
                    borderCol = '#4ade80';
                } else {
                    badgeHtml = `<span style="color:#f87171; font-weight:700;">🔒 Cautivo en Jaula Rúnica</span>`;
                    borderCol = '#ef4444';
                }
                card.style.borderColor = borderCol;

                card.innerHTML = `
                    <div>
                        <div class="shop-card-header">
                            <span class="shop-card-icon">${h.status === 'captive' ? '⛓️' : '🛡️'}</span>
                            <div>
                                <div class="shop-card-title">${h.name}</div>
                                <div style="font-size:0.75rem; color:#cbd5e1;">${h.title}</div>
                            </div>
                        </div>
                        <div style="margin-top:8px; font-size:0.8rem;">${badgeHtml}</div>
                        <div class="shop-card-desc" style="margin-top:4px;">
                            📍 <strong>Ubicación:</strong> ${h.dungeonName}
                        </div>
                    </div>
                `;
                this.heroesGridEl.appendChild(card);
            }
        }

        // 2. Renderizar las 6 Misiones Secundarias
        if (this.questsGridEl && this.app.quests) {
            this.questsGridEl.innerHTML = '';
            const questList = this.app.quests.getFullQuestList();

            for (const q of questList) {
                const card = document.createElement('div');
                card.className = 'shop-card';

                const pct = Math.min(100, Math.round((q.progress / q.targetCount) * 100));
                let statusBadge = '';
                let btnHtml = '';

                if (q.status === 'completed') {
                    statusBadge = `<span style="color:#4ade80; font-weight:700;">✅ Completada</span>`;
                    card.style.borderColor = 'rgba(74, 222, 128, 0.5)';
                    btnHtml = `<button class="hq-btn hq-btn-sm" disabled>✅ Recompensa Entregada</button>`;
                } else if (q.status === 'ready_to_claim') {
                    statusBadge = `<span style="color:#facc15; font-weight:700;">🎁 ¡Lista para Reclamar!</span>`;
                    card.style.borderColor = '#facc15';
                    btnHtml = `<button class="hq-btn hq-btn-sm hq-btn-primary" data-action="claim" data-qid="${q.id}">🎁 Reclamar Recompensa</button>`;
                } else if (q.status === 'active') {
                    statusBadge = `<span style="color:#38bdf8; font-weight:700;">⏳ En Curso (${q.progress}/${q.targetCount})</span>`;
                    card.style.borderColor = '#38bdf8';
                    btnHtml = `<button class="hq-btn hq-btn-sm" disabled>Explorando (${q.progress} / ${q.targetCount})</button>`;
                } else {
                    statusBadge = `<span style="color:#fde047; font-weight:700;">❗ Disponible</span>`;
                    btnHtml = `<button class="hq-btn hq-btn-sm" data-action="accept" data-qid="${q.id}">📜 Aceptar Misión</button>`;
                }

                card.innerHTML = `
                    <div>
                        <div class="shop-card-header" style="justify-content:space-between;">
                            <div>
                                <div class="shop-card-title">${q.title}</div>
                                <div style="font-size:0.74rem; color:#94a3b8;">🗣️ ${q.giverName} — <em>${q.giverRegion}</em></div>
                            </div>
                            <div style="font-size:0.75rem;">${statusBadge}</div>
                        </div>
                        <p class="shop-card-desc" style="margin:8px 0;">${q.description}</p>
                        <div class="hud-bar-track" style="height:7px; margin:6px 0;">
                            <div class="hud-bar-fill stamina-fill" style="width:${pct}%;"></div>
                        </div>
                        <div style="font-size:0.78rem; color:#fde047; background:rgba(0,0,0,0.35); padding:6px 8px; border-radius:5px; border:1px solid rgba(250,204,21,0.3);">
                            🏆 <strong>Recompensa:</strong> ${q.reward.label}
                        </div>
                    </div>
                    <div style="display:flex; justify-content:flex-end; margin-top:6px;">
                        ${btnHtml}
                    </div>
                `;

                const actionBtn = card.querySelector('button[data-action]');
                if (actionBtn) {
                    actionBtn.addEventListener('click', () => {
                        const action = actionBtn.getAttribute('data-action');
                        const qid = actionBtn.getAttribute('data-qid');
                        if (action === 'accept') {
                            const res = this.app.quests.interactWithQuest(qid);
                            this.app.sfx?.play('inspect');
                            this.render(res?.text || '¡Misión aceptada!');
                        } else if (action === 'claim') {
                            const res = this.app.quests.claimReward(qid);
                            this.app.sfx?.play('victory');
                            this.app.hud?.updatePlayer(this.app.player);
                            this.render(res?.text || '¡Recompensa reclamada con éxito!');
                        }
                    });
                }

                this.questsGridEl.appendChild(card);
            }
        }
    }
}
