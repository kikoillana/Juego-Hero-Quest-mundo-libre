/**
 * @fileoverview Modal de la Armería del Imperio: mejoras permanentes de arma y armadura,
 * compra de pociones alquímicas y curación completa con el oro saqueado.
 * Capa 5: Depende de constants.js y EventBus.js.
 */

import { EVENTS } from '../config/constants.js';
import { eventBus } from '../core/EventBus.js';

export class ShopModal {
    /**
     * @param {() => Object|null} getPlayerFn
     */
    constructor(getPlayerFn) {
        this.getPlayer = getPlayerFn;
        this.modalEl = document.getElementById('shop-modal');
        this.goldDisplayEl = document.getElementById('shop-gold-display');
        this.itemsGridEl = document.getElementById('shop-items-grid');
        this.feedbackEl = document.getElementById('shop-feedback-msg');
        this.closeBtn = document.getElementById('shop-close-btn');

        this.isOpen = false;
        this._bindEvents();
    }

    _bindEvents() {
        this.closeBtn?.addEventListener('click', () => {
            eventBus.emit(EVENTS.TOGGLE_SHOP);
        });
    }

    open() {
        const player = this.getPlayer();
        if (!player || !this.modalEl) return;
        this.isOpen = true;
        this.modalEl.classList.remove('hidden');
        this.renderCatalog(player);
    }

    close() {
        if (!this.modalEl) return;
        this.isOpen = false;
        this.modalEl.classList.add('hidden');
    }

    /**
     * Renderiza las tarjetas de la Armería del Imperio con precios dinámicos según nivel.
     * @param {Object} player
     */
    renderCatalog(player) {
        if (!this.itemsGridEl || !player) return;

        if (this.goldDisplayEl) {
            this.goldDisplayEl.textContent = `${player.gold} monedas de oro`;
        }

        const weaponCost = 60 + (player.weaponLevel - 1) * 45;
        const armorCost = 55 + (player.armorLevel - 1) * 45;

        const catalog = [
            {
                id: 'weapon_upgrade',
                name: `Forja Imperial Nv. ${player.weaponLevel + 1}`,
                icon: '⚔️',
                desc: 'Templa tu arma principal con acero rúnico (+8 Daño Base permanente).',
                cost: weaponCost,
                action: () => {
                    player.weaponLevel++;
                    this._showFeedback('¡Tu arma reluce con filo imperial (+8 ATQ)!', '#4ade80');
                }
            },
            {
                id: 'armor_upgrade',
                name: `Placas del Imperio Nv. ${player.armorLevel + 1}`,
                icon: '🛡️',
                desc: 'Refuerza tu armadura (+3 Defensa permanente y +15 Vida Máxima).',
                cost: armorCost,
                action: () => {
                    player.armorLevel++;
                    player.maxHp += 15;
                    player.hp = Math.min(player.maxHp, player.hp + 15);
                    this._showFeedback('¡Armadura reforzada (+3 DEF, +15 VIDA MÁX)!', '#4ade80');
                }
            },
            {
                id: 'buy_heal',
                name: 'Poción Curativa [Slot 1]',
                icon: '🧪',
                desc: 'Elixir carmesí que restaura 50 puntos de Salud en combate.',
                cost: 35,
                action: () => {
                    player.inventory.healPotions++;
                    this._showFeedback('¡Poción Curativa añadida al cinturón!', '#4ade80');
                }
            },
            {
                id: 'buy_strength',
                name: 'Poción de Fuerza [Slot 2]',
                icon: '🔥',
                desc: 'Brebaje volcánico que otorga +50% de Daño durante 14 segundos.',
                cost: 45,
                action: () => {
                    player.inventory.strengthPotions++;
                    this._showFeedback('¡Poción de Fuerza Heroica adquirida!', '#f59e0b');
                }
            },
            {
                id: 'buy_speed',
                name: 'Poción de Viento [Slot 3]',
                icon: '⚡',
                desc: 'Destilado etéreo que aumenta un 35% la velocidad y restaura Stamina.',
                cost: 40,
                action: () => {
                    player.inventory.speedPotions++;
                    this._showFeedback('¡Poción de Viento Veloz adquirida!', '#38bdf8');
                }
            },
            {
                id: 'full_blessing',
                name: 'Bendición de Loretome',
                icon: '✨',
                desc: 'Restaura inmediatamente el 100% de tu Salud y Stamina.',
                cost: 50,
                disabled: player.hp >= player.maxHp && player.stamina >= player.maxStamina,
                action: () => {
                    player.hp = player.maxHp;
                    player.stamina = player.maxStamina;
                    this._showFeedback('¡Tus heridas han sido sanadas por completo!', '#fde047');
                }
            }
        ];

        this.itemsGridEl.innerHTML = '';

        for (const item of catalog) {
            const canAfford = player.gold >= item.cost && !item.disabled;
            const card = document.createElement('div');
            card.className = `shop-card ${canAfford ? '' : 'shop-card-disabled'}`;

            card.innerHTML = `
                <div class="shop-card-header">
                    <span class="shop-card-icon">${item.icon}</span>
                    <div>
                        <h4 class="shop-card-title">${item.name}</h4>
                        <span class="shop-card-cost">🪙 ${item.cost} Oro</span>
                    </div>
                </div>
                <p class="shop-card-desc">${item.desc}</p>
                <button class="hq-btn shop-buy-btn" ${canAfford ? '' : 'disabled'}>
                    ${item.disabled ? 'Salud Completa' : (player.gold >= item.cost ? 'Comprar' : 'Oro Insuficiente')}
                </button>
            `;

            const btn = card.querySelector('.shop-buy-btn');
            btn?.addEventListener('click', () => {
                if (player.gold < item.cost || item.disabled) return;
                player.gold -= item.cost;
                item.action();
                player.emitUpdate();
                eventBus.emit(EVENTS.SHOP_PURCHASE, { itemId: item.id, cost: item.cost });
                this.renderCatalog(player);
            });

            this.itemsGridEl.appendChild(card);
        }
    }

    _showFeedback(text, color = '#fde047') {
        if (!this.feedbackEl) return;
        this.feedbackEl.textContent = text;
        this.feedbackEl.style.color = color;
    }
}
