/**
 * @fileoverview Textos de Lore de Mentor (Mazmorras + Bosque Exterior Mundo Libre),
 * frases cómicas de monstruos, gruñidos y diálogos de muebles y elementos del bosque.
 * Capa 0: Sin dependencias externas.
 */

export const MENTOR_VOICE = Object.freeze({
    role: 'narrator',
    pitch: 0.30,
    rate: 0.80
});

export const MENTOR_LORE = Object.freeze({
    questTitle: 'El rescate de los cuatro héroes',
    questSubtitle: 'Historia',
    introParagraphs: [
        'Escucha, héroe. De camino al corazón del bosque de Loretome, las tropas de Zargon os tendieron una emboscada. Tus tres compañeros fueron capturados y encerrados en jaulas, cada uno en una fortaleza distinta.',
        'Estás solo. Recorre el bosque y entra en el Bastión de Fellmarg (oeste), la Cripta del Rey Brujo (norte) y la Forja de Kellar (este) para liberarlos.',
        'Por los caminos encontrarás herreros, magos y exploradores que te pedirán ayuda. A cambio te darán armas, habilidades y oro.',
        'Cuando los cuatro estéis juntos, se abrirá el santuario de Zargon, en la ciénaga del suroeste. Allí os espera la batalla final.'
    ],
    welcomeBanner: 'Estás solo. Sal al bosque con [E], habla con la gente [J] y libera a tus tres compañeros.',
    zones: {
        overworld: 'El bosque de Loretome. En el campamento central hay gente que necesita ayuda. Pulsa [J] para ver tus misiones.',
        dungeon_fellmarg: 'Bastión de Fellmarg (Mazmorra I — Oeste). En el Santuario final de esta fortaleza se halla encerrado tu primer compañero en una Jaula Rúnica. ¡Llega hasta el Santuario y libéralo con [E]!',
        dungeon_crypt: 'Cripta del Rey Brujo (Mazmorra II — Norte). Tras los sarcófagos y legiones óseas se encuentra la celda rúnica de tu segundo compañero capturado.',
        dungeon_kellar: 'Forja Subterránea de Kellar (Mazmorra III — Este). Entre los ríos de escoria y guardias orcos yace cautivo tu tercer compañero de armas.',
        dungeon_swamp: 'El santuario de Zargon. Los cuatro estáis juntos: es hora de acabar con esto.'
    },
    rooms: {
        entrance: 'Estás junto a la Escalera Imperial. Pulsa [E] sobre los escalones para salir al Bosque Exterior en cualquier momento, o abre las puertas para buscar a tu compañero cautivo.',
        guardroom: '¡Cuidado! Has irrumpido en el Cuerpo de Guardia Pielverde. Los centinelas de Zargon protegen este cruce de pasillos.',
        armory: 'La Antigua Sala de Armas. Aunque los orcos la han saqueado, los armeros y mesas aún esconden acero imperial y monedas.',
        library: 'La Biblioteca Prohibida. Entre sus estanterías polvorientas reposan grimorios que ni siquiera Zargon se atreve a leer en voz alta.',
        torture: 'La Cámara del Tormento. Un frío antinatural emana del potro de tortura y de los guardias no-muertos que custodian esta cripta.',
        alchemy: 'El Laboratorio Alquímico. Redomas burbujeantes de dudosa higiene destilan elixires arcanos vigilados por un Fimir de los pantanos.',
        treasury: '¡La Cámara del Tesoro Real! Cofres reforzados con hierro relucen en la penumbra, pero ten cuidado con los guardianes que acechan.',
        sanctum: '¡El Santuario del Carcelero! ¡Libera a tu compañero de la Jaula Rúnica [E] y abatid juntos al Jefe guardián!',
        // Salas de otras mazmorras
        crypt_hall: 'El Panteón de los Caídos. Los antiguos caballeros del Imperio se alzan de sus losas al sentir el calor de los vivos.',
        crypt_ossuary: 'El Osario Real. Cientos de cráneos observan desde los muros mientras los esqueletos cierran filas.',
        crypt_throne: '¡La Cámara del Rey Brujo! ¡Rompe el sello de la Jaula Rúnica [E] para liberar a tu compañero cautivo y derrotar al Señor Óseo!',
        kellar_smith: 'La Gran Fragua Enana. Los yunques aún arden al rojo vivo bajo el martillo de los saqueadores pielesverdes.',
        kellar_vault: 'Bóveda de Mithril de Kellar. Aquí guardaban los antiguos clanes sus lingotes y runas de guerra.',
        kellar_core: '¡El Corazón del Magma! ¡Tu compañero aguarda en la Jaula Rúnica [E] frente al Caudillo de Kellar!',
        swamp_shrine: 'El Altar de las Mareas Verdes. El musgo luminiscente cubre ídolos anfibios de una era olvidada.',
        swamp_pools: 'Las Pozas de Alquimia Ciega. Los Fimires destilan aquí venenos y elixires de fuerza bruta.',
        swamp_sanctum: '¡EL TRONO FINAL DE ZARGON! ¡Los 4 Héroes reunidos frente al Soberano Supremo del Caos! ¡Por el Imperio y por Loretome!'
    },
    victory: '¡VICTORIA SUPREMA! Has rescatado a tus tres hermanos de batalla y juntos, los 4 Campeones de HeroQuest, habéis conquistado el Santuario Final de Zargon. ¡Tu leyenda brillará eternamente en Loretome!',
    defeat: 'Has caído en combate... Pero las crónicas del Bosque de Loretome aguardan tu regreso.'
});

