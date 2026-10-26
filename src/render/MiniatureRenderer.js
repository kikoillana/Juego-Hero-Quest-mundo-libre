/**
 * @fileoverview Renderizador de miniaturas y personajes estilo Zelda clásico (16-bit / A Link to the Past & Minish Cap):
 * Proporciones estilizadas de acción RPG, sombras dinámicas de suelo, botas con animación de paso,
 * escudos de facción, contornos retro nítidos, cabellos y ropajes con sombreado de tres tonos,
 * y estelas de tajo en arco luminoso para el combate.
 * Capa 4: Cero dependencias circulares.
 */

export class MiniatureRenderer {
    /**
     * Dibuja la miniatura estilo Zelda clásico del jugador o compañero de grupo.
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} player
     * @param {number} elapsed
     */
    static drawPlayer(ctx, player, elapsed = 0) {
        if (!player || player.dead) return;

        const { x, y, z = 0, colors, heroId, walkPhase = 0, isMoving = false, aimAngle = 0, attackAnimTimer = 0, hurtFlashTimer = 0 } = player;

        ctx.save();

        // 1. Sombra elíptica suave de suelo estilo Zelda clásico (permanece en Z=0 cuando salta)
        const allyAura = player.isAI ? 'rgba(74, 222, 128, 0.70)' : null;
        this._drawZeldaShadow(ctx, x, y, z, 14, false, allyAura);

        // Aura de buffs activos (Fuerza o Velocidad)
        if (player.strengthBuffTimer > 0 || player.speedBuffTimer > 0) {
            ctx.save();
            ctx.strokeStyle = player.strengthBuffTimer > 0 ? '#f59e0b' : '#38bdf8';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.ellipse(x, y - z, 16 + Math.sin(elapsed * 10) * 2, 9, 0, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 2. Orientación direccional horizontal (Zelda mira en la dirección de apuntado o movimiento)
        const facingLeft = Math.cos(aimAngle) < -0.15;
        const bob = isMoving ? Math.abs(Math.sin(walkPhase * 2)) * 1.8 : Math.sin(elapsed * 3) * 0.5;
        const tilt = isMoving ? Math.sin(walkPhase) * 0.06 : 0;

        ctx.save();
        ctx.translate(x, y - z - bob);
        if (facingLeft) {
            ctx.scale(-1, 1);
        }
        ctx.rotate(facingLeft ? -tilt : tilt);

        if (hurtFlashTimer > 0) {
            ctx.filter = 'brightness(2.5) saturate(0.2)';
        }

        // 3. Dibujar cuerpo del héroe estilo Zelda
        switch (heroId) {
            case 'barbarian':
                this._drawZeldaBarbarian(ctx, colors, walkPhase, isMoving, elapsed);
                break;
            case 'dwarf':
                this._drawZeldaDwarf(ctx, colors, walkPhase, isMoving, elapsed);
                break;
            case 'elf':
                this._drawZeldaElf(ctx, colors, walkPhase, isMoving, elapsed);
                break;
            case 'wizard':
                this._drawZeldaWizard(ctx, colors, walkPhase, isMoving, elapsed);
                break;
            default:
                this._drawZeldaBarbarian(ctx, colors, walkPhase, isMoving, elapsed);
                break;
        }

        // 4. Arma y escudo en manos del héroe estilo Zelda
        // Progreso del tajo normalizado a la duración real del ataque (0.25–0.38 s según el golpe)
        const swingDur = player.attackAnimDuration || 0.22;
        const swingProgress = attackAnimTimer > 0 ? Math.min(1, Math.max(0, 1 - attackAnimTimer / swingDur)) : 0;
        this._drawZeldaHeroShield(ctx, heroId, colors, player.isBlocking, aimAngle, facingLeft, elapsed);
        this._drawZeldaHeroWeapon(ctx, heroId, colors, aimAngle, swingProgress, player.equippedWeapon, facingLeft);

        ctx.restore();

        // 5. Postura de bloqueo con escudo / Estela de tajo en combate
        if (player.isBlocking) {
            this._drawZeldaBlockBarrier(ctx, x, y - z - 13, aimAngle, elapsed, colors.shieldGlow || '#facc15');
        } else if (attackAnimTimer > 0) {
            this._drawZeldaSlashArc(ctx, x, y - z - 12, aimAngle, swingProgress, colors.slashColor || '#38bdf8', player.attackRange || 64);
        }

        // 6. Efecto de guardia rota (estrellas giratorias de aturdimiento sobre la cabeza)
        if (player.guardBreakTimer > 0) {
            this._drawGuardBreakStun(ctx, x, y - z - 38, elapsed);
        }

        ctx.restore();

        // 6. Barra de vida y nombre sobre los Compañeros IA
        if (player.isAI) {
            ctx.save();
            const barW = 32;
            const barH = 4.5;
            const barX = x - barW * 0.5;
            const barY = y - z - 42;
            const ratio = Math.max(0, player.hp / player.maxHp);

            ctx.fillStyle = 'rgba(15, 12, 22, 0.90)';
            ctx.fillRect(barX - 1.5, barY - 1.5, barW + 3, barH + 3);
            ctx.fillStyle = '#22c55e';
            ctx.fillRect(barX, barY, barW * ratio, barH);
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX - 1.5, barY - 1.5, barW + 3, barH + 3);

            ctx.font = 'bold 9.5px "Segoe UI", sans-serif';
            ctx.textAlign = 'center';
            // Contorno en vez de shadowBlur (mucho más barato por fotograma)
            ctx.lineWidth = 3;
            ctx.lineJoin = 'round';
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
            ctx.strokeText(player.name, x, barY - 4);
            ctx.fillStyle = '#fef08a';
            ctx.fillText(player.name, x, barY - 4);
            ctx.restore();
        }
    }

    /**
     * Dibuja un monstruo estilo Zelda clásico (Bokoblin, Moblin, Stalfos, etc.).
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} monster
     * @param {number} elapsed
     */
    static drawMonster(ctx, monster, elapsed = 0) {
        if (!monster || monster.dead) return;

        const { x, y, z = 0, scale = 1, colors, type, walkPhase = 0, state, hurtFlashTimer = 0, isBoss, isSubBoss, attackAngle = 0 } = monster;
        const isElite = isBoss || isSubBoss;

        ctx.save();

        // 1. Telegrafiado de ataque rojo
        if (state === 'TELEGRAPH') {
            const progress = 1 - Math.max(0, monster.stateTimer / monster.telegraphTime);
            ctx.save();
            ctx.fillStyle = `rgba(239, 68, 68, ${0.16 + progress * 0.35})`;
            ctx.strokeStyle = 'rgba(248, 113, 113, 0.9)';
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

        // 2. Sombra elíptica suave en suelo
        const bossAura = isElite ? 'rgba(239, 68, 68, 0.65)' : null;
        this._drawZeldaShadow(ctx, x, y, z, 13 * scale, isElite, bossAura);

        // 3. Orientación y balanceo
        const facingLeft = Math.cos(attackAngle) < -0.15;
        const bob = Math.abs(Math.sin(walkPhase * 2)) * 1.5;
        const tilt = Math.sin(walkPhase) * 0.08;
        const telegraphShake = state === 'TELEGRAPH' ? (Math.random() - 0.5) * 3 : 0;

        ctx.save();
        ctx.translate(x + telegraphShake, y - z - bob);
        ctx.scale(scale, scale);
        if (facingLeft) {
            ctx.scale(-1, 1);
        }
        ctx.rotate(facingLeft ? -tilt : tilt);

        if (hurtFlashTimer > 0) {
            ctx.filter = 'brightness(2.6)';
        }

        switch (type) {
            case 'goblin':
                this._drawZeldaGoblin(ctx, colors, walkPhase, elapsed);
                break;
            case 'orc':
                this._drawZeldaOrc(ctx, colors, walkPhase, elapsed);
                break;
            case 'skeleton':
                this._drawZeldaSkeleton(ctx, colors, walkPhase, elapsed);
                break;
            case 'fimir':
                this._drawZeldaFimir(ctx, colors, walkPhase, elapsed);
                break;
            case 'gargoyle':
                this._drawZeldaGargoyle(ctx, colors, elapsed);
                break;
            default:
                this._drawZeldaGoblin(ctx, colors, walkPhase, elapsed);
                break;
        }

        ctx.restore();

        // 4. Barra de salud flotante
        if (monster.hp < monster.maxHp || isElite) {
            const barW = isElite ? 52 : 30;
            const barH = isElite ? 6 : 4;
            const barX = x - barW * 0.5;
            const barY = y - z - 34 * scale - 6;
            const ratio = Math.max(0, monster.hp / monster.maxHp);

            ctx.fillStyle = 'rgba(15, 12, 22, 0.90)';
            ctx.fillRect(barX - 1.5, barY - 1.5, barW + 3, barH + 3);

            ctx.fillStyle = isElite ? '#dc2626' : '#ef4444';
            ctx.fillRect(barX, barY, barW * ratio, barH);

            ctx.strokeStyle = isElite ? '#facc15' : '#475569';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX - 1.5, barY - 1.5, barW + 3, barH + 3);

            if (isElite && monster.name) {
                ctx.font = 'bold 9.5px "Cinzel", Georgia, serif';
                ctx.textAlign = 'center';
                const eliteLabel = `💀 ${monster.name}`;
                ctx.lineWidth = 3;
                ctx.lineJoin = 'round';
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
                ctx.strokeText(eliteLabel, x, barY - 4);
                ctx.fillStyle = '#fef08a';
                ctx.fillText(eliteLabel, x, barY - 4);
            }
        }

        ctx.restore();
    }

    /**
     * Dibuja un NPC de misión estilo Zelda clásico (sabio, aldeano, etc.).
     */
    static drawNPC(ctx, npc, questInfo = null, elapsed = 0) {
        if (!npc) return;
        const { x, y, colors, name } = npc;
        const idleBob = Math.sin(elapsed * 3 + x * 0.05) * 1.2;

        ctx.save();

        // 1. Sombra suave en suelo
        this._drawZeldaShadow(ctx, x, y, 0, 13, false, 'rgba(250, 204, 21, 0.45)');

        // 2. Cuerpo del NPC estilo sabio/anciano Zelda
        ctx.save();
        ctx.translate(x, y - idleBob);

        // Túnica larga con pliegues
        ctx.fillStyle = colors?.cape || '#1e3a8a';
        this._roundRect(ctx, -9, -24, 18, 22, 4);
        ctx.strokeStyle = '#0f0c18';
        ctx.lineWidth = 1.3;
        ctx.stroke();

        ctx.fillStyle = colors?.tunic || '#d4af37';
        this._roundRect(ctx, -5, -23, 10, 20, 2);

        // Barba blanca o cabello sabio
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(-6, -20);
        ctx.lineTo(6, -20);
        ctx.lineTo(0, -9);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#0f0c18';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Rostro sabio con ojos amables
        ctx.fillStyle = '#fde2c8';
        ctx.beginPath();
        ctx.arc(0, -25, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(-3, -26, 1.8, 2);
        ctx.fillRect(1.2, -26, 1.8, 2);

        // Birrete / Corona de Loretome
        ctx.fillStyle = '#991b1b';
        this._roundRect(ctx, -7, -33, 14, 5, 2);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-6, -30, 12, 2);

        // Báculo dorado en mano
        ctx.strokeStyle = '#d97706';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(9, -2);
        ctx.lineTo(11, -34);
        ctx.stroke();
        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(11, -36, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.restore();

        // 3. Globo de Misión estilo Zelda ([!] o [✓] rebotando sobre la cabeza)
        const qStatus = questInfo?.status || 'available';
        let badgeIcon = '❗';
        let badgeText = 'MISIÓN [E]';
        let badgeBg = 'rgba(180, 83, 9, 0.94)';
        let badgeBorder = '#facc15';

        if (qStatus === 'ready_to_claim') {
            badgeIcon = '🎁';
            badgeText = '¡RECOMPENSA! [E]';
            badgeBg = 'rgba(21, 128, 61, 0.96)';
            badgeBorder = '#4ade80';
        } else if (qStatus === 'active') {
            badgeIcon = '⏳';
            badgeText = `${questInfo.progress}/${questInfo.targetCount} [E]`;
            badgeBg = 'rgba(30, 58, 138, 0.94)';
            badgeBorder = '#38bdf8';
        } else if (qStatus === 'completed') {
            badgeIcon = '✓';
            badgeText = 'LISTA';
            badgeBg = 'rgba(30, 41, 59, 0.85)';
            badgeBorder = '#94a3b8';
        }

        const iconBounce = Math.sin(elapsed * 5.5) * 3;
        const badgeY = y - 56 + iconBounce;

        ctx.font = 'bold 10px "Cinzel", Georgia, serif';
        const label = `${badgeIcon} ${badgeText}`;
        const tw = ctx.measureText(label).width + 12;
        const tx = x - tw * 0.5;

        ctx.fillStyle = badgeBg;
        ctx.strokeStyle = badgeBorder;
        ctx.lineWidth = 1.4;
        this._roundRect(ctx, tx, badgeY, tw, 18, 4);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, x, badgeY + 9);

        // Nombre del sabio/NPC
        ctx.font = 'bold 9.5px "Segoe UI", sans-serif';
        ctx.lineWidth = 3;
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.strokeText(name, x, y - 36);
        ctx.fillStyle = '#fef08a';
        ctx.fillText(name, x, y - 36);

        ctx.restore();
    }

    /**
     * Dibuja la sombra elíptica suave característica de los juegos tipo Zelda clásico.
     */
    static _drawZeldaShadow(ctx, x, y, z, radius, isElite = false, auraColor = null) {
        const shadowScale = Math.max(0.35, 1 - z / 120);
        const rx = radius * shadowScale;
        const ry = (radius * 0.48) * shadowScale;

        ctx.save();

        // 1. Sombra exterior difuminada
        ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
        ctx.beginPath();
        ctx.ellipse(x, y + 2, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. Núcleo más oscuro
        ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
        ctx.beginPath();
        ctx.ellipse(x, y + 2, rx * 0.65, ry * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();

        // 3. Anillo sutil para grupo o élite
        if (auraColor) {
            ctx.strokeStyle = auraColor;
            ctx.lineWidth = isElite ? 2 : 1.4;
            ctx.beginPath();
            ctx.ellipse(x, y + 2, rx + 1.5, ry + 1.5, 0, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Dibuja las piernas animadas con botas de cuero estilo Zelda.
     */
    static _drawZeldaSteppingLegs(ctx, walkPhase, isMoving, bootColor = '#5c2b09', pantsColor = '#78350f') {
        const legStep = isMoving ? Math.sin(walkPhase) * 4.5 : 0;

        // Pierna izquierda
        ctx.fillStyle = pantsColor;
        ctx.fillRect(-6, -8, 4, 6);
        ctx.fillStyle = bootColor;
        this._roundRect(ctx, -7, -4 + legStep, 5, 6, 1.5);
        ctx.strokeStyle = '#0f0c18';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Pierna derecha
        ctx.fillStyle = pantsColor;
        ctx.fillRect(2, -8, 4, 6);
        ctx.fillStyle = bootColor;
        this._roundRect(ctx, 2, -4 - legStep, 5, 6, 1.5);
        ctx.stroke();
    }

    /* =========================================================================
       HÉROE 1: BÁRBARO (Estilo Conan / Guerrero Zelda clásico)
       ========================================================================= */
    static _drawZeldaBarbarian(ctx, colors, walkPhase, isMoving) {
        // 1. Botas y piernas animadas
        this._drawZeldaSteppingLegs(ctx, walkPhase, isMoving, '#451a03', '#78350f');

        // 2. Faldón / Taparrabos de piel con tachuelas
        ctx.fillStyle = '#b45309';
        this._roundRect(ctx, -8, -13, 16, 7, 2);
        ctx.strokeStyle = '#0f0c18';
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // Cinturón con hebilla de bronce
        ctx.fillStyle = '#292524';
        ctx.fillRect(-8, -15, 16, 3);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(-2, -15.5, 4, 4);

        // 3. Torso musculoso bronceado con arnés cruzado de cuero
        ctx.fillStyle = colors.skin || '#e09f70';
        this._roundRect(ctx, -7, -23, 14, 10, 2);
        ctx.stroke();

        // Tiras de cuero cruzadas en pecho
        ctx.strokeStyle = '#78350f';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-6, -23);
        ctx.lineTo(6, -14);
        ctx.moveTo(6, -23);
        ctx.lineTo(-6, -14);
        ctx.stroke();

        // Hombreras de piel de lobo
        ctx.fillStyle = '#57534e';
        this._roundRect(ctx, -9, -24, 6, 5, 2);
        this._roundRect(ctx, 3, -24, 6, 5, 2);

        // 4. Cabeza: melena negra salvaje, cinta de combate roja y ojos decididos
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.arc(0, -29, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = colors.skin || '#e09f70';
        ctx.beginPath();
        ctx.arc(0, -28, 6.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f0c18';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Cinta roja en la frente con gema de bronce
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-6, -32, 12, 3);
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(-1.5, -32.5, 3, 3);

        // Ojos estilo retro Zelda (miran al frente/apuntado)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-3.5, -29, 2.5, 2);
        ctx.fillRect(1, -29, 2.5, 2);
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(-2.5, -29, 1.5, 2);
        ctx.fillRect(2, -29, 1.5, 2);

        // Cicatriz de guerra en mejilla derecha
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(2.5, -26);
        ctx.lineTo(4, -24);
        ctx.stroke();

        // 5. Escudo de hierro con tachones en brazo izquierdo (off-hand)
        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.arc(-8, -17, 5.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.3;
        ctx.stroke();
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(-8, -17, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    /* =========================================================================
       HÉROE 2: ENANO (Guerrero Acorazado con Yelmo Rúnico y Gran Barba)
       ========================================================================= */
    static _drawZeldaDwarf(ctx, colors, walkPhase, isMoving) {
        // 1. Botas cortas pesadas de metal
        this._drawZeldaSteppingLegs(ctx, walkPhase, isMoving, '#334155', '#1e293b');

        // 2. Coraza rúnica de hierro sobre túnica azul marino
        ctx.fillStyle = '#1e3a8a';
        this._roundRect(ctx, -8.5, -15, 17, 10, 2);
        ctx.fillStyle = '#64748b';
        this._roundRect(ctx, -7.5, -21, 15, 11, 2);
        ctx.strokeStyle = '#0f0c18';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Remaches dorados en la coraza
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-6, -19, 2, 2);
        ctx.fillRect(4, -19, 2, 2);
        ctx.fillRect(-6, -13, 2, 2);
        ctx.fillRect(4, -13, 2, 2);

        // 3. Gran Barba cobriza trenzada clásica
        ctx.fillStyle = '#c2410c';
        ctx.beginPath();
        ctx.moveTo(-8, -19);
        ctx.lineTo(8, -19);
        ctx.lineTo(4, -6);
        ctx.lineTo(0, -3);
        ctx.lineTo(-4, -6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#0f0c18';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Abrazadera dorada de la barba
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-2.5, -7, 5, 2.5);

        // 4. Cabeza: Rostro recio y Yelmo con cuernos rúnicos
        ctx.fillStyle = '#f1b894';
        ctx.beginPath();
        ctx.arc(0, -23, 6, 0, Math.PI * 2);
        ctx.fill();

        // Ojos vivos y cejas pobladas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-3.5, -23.5, 2.2, 1.8);
        ctx.fillRect(1.3, -23.5, 2.2, 1.8);
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(-2.5, -23.5, 1.3, 1.8);
        ctx.fillRect(2.2, -23.5, 1.3, 1.8);

        // Yelmo rúnico de hierro (kettle helmet)
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(0, -25, 7.5, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(-7.5, -26, 15, 2.5);

        // Cuernos del yelmo
        ctx.fillStyle = '#fde68a';
        ctx.beginPath();
        ctx.moveTo(-6, -26);
        ctx.lineTo(-12, -32);
        ctx.lineTo(-4, -29);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(6, -26);
        ctx.lineTo(12, -32);
        ctx.lineTo(4, -29);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 5. Escudo enano de piedra y hierro en brazo izquierdo
        ctx.fillStyle = '#475569';
        this._roundRect(ctx, -13, -18, 7, 10, 2);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.2;
        ctx.stroke();
    }

    /* =========================================================================
       HÉROE 3: ELFO (Homenaje directo a Link de Zelda: Túnica verde y gorro silvano)
       ========================================================================= */
    static _drawZeldaElf(ctx, colors, walkPhase, isMoving) {
        // 1. Botas de cuero altas de explorador
        this._drawZeldaSteppingLegs(ctx, walkPhase, isMoving, '#78350f', '#15803d');

        // 2. Túnica Verde Clásica de Héroe (estilo Link A Link to the Past)
        ctx.fillStyle = '#15803d'; // Verde silvano emblemático
        this._roundRect(ctx, -7.5, -20, 15, 13, 3);
        ctx.strokeStyle = '#0f0c18';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Cuello blanco/crema de la túnica
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.moveTo(-4, -20);
        ctx.lineTo(4, -20);
        ctx.lineTo(0, -16);
        ctx.closePath();
        ctx.fill();

        // Cinturón de cuero con hebilla dorada
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-7.5, -12, 15, 2.8);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-2, -12.5, 4, 3.8);

        // 3. Cabeza: Melena rubia dorada, orejas élficas puntiagudas y gorro verde
        ctx.fillStyle = '#fde2c8';
        ctx.beginPath();
        ctx.arc(0, -25, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#0f0c18';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Orejas élficas puntiagudas a los lados
        ctx.fillStyle = '#fde2c8';
        ctx.beginPath();
        ctx.moveTo(-5, -25);
        ctx.lineTo(-10, -28);
        ctx.lineTo(-5, -22);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(5, -25);
        ctx.lineTo(10, -28);
        ctx.lineTo(5, -22);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Ojos azules expresivos
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-3.5, -25.5, 2.5, 2);
        ctx.fillRect(1, -25.5, 2.5, 2);
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(-2.5, -25.5, 1.5, 2);
        ctx.fillRect(2, -25.5, 1.5, 2);

        // Mechones de cabello rubio
        ctx.fillStyle = '#fde047';
        ctx.fillRect(-6, -29, 12, 4);

        // Gorro verde largo que cae hacia atrás
        ctx.fillStyle = '#16a34a';
        ctx.beginPath();
        ctx.moveTo(-7, -28);
        ctx.lineTo(7, -28);
        ctx.lineTo(0, -38);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 4. Escudo con blasonado silvano/hyliano en mano izquierda
        ctx.fillStyle = '#15803d';
        this._roundRect(ctx, -12, -17, 7, 10, 2);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.3;
        ctx.stroke();
        ctx.fillStyle = '#facc15';
        // Emblema trifuerza / pájaro heráldico simplificado
        ctx.beginPath();
        ctx.moveTo(-8.5, -15);
        ctx.lineTo(-6, -11);
        ctx.lineTo(-11, -11);
        ctx.closePath();
        ctx.fill();
    }

    /* =========================================================================
       HÉROE 4: MAGO (Túnica azul índigo, capucha mágica y orbe elemental)
       ========================================================================= */
    static _drawZeldaWizard(ctx, colors, walkPhase, isMoving, elapsed) {
        // 1. Zapatos oscuros bajo la túnica
        this._drawZeldaSteppingLegs(ctx, walkPhase, isMoving, '#1e1b4b', '#312e81');

        // 2. Túnica acampanada índigo con bordado dorado celestial
        ctx.fillStyle = '#312e81';
        ctx.beginPath();
        ctx.moveTo(-9, -2);
        ctx.lineTo(9, -2);
        ctx.lineTo(6, -22);
        ctx.lineTo(-6, -22);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#0f0c18';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Cenefa dorada inferior de la túnica
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-8.5, -4, 17, 2);

        // Estola mágica central con runas
        ctx.fillStyle = '#4f46e5';
        ctx.fillRect(-3, -22, 6, 18);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 0.8;
        ctx.strokeRect(-3, -22, 6, 18);

        // Cinturón con viales alquímicos
        ctx.fillStyle = '#78350f';
        ctx.fillRect(-7, -13, 14, 2.5);
        ctx.fillStyle = '#ef4444'; // Poción de vida
        ctx.beginPath();
        ctx.arc(-4, -11, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#38bdf8'; // Poción de maná
        ctx.beginPath();
        ctx.arc(-1, -11, 1.8, 0, Math.PI * 2);
        ctx.fill();

        // 3. Barba blanca prominente
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(-5, -21);
        ctx.lineTo(5, -21);
        ctx.lineTo(0, -10);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#0f0c18';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 4. Cabeza: Capucha puntiaguda en sombra y ojos arcanos celestes
        ctx.fillStyle = '#1e1b4b';
        ctx.beginPath();
        ctx.arc(0, -25, 6.5, 0, Math.PI * 2);
        ctx.fill();

        // Ojos mágicos celestes brillantes en la sombra
        const glow = 0.8 + Math.sin(elapsed * 6) * 0.2;
        ctx.fillStyle = `rgba(56, 189, 248, ${glow})`;
        ctx.fillRect(-3.5, -25, 2.2, 1.6);
        ctx.fillRect(1.3, -25, 2.2, 1.6);

        // Capucha puntiaguda con caída
        ctx.fillStyle = '#4338ca';
        ctx.beginPath();
        ctx.moveTo(-8, -26);
        ctx.lineTo(8, -26);
        ctx.lineTo(1, -38);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#0f0c18';
        ctx.lineWidth = 1.1;
        ctx.stroke();

        // 5. Grimorio o foco arcano en mano izquierda
        ctx.fillStyle = '#7c2d12';
        this._roundRect(ctx, -12, -16, 6, 8, 1.5);
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    /**
     * Dibuja el arma del héroe en su mano derecha con ángulo y rotación de barrido.
     */
    static _drawZeldaHeroWeapon(ctx, heroId, colors, aimAngle, swingProgress, equippedWeapon, facingLeft) {
        ctx.save();
        ctx.translate(4, -14);

        // Ángulo de barrido dinámico al atacar
        let angle = facingLeft ? -aimAngle : aimAngle;
        if (swingProgress > 0) {
            angle += (swingProgress - 0.5) * Math.PI * 1.6;
        }
        ctx.rotate(angle);

        const wId = typeof equippedWeapon === 'object' ? equippedWeapon?.id : equippedWeapon;
        const bladeColor = wId === 'astral_blade'
            ? '#38bdf8'
            : wId === 'dragonslayer_halberd'
                ? '#fbbf24'
                : colors.weaponBlade || '#e2e8f0';

        if (heroId === 'barbarian') {
            // Mandoble pesado con filo de doble vertiente y gavilán dorado
            ctx.fillStyle = '#78350f';
            ctx.fillRect(0, -1.5, 8, 3); // Empuñadura
            ctx.fillStyle = '#f59e0b';
            ctx.fillRect(7, -5, 3, 10); // Cruz
            // Hoja ancha de acero
            ctx.fillStyle = bladeColor;
            ctx.beginPath();
            ctx.moveTo(10, -3.2);
            ctx.lineTo(30, -2.2);
            ctx.lineTo(34, 0);
            ctx.lineTo(30, 2.2);
            ctx.lineTo(10, 3.2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#0f0c18';
            ctx.lineWidth = 1;
            ctx.stroke();
            // Ranura central de sangre
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(11, 0);
            ctx.lineTo(28, 0);
            ctx.stroke();
        } else if (heroId === 'dwarf') {
            // Hacha de guerra doble rúnica
            ctx.fillStyle = '#5c2b09';
            ctx.fillRect(0, -1.8, 22, 3.6); // Asta de madera
            // Cuchilla doble de hacha
            ctx.fillStyle = bladeColor;
            ctx.beginPath();
            ctx.arc(17, -5, 6, 0, Math.PI * 1.8);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(17, 5, 6, -Math.PI * 0.8, Math.PI);
            ctx.fill();
            ctx.strokeStyle = '#0f0c18';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = '#facc15';
            ctx.fillRect(15, -2, 4, 4); // Remache rúnico
        } else if (heroId === 'elf') {
            // Espada Maestra Silvana (Zelda Master Sword homage)
            ctx.fillStyle = '#1e3a8a';
            ctx.fillRect(0, -1.2, 7, 2.4); // Empuñadura azul
            ctx.fillStyle = '#facc15';
            // Gavilán curvado alado
            ctx.beginPath();
            ctx.moveTo(7, -5);
            ctx.lineTo(10, -1.5);
            ctx.lineTo(10, 1.5);
            ctx.lineTo(7, 5);
            ctx.lineTo(6, 0);
            ctx.closePath();
            ctx.fill();
            // Hoja afilada plateada con brillo azulado
            ctx.fillStyle = bladeColor;
            ctx.beginPath();
            ctx.moveTo(10, -2.2);
            ctx.lineTo(30, -1.5);
            ctx.lineTo(33, 0);
            ctx.lineTo(30, 1.5);
            ctx.lineTo(10, 2.2);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#0f0c18';
            ctx.lineWidth = 1;
            ctx.stroke();
        } else {
            // Báculo elemental del Mago con orbe brillante
            ctx.fillStyle = '#78350f';
            ctx.fillRect(0, -1.5, 22, 3);
            ctx.fillStyle = '#facc15';
            ctx.fillRect(20, -3.5, 4, 7); // Engaste
            // Orbe elemental mágico
            ctx.fillStyle = equippedWeapon ? bladeColor : '#38bdf8';
            ctx.beginPath();
            ctx.arc(28, 0, 5.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.2;
            ctx.stroke();
        }

        ctx.restore();
    }

    /**
     * Dibuja el escudo del héroe en su mano secundaria estilo Zelda clásico.
     * En postura normal reposa en el flanco; al bloquear (Shift) se adelanta firmemente en guardia.
     */
    static _drawZeldaHeroShield(ctx, heroId, colors, isBlocking, aimAngle, facingLeft, elapsed = 0) {
        ctx.save();

        if (isBlocking) {
            // Postura de bloqueo activa: el escudo se adelanta y se levanta en guardia
            ctx.translate(7, -13);
            const blockTremor = Math.sin(elapsed * 18) * 0.4;
            ctx.translate(0, blockTremor);
        } else {
            // Reposo en el flanco izquierdo
            ctx.translate(-7.5, -13);
        }

        ctx.save();

        // Resplandor de guardia activa
        if (isBlocking) {
            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = 9;
        }

        // Borde metálico exterior forjado
        ctx.fillStyle = isBlocking ? '#fef08a' : '#475569';
        ctx.beginPath();
        ctx.moveTo(-5.5, -9);
        ctx.lineTo(5.5, -9);
        ctx.lineTo(6.5, -1);
        ctx.lineTo(0, 9.5);
        ctx.lineTo(-6.5, -1);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#0f0c18';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Cuerpo interior del escudo según facción/clase
        const innerColor = heroId === 'elf'
            ? '#1e3a8a'
            : heroId === 'barbarian'
                ? '#78350f'
                : heroId === 'dwarf'
                    ? '#065f46'
                    : '#581c87';

        ctx.fillStyle = innerColor;
        ctx.beginPath();
        ctx.moveTo(-3.8, -7.5);
        ctx.lineTo(3.8, -7.5);
        ctx.lineTo(4.8, -1);
        ctx.lineTo(0, 7.5);
        ctx.lineTo(-4.8, -1);
        ctx.closePath();
        ctx.fill();

        // Emblema heráldico dorado estilo Zelda (Cruz / Trifuerza rúnica)
        ctx.fillStyle = isBlocking ? '#fef08a' : '#facc15';
        ctx.beginPath();
        ctx.moveTo(0, -6.5);
        ctx.lineTo(3, -2);
        ctx.lineTo(-3, -2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#b45309';
        ctx.fillRect(-1.2, -1, 2.4, 4.5);

        ctx.restore();
        ctx.restore();
    }

    /**
     * Dibuja la barrera de energía defensiva del escudo al bloquear en arco frontal.
     */
    static _drawZeldaBlockBarrier(ctx, x, y, aimAngle, elapsed, glowColor = '#facc15') {
        ctx.save();
        ctx.translate(x, y);

        const pulse = Math.sin(elapsed * 12) * 2.2;
        const radius = 28 + pulse;
        const arcSpread = Math.PI * 0.62;
        const start = aimAngle - arcSpread * 0.5;
        const end = aimAngle + arcSpread * 0.5;

        // 1. Resplandor exterior de impacto
        ctx.save();
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 14;
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 3.8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, radius, start, end);
        ctx.stroke();
        ctx.restore();

        // 2. Arco interior brillante
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, radius - 1.5, start + 0.08, end - 0.08);
        ctx.stroke();

        // 3. Campo translúcido de energía protectora
        ctx.fillStyle = 'rgba(250, 204, 21, 0.20)';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, start, end);
        ctx.closePath();
        ctx.fill();

        // 4. Chispas de escudo orbitando el arco defensivo
        const sparkPhase = (Math.sin(elapsed * 8) + 1) * 0.5;
        const sparkAngle = start + sparkPhase * arcSpread;
        const sx = Math.cos(sparkAngle) * radius;
        const sy = Math.sin(sparkAngle) * radius;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    /**
     * Dibuja estrellas giratorias de aturdimiento sobre el héroe tras rotura de guardia.
     */
    static _drawGuardBreakStun(ctx, x, y, elapsed) {
        ctx.save();
        ctx.translate(x, y);

        const numStars = 3;
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (let i = 0; i < numStars; i++) {
            const angle = elapsed * 8 + (i * Math.PI * 2) / numStars;
            const sx = Math.cos(angle) * 14;
            const sy = Math.sin(angle) * 5;

            ctx.fillText('💫', sx, sy);
        }

        ctx.restore();
    }

    /**
     * Dibuja la icónica estela de tajo en arco luminoso estilo Zelda clásico.
     */
    static _drawZeldaSlashArc(ctx, x, y, aimAngle, progress, color, range) {
        ctx.save();
        ctx.translate(x, y);

        const radius = Math.min(range, 46);
        const arcSpread = Math.PI * 0.85;
        const start = aimAngle - arcSpread * 0.5 + progress * 0.4;
        const end = start + arcSpread * 0.6;

        // Estela exterior brillante
        ctx.strokeStyle = color;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, radius, start, end);
        ctx.stroke();

        // Filo central blanco resplandeciente
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, radius, start + 0.1, end);
        ctx.stroke();

        ctx.restore();
    }

    /* =========================================================================
       MONSTRUOS ESTILO ZELDA CLÁSICO
       ========================================================================= */

    // 1. GOBLIN (Estilo Bokoblin / Moblin verde ágil)
    static _drawZeldaGoblin(ctx, colors, walkPhase) {
        this._drawZeldaSteppingLegs(ctx, walkPhase, true, '#166534', '#15803d');

        // Cuerpo encorvado con harapos marrones
        ctx.fillStyle = '#78350f';
        this._roundRect(ctx, -6, -17, 12, 10, 2);
        ctx.strokeStyle = '#0f0c18';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Cabeza verde con grandes orejas puntiagudas (típicas de Zelda)
        ctx.fillStyle = colors.skin || '#22c55e';
        ctx.beginPath();
        ctx.arc(0, -21, 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Grandes orejas puntiagudas a los lados
        ctx.fillStyle = colors.skin || '#22c55e';
        ctx.beginPath();
        ctx.moveTo(-5, -22);
        ctx.lineTo(-14, -26);
        ctx.lineTo(-5, -17);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        // Interior rosado de la oreja
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(-11, -24, 4, 3);

        ctx.fillStyle = colors.skin || '#22c55e';
        ctx.beginPath();
        ctx.moveTo(5, -22);
        ctx.lineTo(14, -26);
        ctx.lineTo(5, -17);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#f472b6';
        ctx.fillRect(7, -24, 4, 3);

        // Ojos amarillos malévolos con pupila vertical
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-4, -22, 2.8, 2.5);
        ctx.fillRect(1.2, -22, 2.8, 2.5);
        ctx.fillStyle = '#0f0c18';
        ctx.fillRect(-2.8, -22, 1.4, 2.5);
        ctx.fillRect(2.4, -22, 1.4, 2.5);

        // Daga dentada en mano derecha
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.moveTo(7, -15);
        ctx.lineTo(15, -18);
        ctx.lineTo(13, -13);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    }

    // 2. ORCO (Estilo Moblin acorazado con colmillos de cerdo)
    static _drawZeldaOrc(ctx, colors, walkPhase) {
        this._drawZeldaSteppingLegs(ctx, walkPhase, true, '#450a0a', '#7f1d1d');

        // Torso musculoso rojo con pechera de hierro remachada
        ctx.fillStyle = '#991b1b';
        this._roundRect(ctx, -8.5, -20, 17, 13, 2);
        ctx.fillStyle = '#334155';
        this._roundRect(ctx, -7, -21, 14, 9, 2);
        ctx.strokeStyle = '#0f0c18';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Hombreras con púas de hierro
        ctx.fillStyle = '#475569';
        this._roundRect(ctx, -11, -23, 5, 6, 1.5);
        this._roundRect(ctx, 6, -23, 5, 6, 1.5);
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(-10, -25, 2, 3); // Púa izquierda
        ctx.fillRect(8, -25, 2, 3); // Púa derecha

        // Cabeza brutal con hocico y colmillos prominentes
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.arc(0, -26, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Ojos carmesí
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-4, -27, 2.5, 2);
        ctx.fillRect(1.5, -27, 2.5, 2);

        // Colmillos inferiores blancos que sobresalen hacia arriba
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(-4, -22);
        ctx.lineTo(-3, -25);
        ctx.lineTo(-2, -22);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(2, -22);
        ctx.lineTo(3, -25);
        ctx.lineTo(4, -22);
        ctx.closePath();
        ctx.fill();

        // Machete carnicero pesado
        ctx.fillStyle = '#64748b';
        this._roundRect(ctx, 8, -23, 6, 14, 1.5);
        ctx.stroke();
    }

    // 3. ESQUELETO (Estilo Stalfos clásico de Zelda)
    static _drawZeldaSkeleton(ctx, colors, walkPhase) {
        // Piernas óseas
        const step = Math.sin(walkPhase) * 4;
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(-4, -8);
        ctx.lineTo(-4, 0 + step);
        ctx.moveTo(4, -8);
        ctx.lineTo(4, 0 - step);
        ctx.stroke();

        // Columna vertebral y costillas expuestas
        ctx.strokeStyle = '#0f0c18';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(0, -19);
        ctx.stroke();
        ctx.strokeStyle = '#f8fafc';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.lineTo(0, -19);
        // 3 pares de costillas
        ctx.moveTo(-6, -16);
        ctx.lineTo(6, -16);
        ctx.moveTo(-5, -13);
        ctx.lineTo(5, -13);
        ctx.moveTo(-4, -10);
        ctx.lineTo(4, -10);
        ctx.stroke();

        // Cráneo blanqueado con cuencas oculares oscuras y brillo rojo
        ctx.fillStyle = '#f8fafc';
        this._roundRect(ctx, -6, -29, 12, 10, 3);
        ctx.strokeStyle = '#0f0c18';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Cuencas oculares con brasas rojas
        ctx.fillStyle = '#0f0c18';
        ctx.fillRect(-4, -26, 3, 3);
        ctx.fillRect(1, -26, 3, 3);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-3, -25, 1.5, 1.5);
        ctx.fillRect(2, -25, 1.5, 1.5);

        // Espada vieja de hierro mellada
        ctx.fillStyle = '#475569';
        ctx.fillRect(6, -24, 3, 14);
        ctx.strokeRect(6, -24, 3, 14);
    }

    // 4. FIMIR (Guerrero reptiliano de pantano con único ojo central)
    static _drawZeldaFimir(ctx, colors, walkPhase) {
        this._drawZeldaSteppingLegs(ctx, walkPhase, true, '#064e3b', '#047857');

        // Cola reptiliana que ondea detrás
        ctx.strokeStyle = '#065f46';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.quadraticCurveTo(-12, -8 + Math.sin(walkPhase) * 3, -16, -14);
        ctx.stroke();

        // Torso acorazado con arnés de bronce
        ctx.fillStyle = '#065f46';
        this._roundRect(ctx, -8, -20, 16, 12, 3);
        ctx.strokeStyle = '#0f0c18';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // Cabeza con un único gran ojo dorado de cíclope
        ctx.fillStyle = '#047857';
        ctx.beginPath();
        ctx.arc(0, -25, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Gran ojo central de cíclope con pupila reptiliana
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.arc(0, -25, 3.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0f0c18';
        ctx.fillRect(-0.8, -27, 1.6, 4);

        // Maza con pinchos de hierro
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(7, -19, 11, 3);
        ctx.beginPath();
        ctx.arc(17, -17.5, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    // 5. GÁRGOLA (Jefe Final — Bestia demoníaca de piedra con alas batientes)
    static _drawZeldaGargoyle(ctx, colors, elapsed) {
        const wingFlap = Math.sin(elapsed * 6) * 4;

        // 1. Grandes alas demoníacas de piedra desplegadas
        ctx.fillStyle = '#292524';
        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(-24, -36 + wingFlap);
        ctx.lineTo(-18, -14);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#0f0c18';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, -20);
        ctx.lineTo(24, -36 + wingFlap);
        ctx.lineTo(18, -14);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // 2. Torso colosal de granito agrietado
        ctx.fillStyle = '#44403c';
        this._roundRect(ctx, -10, -26, 20, 18, 3);
        ctx.stroke();

        // Grietas de lava/magma en el pecho
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-5, -23);
        ctx.lineTo(0, -18);
        ctx.lineTo(5, -21);
        ctx.stroke();

        // 3. Cabeza cornuda de gárgola
        ctx.fillStyle = '#57534e';
        this._roundRect(ctx, -7, -33, 14, 10, 3);
        ctx.stroke();

        // Cuernos demoníacos curvados hacia arriba
        ctx.strokeStyle = '#d6d3d1';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(-5, -33);
        ctx.lineTo(-12, -43);
        ctx.moveTo(5, -33);
        ctx.lineTo(12, -43);
        ctx.stroke();

        // Ojos ígneos llameantes del Caos
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(-4.5, -31, 3, 2.5);
        ctx.fillRect(1.5, -31, 3, 2.5);

        // 4. Espada llameante del Caos
        ctx.fillStyle = '#991b1b';
        ctx.beginPath();
        ctx.moveTo(9, -15);
        ctx.lineTo(17, -40);
        ctx.lineTo(12, -40);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 1.2;
        ctx.stroke();
    }

    /**
     * Utilidad para dibujar rectángulos con esquinas redondeadas.
     * Rellena con el fillStyle actual (todos los llamadores lo fijan antes) y deja
     * el trazado activo para un posible ctx.stroke() posterior.
     * Pasar fill=false para obtener solo el trazado.
     */
    static _roundRect(ctx, x, y, w, h, r = 2, fill = true) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.arcTo(x + w, y, x + w, y + h, r);
        ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r);
        ctx.arcTo(x, y, x + w, y, r);
        ctx.closePath();
        if (fill) ctx.fill();
    }
}
