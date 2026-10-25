/**
 * @fileoverview Renderizador procedural de retratos vectoriales en vivo para avatares de UI,
 * selector de héroes y diálogos (4 Clases de Héroe, Mentor y 5 Monstruos).
 * Cero activos externos. Capa 4: Sin dependencias circulares.
 */

export class PortraitRenderer {
    /**
     * Dibuja un retrato vectorial detallado en el canvas indicado.
     * @param {HTMLCanvasElement} canvas
     * @param {string} characterId - 'barbarian' | 'dwarf' | 'elf' | 'wizard' | 'mentor' | 'goblin' | 'orc' | 'skeleton' | 'fimir' | 'gargoyle'
     * @param {number} [time=0] - Tiempo opcional para sutil animación de brillo
     */
    static renderToCanvas(canvas, characterId, time = 0) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const w = canvas.width;
        const h = canvas.height;
        ctx.clearRect(0, 0, w, h);

        ctx.save();
        ctx.scale(w / 100, h / 100);

        switch (characterId) {
            case 'barbarian':
                this._drawBarbarian(ctx, time);
                break;
            case 'dwarf':
                this._drawDwarf(ctx, time);
                break;
            case 'elf':
                this._drawElf(ctx, time);
                break;
            case 'wizard':
                this._drawWizard(ctx, time);
                break;
            case 'mentor':
                this._drawMentor(ctx, time);
                break;
            case 'gargoyle':
                this._drawGargoyle(ctx, time);
                break;
            default:
                this._drawMentor(ctx, time);
                break;
        }

        // Marco gótico interior biselado
        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 3;
        ctx.strokeRect(1.5, 1.5, 97, 97);
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(4, 4, 92, 92);

