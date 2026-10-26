/**
 * @fileoverview Controlador del HUD superpuesto (Edición Mundo Libre):
 * Barras de vida y stamina, retrato vectorial en vivo, oro, indicador de Zona Activa
 * (Bosque de Loretome o cualquiera de las 4 Mazmorras), contador de salas/claros, estado del Jefe,
 * botón rápido para Salir al Bosque y controles de audio/tienda/guardado.
 * Capa 5: Depende de constants.js, EventBus.js y PortraitRenderer.js.
 */

import { EVENTS, ZONE_ID } from '../config/constants.js';
import { SPECIAL_WEAPONS } from '../config/questsData.js';
import { eventBus } from '../core/EventBus.js';
import { PortraitRenderer } from '../render/PortraitRenderer.js';

export class HUDController {
    constructor() {
        this.els = {
            portraitImg: document.getElementById('hud-hero-portrait-img'),
            portraitCanvas: document.getElementById('hud-hero-portrait'),
            heroName: document.getElementById('hud-hero-name'),
            heroTitle: document.getElementById('hud-hero-title'),
            hpFill: document.getElementById('hud-hp-fill'),
            hpText: document.getElementById('hud-hp-text'),
            staminaFill: document.getElementById('hud-stamina-fill'),
            staminaText: document.getElementById('hud-stamina-text'),
            atkValue: document.getElementById('hud-atk-value'),
            defValue: document.getElementById('hud-def-value'),
            partyValue: document.getElementById('hud-party-value'),
            weaponPill: document.getElementById('hud-weapon-pill'),
            weaponValue: document.getElementById('hud-weapon-value'),
            goldValue: document.getElementById('hud-gold-value'),
            zoneValue: document.getElementById('hud-zone-value'),
            roomsLabel: document.getElementById('hud-rooms-label'),
            roomsValue: document.getElementById('hud-rooms-value'),
            bossLabel: document.getElementById('hud-boss-label'),
            bossValue: document.getElementById('hud-boss-value'),
            slotHealCount: document.getElementById('slot-heal-count'),
            slotStrCount: document.getElementById('slot-str-count'),
            slotSpdCount: document.getElementById('slot-spd-count'),
            skillName: document.getElementById('hud-skill-name'),
            skillStatus: document.getElementById('hud-skill-status'),
            secondSkillName: document.getElementById('hud-second-skill-name'),
            secondSkillStatus: document.getElementById('hud-second-skill-status'),
            btnForestExit: document.getElementById('btn-hud-forest'),
            btnQuests: document.getElementById('btn-hud-quests'),
            btnPause: document.getElementById('btn-hud-pause'),
            btnSave: document.getElementById('btn-hud-save'),
            btnShop: document.getElementById('hud-btn-shop') || document.getElementById('btn-hud-shop'),
            btnLore: document.getElementById('btn-hud-lore'),
            btnMusic: document.getElementById('btn-hud-music'),
            btnVoice: document.getElementById('btn-hud-voice'),
            slot1: document.getElementById('hud-slot-1'),
            slot2: document.getElementById('hud-slot-2'),
            slot3: document.getElementById('hud-slot-3')
        };

        this.lastRenderedHeroId = null;
        this.currentZoneId = ZONE_ID.DUNGEON_FELLMARG;
        this._bindEvents();
    }