export const MONSTER_GROWLS = Object.freeze({
    goblin: ['¡Grrrr-jijiji!', '¡Ssshh-grrr!', '¡Ñrrr... carne!'],
    orc: ['¡GRRRAAAGH!', '¡Hrrrgh... sangre!', '¡GRUUUAAAR!'],
    skeleton: ['*Clac-clac-krrrr*', '*Ssshhh... huesos...*', '*Krrrr-clac*'],
    fimir: ['¡GRRR-SSSHHH!', '¡BRRRAAAGH!', '¡Grrrr... ciénaga!'],
    gargoyle: ['¡ROOOAAARGH!', '¡GRRR-PIEDRA Y CAOS!', '¡HRRRAAAGH!']
});

export const MONSTER_QUOTES = Object.freeze({
    goblin: {
        alert: [
            '¡Jijiji! ¡Carne fresca con botas brillantes!',
            '¡Alarma, alarma! ¡Un héroe en el camino!',
            '¡Dadme su bolsa de oro, yo lo vi primero!',
            '¡Pinchadle en los tobillos, chicos!'
        ],
        attack: [
            '¡Toma pinchazo oxidado!',
            '¡Ñaca, ñaca!',
            '¡Bolsillos fuera!'
        ],
        death: [
            '¡Ay mi bazo goblin!',
            '¡Zargon no paga horas extras!',
            '¡Dile a mi madre que robé su cuchara!'
        ]
    },
    orc: {
        alert: [
            '¡WAAAGH! ¡Aplastaré tu cráneo como una nuez!',
            '¡Huelo a héroe recién lustrado!',
            '¡Hoy cenamos chuletas de aventurero!',
            '¡Por el hacha de Ulag, no pasarás!'
        ],
        attack: [
            '¡Parte-escudos!',
            '¡Directo al pescuezo!',
            '¡GrrrAAAGH!'
        ],
        death: [
            '¡Maldito seas, debilucho...!',
            '¡Mi mella favorita se ha doblado!',
            '¡Argh... necesitaba más armadura!'
        ]
    },
    skeleton: {
        alert: [
            '¡Clac, clac! ¡Únete a nuestra eterna guardia ósea!',
            '¡Tengo un hueso que escoger contigo, mortal!',
            '¡Llevaba tres siglos esperando a alguien a quien acuchillar!',
            '¡Tu calcio se verá estupendo aquí!'
        ],
        attack: [
            '¡Crujido sepulcral!',
            '¡Frío de la tumba!',
            '¡Réquiem de acero!'
        ],
        death: [
            '¡Mis costillas recién pulidas!',
            '¡Otra vez al montón de huesos...!',
            '¡Al menos ya no tengo lumbago!'
        ]
    },
    fimir: {
        alert: [
            '¡Con un solo ojo me basta para partirte en dos!',
            '¡La niebla del pantano reclamará tu alma!',
            '¡Intruso insolente, alimentarás a mis renacuajos del Caos!'
        ],
        attack: [
            '¡Hachazo de la ciénaga!',
            '¡Desgarro abisal!',
            '¡Tiembla, sangre caliente!'
        ],
        death: [
            '¡No lo vi venir por el lado ciego...!',
            '¡El pantano me vengará...!',
            '¡Ssshhh... maldita luz!'
        ]
    },
    gargoyle: {
        alert: [
            '¡SOY PIEDRA ETERNA Y FUEGO DEL CAOS! ¡ARRODÍLLATE ANTE ZARGON!',
            '¡TUS ARMAS MORTALES SE QUEBRARÁN CONTRA MI PIEL DE GRANITO!',
            '¡NINGÚN HÉROE HA SALIDO VIVO DE ESTE SANTUARIO!'
        ],
        attack: [
            '¡SENTENCIA DE PIEDRA!',
            '¡PERECE BAJO MIS ALAS!',
            '¡IRA DE ZARGON!'
        ],
        death: [
            '¡IMPOSIBLE... MI GRANITO SE AGRIETA... ZARGON, PERDÓNAME!',
            '¡VUELVO AL POLVO DEL ABISMO!'
        ]
    }
});

