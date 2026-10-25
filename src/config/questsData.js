/**
 * @fileoverview Definición de las 6 Misiones Secundarias del Bosque de Loretome (4x),
 * NPCs dadores de misión, Armas Legendarias desbloqueables, Habilidades Especiales
 * y asignación de rescate de los 3 Héroes Cautivos.
 * Capa 0: Sin dependencias externas.
 */

import { ZONE_ID } from './constants.js';
import { HEROES_DATA } from './heroesData.js';

export const ALL_HERO_IDS = Object.freeze(['barbarian', 'dwarf', 'elf', 'wizard']);

/**
 * Devuelve el mapa de qué compañero héroe está prisionero en cada una de las 3 mazmorras de rescate,
 * dado el héroe líder elegido al inicio.
 * @param {string} leaderHeroId
 * @returns {Record<string, string>} Mapa { [zoneId]: prisonerHeroId }
 */
export function getPrisonerAssignment(leaderHeroId = 'barbarian') {
    const missing = ALL_HERO_IDS.filter((id) => id !== leaderHeroId);
    return {
        [ZONE_ID.DUNGEON_FELLMARG]: missing[0] || 'dwarf',
        [ZONE_ID.DUNGEON_CRYPT]: missing[1] || 'elf',
        [ZONE_ID.DUNGEON_KELLAR]: missing[2] || 'wizard'
    };
}

/**
 * Devuelve la lista detallada de los 4 Campeones (el Líder actual + los 3 compañeros y su estado/ubicación).
 * @param {string} leaderHeroId
 * @param {Array<string>} rescuedHeroIds
 */
export function getRescueStatusList(leaderHeroId = 'barbarian', rescuedHeroIds = []) {
    const map = getPrisonerAssignment(leaderHeroId);
    const rescuedSet = new Set(rescuedHeroIds);
    const leaderData = HEROES_DATA[leaderHeroId] || HEROES_DATA.barbarian;

    const list = [
        {
            heroId: leaderHeroId,
            name: leaderData.name,
            heroName: leaderData.name,
            title: leaderData.title,
            heroTitle: leaderData.title,
            status: 'leader',
            rescued: true,
            zoneId: ZONE_ID.OVERWORLD,
            dungeonName: 'Líder de la Expedición (En Juego)',
            directionHint: 'Activo'
        }
    ];

    const dungeonInfo = [
        {
            zoneId: ZONE_ID.DUNGEON_FELLMARG,
            dungeonName: 'Bastión de Fellmarg (Oeste)',
            directionHint: 'Al Oeste del Campamento Real (Col 14, Fila 33)',
            heroId: map[ZONE_ID.DUNGEON_FELLMARG]
        },
        {
            zoneId: ZONE_ID.DUNGEON_CRYPT,
            dungeonName: 'Cripta del Rey Brujo (Norte)',
            directionHint: 'En los Riscos del Norte (Col 52, Fila 7)',
            heroId: map[ZONE_ID.DUNGEON_CRYPT]
        },
        {
            zoneId: ZONE_ID.DUNGEON_KELLAR,
            dungeonName: 'Forja Subterránea de Kellar (Este)',
            directionHint: 'Al Este cruzando el Gran Puente del Río (Col 88, Fila 33)',
            heroId: map[ZONE_ID.DUNGEON_KELLAR]
        }
    ];

    for (const info of dungeonInfo) {
        const heroData = HEROES_DATA[info.heroId] || HEROES_DATA.dwarf;
        const isRescued = rescuedSet.has(info.heroId);
        list.push({
            ...info,
            name: heroData.name,
            heroName: heroData.name,
            title: heroData.title,
            heroTitle: heroData.title,
            rescued: isRescued,
            status: isRescued ? 'rescued' : 'captive'
        });
    }

    return list;
}

/**
 * Catálogo de Armas Especiales / Legendarias obtenibles en Misiones Secundarias.
 */
export const SPECIAL_WEAPONS = Object.freeze({
    astral_blade: {
        id: 'astral_blade',
        name: 'Hoja Astral de Loretome',
        bonusDamage: 18,
        bonusCrit: 0.10,
        bonusRange: 12,
        slashColor: '#fde047',
        description: '+18 ATQ permanente, +10% Crítico, +12 Alcance y estela solar.'
    },
    dragonslayer_halberd: {
        id: 'dragonslayer_halberd',
        name: 'Alabarda Matadragones',
        bonusDamage: 14,
        bonusCrit: 0.06,
        bonusRange: 16,
        slashColor: '#fb923c',
        description: '+14 ATQ permanente, +16 Alcance de barrido y +1 Nivel de Forja.'
    }
});

