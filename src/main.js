/**
 * @fileoverview Punto de entrada principal (Orquestador Capa 6) de HeroQuest 2.5D — Edición Mundo Libre.
 * Gestiona la transición persistente entre el Bosque Real de Loretome (estilo Zelda clásico)
 * y las 4 Mazmorras conectadas (Bastión de Fellmarg, Cripta del Rey Brujo, Forja de Kellar y Templo del Pantano).
 */

import { TILE, GAME_STATE, ZONE_ID, EVENTS, FURNITURE_TYPE } from './config/constants.js';
import { HERO_LIST } from './config/heroesData.js';
import { MENTOR_LORE } from './config/dialoguesData.js';
import { getPrisonerAssignment, getRescueStatusList } from './config/questsData.js';

import { eventBus } from './core/EventBus.js';
import { GameLoop } from './core/GameLoop.js';
import { InputManager } from './core/InputManager.js';
import { Camera } from './core/Camera.js';
import { SaveManager } from './core/SaveManager.js';

import { BoardGenerator } from './world/BoardGenerator.js';
import { RaycasterLOS } from './world/RaycasterLOS.js';
import { InteractionSystem } from './world/InteractionSystem.js';
import { QuestSystem } from './world/QuestSystem.js';

import { Player, CompanionHero } from './entities/Player.js';
import { Monster, AI_STATE } from './entities/Monster.js';
import { LootItem } from './entities/LootItem.js';
import { ParticleSystem } from './entities/ParticleSystem.js';

import { RenderEngine } from './render/RenderEngine.js';
import { PortraitRenderer } from './render/PortraitRenderer.js';

import { SoundFX } from './audio/SoundFX.js';
import { DungeonSynth } from './audio/DungeonSynth.js';
import { VoiceTTS } from './audio/VoiceTTS.js';

import { HUDController } from './ui/HUDController.js';
import { DialogBanner } from './ui/DialogBanner.js';
import { BubbleManager } from './ui/BubbleManager.js';
import { ShopModal } from './ui/ShopModal.js';
import { SaveModal } from './ui/SaveModal.js';
import { QuestsModal } from './ui/QuestsModal.js';

class HeroQuestApp {
    constructor() {
        /** @type {HTMLCanvasElement} */
        this.canvas = document.getElementById('game-canvas');

        // 1. Subsistemas de Audio y Voz
        this.sfx = new SoundFX();
        this.synth = new DungeonSynth();
        this.tts = new VoiceTTS();

        // 2. Subsistemas Core y Renderizado
        this.camera = new Camera(window.innerWidth, window.innerHeight);
        this.input = new InputManager(this.canvas);
        this.renderer = new RenderEngine(this.canvas, this.camera);
        this.particles = new ParticleSystem();
        this.interaction = new InteractionSystem();

        // 3. Estado del Mundo Multi-Zona (Bosque Exterior + 4 Mazmorras Persistentes)
        this.activeZoneId = ZONE_ID.DUNGEON_FELLMARG;
        /** @type {Map<string, { board: Object, monsters: Array<Monster>, lootItems: Array<LootItem> }>} */
        this.zoneStates = new Map();

        this.board = null;
        this.player = null;
        /** @type {Array<CompanionHero>} */
        this.companions = [];
        /** @type {Array<string>} IDs de los compañeros ya rescatados de sus jaulas */
        this.rescuedHeroIds = [];
        /** @type {Array<Monster>} */
        this.monsters = [];
        /** @type {Array<LootItem>} */
        this.lootItems = [];
        this.inCombat = false;

        // 4. Sistema de Misiones Secundarias y Controladores de UI
        this.quests = new QuestSystem(() => this.player, () => this.companions);
        this.hud = new HUDController();
        this.dialogBanner = new DialogBanner();
        this.bubbles = new BubbleManager();
        this.shopModal = new ShopModal(() => this.player);
        this.saveModal = new SaveModal(this);
        this.questsModal = new QuestsModal(this);

        // Referencias a Modales del DOM
        this.heroModalEl = document.getElementById('hero-modal');
        this.loreModalEl = document.getElementById('lore-modal');
        this.pauseModalEl = document.getElementById('pause-modal');
        this.endgameModalEl = document.getElementById('endgame-modal');
        this.stateBeforeSaveModal = GAME_STATE.MENU;

        // 5. Bucle Principal
        this.loop = new GameLoop(
            (dt, state, elapsed) => this.update(dt, state, elapsed),
            (dt, state, elapsed) => this.render(dt, state, elapsed)
        );

        this._initResizeHandler();
        this._buildHeroSelectionModal();
        this._buildLoreModal();
        this._buildPauseModal();
        this._bindGameplayEvents();

        // Generar mundo de vista previa en segundo plano mientras se elige héroe
        this._setupWorld('barbarian', true);
        this.loop.start();
    }