export const FURNITURE_INSPECTIONS = Object.freeze({
    table: [
        '¡Mirad debajo de esta mesa! Tres dados mordidos por un goblin, queso rancio y unas monedas olvidadas.',
        '¡Ja! Un mapa táctico dibujado por un orco... y debajo del jarro de cerveza hay un buen puñado de oro.'
    ],
    throne: [
        '¡Por mis ancestros! Entre los cojines de este Trono Profano había un alijo de monedas imperiales.',
        'Nada mal la ergonomía del Caos. ¡Un compartimento secreto en el reposabrazos acaba de soltar oro brillante!'
    ],
    chest: [
        '¡Ja, cerradura forzada! El interior de este cofre reluce con buen oro imperial.',
        '¡Cómo me gusta el crujido de un buen cofre! Venid conmigo, monedas.'
    ],
    bookcase: [
        '¿"Cómo domesticar a tu Fimir en diez días"? ¡Bah! Lo importante es el alijo oculto tras este tomo hueco.',
        '¡Mirad esto! Detrás de este grimorio polvoriento se escondían suministros arcanos y monedas.'
    ],
    rack: [
        'Según esta nota, los orcos usan el potro para estirar masa de pizza. ¡Al menos dejaron caer estas monedas!',
        'Esta manivela chirría como el demonio, pero tenía una bolsa de oro atascada en los engranajes.'
    ],
    fireplace: [
        '¡Sin quemarme las cejas! He rescatado joyas y monedas que ni el fuego pudo fundir.',
        'Sobre la repisa de esta chimenea han dejado un buen botín intacto.'
    ],
    alchemist_bench: [
        'Estos matraces huelen a calcetín de troll destilado, ¡pero esta poción y el polvo de oro me vendrán de perlas!',
        '¡Por todos los alquimistas! Aquí hay un elixir recién destilado y monedas transmutadas.'
    ],
    sarcophagus: [
        'Tranquila, momia, sigue durmiendo; yo cuidaré de tu ofrenda funeraria de oro.',
        '¡El ajuar dorado de un antiguo señor de la guerra! Y por suerte hoy ningún no-muerto reclama propina.'
    ],
    weapons_rack: [
        'La mitad de estas alabardas están oxidadas, pero aquí escondían la paga de toda la guardia pielverde.',
        '¡Sacudir el armero siempre funciona! Han caído varias bolsas de monedas al suelo.'
    ],
    // Inspecciones del Bosque Exterior (Zelda Overworld)
    bush: [
        '¡Zas! Al cortar la maleza del bosque han aparecido monedas brillantes entre las raíces.',
        '¡Como en las viejas leyendas! Siempre hay tesoros escondidos entre los arbustos del claro.'
    ],
    boulder_field: [
        '¡Levantando esta roca musgosa había un alijo de explorador oculto bajo la tierra húmeda!',
        'Bajo este peñasco del bosque brillaban unas monedas antiguas del Imperio.'
    ],
    stump: [
        'En el hueco de este viejo tocón de roble alguien escondió una bolsa de monedas y provisiones.',
        '¡Las ardillas de Loretome tienen buen gusto! Había monedas relucientes dentro del tronco.'
    ],
    well: [
        'El agua cristalina del Manantial Élfico revitaliza el cuerpo y deja relucir ofrendas de oro en el fondo.',
        'Bebes del pozo ancestral del bosque y recoges unas monedas de buena suerte del brocal.'
    ]
});
