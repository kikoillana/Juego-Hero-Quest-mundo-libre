/**
 * @fileoverview Renderizador procedural 2.5D de miniaturas de Héroes (4 clases) y Monstruos (5 arquetipos)
 * sobre peanas biseladas de tablero HeroQuest, con balanceo al caminar, elevación Z y armas animadas.
 * Capa 4: Depende únicamente de constants.js.
 */

export class MiniatureRenderer {
    /**
     * Dibuja la miniatura 2.5D del jugador sobre su peana biselada.
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} player
     * @param {number} elapsed
     */
    static drawPlayer(ctx, player, elapsed = 0) {
        if (!player || player.dead) return;

        const { x, y, z, colors, heroId, walkPhase, isMoving, aimAngle, attackAnimTimer, hurtFlashTimer } = player;

        ctx.save();

        // 1. Sombra proyectada en el plano Z=0
        const shadowScale = Math.max(0.45, 1 - z / 140);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.48)';
        ctx.beginPath();
        ctx.ellipse(x, y + 4, 15 * shadowScale, 8.5 * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Aura de buffs activos (Fuerza o Velocidad)
        if (player.strengthBuffTimer > 0 || player.speedBuffTimer > 0) {
            ctx.strokeStyle = player.strengthBuffTimer > 0 ? '#f59e0b' : '#38bdf8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(x, y - z, 18 + Math.sin(elapsed * 10) * 2, 10, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        // 2. Peana biselada clásica de HeroQuest (elevada en Z)
        this._drawBeveledBase(ctx, x, y - z, 14.5, colors.baseRim, colors.baseTop, true);

        // 3. Transformación del cuerpo de la miniatura (balanceo al caminar)
        const tilt = isMoving ? Math.sin(walkPhase) * 0.11 : 0;
        const bob = isMoving ? Math.abs(Math.cos(walkPhase)) * 2.2 : 0;

        ctx.translate(x, y - z - 3 - bob);
        ctx.rotate(tilt);

        if (hurtFlashTimer > 0) {
            ctx.filter = 'brightness(2.2) sepia(1) hue-rotate(-40deg) saturate(4)';
        }

        // Dibujar figura según clase
        switch (heroId) {
            case 'barbarian':
                this._drawBarbarianBody(ctx, colors);
                break;
            case 'dwarf':
                this._drawDwarfBody(ctx, colors);
                break;
            case 'elf':
                this._drawElfBody(ctx, colors);
                break;
            case 'wizard':
                this._drawWizardBody(ctx, colors, elapsed);
                break;
            default:
                this._drawBarbarianBody(ctx, colors);
                break;
        }

        // 4. Arma orientada hacia el ángulo de apuntado con animación de barrido
        const swingOffset = attackAnimTimer > 0
            ? Math.sin((attackAnimTimer / 0.22) * Math.PI) * 1.15
            : 0;
        this._drawHeroWeapon(ctx, heroId, colors, aimAngle - tilt + swingOffset, player.equippedWeapon);

        ctx.restore();

        // 5. Etiqueta y barra de vida sobre los Compañeros IA para identificar al equipo
        if (player.isAI) {
            ctx.save();
            const barW = 30;
            const barH = 4;
            const barX = x - barW * 0.5;
            const barY = y - z - 44;
            const ratio = Math.max(0, player.hp / player.maxHp);

            ctx.fillStyle = 'rgba(9, 8, 11, 0.85)';
            ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(barX, barY, barW * ratio, barH);
            ctx.strokeStyle = colors.baseRim;
            ctx.lineWidth = 1;
            ctx.strokeRect(barX - 1, barY - 1, barW + 2, barH + 2);

            ctx.font = 'bold 9.5px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#fef08a';
            ctx.fillText(player.name, x, barY - 4);
            ctx.restore();
        }
    }

    /**
     * Dibuja la miniatura 2.5D de un monstruo sobre su peana biselada, incluyendo telegrafiado y barra de vida.
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} monster
     * @param {number} elapsed
     */
    static drawMonster(ctx, monster, elapsed = 0) {
        if (!monster || monster.dead) return;

        const { x, y, z, scale, colors, type, walkPhase, state, hurtFlashTimer, isBoss } = monster;
        const baseRadius = 13.5 * scale;

        ctx.save();

        // 1. Indicador en el suelo de Telegrafiado de Ataque (cono de peligro rojo)
        if (state === 'TELEGRAPH') {
            const progress = 1 - Math.max(0, monster.stateTimer / monster.telegraphTime);
            ctx.save();
            ctx.fillStyle = `rgba(239, 68, 68, ${0.18 + progress * 0.32})`;
            ctx.strokeStyle = 'rgba(248, 113, 113, 0.85)';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.arc(
                x,
                y,
                monster.attackRange,
                monster.attackAngle - Math.PI * 0.32,
                monster.attackAngle + Math.PI * 0.32
            );
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        // 2. Sombra proyectada en el suelo
        const shadowScale = Math.max(0.5, 1 - z / 140);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.46)';
        ctx.beginPath();
        ctx.ellipse(x, y + 4, (baseRadius + 2) * shadowScale, (baseRadius * 0.56) * shadowScale, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3. Peana biselada de monstruo
        this._drawBeveledBase(ctx, x, y - z, baseRadius, colors.baseRim, colors.baseTop, isBoss);

        // 4. Cuerpo de la miniatura
        const tilt = Math.sin(walkPhase) * 0.08;
        const telegraphShake = state === 'TELEGRAPH' ? (Math.random() - 0.5) * 2.5 : 0;

        ctx.save();
        ctx.translate(x + telegraphShake, y - z - 3);
        ctx.scale(scale, scale);
        ctx.rotate(tilt);

        if (hurtFlashTimer > 0) {
            ctx.filter = 'brightness(2.4)';
        }

        switch (type) {
            case 'goblin':
                this._drawGoblinBody(ctx, colors);
                break;
            case 'orc':
                this._drawOrcBody(ctx, colors);
                break;
            case 'skeleton':
                this._drawSkeletonBody(ctx, colors);
                break;
            case 'fimir':
                this._drawFimirBody(ctx, colors);
                break;
            case 'gargoyle':
                this._drawGargoyleBody(ctx, colors, elapsed);
                break;
            default:
                this._drawGoblinBody(ctx, colors);
                break;
        }
        ctx.restore();

        // 5. Barra de salud flotante sobre la miniatura (siempre visible en Jefe/Sub-Jefe o al recibir daño)
        const isElite = isBoss || monster.isSubBoss;
        if (monster.hp < monster.maxHp || isElite) {
            const barW = isElite ? 52 : 30;
            const barH = isElite ? 6 : 4;
            const barX = x - barW * 0.5;
            const barY = y - z - 36 * scale - 8;
            const ratio = Math.max(0, monster.hp / monster.maxHp);

            ctx.fillStyle = 'rgba(9, 8, 11, 0.85)';
            ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

            ctx.fillStyle = isElite ? '#dc2626' : '#ef4444';
            ctx.fillRect(barX, barY, barW * ratio, barH);

            ctx.strokeStyle = isElite ? '#facc15' : '#475569';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX - 1, barY - 1, barW + 2, barH + 2);

            if (isElite && monster.name) {
                ctx.font = 'bold 9.5px "Cinzel", Georgia, serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#fef08a';
                ctx.fillText(`💀 ${monster.name}`, x, barY - 5);
            }
        }

        ctx.restore();
    }

    /**
     * Dibuja un NPC de Misión Secundaria en el Bosque Exterior con su peana dorada e icono de misión.
     */
    static drawNPC(ctx, npc, questInfo = null, elapsed = 0) {
        if (!npc) return;
        const { x, y, colors, name } = npc;
        const bob = Math.sin(elapsed * 2.8 + x * 0.02) * 1.4;

        ctx.save();

        // 1. Sombra
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.beginPath();
        ctx.ellipse(x, y + 4, 15, 8.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Halo mágico bajo la peana del NPC
        const pulse = 0.35 + Math.sin(elapsed * 4) * 0.18;
        ctx.strokeStyle = `rgba(250, 204, 21, ${pulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(x, y, 20, 11, 0, 0, Math.PI * 2);
        ctx.stroke();

        // 3. Peana biselada dorada de NPC
        this._drawBeveledBase(ctx, x, y, 14.5, colors?.baseRim || '#f59e0b', '#44403c', true);

        // 4. Figura del NPC
        ctx.save();
        ctx.translate(x, y - 3 - bob);

        // Capa
        ctx.fillStyle = colors?.cape || '#1e3a8a';
        ctx.beginPath();
        ctx.moveTo(-9, -2);
        ctx.lineTo(9, -2);
        ctx.lineTo(6, -22);
        ctx.lineTo(-6, -22);
        ctx.closePath();
        ctx.fill();

        // Túnica / Armadura
        ctx.fillStyle = colors?.tunic || '#475569';
        ctx.fillRect(-6.5, -22, 13, 16);

        // Rostro y cabello
        ctx.fillStyle = colors?.hair || '#facc15';
        ctx.beginPath();
        ctx.arc(0, -28, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.arc(0, -26.5, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // Báculo o insignia
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(9, -2);
        ctx.lineTo(11, -30);
        ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(11, -32, 3.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // 5. Nombre del NPC y Marcador de Misión Flotante
        const qStatus = questInfo?.status || 'available';
        let badgeText = '❗ MISIÓN [E]';
        let badgeColor = '#facc15';
        let badgeBg = 'rgba(120, 53, 15, 0.92)';

        if (qStatus === 'ready_to_claim') {
            badgeText = '🎁 ¡RECLAMAR RECOMPENSA! [E]';
            badgeColor = '#4ade80';
            badgeBg = 'rgba(20, 83, 45, 0.94)';
        } else if (qStatus === 'active') {
            badgeText = `⏳ ${questInfo.progress}/${questInfo.targetCount} [E]`;
            badgeColor = '#38bdf8';
            badgeBg = 'rgba(15, 23, 42, 0.92)';
        } else if (qStatus === 'completed') {
            badgeText = '✅ COMPLETADA';
            badgeColor = '#94a3b8';
            badgeBg = 'rgba(15, 23, 42, 0.80)';
        }

        const iconBob = Math.sin(elapsed * 5.5) * 2.5;
        ctx.font = 'bold 10px "Cinzel", Georgia, serif';
        const bw = ctx.measureText(badgeText).width + 12;
        const bh = 16;
        const bx = x - bw * 0.5;
        const by = y - 62 + iconBob;

        ctx.fillStyle = badgeBg;
        ctx.strokeStyle = badgeColor;
        ctx.lineWidth = 1.3;
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeRect(bx, by, bw, bh);

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, x, by + bh * 0.5);

        ctx.font = 'bold 9.5px "Segoe UI", sans-serif';
        ctx.fillStyle = '#fef08a';
        ctx.fillText(name, x, y - 39);

        ctx.restore();
    }

    /**
     * Dibuja la característica peana biselada en relieve de las miniaturas de HeroQuest.
     */
    static _drawBeveledBase(ctx, x, y, radius, rimColor, topColor, goldTrim = false) {
        const rx = radius;
        const ry = radius * 0.58;
        const baseThickness = 5;

        // Cilindro/borde lateral de la peana
        ctx.fillStyle = rimColor;
        ctx.beginPath();
        ctx.ellipse(x, y + baseThickness * 0.5, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#09080b';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Cara superior de la peana (losa texturizada)
        ctx.fillStyle = topColor;
        ctx.beginPath();
        ctx.ellipse(x, y - 1, rx * 0.84, ry * 0.82, 0, 0, Math.PI * 2);
        ctx.fill();

        if (goldTrim) {
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.65)';
            ctx.lineWidth = 1.1;
            ctx.stroke();
        }
    }

    static _drawBarbarianBody(ctx, colors) {
        // Capa roja y botas
        ctx.fillStyle = colors.cape;
        ctx.fillRect(-8, -18, 16, 16);

        // Torso musculoso y taparrabos de piel
        ctx.fillStyle = colors.tunic;
        ctx.fillRect(-7, -10, 14, 8);
        ctx.fillStyle = colors.skin;
        ctx.fillRect(-7, -22, 14, 12);

        // Hombrera de piel
        ctx.fillStyle = colors.armor;
        ctx.beginPath();
        ctx.ellipse(-6, -21, 5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cabeza, melena y cinta de bronce
        ctx.fillStyle = colors.hair;
        ctx.beginPath();
        ctx.arc(0, -28, 7.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colors.skin;
        ctx.beginPath();
        ctx.arc(0, -27, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = colors.weaponHilt;
        ctx.fillRect(-6, -31, 12, 2.5);
    }

    static _drawDwarfBody(ctx, colors) {
        // Cuerpo acorazado compacto
        ctx.fillStyle = colors.tunic;
        ctx.fillRect(-8, -18, 16, 15);
        ctx.fillStyle = colors.armor;
        ctx.fillRect(-7, -19, 14, 11);

        // Gran barba cobriza
        ctx.fillStyle = colors.hair;
        ctx.beginPath();
        ctx.moveTo(-7, -21);
        ctx.lineTo(7, -21);
        ctx.lineTo(0, -9);
        ctx.closePath();
        ctx.fill();

        // Yelmo rúnico con cuernos
        ctx.fillStyle = colors.armor;
        ctx.beginPath();
        ctx.arc(0, -25, 6.8, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.moveTo(-6, -26);
        ctx.lineTo(-11, -31);
        ctx.lineTo(-4, -28);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(6, -26);
        ctx.lineTo(11, -31);
        ctx.lineTo(4, -28);
        ctx.fill();
    }

    static _drawElfBody(ctx, colors) {
        // Capa silvana y túnica esbelta
        ctx.fillStyle = colors.cape;
        ctx.beginPath();
        ctx.moveTo(-8, -4);
        ctx.lineTo(8, -4);
        ctx.lineTo(5, -22);
        ctx.lineTo(-5, -22);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = colors.tunic;
        ctx.fillRect(-5.5, -22, 11, 16);

        // Hombreras élficas doradas
        ctx.fillStyle = colors.armor;
        ctx.fillRect(-7, -22, 14, 3);

        // Cabeza y melena rubia
        ctx.fillStyle = colors.hair;
        ctx.fillRect(-6, -31, 12, 11);
        ctx.fillStyle = colors.skin;
        ctx.beginPath();
        ctx.arc(0, -27, 5.5, 0, Math.PI * 2);
        ctx.fill();
    }

    static _drawWizardBody(ctx, colors, elapsed) {
        // Túnica arcana acampanada
        ctx.fillStyle = colors.tunic;
        ctx.beginPath();
        ctx.moveTo(-9, -2);
        ctx.lineTo(9, -2);
        ctx.lineTo(6, -22);
        ctx.lineTo(-6, -22);
        ctx.closePath();
        ctx.fill();

        // Estola púrpura y barba blanca
        ctx.fillStyle = colors.armor;
        ctx.fillRect(-2, -21, 4, 17);
        ctx.fillStyle = colors.hair;
        ctx.beginPath();
        ctx.moveTo(-4, -22);
        ctx.lineTo(4, -22);
        ctx.lineTo(0, -13);
        ctx.fill();

        // Rostro y sombrero puntiagudo
        ctx.fillStyle = colors.skin;
        ctx.beginPath();
        ctx.arc(0, -26, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = colors.cape;
        ctx.beginPath();
        ctx.moveTo(-9, -28);
        ctx.lineTo(9, -28);
        ctx.lineTo(0, -41);
        ctx.closePath();
        ctx.fill();
    }

    static _drawHeroWeapon(ctx, heroId, colors, angle, equippedWeapon = null) {
        ctx.save();
        ctx.translate(0, -16);
        ctx.rotate(angle);

        const wId = typeof equippedWeapon === 'object' ? equippedWeapon?.id : equippedWeapon;
        const bladeColor = wId === 'astral_blade'
            ? '#38bdf8'
            : wId === 'dragonslayer_halberd'
                ? '#fbbf24'
                : colors.weaponBlade;

        if (heroId === 'barbarian') {
            // Mandoble ancho
            ctx.fillStyle = colors.weaponHilt;
            ctx.fillRect(6, -4, 3, 8);
            ctx.fillStyle = bladeColor;
            ctx.beginPath();
            ctx.moveTo(9, -2.5);
            ctx.lineTo(27, -1.5);
            ctx.lineTo(31, 0);
            ctx.lineTo(27, 1.5);
            ctx.lineTo(9, 2.5);
            ctx.closePath();
            ctx.fill();
        } else if (heroId === 'dwarf') {
            // Hacha de doble filo rúnica
            ctx.fillStyle = '#78350f';
            ctx.fillRect(6, -1.5, 18, 3);
            ctx.fillStyle = bladeColor;
            ctx.beginPath();
            ctx.arc(20, 0, 7, -Math.PI * 0.7, Math.PI * 0.7);
            ctx.fill();
        } else if (heroId === 'elf') {
            // Estoque silvano fino y brillante
            ctx.fillStyle = colors.weaponHilt;
            ctx.beginPath();
            ctx.arc(8, 0, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = bladeColor;
            ctx.lineWidth = 2.4;
            ctx.beginPath();
            ctx.moveTo(9, 0);
            ctx.lineTo(29, 0);
            ctx.stroke();
        } else {
            // Bastón arcano con orbe ígneo
            ctx.fillStyle = '#78350f';
            ctx.fillRect(6, -1.5, 19, 3);
            ctx.fillStyle = equippedWeapon ? bladeColor : '#38bdf8';
            ctx.beginPath();
            ctx.arc(26, 0, 4.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    }

    static _drawGoblinBody(ctx, colors) {
        // Torso encorvado y harapos
        ctx.fillStyle = colors.armor;
        ctx.fillRect(-5, -15, 10, 11);

        // Cabeza verde con grandes orejas puntiagudas
        ctx.fillStyle = colors.skin;
        ctx.beginPath();
        ctx.moveTo(-5, -21);
        ctx.lineTo(-13, -24);
        ctx.lineTo(-5, -18);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(5, -21);
        ctx.lineTo(13, -24);
        ctx.lineTo(5, -18);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(0, -20, 5.8, 0, Math.PI * 2);
        ctx.fill();

        // Ojos amarillos maliciosos
        ctx.fillStyle = colors.eyes;
        ctx.fillRect(-3.5, -21, 2.2, 2.2);
        ctx.fillRect(1.3, -21, 2.2, 2.2);

        // Daga curva
        ctx.fillStyle = colors.weapon;
        ctx.fillRect(6, -16, 8, 2.5);
    }

    static _drawOrcBody(ctx, colors) {
        // Pechera de hierro rojo y hombreras con pinchos
        ctx.fillStyle = colors.armor;
        ctx.fillRect(-8, -21, 16, 16);
        ctx.fillStyle = colors.skin;
        ctx.beginPath();
        ctx.arc(-8, -20, 4, 0, Math.PI * 2);
        ctx.arc(8, -20, 4, 0, Math.PI * 2);
        ctx.fill();

        // Cabeza brutal con colmillos inferiores
        ctx.fillStyle = colors.skin;
        ctx.fillRect(-6, -29, 12, 10);
        ctx.fillStyle = colors.eyes;
        ctx.fillRect(-4, -26, 2.5, 2.5);
        ctx.fillRect(1.5, -26, 2.5, 2.5);
        ctx.fillStyle = '#fef3c7';
        ctx.fillRect(-4, -21, 2, 3);
        ctx.fillRect(2, -21, 2, 3);

        // Mella de carnicero orca
        ctx.fillStyle = colors.weapon;
        ctx.fillRect(8, -24, 5, 14);
    }

    static _drawSkeletonBody(ctx, colors) {
        // Columna y costillar óseo
        ctx.strokeStyle = colors.skin;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(0, -21);
        ctx.moveTo(-5, -18);
        ctx.lineTo(5, -18);
        ctx.moveTo(-4, -14);
        ctx.lineTo(4, -14);
        ctx.stroke();

        // Cráneo blanqueado
        ctx.fillStyle = colors.skin;
        ctx.beginPath();
        ctx.arc(0, -25, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // Cuencas oculares brillantes
        ctx.fillStyle = colors.eyes;
        ctx.fillRect(-3, -26, 2, 2);
        ctx.fillRect(1, -26, 2, 2);

        // Guadaña / cimitarra antigua
        ctx.strokeStyle = colors.weapon;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(6, -6);
        ctx.lineTo(9, -28);
        ctx.lineTo(2, -30);
        ctx.stroke();
    }

    static _drawFimirBody(ctx, colors) {
        // Cola reptiliana y torso escamoso ancho
        ctx.fillStyle = colors.skin;
        ctx.beginPath();
        ctx.ellipse(0, -14, 9, 11, 0, 0, Math.PI * 2);
        ctx.fill();

        // Arnés de bronce cruzado
        ctx.strokeStyle = colors.armor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-7, -21);
        ctx.lineTo(7, -8);
        ctx.moveTo(7, -21);
        ctx.lineTo(-7, -8);
        ctx.stroke();

        // Cabeza de cíclope con un único ojo dorado central
        ctx.fillStyle = colors.skin;
        ctx.beginPath();
        ctx.arc(0, -25, 6.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = colors.eyes;
        ctx.beginPath();
        ctx.arc(0, -25, 2.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#09080b';
        ctx.fillRect(-0.8, -26.5, 1.6, 3);

        // Hacha de guerra del pantano
        ctx.fillStyle = colors.weapon;
        ctx.beginPath();
        ctx.arc(10, -18, 6.5, -Math.PI * 0.6, Math.PI * 0.6);
        ctx.fill();
    }

    static _drawGargoyleBody(ctx, colors, elapsed) {
        const wingFlap = Math.sin(elapsed * 5) * 3;

        // Grandes alas de piedra desplegadas
        ctx.fillStyle = '#292524';
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(-22, -34 + wingFlap);
        ctx.lineTo(-16, -12);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.lineTo(22, -34 + wingFlap);
        ctx.lineTo(16, -12);
        ctx.closePath();
        ctx.fill();

        // Torso colosal de granito y armadura del Caos
        ctx.fillStyle = colors.skin;
        ctx.fillRect(-9, -24, 18, 19);
        ctx.fillStyle = colors.armor;
        ctx.fillRect(-7, -12, 14, 6);

        // Cabeza cornuda de la Gárgola
        ctx.fillStyle = colors.skin;
        ctx.beginPath();
        ctx.arc(0, -29, 7, 0, Math.PI * 2);
        ctx.fill();

        // Cuernos curvos
        ctx.strokeStyle = '#d6d3d1';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-4, -33);
        ctx.lineTo(-11, -41);
        ctx.moveTo(4, -33);
        ctx.lineTo(11, -41);
        ctx.stroke();

        // Ojos llameantes
        ctx.fillStyle = colors.eyes;
        ctx.fillRect(-4, -30, 3, 2.5);
        ctx.fillRect(1, -30, 3, 2.5);

        // Espada flamígera del Caos
        ctx.fillStyle = colors.weapon;
        ctx.beginPath();
        ctx.moveTo(10, -12);
        ctx.lineTo(16, -34);
        ctx.lineTo(12, -34);
        ctx.closePath();
        ctx.fill();
    }
}