    _bindEvents() {
        eventBus.on(EVENTS.PLAYER_UPDATED, ({ player }) => this.updatePlayer(player));

        eventBus.on(EVENTS.ROOM_DISCOVERED, ({ discoveredCount, totalRooms }) => {
            if (this.els.roomsValue) {
                this.els.roomsValue.textContent = `${discoveredCount} / ${totalRooms}`;
            }
        });

        eventBus.on(EVENTS.ZONE_CHANGED, ({ zoneId, zoneName, isOverworld, discoveredRooms, totalRooms, bossName, bossDefeated }) => {
            this.currentZoneId = zoneId;
            if (this.els.zoneValue) {
                this.els.zoneValue.textContent = isOverworld ? '🌲 Bosque de Loretome' : `🏰 ${zoneName}`;
            }
            if (this.els.roomsLabel) {
                this.els.roomsLabel.textContent = isOverworld ? '🌲 Regiones' : '🚪 Salas';
            }
            if (this.els.roomsValue) {
                this.els.roomsValue.textContent = `${discoveredRooms} / ${totalRooms}`;
            }
            if (this.els.bossLabel) {
                this.els.bossLabel.textContent = isOverworld ? '🏰 Mazmorras' : '👹 Jefe';
            }
            if (this.els.bossValue) {
                if (isOverworld) {
                    this.els.bossValue.textContent = '4 en el Bosque';
                    this.els.bossValue.classList.remove('boss-slain');
                } else {
                    this.els.bossValue.textContent = bossDefeated ? '¡Abatido!' : (bossName || 'En el Santuario');
                    this.els.bossValue.classList.toggle('boss-slain', Boolean(bossDefeated));
                }
            }
            if (this.els.btnForestExit) {
                if (isOverworld) {
                    this.els.btnForestExit.textContent = '🏕️ Ir a Hoguera Central';
                    this.els.btnForestExit.title = 'Viajar al Campamento Real en el centro del Bosque';
                } else {
                    this.els.btnForestExit.textContent = '🌲 Salir al Bosque';
                    this.els.btnForestExit.title = 'Subir por la Escalera Imperial hacia el Bosque de Loretome';
                }
            }
        });

        eventBus.on(EVENTS.BOSS_DEFEATED, () => {
            if (this.els.bossValue) {
                this.els.bossValue.textContent = '¡Abatido!';
                this.els.bossValue.classList.add('boss-slain');
            }
        });

        eventBus.on(EVENTS.MUSIC_STATE, ({ playing, inCombat, isOverworld }) => {
            if (this.els.btnMusic) {
                let label = '🔇 Música: OFF [M]';
                if (playing) {
                    if (inCombat) label = '🎵 Música: Combate [M]';
                    else if (isOverworld) label = '🎵 Música: Bosque [M]';
                    else label = '🎵 Música: Mazmorra [M]';
                }
                this.els.btnMusic.textContent = label;
                this.els.btnMusic.classList.toggle('active-toggle', playing);
            }
        });

        eventBus.on(EVENTS.VOICE_STATE, ({ enabled }) => {
            if (this.els.btnVoice) {
                this.els.btnVoice.textContent = enabled ? '🗣️ Gritos: ON [V]' : '🔇 Gritos: OFF [V]';
                this.els.btnVoice.classList.toggle('active-toggle', enabled);
            }
        });

        eventBus.on(EVENTS.GAME_STATE_CHANGED, ({ state }) => {
            if (this.els.btnPause) {
                const isPaused = state === 'PAUSED';
                this.els.btnPause.textContent = isPaused ? '▶️ Reanudar [P]' : '⏸️ Pausa [P]';
                this.els.btnPause.classList.toggle('active-toggle', isPaused);
            }
        });

        // Botón directo para Salir al Bosque Exterior (o ir a la Hoguera Central si ya estás en el Bosque)
        this.els.btnForestExit?.addEventListener('click', (e) => {
            e.currentTarget.blur();
            if (this.currentZoneId === ZONE_ID.OVERWORLD) {
                eventBus.emit(EVENTS.ZONE_CHANGE_REQUEST, {
                    targetZoneId: ZONE_ID.OVERWORLD,
                    fromZoneId: ZONE_ID.OVERWORLD,
                    teleportToCamp: true
                });
            } else {
                eventBus.emit(EVENTS.ZONE_CHANGE_REQUEST, {
                    targetZoneId: ZONE_ID.OVERWORLD,
                    fromZoneId: this.currentZoneId
                });
            }
        });

        this.els.btnQuests?.addEventListener('click', (e) => {
            e.currentTarget.blur();
            eventBus.emit(EVENTS.TOGGLE_QUESTS);
        });
        this.els.btnPause?.addEventListener('click', (e) => {
            e.currentTarget.blur();
            eventBus.emit(EVENTS.TOGGLE_PAUSE);
        });
        this.els.btnSave?.addEventListener('click', (e) => {
            e.currentTarget.blur();
            eventBus.emit(EVENTS.TOGGLE_SAVE_MODAL);
        });
        this.els.btnShop?.addEventListener('click', (e) => {
            e.currentTarget.blur();
            eventBus.emit(EVENTS.TOGGLE_SHOP);
        });
        this.els.btnLore?.addEventListener('click', (e) => {
            e.currentTarget.blur();
            eventBus.emit(EVENTS.TOGGLE_LORE);
        });
        this.els.btnMusic?.addEventListener('click', (e) => {
            e.currentTarget.blur();
            eventBus.emit(EVENTS.MUSIC_TOGGLE);
        });
        this.els.btnVoice?.addEventListener('click', (e) => {
            e.currentTarget.blur();
            eventBus.emit(EVENTS.VOICE_TOGGLE);
        });

        this.els.slot1?.addEventListener('click', () => eventBus.emit(EVENTS.USE_ITEM_SLOT, { slot: 1 }));
        this.els.slot2?.addEventListener('click', () => eventBus.emit(EVENTS.USE_ITEM_SLOT, { slot: 2 }));
        this.els.slot3?.addEventListener('click', () => eventBus.emit(EVENTS.USE_ITEM_SLOT, { slot: 3 }));
    }

