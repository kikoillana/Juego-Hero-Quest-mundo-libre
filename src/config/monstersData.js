/**
 * @fileoverview Arquetipos de enemigos clásicos de HeroQuest escalados para grupo de 4 Héroes
 * y Jefe Final (Gárgola del Caos) multifase de alta dificultad.
 * Capa 0: Sin dependencias externas.
 */

export const MONSTERS_DATA = Object.freeze({
    goblin: {
        id: 'goblin',
        name: 'Goblin',
        title: 'Merodeador Nocturno',
        isBoss: false,
        maxHp: 78,
        speed: 158,
        patrolSpeed: 74,
        damage: 14,
        attackRange: 44,
        aggroRadius: 260,
        telegraphTime: 0.36,
        attackCooldown: 0.88,
        radius: 13,
        scale: 0.88,
        goldMin: 12,
        goldMax: 26,
        potionChance: 0.16,
        colors: {
            baseRim: '#15803d',
            baseTop: '#14532d',
            skin: '#65a30d',
            armor: '#78350f',
            eyes: '#facc15',
            weapon: '#94a3b8'
        },
        voice: {
            role: 'monster',
            monsterType: 'goblin',
            pitch: 1.45,
            rate: 1.22
        }
    },

    orc: {
        id: 'orc',
        name: 'Orco',
        title: 'Guerrero de Ulag',
        isBoss: false,
        maxHp: 145,
        speed: 132,
        patrolSpeed: 62,
        damage: 24,
        attackRange: 52,
        aggroRadius: 270,
        telegraphTime: 0.44,
        attackCooldown: 1.05,
        radius: 16,
        scale: 1.05,
        goldMin: 22,
        goldMax: 44,
        potionChance: 0.22,
        colors: {
            baseRim: '#166534',
            baseTop: '#052e16',
            skin: '#3f6212',
            armor: '#7f1d1d',
            eyes: '#ef4444',
            weapon: '#cbd5e1'
        },
        voice: {
            role: 'monster',
            monsterType: 'orc',
            pitch: 0.28,
            rate: 0.78
        }
    },

    skeleton: {
        id: 'skeleton',
        name: 'Esqueleto',
        title: 'Guardián de la Cripta',
        isBoss: false,
        maxHp: 120,
        speed: 120,
        patrolSpeed: 56,
        damage: 20,
        attackRange: 50,
        aggroRadius: 265,
        telegraphTime: 0.40,
        attackCooldown: 1.00,
        radius: 14,
        scale: 0.96,
        goldMin: 18,
        goldMax: 36,
        potionChance: 0.20,
        colors: {
            baseRim: '#64748b',
            baseTop: '#334155',
            skin: '#e2e8f0',
            armor: '#475569',
            eyes: '#38bdf8',
            weapon: '#94a3b8'
        },
        voice: {
            role: 'monster',
            monsterType: 'skeleton',
            pitch: 0.38,
            rate: 0.84
        }
    },

    fimir: {
        id: 'fimir',
        name: 'Fimir',
        title: 'Cíclope de las Ciénegas',
        isBoss: false,
        maxHp: 225,
        speed: 114,
        patrolSpeed: 52,
        damage: 32,
        attackRange: 58,
        aggroRadius: 280,
        telegraphTime: 0.50,
        attackCooldown: 1.20,
        radius: 18,
        scale: 1.18,
        goldMin: 38,
        goldMax: 70,
        potionChance: 0.35,
        colors: {
            baseRim: '#0f766e',
            baseTop: '#134e4a',
            skin: '#0d9488',
            armor: '#b45309',
            eyes: '#fde047',
            weapon: '#d6d3d1'
        },
        voice: {
            role: 'monster',
            monsterType: 'fimir',
            pitch: 0.22,
            rate: 0.74
        }
    },

    gargoyle: {
        id: 'gargoyle',
        name: 'Gárgola del Caos',
        title: 'Verdugo Alado de Zargon (JEFE SUPREMO)',
        isBoss: true,
        maxHp: 920,
        speed: 132,
        patrolSpeed: 55,
        damage: 44,
        attackRange: 76,
        aggroRadius: 340,
        telegraphTime: 0.52,
        attackCooldown: 1.00,
        radius: 23,
        scale: 1.44,
        goldMin: 220,
        goldMax: 350,
        potionChance: 1.0,
        colors: {
            baseRim: '#991b1b',
            baseTop: '#450a0a',
            skin: '#57534e',
            armor: '#dc2626',
            eyes: '#fbbf24',
            weapon: '#f87171'
        },
        voice: {
            role: 'monster',
            monsterType: 'gargoyle',
            pitch: 0.14,
            rate: 0.70
        }
    }
});
