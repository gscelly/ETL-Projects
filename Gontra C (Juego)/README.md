# 🎮 Gontra C de Danami

> Un juego de acción side-scrolling 2D, ambientado en un mundo post-apocalíptico en llamas. Construido con **Phaser 3** y JavaScript vanilla.

---

## 🕹️ Demo

Abre `index.html` con un servidor local para jugar. No requiere instalación de dependencias.

```bash
# Opción rápida con Python
python -m http.server 8000

# O con Node.js
npx http-server .
```

Luego abre `http://localhost:8000` en tu navegador.

---

## 🎯 Características

### Diseño de Nivel
- **Nivel extenso** de 6400px con scroll horizontal y fondo parallax de ciudad destruida
- **3 huecos/fosos** con lava animada, chispas y señales de peligro ⚠️
- **1 puente destruido** con tablones de madera que se balancean y cuerdas decorativas 🌉
- **37+ plataformas de salto** distribuidas en 8 zonas con texturas de concreto agrietado
- **Decoración ambiental** con autos oxidados y helicópteros destruidos en el fondo

### Sistema de Combate
- **4 armas** intercambiables con `Q`:
  | Arma | Color | Cadencia | Comportamiento |
  |------|-------|----------|----------------|
  | Standard | 🔵 Cyan | Normal | Disparo recto |
  | Spread | 🟣 Magenta | Lenta | 3 balas en abanico |
  | Machine Gun | 🟡 Amarilla | Muy rápida | Dispersión aleatoria |
  | Laser | 🔴 Roja | Ultra rápida | Bala muy veloz |

- **Bombas** (`B`): Limpia toda la pantalla de enemigos con explosión masiva
- **Disparo multidireccional**: Dispara en la dirección que te mueves (incluyendo diagonal arriba)

### 5 Tipos de Enemigos
| Tipo | Color | IA | Vida | Puntos |
|------|-------|----|------|--------|
| Normal | 🔴 Rojo | Persigue a distancia media | 1 | 100 |
| Runner | 🔵 Cyan | Muy rápido, agresivo, rango amplio | 1 | 150 |
| Jumper | 🟢 Verde | Persigue y salta frecuentemente | 1 | 200 |
| Sniper | 🟡 Amarillo | Dispara desde lejos, huye si te acercas | 1 | 250 |
| Heavy | 🟣 Púrpura | Lento, tanque, dispara 3 balas | 3 | 500 |

- **18 enemigos estáticos** colocados como emboscadas a lo largo del nivel
- **Spawn dinámico** cada 1.8 segundos con tipos aleatorios
- Los enemigos caen en los huecos y mueren

### Jefe Final 👾
- Se activa al llegar a `x > 5800`
- Movimiento sinusoidal vertical
- Disparo aleatorio de proyectiles
- 1000 HP — se le puede hacer daño con armas y bombas
- Barra de vida dedicada en el HUD

### Sistema de Power-ups
- **Orbes de armas** distribuidos por el nivel (Spread, Machine Gun, Laser)
- **Bombas extra** (+1 bomba)
- Reemplaza el arma del slot activo al estilo Contra III

### High Scores
- Ingreso de iniciales (máx. 12 caracteres) al terminar la partida
- Top 10 guardado en `localStorage`
- Persistente entre sesiones del navegador

---

## 📊 Sistema de Analytics (Data Batch → CSV)

Al morir o completar el nivel, el juego **descarga automáticamente 4 archivos CSV** con toda la telemetría de la sesión. Los datos se **acumulan** entre partidas, así que cada descarga contiene el historial completo.

### Archivos Generados

#### 1. `gontra_sesiones_resumen.csv`
Una fila por partida con **44 columnas**:

| Grupo | Métricas |
|-------|----------|
| **General** | session_id, fecha, duración, resultado (death/victory), score final |
| **Disparos** | Total, por arma (standard, spread, machinegun, laser) |
| **Enemigos** | Eliminados total, por tipo (normal, runner, jumper, sniper, heavy) |
| **Daño recibido** | Total, por fuente (contacto enemigo, bala enemiga, contacto boss, bala boss, caída en hueco) |
| **Muerte** | Posición exacta (x, y), causa de muerte |
| **Botones** | Conteo de presses: ←, →, ↑, ↓, SPACE, Q, B |
| **Progreso** | Máximo avance X, si alcanzó al boss, daño infligido al boss |
| **Items** | Power-ups recogidos, bombas usadas, cambios de arma |
| **Tiempo por zona** | 8 zonas de 800px cada una (en segundos) |