    _initResizeHandler() {
        const onResize = () => {
            this.renderer.resize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', onResize);
        onResize();
    }

    /**
     * Construye las 4 tarjetas interactivas de selección de clase con retratos vectoriales en vivo.
     */
    _buildHeroSelectionModal() {
        const gridEl = document.getElementById('hero-selection-grid');
        if (!gridEl) return;

        gridEl.innerHTML = '';

        for (const hero of HERO_LIST) {
            const card = document.createElement('div');
            card.className = 'hero-select-card';
            card.innerHTML = `
                <canvas class="hero-card-canvas" width="96" height="96"></canvas>
                <h3 class="hero-card-name">${hero.name}</h3>
                <span class="hero-card-title">${hero.title}</span>
                <p class="hero-card-desc">${hero.description}</p>
                <div class="hero-card-stats">
                    <span>❤️ Vida: <strong>${hero.stats.maxHp}</strong></span>
                    <span>⚡ Stamina: <strong>${hero.stats.maxStamina}</strong></span>
                    <span>⚔️ Ataque: <strong>${hero.stats.attackDamage}</strong></span>
                    <span>🛡️ Defensa: <strong>${hero.stats.defense}</strong></span>
                </div>
                <div class="hero-card-skill">
                    <strong>Habilidad: ${hero.skill.name}</strong><br/>
                    <span>${hero.skill.description}</span>
                </div>
                <button class="hq-btn hq-btn-primary" style="width:100%;">Elegir ${hero.name}</button>
            `;

            const portraitCanvas = card.querySelector('canvas');
            PortraitRenderer.renderToCanvas(portraitCanvas, hero.id);

            card.addEventListener('click', () => {
                this.selectHeroAndStart(hero.id);
            });

            gridEl.appendChild(card);
        }

        const btnOpenSaves = document.getElementById('btn-hero-open-saves');
        btnOpenSaves?.addEventListener('click', () => {
            this.stateBeforeSaveModal = this.loop.getState();
            this.saveModal.open(false);
        });
    }

    /**
     * Configura el pergamino de Lore de Mentor y los botones de inicio (Mazmorra o Bosque Directo).
     */
    _buildLoreModal() {
        const mentorCanvas = document.getElementById('lore-mentor-canvas');
        if (mentorCanvas) {
            PortraitRenderer.renderToCanvas(mentorCanvas, 'mentor');
        }

        const titleEl = document.getElementById('lore-quest-title');
        const subEl = document.getElementById('lore-quest-subtitle');
        const bodyEl = document.getElementById('lore-paragraphs');

        if (titleEl) titleEl.textContent = MENTOR_LORE.questTitle;
        if (subEl) subEl.textContent = MENTOR_LORE.questSubtitle;
        if (bodyEl) {
            bodyEl.innerHTML = MENTOR_LORE.introParagraphs
                .map((p) => `<p>${p}</p>`)
                .join('');
        }

        const startPlayingWithWarCry = () => {
            this.loreModalEl?.classList.add('hidden');
            if (this.loop.getState() === GAME_STATE.LORE) {
                this.loop.setState(GAME_STATE.PLAYING);
                if (this.player) {
                    this.tts.playHeroWarCry(this.player.heroId);
                    eventBus.emit(EVENTS.BUBBLE_SHOW, {
                        entity: this.player,
                        text: this.player.quotes.spawn,
                        duration: 3.5,
                        style: 'hero'
                    });
                }
            }
        };

        const btnClose = document.getElementById('btn-lore-close');
        btnClose?.addEventListener('click', () => {
            startPlayingWithWarCry();
        });

        const btnStartForest = document.getElementById('btn-lore-start-forest');
        btnStartForest?.addEventListener('click', () => {
            startPlayingWithWarCry();
            if (this.activeZoneId !== ZONE_ID.OVERWORLD) {
                this.transitionToZone(ZONE_ID.OVERWORLD, { fromZoneId: this.activeZoneId });
            }
        });

        const btnContinueForest = document.getElementById('btn-endgame-continue-forest');
        btnContinueForest?.addEventListener('click', () => {
            this.endgameModalEl?.classList.add('hidden');
            if (this.player && this.player.dead) {
                this.player.dead = false;
                this.player.hp = this.player.maxHp;
                this.player.stamina = this.player.maxStamina;
            }
            this.synth.start();
            this.loop.setState(GAME_STATE.PLAYING);
            this.transitionToZone(ZONE_ID.OVERWORLD, {
                fromZoneId: this.activeZoneId,
                teleportToCamp: true
            });
        });

        const btnRestart = document.getElementById('btn-restart-game');
        btnRestart?.addEventListener('click', () => {
            this.endgameModalEl?.classList.add('hidden');
            this.heroModalEl?.classList.remove('hidden');
            this.loop.setState(GAME_STATE.MENU);
        });
    }

    /**
     * Actualiza en el Pergamino de Lore inicial el recuadro dinámico con los 3 compañeros cautivos.
     */
    _updateLorePrisonersSummary(heroId) {
        const boxEl = document.getElementById('lore-prisoners-summary');
        if (!boxEl) return;

        const statusList = getRescueStatusList(heroId, this.rescuedHeroIds);
        const captives = statusList.filter((h) => h.status !== 'leader');
        const leader = statusList.find((h) => h.status === 'leader');

        boxEl.innerHTML = `
            <h4>🛡️ Estado Inicial de los 4 Campeones — Comienzas en Solitario (1/4)</h4>
            <p style="font-size:0.86rem; margin-bottom:6px;">
                Has escapado de la emboscada como <strong>${leader?.name || 'Héroe'}</strong>. Para romper el <strong>Sello de los Cuatro Campeones</strong> del <em>Santuario Final de Zargon</em>, rescata uno a uno a tus 3 compañeros cautivos:
            </p>
            <ul style="font-size:0.85rem; line-height:1.45;">
                ${captives
                    .map(
                        (c) =>
                            `<li><strong>${c.name} (${c.title}):</strong> ${
                                c.status === 'rescued'
                                    ? '<span style="color:#15803d; font-weight:700;">¡Ya Rescatado!</span>'
                                    : `Cautivo en Jaula Rúnica dentro de <strong>${c.dungeonName}</strong>`
                            }</li>`
                    )
                    .join('')}
            </ul>
        `;
    }

    /**
     * Configura el modal de Pausa Táctica y sus accesos directos.
     */
    _buildPauseModal() {
        const btnResume = document.getElementById('btn-pause-resume');
        const btnQuests = document.getElementById('btn-pause-quests');
        const btnForest = document.getElementById('btn-pause-forest');
        const btnSaves = document.getElementById('btn-pause-saves');
        const btnShop = document.getElementById('btn-pause-shop');
        const btnLore = document.getElementById('btn-pause-lore');
        const btnRestart = document.getElementById('btn-pause-restart');

        btnResume?.addEventListener('click', () => {
            this.pauseModalEl?.classList.add('hidden');
            this.loop.setState(GAME_STATE.PLAYING);
        });

        btnQuests?.addEventListener('click', () => {
            this.pauseModalEl?.classList.add('hidden');
            this.loop.setState(GAME_STATE.QUESTS_MODAL);
            this.questsModal.show();
        });

        btnForest?.addEventListener('click', () => {
            this.pauseModalEl?.classList.add('hidden');
            this.loop.setState(GAME_STATE.PLAYING);
            if (this.activeZoneId === ZONE_ID.OVERWORLD) {
                this.transitionToZone(ZONE_ID.OVERWORLD, {
                    fromZoneId: ZONE_ID.OVERWORLD,
                    teleportToCamp: true
                });
            } else {
                this.transitionToZone(ZONE_ID.OVERWORLD, {
                    fromZoneId: this.activeZoneId
                });
            }
        });

        btnSaves?.addEventListener('click', () => {
            this.pauseModalEl?.classList.add('hidden');
            this.stateBeforeSaveModal = GAME_STATE.PLAYING;
            this.loop.setState(GAME_STATE.SAVE_MODAL);
            this.saveModal.open(true);
        });

        btnShop?.addEventListener('click', () => {
            this.pauseModalEl?.classList.add('hidden');
            this.loop.setState(GAME_STATE.SHOP);
            this.shopModal.open();
        });

        btnLore?.addEventListener('click', () => {
            this.pauseModalEl?.classList.add('hidden');
            this._updateLorePrisonersSummary(this.player?.heroId || 'barbarian');
            this.loop.setState(GAME_STATE.LORE);
            this.loreModalEl?.classList.remove('hidden');
        });

        btnRestart?.addEventListener('click', () => {
            this.pauseModalEl?.classList.add('hidden');
            this.heroModalEl?.classList.remove('hidden');
            this.loop.setState(GAME_STATE.MENU);
        });
    }

    _updatePauseSummary() {
        const summaryEl = document.getElementById('pause-party-summary');
        if (!summaryEl || !this.player || !this.board) return;
        const disc = this.board.rooms.filter((r) => r.discovered).length;
        const partyCount = 1 + this.companions.length;
        summaryEl.innerHTML = `
            <div>Líder: <strong>${this.player.name} (${Math.ceil(this.player.hp)}/${this.player.maxHp} ❤️)</strong></div>
            <div>Héroes Reunidos: <strong style="color:${partyCount >= 4 ? '#4ade80' : '#fef08a'};">👥 ${partyCount} / 4 (Reto Final)</strong></div>
            <div>Zona Actual: <strong style="color:#86efac;">${this.board.zoneName || 'Mazmorra'}</strong></div>
            <div>Tesoro Actual: <strong style="color:#facc15;">🪙 ${this.player.gold} Oro</strong></div>
            <div>Zonas Descubiertas: <strong>🚪 ${disc} / ${this.board.rooms.length}</strong></div>
            <div>Nivel de Equipo: <strong>Arma Nv.${this.player.weaponLevel} / Armadura Nv.${this.player.armorLevel}</strong></div>
        `;
    }

    /**
     * Vincula todos los eventos globales del EventBus.
     */
    _bindGameplayEvents() {
        // Interacción contextual (Tecla E / 0)
        eventBus.on(EVENTS.INTERACT_REQUEST, () => {
            if (this.loop.getState() !== GAME_STATE.PLAYING) return;
            const interacted = this.interaction.tryInteract(this.player, this.board);
            if (interacted) {
                RaycasterLOS.updateFogOfWar(this.board, this.player.x, this.player.y);
            }
        });

        // Petición de cambio de Zona (Mazmorra <-> Bosque Exterior tipo Zelda)
        eventBus.on(EVENTS.ZONE_CHANGE_REQUEST, (payload) => {
            if (!this.player) return;
            this.transitionToZone(payload.targetZoneId, payload);
        });

        // Descansar en la Hoguera del Campamento Real del Bosque
        eventBus.on(EVENTS.CAMPFIRE_REST, ({ campfire }) => {
            if (!this.player) return;
            this.player.heal(this.player.maxHp, false);
            this.player.stamina = this.player.maxStamina;
            for (const ally of this.companions) {
                ally.dead = false;
                ally.downedTimer = 0;
                ally.heal(ally.maxHp, true);
                ally.stamina = ally.maxStamina;
            }
            eventBus.emit(EVENTS.PARTICLE_BURST, {
                x: campfire ? campfire.centerX : this.player.x,
                y: campfire ? campfire.centerY : this.player.y,
                z: 20,
                count: 28,
                color: '#facc15'
            });
            eventBus.emit(EVENTS.FLOATING_TEXT, {
                x: this.player.x,
                y: this.player.y,
                z: 48,
                text: '🔥 ¡GRUPO RESTAURADO EN LA HOGUERA!',
                color: '#4ade80',
                size: 16
            });
            eventBus.emit(EVENTS.DIALOG_SHOW, {
                speakerId: 'mentor',
                speakerName: 'Hoguera del Campamento Real',
                title: 'Claro Central de Loretome',
                text: 'El calor de la hoguera restaura por completo las fuerzas y heridas de los 4 héroes. Tus compañeros están listos para adentrarse en la siguiente mazmorra.',
                duration: 6.5
            });
        });

        // Uso de pociones del cinturón (Teclas 1, 2, 3)
        eventBus.on(EVENTS.USE_ITEM_SLOT, ({ slot }) => {
            if (this.loop.getState() !== GAME_STATE.PLAYING || !this.player) return;
            this.player.useItemSlot(slot, this.companions);
        });

        // Creación de botín físico con rebote en eje Z
        eventBus.on(EVENTS.SPAWN_LOOT, (lootConfig) => {
            this.lootItems.push(new LootItem(lootConfig));
        });

        // Invocación de refuerzos por el Jefe (Fases 2 y 3)
        eventBus.on(EVENTS.BOSS_SUMMON, ({ spawns = [] }) => {
            for (const sp of spawns) {
                const m = new Monster(sp.type, sp.x, sp.y, 'sanctum');
                m.state = AI_STATE.CHASE;
                m.vz = 220;
                this.monsters.push(m);
                eventBus.emit(EVENTS.PARTICLE_BURST, {
                    x: sp.x,
                    y: sp.y,
                    z: 18,
                    count: 18,
                    color: '#c084fc'
                });
            }
        });

        // Contabilizar bajas enemigas
        eventBus.on(EVENTS.MONSTER_KILLED, () => {
            if (this.player) {
                this.player.kills++;
            }
        });

        // Rescate de uno de los 3 Compañeros cautivos en Jaula Rúnica [E]
        eventBus.on(EVENTS.HERO_RESCUED, ({ heroId, cage }) => {
            this.rescueHero(heroId, cage?.centerX, (cage?.centerY || this.player?.y || 0) + 26);
        });

        // Interacción con cualquiera de los 6 NPCs de Misiones Secundarias en el Bosque 4x
        eventBus.on(EVENTS.NPC_INTERACT, ({ npc }) => {
            if (!npc || !this.quests) return;
            const res = this.quests.interactWithQuest(npc.questId);
            if (!res) return;

            this.sfx.playTone(res.status === 'completed' ? 680 : 520, 0.14, 'triangle', 0.16);
            this.hud.updatePlayer(this.player);
        });

        // Derrota del Jefe de una Mazmorra
        eventBus.on(EVENTS.BOSS_DEFEATED, () => {
            // Si estamos en una de las 3 mazmorras de rescate y el prisionero aún estaba en la jaula, liberarlo automáticamente
            if (this.board && !this.board.isOverworld && !this.board.isFinalDungeon) {
                const cage = this.board.furniture?.find(
                    (f) => f.type === FURNITURE_TYPE.HERO_CAGE && !f.opened
                );
                if (cage && cage.prisonerHeroId) {
                    cage.opened = true;
                    cage.inspected = true;
                    this.rescueHero(cage.prisonerHeroId, cage.centerX, cage.centerY + 26);
                }
            }

            setTimeout(() => {
                if (this.player && !this.player.dead) {
                    this.triggerEndgame(true);
                }
            }, 1500);
        });

        // Derrota del Jugador
        eventBus.on(EVENTS.GAME_DEFEAT, () => {
            setTimeout(() => {
                this.triggerEndgame(false);
            }, 900);
        });

        // Abrir / Cerrar Diario de Misiones Secundarias y Rescate (Tecla J)
        eventBus.on(EVENTS.TOGGLE_QUESTS, () => {
            const st = this.loop.getState();
            if (st === GAME_STATE.PLAYING || st === GAME_STATE.PAUSED) {
                this.pauseModalEl?.classList.add('hidden');
                this.shopModal.close();
                this.saveModal.close();
                this.loreModalEl?.classList.add('hidden');
                this.loop.setState(GAME_STATE.QUESTS_MODAL);
                this.questsModal.show();
            } else if (st === GAME_STATE.QUESTS_MODAL) {
                this.questsModal.hide();
                this.loop.setState(GAME_STATE.PLAYING);
            }
        });

        // Pausar / Reanudar partida (Tecla P, Escape o botón Pausa)
        eventBus.on(EVENTS.TOGGLE_PAUSE, () => {
            if (this.saveModal.isOpen) {
                this.saveModal.close();
                const targetState = this.stateBeforeSaveModal === GAME_STATE.MENU ? GAME_STATE.MENU : GAME_STATE.PLAYING;
                this.loop.setState(targetState);
                return;
            }

            const st = this.loop.getState();
            if (st === GAME_STATE.PLAYING) {
                this._updatePauseSummary();
                this.pauseModalEl?.classList.remove('hidden');
                this.loop.setState(GAME_STATE.PAUSED);
            } else if (st === GAME_STATE.PAUSED) {
                this.pauseModalEl?.classList.add('hidden');
                this.loop.setState(GAME_STATE.PLAYING);
            } else if (st === GAME_STATE.SHOP) {
                this.shopModal.close();
                this.loop.setState(GAME_STATE.PLAYING);
            } else if (st === GAME_STATE.LORE) {
                this.loreModalEl?.classList.add('hidden');
                this.loop.setState(GAME_STATE.PLAYING);
            } else if (st === GAME_STATE.QUESTS_MODAL) {
                this.questsModal.hide();
                this.loop.setState(GAME_STATE.PLAYING);
            }
        });

        // Abrir / Cerrar Armería del Imperio (Tecla B)
        eventBus.on(EVENTS.TOGGLE_SHOP, () => {
            const st = this.loop.getState();
            if (st === GAME_STATE.PLAYING || st === GAME_STATE.PAUSED || st === GAME_STATE.QUESTS_MODAL) {
                this.pauseModalEl?.classList.add('hidden');
                this.questsModal.hide();
                this.saveModal.close();
                this.loop.setState(GAME_STATE.SHOP);
                this.shopModal.open();
            } else if (st === GAME_STATE.SHOP) {
                this.shopModal.close();
                this.loop.setState(GAME_STATE.PLAYING);
            }
        });

        // Abrir / Cerrar Pergamino de Lore (Tecla L)
        eventBus.on(EVENTS.TOGGLE_LORE, () => {
            const st = this.loop.getState();
            if (st === GAME_STATE.PLAYING || st === GAME_STATE.PAUSED || st === GAME_STATE.QUESTS_MODAL) {
                this.pauseModalEl?.classList.add('hidden');
                this.questsModal.hide();
                this.saveModal.close();
                this._updateLorePrisonersSummary(this.player?.heroId || 'barbarian');
                this.loop.setState(GAME_STATE.LORE);
                this.loreModalEl?.classList.remove('hidden');
            } else if (st === GAME_STATE.LORE) {
                this.loreModalEl?.classList.add('hidden');
                this.loop.setState(GAME_STATE.PLAYING);
            }
        });

        // Abrir / Cerrar Gestión de Partidas SQLite (Tecla G)
        eventBus.on(EVENTS.TOGGLE_SAVE_MODAL, () => {
            if (this.saveModal.isOpen) {
                this.saveModal.close();
                const resumeState = this.stateBeforeSaveModal === GAME_STATE.MENU
                    ? GAME_STATE.MENU
                    : GAME_STATE.PLAYING;
                this.loop.setState(resumeState);
            } else {
                const st = this.loop.getState();
                this.stateBeforeSaveModal = st === GAME_STATE.MENU ? GAME_STATE.MENU : GAME_STATE.PLAYING;
                this.pauseModalEl?.classList.add('hidden');
                this.questsModal.hide();
                this.shopModal.close();
                this.loreModalEl?.classList.add('hidden');
                if (st !== GAME_STATE.MENU) {
                    this.loop.setState(GAME_STATE.SAVE_MODAL);
                }
                const canSave = st !== GAME_STATE.MENU && Boolean(this.player);
                this.saveModal.open(canSave);
            }
        });

        // Guardado Rápido en SQLite Ranura 1 (Tecla F5)
        eventBus.on(EVENTS.QUICK_SAVE, async () => {
            if (this.loop.getState() !== GAME_STATE.PLAYING || !this.player) return;
            await SaveManager.saveToSlot(1, this, `Guardado Rápido [F5] — ${this.player.name}`);
            eventBus.emit(EVENTS.FLOATING_TEXT, {
                x: this.player.x,
                y: this.player.y,
                z: this.player.z + 44,
                text: '💾 PARTIDA GUARDADA [F5]',
                color: '#34d399',
                size: 16
            });
        });

        // Carga Rápida desde SQLite Ranura 1 o 0 (Tecla F9)
        eventBus.on(EVENTS.QUICK_LOAD, async () => {
            let record = await SaveManager.loadFromSlot(1);
            if (!record || !record.worldState) {
                record = await SaveManager.loadFromSlot(0);
            }
            if (record && record.worldState) {
                this.restoreFromSaveData(record);
            }
        });

        // Autoguardado automático en Ranura 0 al descubrir cada nueva sala
        eventBus.on(EVENTS.ROOM_DISCOVERED, ({ room }) => {
            if (this.loop.getState() === GAME_STATE.PLAYING && this.player) {
                SaveManager.saveToSlot(0, this, `Autoguardado: ${room?.name || 'Zona Descubierta'}`);
            }
        });
    }

    /**
     * Rescata a uno de los 3 héroes cautivos y lo incorpora permanentemente al grupo como Compañero IA.
     */
    rescueHero(heroId, spawnX, spawnY) {
        if (!heroId || !this.player) return;
        if (heroId === this.player.heroId || this.rescuedHeroIds.includes(heroId)) return;

        this.rescuedHeroIds.push(heroId);

        const slotIndex = this.companions.length;
        const x = spawnX ?? (this.player.x + 32);
        const y = spawnY ?? (this.player.y + 32);
        const newAlly = new CompanionHero(heroId, x, y, slotIndex);
        newAlly.weaponLevel = this.player.weaponLevel;
        newAlly.armorLevel = this.player.armorLevel;
        newAlly.vz = 230;
        this.companions.push(newAlly);

        const partyCount = 1 + this.companions.length;
        this.hud.updatePartyCount(partyCount);
        this.tts.playHeroWarCry(heroId);

        eventBus.emit(EVENTS.PARTICLE_BURST, {
            x,
            y,
            z: 24,
            count: 34,
            color: '#4ade80'
        });
        eventBus.emit(EVENTS.FLOATING_TEXT, {
            x,
            y,
            z: 52,
            text: `🎉 ¡${newAlly.name.toUpperCase()} RESCATADO (${partyCount}/4)!`,
            color: '#4ade80',
            size: 16
        });

        const allRescued = partyCount >= 4;
        eventBus.emit(EVENTS.DIALOG_SHOW, {
            speakerId: heroId,
            speakerName: `${newAlly.name} — ${newAlly.title}`,
            title: allRescued
                ? '🔓 ¡4/4 HÉROES REUNIDOS! RETO FINAL DESBLOQUEADO'
                : `Compañero Rescatado (${partyCount}/4 Héroes en el Grupo)`,
            text: allRescued
                ? `«¡Gracias por romper mis cadenas, ${this.player.name}! ¡Los 4 Campeones de Loretome estamos por fin reunidos! El Sello del Santuario Final de Zargon (en la Ciénaga Suroeste del Bosque) se ha roto: ¡vayamos juntos a por la victoria final!»`
                : `«¡Libre al fin! Mi acero y mi vida son tuyos, ${this.player.name}. Aún quedan ${4 - partyCount} compañero(s) cautivo(s) en las otras mazmorras antes de que podamos abrir el Reto Final.»`,
            duration: 9.0
        });

        this._updateLorePrisonersSummary(this.player.heroId);
    }

    /**
     * Inicia una nueva partida con la clase de héroe elegida (comenzando en solitario 1/4).
     */
    selectHeroAndStart(heroId) {
        this.sfx.ensureContext();
        this.synth.start();

        this._setupWorld(heroId, false);

        this.heroModalEl?.classList.add('hidden');
        this.pauseModalEl?.classList.add('hidden');
        this.endgameModalEl?.classList.add('hidden');
        this.questsModal.hide();
        this.shopModal.close();
        this.saveModal.close();

        this.loreModalEl?.classList.remove('hidden');
        this.loop.setState(GAME_STATE.LORE);

        eventBus.emit(EVENTS.DIALOG_SHOW, {
            speakerId: 'mentor',
            speakerName: 'Mentor — Guardián de Loretome',
            title: MENTOR_LORE.questTitle,
            text: MENTOR_LORE.welcomeBanner,
            duration: 9.0
        });
    }

    /**
     * Crea o recupera de caché una Zona del Mundo Libre (Bosque Exterior 4x o cualquiera de las 4 Mazmorras).
     * @param {string} zoneId
     * @param {string|null} [leaderHeroIdOverride=null]
     */
    _getOrCreateZoneState(zoneId, leaderHeroIdOverride = null) {
        if (this.zoneStates.has(zoneId)) {
            return this.zoneStates.get(zoneId);
        }

        const leaderId = leaderHeroIdOverride || this.player?.heroId || 'barbarian';
        const assignment = getPrisonerAssignment(leaderId);
        const prisonerHeroId = assignment[zoneId] || null;

        const board = BoardGenerator.generate(zoneId, prisonerHeroId);

        // Si el héroe de esta mazmorra ya fue rescatado previamente, abrir su jaula
        if (prisonerHeroId && this.rescuedHeroIds.includes(prisonerHeroId)) {
            for (const f of board.furniture) {
                if (f.type === FURNITURE_TYPE.HERO_CAGE) {
                    f.opened = true;
                    f.inspected = true;
                }
            }
        }

        const monsters = board.monsterSpawns.map(
            (sp) =>
                new Monster(sp.type, sp.col * TILE, sp.row * TILE, sp.roomId, {
                    isSubBoss: Boolean(sp.isSubBoss),
                    customName: sp.customName || null
                })
        );
        const zoneObj = {
            board,
            monsters,
            lootItems: []
        };
        this.zoneStates.set(zoneId, zoneObj);
        return zoneObj;
    }

    /**
     * Cambia entre una Mazmorra y el Bosque Real de Loretome 4x (o hacia otra Mazmorra),
     * verificando el Sello de los 4 Héroes si se intenta entrar al Reto Final.
     * @param {string} targetZoneId
     * @param {{ fromZoneId?: string, portalId?: string, teleportToCamp?: boolean }} [options]
     */
    transitionToZone(targetZoneId, options = {}) {
        // Barrera de Seguridad del Reto Final: exige los 4 Héroes reunidos (Líder + 3 Compañeros)
        if (targetZoneId === ZONE_ID.DUNGEON_SWAMP && this.companions.length < 3) {
            const partyCount = 1 + this.companions.length;
            const statusList = getRescueStatusList(this.player?.heroId || 'barbarian', this.rescuedHeroIds);
            const missing = statusList
                .filter((h) => h.status === 'captive')
                .map((h) => `${h.name} (en ${h.dungeonName})`)
                .join(', ');

            this.sfx.playTone(150, 0.25, 'sawtooth', 0.2);
            if (this.player) {
                eventBus.emit(EVENTS.PARTICLE_BURST, {
                    x: this.player.x,
                    y: this.player.y,
                    z: 20,
                    count: 24,
                    color: '#ef4444'
                });
                eventBus.emit(EVENTS.FLOATING_TEXT, {
                    x: this.player.x,
                    y: this.player.y,
                    z: 48,
                    text: `🔒 SELLO DE LOS 4 HÉROES (${partyCount}/4)`,
                    color: '#f87171',
                    size: 16
                });
            }
            eventBus.emit(EVENTS.DIALOG_SHOW, {
                speakerId: 'mentor',
                speakerName: 'Sello de los Cuatro Campeones — Reto Final',
                title: `Acceso Bloqueado (${partyCount}/4 Héroes Reunidos)`,
                text: `¡El Santuario Final de Zargon solo puede abrirse cuando los 4 Héroes estén unidos! Aún debes rescatar a: ${missing}.`,
                duration: 8.5
            });
            return;
        }

        const fromZoneId = options.fromZoneId || this.activeZoneId;

        // 1. Guardar referencias actuales en la zona saliente
        if (this.board && this.activeZoneId) {
            this.zoneStates.set(this.activeZoneId, {
                board: this.board,
                monsters: this.monsters,
                lootItems: this.lootItems
            });
        }

        // 2. Obtener o generar la zona destino
        const nextZone = this._getOrCreateZoneState(targetZoneId);
        this.activeZoneId = targetZoneId;
        this.board = nextZone.board;
        this.monsters = nextZone.monsters;
        this.lootItems = nextZone.lootItems;
        this.particles.clear();
        this.bubbles.clear();
        this.interaction.activeHighlight = null;

        // 3. Calcular punto de aparición para el Héroe Líder y los Compañeros rescatados
        let spawnX = this.board.playerSpawn.x;
        let spawnY = this.board.playerSpawn.y;

        if (targetZoneId === ZONE_ID.OVERWORLD) {
            if (options.teleportToCamp) {
                // Viaje al Claro del Campamento Real en el centro del Mapa 4x
                spawnX = this.board.campSpawn?.x || 52.5 * TILE;
                spawnY = this.board.campSpawn?.y || 39.0 * TILE;
            } else if (fromZoneId && fromZoneId !== ZONE_ID.OVERWORLD && Array.isArray(this.board.portals)) {
                // Aparecer frente a la fachada exterior de la mazmorra de la que salimos
                const matchingPortal = this.board.portals.find((p) => p.targetZoneId === fromZoneId);
                if (matchingPortal) {
                    spawnX = matchingPortal.spawnOutX;
                    spawnY = matchingPortal.spawnOutY;
                }
            }
        }

        if (this.player) {
            this.player.x = spawnX;
            this.player.y = spawnY;
            this.player.z = 0;
            this.player.vz = 0;

            const offsets = [
                { dx: -42, dy: 24 },
                { dx: 42, dy: 24 },
                { dx: 0, dy: 44 }
            ];
            this.companions.forEach((ally, idx) => {
                const off = offsets[idx % offsets.length];
                ally.x = spawnX + off.dx;
                ally.y = spawnY + off.dy;
                ally.z = 0;
                ally.vz = 0;
                if (ally.dead) {
                    ally.dead = false;
                    ally.hp = Math.max(25, Math.round(ally.maxHp * 0.5));
                }
            });
        }

        RaycasterLOS.updateFogOfWar(this.board, spawnX, spawnY);
        this.camera.snapTo(spawnX, spawnY);

        this._emitZoneChangedEvent();

        // Efecto visual y diálogo de transición
        if (this.player) {
            eventBus.emit(EVENTS.PARTICLE_BURST, {
                x: this.player.x,
                y: this.player.y,
                z: 18,
                count: 22,
                color: this.board.isOverworld ? '#4ade80' : '#facc15'
            });
            eventBus.emit(EVENTS.FLOATING_TEXT, {
                x: this.player.x,
                y: this.player.y,
                z: 48,
                text: this.board.isOverworld ? '🌲 BOSQUE REAL DE LORETOME (MAPA 4X)' : `🏰 ${this.board.zoneName.toUpperCase()}`,
                color: this.board.isOverworld ? '#86efac' : '#fde047',
                size: 16
            });

            const zoneLore = MENTOR_LORE.zones?.[targetZoneId];
            if (zoneLore) {
                eventBus.emit(EVENTS.DIALOG_SHOW, {
                    speakerId: 'mentor',
                    speakerName: 'Mentor — Guardián de Loretome',
                    title: this.board.zoneName,
                    text: zoneLore,
                    duration: 7.5
                });
            }

            if (this.loop.getState() === GAME_STATE.PLAYING) {
                SaveManager.saveToSlot(0, this, `Transición: ${this.board.zoneName}`);
            }
        }
    }

    _emitZoneChangedEvent() {
        if (!this.board) return;
        const discoveredRooms = this.board.rooms.filter((r) => r.discovered).length;
        const bossMonster = this.monsters.find((m) => m.isBoss);
        const bossDefeated = !this.board.isOverworld && (!bossMonster || bossMonster.dead);

        eventBus.emit(EVENTS.ZONE_CHANGED, {
            zoneId: this.activeZoneId,
            zoneName: this.board.zoneName,
            isOverworld: Boolean(this.board.isOverworld),
            discoveredRooms,
            totalRooms: this.board.rooms.length,
            bossName: this.board.bossName || 'En el Santuario',
            bossDefeated
        });
    }

    /**
     * Inicializa el mundo completo al comenzar una nueva partida:
     * El héroe elegido empieza SOLO (1/4) y los otros 3 están cautivos en las 3 mazmorras.
     * @param {string} heroId
     * @param {boolean} [isPreview=false]
     */
    _setupWorld(heroId, isPreview = false) {
        this.zoneStates.clear();
        this.rescuedHeroIds = [];
        this.companions = [];
        this.quests.reset();
        this.activeZoneId = ZONE_ID.DUNGEON_FELLMARG;

        const startZone = this._getOrCreateZoneState(this.activeZoneId, heroId);
        this.board = startZone.board;
        this.monsters = startZone.monsters;
        this.lootItems = startZone.lootItems;

        this.particles.clear();
        this.bubbles.clear();

        this.player = new Player(
            heroId,
            this.board.playerSpawn.x,
            this.board.playerSpawn.y,
            false
        );

        // El Héroe elegido empieza en solitario (1/4); los otros 3 deben ser rescatados uno a uno
        this.companions = [];
        this.hud.updatePartyCount(1);
        this._updateLorePrisonersSummary(heroId);

        RaycasterLOS.updateFogOfWar(this.board, this.player.x, this.player.y);
        this.camera.snapTo(this.player.x, this.player.y);

        this.hud.resetWorldCounters(1, this.board.rooms.length);
        this._emitZoneChangedEvent();
        this.player.emitUpdate();

        if (!isPreview) {
            eventBus.emit(EVENTS.GAME_START, { heroId, player: this.player, companions: this.companions });
        }
    }

    /**
     * Hidrata los datos guardados de una zona sobre su tablero recién generado.
     */
    _hydrateZoneFromSaved(zoneId, savedZoneData, leaderHeroId = 'barbarian') {
        const assignment = getPrisonerAssignment(leaderHeroId);
        const prisonerHeroId = assignment[zoneId] || null;
        const board = BoardGenerator.generate(zoneId, prisonerHeroId);

        if (Array.isArray(savedZoneData.doors)) {
            const doorMap = new Map(savedZoneData.doors.map((d) => [d.id, d.open]));
            for (const door of board.doors) {
                if (doorMap.has(door.id)) {
                    door.open = Boolean(doorMap.get(door.id));
                }
            }
        }

        if (Array.isArray(savedZoneData.furniture)) {
            const furnMap = new Map(savedZoneData.furniture.map((f) => [f.id, f]));
            for (const furn of board.furniture) {
                const savedF = furnMap.get(furn.id);
                if (savedF) {
                    furn.inspected = Boolean(savedF.inspected);
                    furn.opened = Boolean(savedF.opened);
                }
            }
        }

        if (prisonerHeroId && this.rescuedHeroIds.includes(prisonerHeroId)) {
            for (const furn of board.furniture) {
                if (furn.type === FURNITURE_TYPE.HERO_CAGE) {
                    furn.opened = true;
                    furn.inspected = true;
                }
            }
        }

        if (Array.isArray(savedZoneData.traps) && Array.isArray(board.traps)) {
            const trapMap = new Map(savedZoneData.traps.map((t) => [t.id, t.state]));
            for (const trap of board.traps) {
                if (trapMap.has(trap.id)) {
                    trap.state = trapMap.get(trap.id);
                }
            }
        }

        if (Array.isArray(savedZoneData.discoveredRooms)) {
            const discSet = new Set(savedZoneData.discoveredRooms);
            for (const room of board.rooms) {
                room.discovered = discSet.has(room.id);
            }
        }

        if (Array.isArray(savedZoneData.fog) && savedZoneData.fog.length === board.rows) {
            board.fog = savedZoneData.fog;
        }

        const monsters = Array.isArray(savedZoneData.monsters)
            ? savedZoneData.monsters.map((mData) => {
                const m = new Monster(mData.type, mData.x, mData.y, mData.roomId, {
                    isSubBoss: Boolean(mData.isSubBoss),
                    customName: mData.customName || null
                });
                m.hp = mData.hp;
                m.maxHp = mData.maxHp || m.maxHp;
                m.state = mData.state || AI_STATE.PATROL;
                m.bossPhase = mData.bossPhase || 1;
                return m;
            })
            : board.monsterSpawns.map(
                (sp) =>
                    new Monster(sp.type, sp.col * TILE, sp.row * TILE, sp.roomId, {
                        isSubBoss: Boolean(sp.isSubBoss),
                        customName: sp.customName || null
                    })
            );

        const lootItems = Array.isArray(savedZoneData.lootItems)
            ? savedZoneData.lootItems.map((l) => new LootItem(l))
            : [];

        return { board, monsters, lootItems };
    }

    /**
     * Reconstruye por completo el estado de la partida (incluyendo Héroes Rescatados, Misiones y Mapa 4x)
     * desde un registro de la BBDD SQLite.
     */
    restoreFromSaveData(saveRecord) {
        const ws = saveRecord?.worldState;
        if (!ws || !ws.player) return;

        this.sfx.ensureContext();
        this.synth.start();

        this.zoneStates.clear();
        this.particles.clear();
        this.bubbles.clear();

        const pData = ws.player;
        this.rescuedHeroIds = Array.isArray(ws.rescuedHeroIds)
            ? [...ws.rescuedHeroIds]
            : Array.isArray(ws.companions)
                ? ws.companions.map((c) => c.heroId)
                : [];

        // 1. Restaurar todas las zonas guardadas en ws.allZones
        const activeZ = ws.activeZoneId || ZONE_ID.DUNGEON_FELLMARG;
        if (ws.allZones && typeof ws.allZones === 'object') {
            for (const [zId, zData] of Object.entries(ws.allZones)) {
                this.zoneStates.set(zId, this._hydrateZoneFromSaved(zId, zData, pData.heroId));
            }
        }

        if (!this.zoneStates.has(activeZ)) {
            this.zoneStates.set(activeZ, this._hydrateZoneFromSaved(activeZ, ws, pData.heroId));
        }

        const currentZoneObj = this.zoneStates.get(activeZ);
        this.activeZoneId = activeZ;
        this.board = currentZoneObj.board;
        this.monsters = currentZoneObj.monsters;
        this.lootItems = currentZoneObj.lootItems;

        // 2. Restaurar Héroe Líder (Jugador) y sus armas/habilidades de misiones secundarias
        this.player = new Player(pData.heroId, pData.x, pData.y, false);
        this.player.z = pData.z || 0;
        this.player.hp = pData.hp;
        this.player.maxHp = pData.maxHp;
        this.player.stamina = pData.stamina;
        this.player.maxStamina = pData.maxStamina;
        this.player.gold = pData.gold;
        this.player.kills = pData.kills || 0;
        this.player.weaponLevel = pData.weaponLevel || 1;
        this.player.armorLevel = pData.armorLevel || 1;
        if (pData.equippedWeapon) {
            this.player.equipSpecialWeapon(pData.equippedWeapon);
        }
        this.player.secondSkillUnlocked = Boolean(pData.secondSkillUnlocked);
        this.player.passiveRegenUnlocked = Boolean(pData.passiveRegenUnlocked);
        this.player.questDefenseBonus = pData.questDefenseBonus || 0;
        if (pData.inventory) {
            this.player.inventory = { ...this.player.inventory, ...pData.inventory };
        }
        this.player.strengthBuffTimer = pData.strengthBuffTimer || 0;
        this.player.speedBuffTimer = pData.speedBuffTimer || 0;

        // 3. Restaurar Compañeros IA rescatados
        if (Array.isArray(ws.companions)) {
            this.companions = ws.companions.map((cData, idx) => {
                const comp = new CompanionHero(cData.heroId, cData.x, cData.y, cData.slotIndex ?? idx);
                comp.z = cData.z || 0;
                comp.hp = cData.hp;
                comp.maxHp = cData.maxHp || comp.maxHp;
                comp.dead = Boolean(cData.dead);
                comp.downedTimer = cData.downedTimer || 0;
                comp.weaponLevel = this.player.weaponLevel;
                comp.armorLevel = this.player.armorLevel;
                return comp;
            });
        } else {
            this.companions = [];
        }

        // 4. Restaurar progreso de las 6 Misiones Secundarias
        this.quests.hydrate(ws.questsState || {});

        this.hud.updatePartyCount(1 + this.companions.length);
        this._updateLorePrisonersSummary(this.player.heroId);

        RaycasterLOS.updateFogOfWar(this.board, this.player.x, this.player.y);
        this.camera.snapTo(this.player.x, this.player.y);

        this._emitZoneChangedEvent();
        this.player.emitUpdate();

        // Cerrar modales y reanudar partida
        this.heroModalEl?.classList.add('hidden');
        this.loreModalEl?.classList.add('hidden');
        this.pauseModalEl?.classList.add('hidden');
        this.endgameModalEl?.classList.add('hidden');
        this.questsModal.hide();
        this.shopModal.close();
        this.saveModal.close();
        this.loop.setState(GAME_STATE.PLAYING);

        eventBus.emit(EVENTS.GAME_LOADED, { saveRecord });
        eventBus.emit(EVENTS.FLOATING_TEXT, {
            x: this.player.x,
            y: this.player.y,
            z: this.player.z + 45,
            text: '📂 PARTIDA CARGADA',
            color: '#facc15',
            size: 16
        });
    }

    /**
     * Muestra el modal de Victoria de Mazmorra (o Victoria Final de Campaña) o Derrota.
     */
    triggerEndgame(isVictory) {
        this.loop.setState(isVictory ? GAME_STATE.VICTORY : GAME_STATE.DEFEAT);

        const isFinalDungeon = Boolean(this.board?.isFinalDungeon);
        if (isVictory && this.player) {
            this.player.addGold(isFinalDungeon ? 500 : 200);
            eventBus.emit(EVENTS.GAME_VICTORY, { player: this.player, isFinalDungeon });
        }

        const discoveredRooms = this.board
            ? this.board.rooms.filter((r) => r.discovered).length
            : 1;
        const partyCount = 1 + this.companions.length;

        if (this.player) {
            SaveManager.recordHallOfFame({
                questId: isFinalDungeon ? 'zargon_final_sanctum' : (this.activeZoneId || 'fellmarg_book_1'),
                heroId: this.player.heroId,
                heroName: this.player.name,
                victory: isVictory,
                gold: this.player.gold,
                kills: this.player.kills,
                roomsDiscovered: discoveredRooms
            });
        }

        const portraitCanvas = document.getElementById('endgame-portrait-canvas');
        const titleEl = document.getElementById('endgame-title');
        const msgEl = document.getElementById('endgame-message');
        const statsEl = document.getElementById('endgame-stats');

        if (portraitCanvas) {
            PortraitRenderer.renderToCanvas(
                portraitCanvas,
                isVictory ? (this.player?.heroId || 'mentor') : 'gargoyle'
            );
        }

        if (titleEl) {
            if (!isVictory) {
                titleEl.textContent = 'HAS CAÍDO EN COMBATE';
                titleEl.style.color = '#ef4444';
            } else if (isFinalDungeon) {
                titleEl.textContent = '🏆 ¡RETO FINAL SUPERADO! ¡LORETOME ES LIBRE!';
                titleEl.style.color = '#4ade80';
            } else {
                titleEl.textContent = `¡${(this.board?.zoneName || 'MAZMORRA').toUpperCase()} CONQUISTADA!`;
                titleEl.style.color = '#facc15';
            }
        }

        if (msgEl) {
            if (!isVictory) {
                msgEl.textContent = MENTOR_LORE.defeat;
            } else if (isFinalDungeon) {
                msgEl.textContent = MENTOR_LORE.victory;
            } else {
                msgEl.textContent =
                    partyCount >= 4
                        ? '¡Has conquistado este bastión y los 4 Campeones de Loretome están por fin reunidos (4/4)! Sal al Bosque y dirígete al Suroeste para cruzar el portal del Santuario Final de Zargon.'
                        : `¡Has derrotado al señor de esta mazmorra (+200 monedas de oro)! Tu grupo cuenta ahora con ${partyCount}/4 Héroes. Regresa al Bosque Exterior para rescatar a los compañeros restantes y completar Misiones Secundarias.`;
            }
        }

        if (statsEl && this.player) {
            statsEl.innerHTML = `
                <div>Campeón Líder: <strong>${this.player.name}</strong></div>
                <div>Héroes Reunidos: <strong style="color:#4ade80;">👥 ${partyCount} / 4</strong></div>
                <div>Oro Total: <strong style="color:#facc15;">🪙 ${this.player.gold}</strong></div>
                <div>Enemigos Abatidos: <strong>⚔️ ${this.player.kills}</strong></div>
                <div>Salas Descubiertas: <strong>🚪 ${discoveredRooms} / ${this.board.rooms.length}</strong></div>
                <div>Nivel de Equipo: <strong>Arma Nv.${this.player.weaponLevel} / Armadura Nv.${this.player.armorLevel}</strong></div>
            `;
        }

        this.endgameModalEl?.classList.remove('hidden');
    }

    /**
     * Bucle de actualización lógica por fotograma.
     */
    update(dt, state, elapsed) {
        if (this.input.mouse.wheelDelta !== 0) {
            this.camera.adjustZoom(this.input.mouse.wheelDelta);
        }

        this.input.updateWorldMouse(this.camera);

        if (state === GAME_STATE.PLAYING && this.board && this.player) {
            const hasLOSFn = (b, x0, y0, x1, y1) => RaycasterLOS.hasLineOfSight(b, x0, y0, x1, y1);

            // 1. Actualizar Héroe Líder (Jugador)
            this.player.update(dt, {
                input: this.input,
                board: this.board,
                monsters: this.monsters,
                interaction: this.interaction,
                companions: this.companions
            });

            // 2. Actualizar Compañeros IA rescatados
            for (const ally of this.companions) {
                ally.updateAI(dt, {
                    leader: this.player,
                    companions: this.companions,
                    board: this.board,
                    monsters: this.monsters,
                    hasLOS: hasLOSFn
                });
            }

            // 3. Actualizar Línea de Visión y Niebla de Guerra
            RaycasterLOS.updateFogOfWar(this.board, this.player.x, this.player.y);

            // 4. Actualizar Trampas y buscar objeto interactuable más cercano [E / 0]
            this.interaction.updateTraps(dt, this.board, [this.player, ...this.companions], this.monsters);
            this.interaction.findNearestInteractable(this.player, this.board);

            // 5. Actualizar Monstruos y comprobar estado de combate para música dinámica
            let anyAggro = false;

            for (const monster of this.monsters) {
                if (monster.dead) continue;
                monster.update(dt, {
                    player: this.player,
                    companions: this.companions,
                    board: this.board,
                    monsters: this.monsters,
                    hasLOS: hasLOSFn
                });
                if (monster.state !== AI_STATE.PATROL) {
                    anyAggro = true;
                }
            }

            if (anyAggro !== this.inCombat) {
                this.inCombat = anyAggro;
                eventBus.emit(EVENTS.COMBAT_STATE_CHANGED, { inCombat: this.inCombat });
            }

            // 6. Actualizar objetos de Botín (rebote Z + imán)
            for (let i = this.lootItems.length - 1; i >= 0; i--) {
                const item = this.lootItems[i];
                item.update(dt, this.player, this.board);
                if (item.collected) {
                    this.lootItems.splice(i, 1);
                }
            }
        }

        // Actualizar cámara, partículas, diálogos y bocadillos
        this.camera.update(dt, this.player, this.input.mouse);
        this.particles.update(dt);
        this.dialogBanner.update(dt);
        this.bubbles.update(dt);

        this.input.endFrame();
    }

    /**
     * Bucle de renderizado 2.5D por fotograma.
     */
    render(dt, state, elapsed) {
        this.renderer.render({
            board: this.board,
            player: this.player,
            companions: this.companions,
            monsters: this.monsters,
            lootItems: this.lootItems,
            particles: this.particles,
            interaction: this.interaction,
            quests: this.quests,
            elapsed
        });

        this.bubbles.render(this.renderer.ctx, this.camera);
    }
}

window.addEventListener('DOMContentLoaded', () => {
    window.heroQuestApp = new HeroQuestApp();
});