    updatePartyCount(count = 1) {
        if (this.els.partyValue) {
            this.els.partyValue.textContent = `${count} / 4`;
            this.els.partyValue.style.color = count >= 4 ? '#4ade80' : '#fef08a';
        }
    }

    /**
     * Escribe textContent solo si cambió (evita invalidar estilo/layout en cada frame).
     * @param {HTMLElement|null} el
     * @param {string} value
     */
    _setText(el, value) {
        if (!el || el._hudText === value) return;
        el._hudText = value;
        el.textContent = value;
    }

    /** Escribe style.width solo si cambió. */
    _setWidth(el, value) {
        if (!el || el._hudWidth === value) return;
        el._hudWidth = value;
        el.style.width = value;
    }

    /** Alterna una clase solo si su estado cambió. */
    _setClass(el, cls, on) {
        if (!el) return;
        const key = `_hudCls_${cls}`;
        if (el[key] === on) return;
        el[key] = on;
        el.classList.toggle(cls, on);
    }

    updatePlayer(player) {
        if (!player) return;
        const els = this.els;

        if (this.lastRenderedHeroId !== player.heroId) {
            this.lastRenderedHeroId = player.heroId;
            if (els.portraitImg) {
                // Rehabilitar la imagen por si un fallo de carga previo (onerror en index.html) la ocultó
                els.portraitImg.style.display = '';
                if (els.portraitCanvas) els.portraitCanvas.style.display = 'none';
                els.portraitImg.src = `./assets/heroes/${player.heroId}.jpg`;
            }
            if (els.portraitCanvas) {
                PortraitRenderer.renderToCanvas(els.portraitCanvas, player.heroId);
            }
        }

        this._setText(els.heroName, player.name);
        this._setText(els.heroTitle, player.title);

        const hpPct = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
        this._setWidth(els.hpFill, `${hpPct.toFixed(1)}%`);
        this._setText(els.hpText, `${Math.ceil(player.hp)} / ${player.maxHp}`);

        const stamPct = Math.max(0, Math.min(100, (player.stamina / player.maxStamina) * 100));
        this._setWidth(els.staminaFill, `${stamPct.toFixed(1)}%`);
        this._setText(els.staminaText, `${Math.floor(player.stamina)} / ${player.maxStamina}`);

        this._setText(els.atkValue, `${player.effectiveDamage}`);
        this._setText(els.defValue, `${player.effectiveDefense}`);
        this._setText(els.goldValue, `${player.gold}`);

        if (els.weaponPill && els.weaponValue) {
            const spec = typeof player.equippedWeapon === 'string'
                ? SPECIAL_WEAPONS[player.equippedWeapon]
                : player.equippedWeapon;
            const hasWeapon = Boolean(spec && spec.name);
            this._setClass(els.weaponPill, 'hidden', !hasWeapon);
            if (hasWeapon) this._setText(els.weaponValue, spec.name);
        }

        this._setText(els.slotHealCount, `${player.inventory.healPotions}`);
        this._setText(els.slotStrCount, `${player.inventory.strengthPotions}`);
        this._setText(els.slotSpdCount, `${player.inventory.speedPotions}`);

        this._setText(els.skillName, player.skillData.name);
        if (els.skillStatus) {
            const onCd = player.skillCooldownTimer > 0;
            this._setText(els.skillStatus, onCd ? `${player.skillCooldownTimer.toFixed(1)}s` : 'Lista [Click Der]');
            this._setClass(els.skillStatus, 'on-cooldown', onCd);
        }

        if (els.secondSkillStatus) {
            let text;
            let onCd = true;
            if (!player.secondSkillUnlocked) {
                text = '🔒 Misión [J]';
            } else if (player.secondSkillCooldownTimer > 0) {
                text = `${player.secondSkillCooldownTimer.toFixed(1)}s`;
            } else {
                text = '⚡ Lista [Tecla F]';
                onCd = false;
            }
            this._setText(els.secondSkillStatus, text);
            this._setClass(els.secondSkillStatus, 'on-cooldown', onCd);
        }
    }

    resetWorldCounters(discoveredRooms = 1, totalRooms = 7) {
        if (this.els.roomsValue) {
            this.els.roomsValue.textContent = `${discoveredRooms} / ${totalRooms}`;
        }
        if (this.els.bossValue) {
            this.els.bossValue.textContent = 'En el Santuario';
            this.els.bossValue.classList.remove('boss-slain');
        }
    }
}