#### 2. `gontra_eventos_daño.csv`
Cada evento de daño recibido:
```
session_id, tiempo_ms, posicion_x, posicion_y, fuente, cantidad
```

#### 3. `gontra_heatmap_posicion.csv`
Posición del jugador muestreada cada 500ms:
```
session_id, tiempo_game, posicion_x, posicion_y
```

#### 4. `gontra_powerups.csv`
Cada power-up recogido:
```
session_id, tipo, tiempo_ms, posicion_x
```

### Descarga Manual
También disponible el botón **📊 Descargar Analytics CSV** en el modal de Game Over, o desde la consola:
```javascript
window.downloadAnalyticsCSV()
```

---

## ⌨️ Controles

| Tecla | Acción |
|-------|--------|
| `←` `→` | Movimiento horizontal |
| `↑` | Saltar |
| `↓` + `SPACE` | Bajar de plataforma |
| `SPACE` | Disparar (en la dirección del movimiento) |
| `Q` | Cambiar arma (alterna entre 2 slots) |
| `B` | Usar bomba (limpia pantalla) |

---

## 📁 Estructura del Proyecto

```
gontra-c-de-danami/
├── index.html              # Punto de entrada + HUD HTML + Modal Game Over
├── style.css               # Estilos del HUD, modal y botones
├── README.md
├── js/
│   ├── main.js             # Configuración de Phaser, funciones UI globales, high scores
│   └── scenes/
│       └── Game.js         # Escena principal: nivel, enemigos, combate, analytics
└── assets/
    └── images/
        ├── apoc_bg.png         # Fondo parallax de ciudad en llamas
        ├── apoc_car.png        # Auto abandonado (decoración)
        ├── apoc_heli.png       # Helicóptero destruido (decoración)
        ├── ruined_pavement.png # Textura del suelo
        ├── jump_platform.png   # Textura plataformas de salto
        ├── bridge_plank.png    # Tablones del puente
        ├── bridge_pillar.png   # Pilares del puente
        └── danger_sign.png     # Señal de peligro en huecos
```

> Los sprites del jugador, enemigos, boss, balas y power-ups se cargan desde el CDN de [Phaser Labs](https://labs.phaser.io/assets/).

---

## 🛠️ Tecnologías

- **[Phaser 3.60](https://phaser.io/)** — Motor de juegos 2D (cargado desde CDN)
- **JavaScript ES6+** — Modules, clases, arrow functions
- **HTML5 / CSS3** — HUD superpuesto al canvas del juego
- **Web Audio API** — Efectos de sonido generados proceduralmente (salto, disparo)
- **localStorage** — Persistencia de high scores y acumulación de datos analytics
- **Blob API** — Generación y descarga de archivos CSV desde el navegador

---

## 🚀 Cómo Ejecutar

1. **Clona el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/gontra-c-de-danami.git
   cd gontra-c-de-danami
   ```

2. **Inicia un servidor local** (necesario por los ES6 modules):
   ```bash
   python -m http.server 8000
   ```

3. **Abre en el navegador:**
   ```
   http://localhost:8000
   ```

> ⚠️ No se puede abrir `index.html` directamente como archivo (`file://`) debido a las restricciones de CORS con ES6 modules.

---

## 📝 Notas

- La música de fondo usa un archivo `.ogg` del CDN de Phaser Labs
- Las texturas de plataformas, puente y señales fueron generadas con IA
- Los datos de analytics se acumulan en `localStorage` — para resetearlos, ejecuta en la consola:
  ```javascript
  localStorage.removeItem('gontra_analytics_summary');
  localStorage.removeItem('gontra_analytics_damage');
  localStorage.removeItem('gontra_analytics_heatmap');
  localStorage.removeItem('gontra_analytics_powerups');
  ```

---

```
erDiagram
    FACT_GAME_EVENTS {
        string event_id PK
        string session_id FK
        string event_type "damage, powerup, death"
        int in_game_time_ms
        int pos_x
        int pos_y
        int event_value "ej. daño recibido o ID de arma"
    }
    DIM_SESSION {
        string session_id PK
        datetime fecha_inicio
        float duracion_seg
        string resultado "death / win"
        int score_final
        int max_progreso_x
    }
    DIM_PLAYER_STATS {
        string session_id PK FK
        int saltos_totales
        int disparos_totales
        int enemigos_eliminados
    }

    DIM_SESSION ||--o{ FACT_GAME_EVENTS : "tiene_eventos"
    DIM_SESSION ||--|| DIM_PLAYER_STATS : "resumen"
```


---

## 📄 Licencia

Este proyecto es de uso educativo y personal.
