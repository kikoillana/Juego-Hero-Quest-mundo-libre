/**
 * @fileoverview Datos base, estadísticas, velocidades de IA, armamento y personalidad de las 4 clases de HeroQuest.
 * Jerarquía de velocidad automática: Mago (más lento) < Enano (2º más lento) < Bárbaro < Elfo (más rápido).
 * Capa 0: Sin dependencias externas.
 */

export const HEROES_DATA = Object.freeze({
    barbarian: {
        id: 'barbarian',
        name: 'Bárbaro',
        portrait: './assets/portraits/barbarian.png',
        title: 'Campeón de las Tierras Salvajes',
        description: 'Coloso de fuerza descomunal armado con un mandoble de doble filo. Sus barridos diezman filas enteras de pielesverdes.',
        stats: {
            maxHp: 130,
            maxStamina: 100,
            speed: 198,
            aiSpeed: 182, // 2º más rápido
            attackDamage: 28,
            attackRange: 64,
            attackArc: Math.PI * 0.85,
            attackCooldown: 0.40,
            critChance: 0.20,
            defense: 3
        },
        skill: {
            name: 'Torbellino de Acero',
            description: 'Giro brutal de 360° que golpea y derriba a todos los enemigos alrededor.',
            staminaCost: 35,
            cooldown: 3.5,
            damageMultiplier: 1.65,
            radius: 80
        },
        colors: {
            baseRim: '#b91c1c',
            baseTop: '#7f1d1d',
            skin: '#e09f70',
            tunic: '#92400e',
            armor: '#78716c',
            cape: '#991b1b',
            hair: '#292524',
            weaponBlade: '#e2e8f0',
            weaponHilt: '#f59e0b',
            slashColor: '#f87171'
        },
        voice: {
            role: 'hero',
            pitch: 0.48,
            rate: 0.92
        },
        startingItems: {
            healPotions: 2,
            strengthPotions: 1,
            speedPotions: 1
        },
        quotes: {
            spawn: '¡Por el acero de mis ancestros, ningún siervo de Zargon quedará en pie!',
            attack: ['¡Por Crom!', '¡Partiré vuestros escudos!', '¡Sentid mi acero!', '¡Detrás de mí, compañeros!'],
            teamwork: ['¡Cubro al Mago!', '¡Aguantad la línea!', '¡Dejadme a los grandes a mí!'],
            loot: ['¡Oro digno de un rey bárbaro!', '¡Buen botín para la taberna!'],
            hurt: ['¡Solo es un rasguño!', '¡Pagarás esa osadía con sangre!']
        }
    },

    dwarf: {
        id: 'dwarf',
        name: 'Enano',
        portrait: './assets/portraits/dwarf.png',
        title: 'Berserker Forjador (Un Poco Loco)',
        description: 'Acorazado en malla rúnica, desquiciado por la pólvora y la cerveza fuerte. Salta de cabeza al peligro y desmonta trampas a martillazos.',
        stats: {
            maxHp: 140,
            maxStamina: 110,
            speed: 168,
            aiSpeed: 148, // 2º más lento
            attackDamage: 26,
            attackRange: 56,
            attackArc: Math.PI * 0.78,
            attackCooldown: 0.36,
            critChance: 0.25,
            defense: 5
        },
        skill: {
            name: 'Martillo Sísmico',
            description: 'Salta como un demente e impacta el suelo liberando una onda sísmica rúnica.',
            staminaCost: 32,
            cooldown: 3.2,
            damageMultiplier: 1.75,
            radius: 86
        },
        colors: {
            baseRim: '#d97706',
            baseTop: '#92400e',
            skin: '#f1b894',
            tunic: '#1e3a8a',
            armor: '#cbd5e1',
            cape: '#b45309',
            hair: '#b45309',
            weaponBlade: '#f8fafc',
            weaponHilt: '#d97706',
            slashColor: '#fbbf24'
        },
        voice: {
            role: 'hero',
            pitch: 0.42,
            rate: 0.86
        },
        startingItems: {
            healPotions: 2,
            strengthPotions: 1,
            speedPotions: 1
        },
        quotes: {
            spawn: '¡JAJAJA! ¡Mis barbas tiemblan de locura! ¡Hora de repartir hachazos sin preguntar!',
            attack: [
                '¡JAJAJA! ¡VOY SIN FRENOS!',
                '¡QUIÉN NECESITA ESCUDO TENIENDO EL CRÁNEO DURO!',
                '¡POR MIS BARBAS EN LLAMAS!',
                '¡OS VOY A PEINAR CON EL HACHA!',
                '¡SUJETADME LA CERVEZA RÚNICA!'
            ],
            crazy: [
                '¡Jajaja! ¿Oís esas voces? ¡Dicen que machaque más goblins!',
                '¡Si no sangra, le doy otro hachazo por si acaso!',
                '¡El Mago camina como una tortuga con túnica! ¡CORRED MÁS!',
                '¡Qué bonita piedra, voy a darle un cabezazo!'
            ],
            trapDisarm: [
                '¡JAJA! ¡Una trampa de Zargon! ¡La he desmontado a martillazos!',
                '¡Trampa desactivada! ¡Casi me corta la barba, qué emoción!',
                '¡Clic, clac, trampa fuera! ¡Soy un genio de la chatarra!'
            ],
            loot: ['¡Oro puro de veta imperial!', '¡Directo a mi faltriquera!'],
            hurt: ['¡JAJAJA, ESO HACE COSQUILLAS!', '¡Maldito grobi, eso irá al Libro de Agravios!']
        }
    },

    elf: {
        id: 'elf',
        name: 'Elfo',
        portrait: './assets/portraits/elf.png',
        title: 'Hoja de Athel Loren',
        description: 'Guerrero veloz y elegante que flanquea enemigos y canaliza brisas curativas de la naturaleza para sanar al grupo.',
        stats: {
            maxHp: 105,
            maxStamina: 120,
            speed: 225,
            aiSpeed: 205, // El más rápido del grupo
            attackDamage: 23,
            attackRange: 62,
            attackArc: Math.PI * 0.70,
            attackCooldown: 0.28,
            critChance: 0.30,
            defense: 2
        },
        skill: {
            name: 'Viento Silvano Sanador',
            description: 'Descarga un vendaval esmeralda que lacera enemigos y restaura salud a todo el grupo cercano.',
            staminaCost: 30,
            cooldown: 3.4,
            damageMultiplier: 1.55,
            radius: 86
        },
        colors: {
            baseRim: '#16a34a',
            baseTop: '#14532d',
            skin: '#fde2c8',
            tunic: '#15803d',
            armor: '#fef08a',
            cape: '#166534',
            hair: '#fde047',
            weaponBlade: '#a7f3d0',
            weaponHilt: '#eab308',
            slashColor: '#4ade80'
        },
        voice: {
            role: 'hero',
            pitch: 0.65,
            rate: 0.96
        },
        startingItems: {
            healPotions: 2,
            strengthPotions: 1,
            speedPotions: 2
        },
        quotes: {
            spawn: 'El viento susurra entre estas piedras corruptas. Purificaré esta mazmorra.',
            attack: ['¡Veloz como el viento!', '¡Danza con mi hoja!', '¡Luz de Loren!', '¡Flanqueando por la izquierda!'],
            teamwork: ['¡Sanando vuestras heridas con luz silvana!', '¡Resistid, amigos, el bosque os protege!'],
            loot: ['Reliquias brillantes en la oscuridad.', 'Usaré este oro con sabiduría.'],
            hurt: ['¡Qué torpeza la mía!', '¡No volverás a rozarme, engendro!']
        }
    },

    wizard: {
        id: 'wizard',
        name: 'Mago',
        portrait: './assets/portraits/wizard.png',
        title: 'Archimago de los Cuatro Elementos',
        description: 'El más pausado al caminar por el peso de sus tomos, pero letal a distancia con descargas ígneas y novas pirománticas.',
        stats: {
            maxHp: 95,
            maxStamina: 135,
            speed: 152,
            aiSpeed: 126, // El más lento de todos en modo automático
            attackDamage: 26,
            attackRange: 82,
            attackArc: Math.PI * 0.75,
            attackCooldown: 0.36,
            critChance: 0.25,
            defense: 2
        },
        skill: {
            name: 'Fuego de Ira de Zargon',
            description: 'Invoca una nova piromántica arcana que incinera a toda criatura en un amplio radio.',
            staminaCost: 35,
            cooldown: 3.6,
            damageMultiplier: 1.95,
            radius: 102
        },
        colors: {
            baseRim: '#2563eb',
            baseTop: '#1e3a8a',
            skin: '#f8d8be',
            tunic: '#4f46e5',
            armor: '#c084fc',
            cape: '#312e81',
            hair: '#e2e8f0',
            weaponBlade: '#38bdf8',
            weaponHilt: '#9333ea',
            slashColor: '#60a5fa'
        },
        voice: {
            role: 'hero',
            pitch: 0.54,
            rate: 0.88
        },
        startingItems: {
            healPotions: 3,
            strengthPotions: 1,
            speedPotions: 1
        },
        quotes: {
            spawn: 'Los vientos de la magia convergen en este tablero. ¡Que arda la oscuridad!',
            attack: ['¡Ignis Arcana!', '¡Fuego de Ira!', '¡Disípate en cenizas!', '¡No corráis tanto, mis tomos pesan!'],
            teamwork: ['¡Fuego de cobertura desde la retaguardia!', '¡Apartaos del radio de mi nova ígnea!'],
            loot: ['¡Excelente financiación para mis pergaminos!', '¡Oro alquímico de primera ley!'],
            hurt: ['¡Proteged a vuestro Archimago!', '¡Mi escudo etéreo se resiente!']
        }
    }
});

export const HERO_LIST = Object.values(HEROES_DATA);