/**
 * Catálogo de las 6 Misiones Secundarias del Bosque Real de Loretome (Mapa 4x).
 * Otorgan Nuevas Armas, Nuevas Habilidades (Activas y Pasivas) y Dinero (Oro).
 */
export const SIDE_QUESTS_DATA = Object.freeze([
    {
        id: 'quest_green_threat',
        title: 'I. La Amenaza Pielverde del Camino Real',
        giverName: 'Capitán Varek',
        giverRole: 'Guardia Imperial del Claro',
        giverPortrait: 'barbarian',
        regionName: 'Campamento Real Central (Centro)',
        description: 'Las patrullas de Goblins y Orcos emboscan a los viajeros en los caminos del Bosque de Loretome. Abate a 6 siervos de Zargon para asegurar las rutas hacia las mazmorras.',
        objectiveType: 'kills',
        targetCount: 6,
        rewardType: 'gold',
        rewardSummary: '💰 250 Monedas de Oro + 🧪 2 Pociones Curativas',
        reward: {
            gold: 250,
            healPotions: 2
        },
        dialogueStart: '«¡Campeón! Qué fortuna verte con vida tras la emboscada. Los pielesverdes han tomado los senderos del bosque. ¡Abate a 6 de ellos y te pagaré con el cofre de la guardia!»',
        dialogueComplete: '«¡Espléndido tajo! Los caminos vuelven a ser seguros. Toma estas 250 monedas de oro imperial y provisiones curativas para el rescate de tus compañeros.»'
    },
    {
        id: 'quest_star_steel',
        title: 'II. El Acero Estelar de los Reyes',
        giverName: 'Maestro Herrero Durgan',
        giverRole: 'Forjador Rúnico de Campaña',
        giverPortrait: 'dwarf',
        regionName: 'Forja del Campamento Real (Centro)',
        description: 'Un meteorito rúnico se fragmentó en 3 pedazos al caer sobre el Bosque de Loretome (en el Claro Noroeste, las Ruinas del Oeste y las Tierras Altas del Este). Recógelos con [E] para forjar un Arma Legendaria.',
        objectiveType: 'meteors',
        targetCount: 3,
        rewardType: 'weapon',
        rewardSummary: '⚔️ NUEVA ARMA: «Hoja Astral de Loretome» (+18 ATQ, +10% Crítico, +12 Alcance)',
        reward: {
            weaponId: 'astral_blade',
            gold: 100
        },
        dialogueStart: '«¡Por las barbas de Grungni! Si vas a asaltar las mazmorras para liberar a tus amigos, necesitas algo mejor que acero común. ¡Tráeme los 3 Fragmentos de Meteorito Rúnico caídos en el bosque y te forjaré la Hoja Astral!»',
        dialogueComplete: '«¡Mira cómo reluce este metal celeste! ¡He forjado para ti la Hoja Astral de Loretome (+18 ATQ, +10% Crítico y mayor alcance)! ¡Ninguna armadura del Caos resistirá tu golpe!»'
    },
    {
        id: 'quest_arcane_storm',
        title: 'III. El Códice de la Tempestad Arcana',
        giverName: 'Archimaga Lyra',
        giverRole: 'Custodia del Círculo Élfico',
        giverPortrait: 'wizard',
        regionName: 'Santuario del Norte / Claro Real',
        description: 'Los brujos de Zargon han erigido 3 Altares Corruptos en el bosque para drenar la magia de Loretome (Noroeste, Norte y Noreste). Purifícalos pulsando [E] junto a ellos.',
        objectiveType: 'altars',
        targetCount: 3,
        rewardType: 'skill_active',
        rewardSummary: '⚡ NUEVA HABILIDAD [Tecla F]: «Tempestad de Loretome» (Rayo en Área + Curación)',
        reward: {
            unlockSecondSkill: true,
            gold: 120
        },
        dialogueStart: '«Los tres Altares Corruptos envenenan las líneas ley del bosque. Si logras purificarlos con tu presencia [E], te enseñaré el conjuro prohibido de la Tempestad de Loretome.»',
        dialogueComplete: '«¡El bosque vuelve a respirar magia pura! Has desbloqueado la habilidad activa [Tecla F] TEMPESTAD DE LORETOME: invoca relámpagos celestiales que dañan en gran área y restauran la salud de tu grupo.»'
    },
    {
        id: 'quest_moonflowers',
        title: 'IV. Las Flores de Luz Lunar',
        giverName: 'Herborista Elara',
        giverRole: 'Sanadora de Athel Loren',
        giverPortrait: 'elf',
        regionName: 'Manantial Élfico (Campamento Central)',
        description: 'En los claros húmedos del gran bosque crecen 5 Flores de Luz Lunar brillantes. Recoléctalas con [E] para destilar el Elixir Eterno de los Antiguos.',
        objectiveType: 'moonflowers',
        targetCount: 5,
        rewardType: 'skill_passive',
        rewardSummary: '🌿 HABILIDAD PASIVA: «Sangre Silvana» (Regenera Vida/Stamina +25 Vida Máx) + 💰 180 Oro',
        reward: {
            unlockPassiveRegen: true,
            bonusMaxHp: 25,
            gold: 180
        },
        dialogueStart: '«Tus compañeros sufren en las celdas de Zargon y tú necesitarás resistencia sobrehumana. Recoge 5 Flores de Luz Lunar por los claros del bosque y te otorgaré la Bendición de Sangre Silvana.»',
        dialogueComplete: '«¡Bebe este rocío estelar! Has adquirido la habilidad pasiva SANGRE SILVANA (+25 Vida Máxima y regeneración continua de Vida y Stamina cada segundo) además de 180 monedas de oro.»'
    },
    {
        id: 'quest_swamp_warlord',
        title: 'V. Caza Mayor: El Caudillo de la Ciénaga',
        giverName: 'Guardabosques Eldon',
        giverRole: 'Explorador de los Puentes',
        giverPortrait: 'elf',
        regionName: 'Ribera del Gran Río (Este del Campamento)',
        description: 'Un colosal Caudillo Fimir de Élite ha establecido su campamento de caza en las charcas del Sur del Bosque (Col 36, Fila 62). Derrótalo para recuperar el armamento real.',
        objectiveType: 'subboss',
        targetCount: 1,
        rewardType: 'weapon_and_gold',
        rewardSummary: '🗡️ NUEVA ARMA: «Alabarda Matadragones» (+14 ATQ y +1 Nv. Forja) + 💰 350 Oro',
        reward: {
            weaponId: 'dragonslayer_halberd',
            bonusWeaponLevel: 1,
            gold: 350
        },
        dialogueStart: '«Al sur del río, cerca de las ciénagas exteriores, merodea el Caudillo Fimir Kragosh. ¡Acaba con esa bestia y te entregaré la legendaria Alabarda Matadragones y 350 monedas de oro!»',
        dialogueComplete: '«¡Abatiste al Caudillo de la Ciénaga! Toma la Alabarda Matadragones (+14 ATQ, +1 Nivel de Forja) y tu recompensa de 350 monedas de oro.»'
    },
    {
        id: 'quest_imperial_relics',
        title: 'VI. Reliquias del Tesoro Imperial',
        giverName: 'Mercader Real Balthazar',
        giverRole: 'Intendente de la Corona',
        giverPortrait: 'mentor',
        regionName: 'Plaza del Campamento Real (Centro)',
        description: 'Encuentra y abre 4 Cofres del Tesoro ocultos en los claros del Bosque de Loretome o dentro de las mazmorras.',
        objectiveType: 'chests',
        targetCount: 4,
        rewardType: 'gold_and_armor',
        rewardSummary: '💰 450 Monedas de Oro + 🛡️ Habilidad «Égida Imperial» (+4 DEF y +20 Stamina Máx)',
        reward: {
            gold: 450,
            bonusDefense: 4,
            bonusMaxStamina: 20
        },
        dialogueStart: '«Las caravanas del Imperio escondieron cofres por todo el bosque antes del ataque de Zargon. ¡Abre 4 cofres cualesquiera y te recompensaré con 450 monedas de oro y la Égida Imperial!»',
        dialogueComplete: '«¡Magnífico ojo para el tesoro! Aquí tienes 450 monedas de oro y la bendición de la Égida Imperial (+4 Defensa permanente y +20 Stamina Máxima).»'
    }
]);
