# 🌲⚔️ HeroQuest 2.5D — Edición Mundo Libre (Bosque de Loretome & 4 Mazmorras)

Versión **Mundo Libre** de **HeroQuest 2.5D** inspirada en *The Legend of Zelda: A Link to the Past*. Permite salir de cualquier mazmorra al **Bosque Real de Loretome**, explorar senderos, ríos con puentes, cortar arbustos, descansar en el Campamento Central y adentrarse en **4 Mazmorras conectadas con estado persistente**.

---

## 🚀 Cómo Ejecutar el Proyecto

### Opción 1: Ejecutable Nativo de Windows (`HeroQuest25D.exe`)
Haz doble clic en **`HeroQuest25D.exe`** dentro de `heroquest-25d-mundo-libre`.
- Inicia automáticamente el backend con BBDD SQLite en `http://127.0.0.1:8081` y abre la ventana dedicada de escritorio (`1440x900`).

### Opción 2: Desde Terminal
```bash
cd c:\Users\kikoi\.gemini\antigravity\scratch\heroquest-25d-mundo-libre
npm start
```
Abre `http://localhost:8081` en tu navegador.

---

## 🌲 Novedades de la Edición «Mundo Libre»

1. **Transición Libre entre Mazmorras y Bosque (`[E]` o Botón `🌲 Salir al Bosque`)**:
   - Acércate a la **Escalera Imperial** de cualquier mazmorra y pulsa **`[E]`** (o usa el botón superior **`🌲 Salir al Bosque`**) para salir al exterior junto a tus 3 compañeros IA.
   - Al elegir héroe, también puedes pulsar **«🌲 Empezar Directo en el Bosque»** en el pergamino inicial.
2. **El Bosque Real de Loretome (`OverworldGenerator.js` — 52x38 celdas)**:
   - **Árboles Volumétricos 2.5D y Riscos de Montaña** con mecido suave al viento, rayos de sol y luciérnagas.
   - **Río Cristalino con 3 Puentes de Madera** y caminos de tierra que conectan todas las regiones.
   - **Arbustos Cortables estilo Zelda**: Atácalos con tu arma (`Click Izquierdo`) o pulsa `[E]` para cortarlos y encontrar monedas y pociones.
   - **Campamento Real del Claro Central**:
     - 🔥 **Hoguera Curativa**: Pulsa `[E]` para descansar y restaurar el 100% de Vida y Stamina de los 4 héroes.
     - ⚒️ **Forja Real de Campaña**: Pulsa `[E]` para abrir la Armería en pleno bosque.
     - 💧 **Manantial Élfico** y **Carteles de Madera** en los cruces de caminos.
3. **4 Mazmorras Conectadas con Estado Persistente**:
   - **Oeste**: *Bastión de Fellmarg* (7 Salas — Jefe: Gárgola del Caos).
   - **Norte**: *Cripta del Rey Brujo* (6 Salas — Jefe: Señor Óseo de la Cripta).
   - **Este (cruzando el puente del río)**: *Forja Subterránea de Kellar* (6 Salas — Jefe: Gárgola de Magma).
   - **Suroeste (junto a la laguna)**: *Templo Hundido del Pantano* (6 Salas — Jefe: Soberano del Pantano).
   - El estado de puertas abiertas, cofres saqueados, trampas desactivadas y monstruos abatidos se conserva al salir y entrar, y se guarda en la **BBDD SQLite (`data/heroquest.db`)**.
4. **Minimapa Táctico en Tiempo Real** en la esquina inferior derecha y **Música Dual** (*Forest Adventure Synth* en el bosque y *Dark Dungeon Synth* en las mazmorras).