        ctx.restore();
    }

    static _drawBackground(ctx, colorTop, colorBottom, glowColor) {
        const grad = ctx.createLinearGradient(0, 0, 0, 100);
        grad.addColorStop(0, colorTop);
        grad.addColorStop(1, colorBottom);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 100, 100);

        const rad = ctx.createRadialGradient(50, 48, 8, 50, 48, 48);
        rad.addColorStop(0, glowColor);
        rad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = rad;
        ctx.fillRect(0, 0, 100, 100);
    }

    static _drawBarbarian(ctx) {
        this._drawBackground(ctx, '#450a0a', '#1c0908', 'rgba(239, 68, 68, 0.32)');

        // Manto de piel de lobo sobre los hombros
        ctx.fillStyle = '#57534e';
        ctx.beginPath();
        ctx.ellipse(50, 92, 40, 24, 0, Math.PI, Math.PI * 2);
        ctx.fill();

        // Cuello y trapecios musculosos
        ctx.fillStyle = '#c88255';
        ctx.fillRect(36, 62, 28, 22);

        // Melena negra salvaje (fondo)
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.arc(50, 46, 27, 0, Math.PI * 2);
        ctx.fill();

        // Rostro anguloso bronceado
        ctx.fillStyle = '#e09f70';
        ctx.beginPath();
        ctx.moveTo(31, 32);
        ctx.lineTo(69, 32);
        ctx.lineTo(66, 58);
        ctx.lineTo(50, 70);
        ctx.lineTo(34, 58);
        ctx.closePath();
        ctx.fill();

        // Cicatriz de batalla en la mejilla
        ctx.strokeStyle = '#991b1b';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(57, 45);
        ctx.lineTo(63, 56);
        ctx.stroke();

        // Diadema de cuero y bronce
        ctx.fillStyle = '#78350f';
        ctx.fillRect(29, 28, 42, 8);
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(45, 27, 10, 10);

        // Cejas fruncidas y ojos fieros
        ctx.fillStyle = '#1c1917';
        ctx.fillRect(35, 39, 11, 3);
        ctx.fillRect(54, 39, 11, 3);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(37, 43, 8, 4);
        ctx.fillRect(55, 43, 8, 4);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(40, 43, 4, 4);
        ctx.fillRect(57, 43, 4, 4);

        // Boca firme
        ctx.strokeStyle = '#7c2d12';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(43, 59);
        ctx.lineTo(57, 59);
        ctx.stroke();
    }

    static _drawDwarf(ctx) {
        this._drawBackground(ctx, '#451a03', '#1c1008', 'rgba(245, 158, 11, 0.32)');

        // Armadura pesada de placas en los hombros
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.ellipse(50, 92, 42, 24, 0, Math.PI, Math.PI * 2);
        ctx.fill();

        // Rostro robusto
        ctx.fillStyle = '#f1b894';
        ctx.fillRect(32, 34, 36, 30);

        // Gran barba trenzada cobriza
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.moveTo(27, 48);
        ctx.lineTo(73, 48);
        ctx.lineTo(66, 94);
        ctx.lineTo(50, 99);
        ctx.lineTo(34, 94);
        ctx.closePath();
        ctx.fill();

        // Broches de oro en la barba
        ctx.fillStyle = '#facc15';
        ctx.fillRect(45, 72, 10, 5);
        ctx.fillRect(46, 84, 8, 5);

        // Nariz ancha de maestro forjador
        ctx.fillStyle = '#e09a72';
        ctx.beginPath();
        ctx.arc(50, 48, 6, 0, Math.PI * 2);
        ctx.fill();

        // Ojos bajo cejas pobladas
        ctx.fillStyle = '#92400e';
        ctx.fillRect(34, 37, 12, 4);
        ctx.fillRect(54, 37, 12, 4);
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(38, 42, 5, 4);
        ctx.fillRect(57, 42, 5, 4);

        // Yelmo rúnico con cuernos cortos
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.arc(50, 34, 23, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(27, 31, 46, 6);
        ctx.fillRect(47, 16, 6, 20);
    }

    static _drawElf(ctx) {
        this._drawBackground(ctx, '#064e3b', '#052e16', 'rgba(74, 222, 128, 0.28)');

        // Capa verde silvana con broche dorado
        ctx.fillStyle = '#15803d';
        ctx.beginPath();
        ctx.ellipse(50, 92, 38, 24, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#facc15';
        ctx.beginPath();
        ctx.arc(50, 78, 5, 0, Math.PI * 2);
        ctx.fill();

        // Cabello dorado largo
        ctx.fillStyle = '#fde047';
        ctx.fillRect(28, 24, 44, 54);

        // Orejas puntiagudas élficas
        ctx.fillStyle = '#fde2c8';
        ctx.beginPath();
        ctx.moveTo(29, 44);
        ctx.lineTo(16, 36);
        ctx.lineTo(29, 53);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(71, 44);
        ctx.lineTo(84, 36);
        ctx.lineTo(71, 53);
        ctx.fill();

        // Rostro estilizado
        ctx.fillStyle = '#fde2c8';
        ctx.beginPath();
        ctx.moveTo(33, 30);
        ctx.lineTo(67, 30);
        ctx.lineTo(62, 56);
        ctx.lineTo(50, 68);
        ctx.lineTo(38, 56);
        ctx.closePath();
        ctx.fill();

        // Diadema élfica con esmeralda
        ctx.strokeStyle = '#eab308';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(32, 31);
        ctx.quadraticCurveTo(50, 36, 68, 31);
        ctx.stroke();
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(50, 33, 3.5, 0, Math.PI * 2);
        ctx.fill();

        // Ojos esmeralda
        ctx.fillStyle = '#16a34a';
        ctx.fillRect(38, 42, 6, 4);
        ctx.fillRect(56, 42, 6, 4);

        // Sonrisa serena
        ctx.strokeStyle = '#b45309';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.arc(50, 56, 6, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
    }

    static _drawWizard(ctx) {
        this._drawBackground(ctx, '#1e1b4b', '#0f172a', 'rgba(96, 165, 250, 0.35)');

        // Túnica arcana índigo
        ctx.fillStyle = '#3730a3';
        ctx.beginPath();
        ctx.ellipse(50, 92, 40, 25, 0, Math.PI, Math.PI * 2);
        ctx.fill();

        // Capucha mística
        ctx.fillStyle = '#312e81';
        ctx.beginPath();
        ctx.arc(50, 45, 28, 0, Math.PI * 2);
        ctx.fill();

        // Rostro sabio
        ctx.fillStyle = '#f8d8be';
        ctx.beginPath();
        ctx.arc(50, 47, 17, 0, Math.PI * 2);
        ctx.fill();

        // Barba plateada puntiaguda
        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.moveTo(35, 52);
        ctx.lineTo(65, 52);
        ctx.lineTo(50, 82);
        ctx.closePath();
        ctx.fill();

        // Ojos brillantes con energía arcana azul
        ctx.fillStyle = '#38bdf8';
        ctx.shadowColor = '#38bdf8';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(43, 44, 3.2, 0, Math.PI * 2);
        ctx.arc(57, 44, 3.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Sombrero puntiagudo con borde dorado
        ctx.fillStyle = '#4338ca';
        ctx.beginPath();
        ctx.moveTo(20, 32);
        ctx.lineTo(80, 32);
        ctx.lineTo(50, 6);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(22, 32);
        ctx.lineTo(78, 32);
        ctx.stroke();
    }

    static _drawMentor(ctx) {
        this._drawBackground(ctx, '#4c0519', '#1f0812', 'rgba(250, 204, 21, 0.30)');

        // Túnica carmesí de Loretome con estola dorada
        ctx.fillStyle = '#881337';
        ctx.beginPath();
        ctx.ellipse(50, 94, 42, 26, 0, Math.PI, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(43, 68, 14, 30);

        // Rostro venerable
        ctx.fillStyle = '#f3d0b5';
        ctx.beginPath();
        ctx.arc(50, 42, 18, 0, Math.PI * 2);
        ctx.fill();

        // Gran barba blanca imperial
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.moveTo(31, 47);
        ctx.lineTo(69, 47);
        ctx.lineTo(60, 92);
        ctx.lineTo(50, 98);
        ctx.lineTo(40, 92);
        ctx.closePath();
        ctx.fill();

        // Cejas blancas y ojos sabios dorados
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(36, 35, 11, 3.5);
        ctx.fillRect(53, 35, 11, 3.5);
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.arc(42, 41, 3, 0, Math.PI * 2);
        ctx.arc(58, 41, 3, 0, Math.PI * 2);
        ctx.fill();

        // Corona/Birrete de Sabio Imperial
        ctx.fillStyle = '#9f1239';
        ctx.fillRect(31, 18, 38, 14);
        ctx.fillStyle = '#facc15';
        ctx.fillRect(30, 29, 40, 4);
    }

    static _drawGargoyle(ctx) {
        this._drawBackground(ctx, '#450a0a', '#09080b', 'rgba(220, 38, 38, 0.45)');

        // Alas y cuernos de granito
        ctx.fillStyle = '#44403c';
        ctx.beginPath();
        ctx.moveTo(28, 36);
        ctx.lineTo(10, 10);
        ctx.lineTo(38, 26);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(72, 36);
        ctx.lineTo(90, 10);
        ctx.lineTo(62, 26);
        ctx.fill();

        // Cabeza pétrea
        ctx.fillStyle = '#57534e';
        ctx.fillRect(30, 28, 40, 42);

        // Ojos ígneos del Caos
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(35, 42);
        ctx.lineTo(47, 46);
        ctx.lineTo(36, 49);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(65, 42);
        ctx.lineTo(53, 46);
        ctx.lineTo(64, 49);
        ctx.fill();

        // Colmillos de piedra
        ctx.fillStyle = '#e7e5e4';
        ctx.fillRect(36, 58, 28, 7);
    }
}
