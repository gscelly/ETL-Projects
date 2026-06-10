export default class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    get currentWeapon() {
        return this.inventory[this.activeSlot] || 'standard';
    }

    preload() {
        // Fondos generados por IA (Apocalípticos)
        this.load.image('bg', 'assets/images/apoc_bg.png'); // Fondo de ciudad destruida en llamas
        this.load.image('platform', 'assets/images/ruined_pavement.png'); // Pavimento destruido
        
        // Nuevas texturas de nivel
        this.load.image('jump_platform', 'assets/images/jump_platform.png'); // Plataformas de salto
        this.load.image('bridge_plank', 'assets/images/bridge_plank.png'); // Tablones del puente
        this.load.image('bridge_pillar', 'assets/images/bridge_pillar.png'); // Pilares del puente
        this.load.image('danger_sign', 'assets/images/danger_sign.png'); // Señal de peligro
        
        // Elementos decorativos apocalípticos generados por IA
        this.load.image('car', 'assets/images/apoc_car.png');
        this.load.image('heli', 'assets/images/apoc_heli.png');
        
        // Personajes
        this.load.spritesheet('dude', 'https://labs.phaser.io/assets/sprites/dude.png', { frameWidth: 32, frameHeight: 48 });
        
        // Jefe
        this.load.image('boss', 'https://labs.phaser.io/assets/sprites/space-baddie.png');
        
        // Power-ups e Iconos de Armas
        this.load.image('bomb_item', 'https://labs.phaser.io/assets/sprites/bomb.png');
        this.load.image('orb_blue', 'https://labs.phaser.io/assets/sprites/orb-blue.png');
        this.load.image('orb_red', 'https://labs.phaser.io/assets/sprites/orb-red.png');
        this.load.image('orb_green', 'https://labs.phaser.io/assets/sprites/orb-green.png');
        
        this.load.image('bullet', 'https://labs.phaser.io/assets/sprites/bullet.png');
        
        // Partícula para bomba
        this.load.image('flare', 'https://labs.phaser.io/assets/particles/white-flare.png');
        
        // Música de fondo (Rock/Metal intenso)
        this.load.audio('bgm', 'https://labs.phaser.io/assets/audio/bodenstaendig_2000_in_rock_4bit.ogg');
    }

    create() {
        // Asegurarnos de que las físicas no estén pausadas por un Game Over previo
        this.physics.resume();

        // Inicializar o Reiniciar Estado del Juego
        this.p1Health = 100;
        this.p1Score = 0;
        this.inventory = ['standard', 'standard']; // Empiezas con arma básica en ambos slots
        this.activeSlot = 0;
        this.bombs = 3;
        this.bossActive = false;
        this.bossHealth = 1000;
        this.bossMaxHealth = 1000;
        this.lastFacing = 1;

        // =============================================
        // SISTEMA DE ANALYTICS / TELEMETRÍA
        // =============================================
        this.analytics = {
            sessionId: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
            startTime: Date.now(),
            endTime: null,
            outcome: null, // 'death' | 'victory'
            finalScore: 0,
            maxProgressX: 0, // Máximo avance horizontal

            // Contadores de botones
            buttonPresses: {
                left: 0,
                right: 0,
                up: 0,
                down: 0,
                space: 0,
                Q: 0,
                B: 0
            },
            // Para evitar contar "hold" como muchos presses
            _buttonStates: {
                left: false, right: false, up: false, down: false,
                space: false
            },

            // Disparos
            shotsFired: 0,
            shotsByWeapon: { standard: 0, spread: 0, machinegun: 0, laser: 0 },

            // Saltos
            totalJumps: 0,

            // Daño recibido
            totalDamageTaken: 0,
            damageBySource: {
                enemy_contact: 0,
                enemy_bullet: 0,
                boss_contact: 0,
                boss_bullet: 0,
                pit_fall: 0
            },
            damageEvents: [], // { time, x, y, source, amount }

            // Muertes / Posición de muerte
            deathPosition: null, // { x, y }
            deathCause: null,

            // Enemigos eliminados
            enemiesKilled: 0,
            killsByType: { normal: 0, runner: 0, jumper: 0, sniper: 0, heavy: 0 },

            // Boss
            bossReached: false,
            bossDamageDealt: 0,

            // Power-ups recogidos
            powerupsCollected: [],

            // Bombas
            bombsUsed: 0,
            weaponSwitches: 0,

            // Heatmap de posición (muestreo cada ~500ms)
            positionHeatmap: [], // { time, x, y }
            _lastHeatmapSample: 0,

            // Tiempo en cada zona del nivel
            timeInZones: {
                'zone_0_800': 0,
                'zone_800_1600': 0,
                'zone_1600_2400': 0,
                'zone_2400_3200': 0,
                'zone_3200_4000': 0,
                'zone_4000_4800': 0,
                'zone_4800_5600': 0,
                'zone_5600_6400': 0
            },
            _lastZoneUpdate: 0
        };

        // Exponer acceso a analytics para main.js
        window.getAnalyticsData = () => this.analytics;

        if (window.updateScore) window.updateScore(1, 0);
        if (window.updateBombs) window.updateBombs(this.bombs);
        if (window.updateEnergy) window.updateEnergy(1, 100);
        if (window.updateWeapon) window.updateWeapon('standard');

        // Nivel muy largo (6400px)
        const LEVEL_WIDTH = 6400;
        this.physics.world.setBounds(0, 0, LEVEL_WIDTH, 600);
        this.cameras.main.setBounds(0, 0, LEVEL_WIDTH, 600);

        // Fondo Parallax de la ciudad en ruinas
        for (let i = 0; i < 16; i++) {
            // El bg generado puede no ser ancho, lo repetimos más seguido y lo escalamos un poco
            this.add.image(400 + (i * 500), 300, 'bg').setScrollFactor(0.2).setScale(1.5); 
        }

        // Filtro oscuro para el fondo (hace que las plataformas y personajes resalten mucho más)
        this.add.rectangle(400, 300, 800, 600, 0x000000, 0.6).setScrollFactor(0);

        // Decoración de fondo (Autos y Helicópteros en llamas, más densos)
        for (let i = 0; i < 40; i++) {
            let spaceX = i * 160 + Phaser.Math.Between(-50, 50);
            
            // Helicópteros destruidos
            let h = this.add.image(spaceX, Phaser.Math.Between(50, 250), 'heli');
            h.setScrollFactor(0.5);
            h.setScale(Phaser.Math.FloatBetween(0.5, 1.2));
            h.setTint(0xffaaaa); // Tinte rojizo por el fuego
            
            // Autos abandonados oxidados
            let c = this.add.image(spaceX + 80, 540, 'car');
            c.setScrollFactor(0.8);
            c.setScale(Phaser.Math.FloatBetween(0.3, 0.7));
            c.setTint(0x995555); // Tinte de óxido y ceniza
        }

        // Música
        this.bgm = this.sound.add('bgm', { loop: true, volume: 0.5 });
        this.bgm.play();

        this.platforms = this.physics.add.staticGroup();
        this.deathZones = this.physics.add.staticGroup(); // Zonas de muerte (huecos)
        
        // =============================================
        // DISEÑO DE NIVEL CON HUECOS, PUENTE Y PLATAFORMAS
        // =============================================
        
        // Definición de huecos en el suelo (posición X inicio, ancho)
        const gaps = [
            { x: 1200, width: 200 },  // Hueco 1 - pequeño
            { x: 2400, width: 300 },  // Hueco 2 - mediano
            { x: 4200, width: 250 },  // Hueco 3 - mediano
        ];
        
        // Definición del puente (entre x=3200 y x=3700)
        const bridge = { x: 3200, width: 500 };
        
        // Crear suelo con huecos
        this.createGroundWithGaps(LEVEL_WIDTH, gaps, bridge);
        
        // Crear señales de peligro y decoración en los huecos
        this.createGapDecorations(gaps);
        
        // Crear el puente
        this.createBridge(bridge);
        
        // Crear plataformas de salto elevadas con textura propia
        this.createJumpPlatforms();

        // Jugador
        this.player = this.physics.add.sprite(100, 450, 'dude');
        this.player.setBounce(0.1);
        this.player.setCollideWorldBounds(true);

        // Animaciones
        if (!this.anims.exists('left')) {
            this.anims.create({ key: 'left', frames: this.anims.generateFrameNumbers('dude', { start: 0, end: 3 }), frameRate: 10, repeat: -1 });
            this.anims.create({ key: 'turn', frames: [ { key: 'dude', frame: 4 } ], frameRate: 20 });
            this.anims.create({ key: 'right', frames: this.anims.generateFrameNumbers('dude', { start: 5, end: 8 }), frameRate: 10, repeat: -1 });
        }

        this.cameras.main.startFollow(this.player, true, 0.05, 0.05);

        // Controles
        this.cursors = this.input.keyboard.createCursorKeys();
        this.spaceBar = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
        this.keyQ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
        this.keyB = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);

        // Inputs para alternar armas y bombas
        this.keyQ.on('down', this.switchWeapon, this);
        this.keyB.on('down', this.useBomb, this);

        // Grupos
        this.enemies = this.physics.add.group();
        this.bullets = this.physics.add.group();
        this.enemyBullets = this.physics.add.group();
        this.powerups = this.physics.add.group();

        this.lastFired = 0;

        // Crear power-ups ÚNICOS a lo largo del nivel
        this.createPowerup(600, 'spread', 'orb_blue');
        this.createPowerup(1800, 'machinegun', 'orb_red');
        this.createPowerup(2800, 'laser', 'orb_green');
        this.createPowerup(3500, 'bomb', 'bomb_item');
        this.createPowerup(4800, 'spread', 'orb_blue');
        this.createPowerup(5500, 'bomb', 'bomb_item');

        // Enemigos estáticos iniciales colocados en el nivel (emboscadas)
        this.spawnStaticEnemy(800, 500, 'runner');
        this.spawnStaticEnemy(900, 500, 'normal');
        this.spawnStaticEnemy(1500, 300, 'sniper');
        this.spawnStaticEnemy(1700, 500, 'runner');
        this.spawnStaticEnemy(2000, 400, 'jumper');
        this.spawnStaticEnemy(2100, 500, 'normal');
        this.spawnStaticEnemy(2700, 300, 'sniper');
        this.spawnStaticEnemy(2900, 500, 'heavy');
        this.spawnStaticEnemy(3000, 500, 'runner');
        this.spawnStaticEnemy(3600, 500, 'jumper');
        this.spawnStaticEnemy(3800, 500, 'normal');
        this.spawnStaticEnemy(4000, 350, 'sniper');
        this.spawnStaticEnemy(4500, 500, 'heavy');
        this.spawnStaticEnemy(4600, 500, 'runner');
        this.spawnStaticEnemy(4700, 500, 'jumper');
        this.spawnStaticEnemy(5000, 500, 'normal');
        this.spawnStaticEnemy(5200, 400, 'sniper');
        this.spawnStaticEnemy(5400, 500, 'heavy');

        // Spawners de enemigos dinámicos (Más frecuencia y variados)
        this.time.addEvent({
            delay: 1800,
            callback: () => { 
                if(!this.bossActive) {
                    const types = ['normal', 'runner', 'jumper', 'sniper', 'heavy'];
                    const type = types[Phaser.Math.Between(0, types.length - 1)];
                    this.spawnEnemy(this.player.x + Phaser.Math.Between(500, 700), type); 
                }
                if(!this.bossActive && Phaser.Math.Between(0, 2) >= 1) {
                    const types = ['normal', 'runner', 'jumper'];
                    const type = types[Phaser.Math.Between(0, types.length - 1)];
                    this.spawnEnemy(this.player.x - Phaser.Math.Between(500, 700), type); 
                }
            },
            callbackScope: this,
            loop: true
        });

        // Disparo enemigo
        this.time.addEvent({
            delay: 1200,
            callback: this.enemiesFire,
            callbackScope: this,
            loop: true
        });

        // Colisiones
        this.playerPlatformCollider = this.physics.add.collider(this.player, this.platforms);
        this.physics.add.collider(this.enemies, this.platforms);
        this.physics.add.collider(this.powerups, this.platforms);
        
        // Muerte por caer en huecos
        this.physics.add.overlap(this.player, this.deathZones, this.fallIntoPit, null, this);
        // Enemigos también mueren en huecos
        this.physics.add.overlap(this.enemies, this.deathZones, (enemy) => { enemy.destroy(); }, null, this);
        
        this.physics.add.overlap(this.player, this.enemies, this.hitPlayer, null, this);
        this.physics.add.overlap(this.player, this.enemyBullets, this.hitPlayerWithBullet, null, this);
        this.physics.add.overlap(this.bullets, this.enemies, this.hitEnemy, null, this);
        this.physics.add.overlap(this.player, this.powerups, this.collectPowerup, null, this);

        // Preparar Jefe Final
        this.boss = this.physics.add.sprite(6200, 200, 'boss').setScale(4).setTint(0xff00ff);
        this.boss.setImmovable(true);
        this.boss.body.allowGravity = false;
        this.boss.setActive(false).setVisible(false);
        this.physics.add.overlap(this.bullets, this.boss, this.hitBoss, null, this);
        this.physics.add.overlap(this.player, this.boss, this.hitPlayerBoss, null, this);
    }

    // =============================================
    // SISTEMA DE CREACIÓN DE NIVEL
    // =============================================

    createGroundWithGaps(levelWidth, gaps, bridge) {
        // Ordenar huecos por posición X
        const allHoles = [...gaps];
        // El puente también es un hueco en el suelo (se reemplaza con tablones)
        allHoles.push({ x: bridge.x, width: bridge.width, isBridge: true });
        allHoles.sort((a, b) => a.x - b.x);
        
        let currentX = 0;
        
        for (const hole of allHoles) {
            const segmentWidth = hole.x - currentX;
            
            if (segmentWidth > 0) {
                // Crear segmento de suelo sólido
                this.createGroundSegment(currentX, segmentWidth);
            }
            
            if (!hole.isBridge) {
                // Crear zona de muerte debajo del hueco
                let deathZone = this.add.rectangle(hole.x + hole.width / 2, 590, hole.width, 20, 0x000000, 0);
                this.physics.add.existing(deathZone, true);
                this.deathZones.add(deathZone);
                
                // Efecto visual de lava/fuego en el hueco
                this.createPitVisuals(hole.x, hole.width);
            }
            
            currentX = hole.x + hole.width;
        }
        
        // Último segmento de suelo
        if (currentX < levelWidth) {
            this.createGroundSegment(currentX, levelWidth - currentX);
        }
    }

    createGroundSegment(startX, width) {
        // Visual del suelo (TileSprite)
        this.add.tileSprite(startX + width / 2, 568, width, 64, 'platform');
        
        // Físicas del suelo (bloque invisible)
        let ground = this.add.rectangle(startX + width / 2, 568, width, 64, 0x000000, 0);
        this.physics.add.existing(ground, true);
        this.platforms.add(ground);
    }

    createPitVisuals(x, width) {
        // Lava/fuego en el fondo del hueco
        for (let i = 0; i < width; i += 16) {
            let lavaGlow = this.add.rectangle(x + i + 8, 590, 16, 20, 0xff4400, 0.8);
            this.tweens.add({
                targets: lavaGlow,
                alpha: { from: 0.4, to: 1 },
                duration: Phaser.Math.Between(300, 800),
                yoyo: true,
                repeat: -1
            });
        }
        
        // Resplandor naranja desde abajo
        let glow = this.add.rectangle(x + width / 2, 570, width + 20, 60, 0xff6600, 0.3);
        this.tweens.add({
            targets: glow,
            alpha: { from: 0.15, to: 0.4 },
            duration: 1000,
            yoyo: true,
            repeat: -1
        });
        
        // Partículas de humo/chispas subiendo
        for (let i = 0; i < 3; i++) {
            let spark = this.add.circle(x + Phaser.Math.Between(10, width - 10), 580, 3, 0xffaa00, 0.8);
            this.tweens.add({
                targets: spark,
                y: 520,
                alpha: 0,
                duration: Phaser.Math.Between(800, 1500),
                repeat: -1,
                delay: Phaser.Math.Between(0, 1000)
            });
        }
    }

    createGapDecorations(gaps) {
        for (const gap of gaps) {
            // Señal de peligro antes del hueco
            let sign = this.add.image(gap.x - 40, 500, 'danger_sign');
            sign.setScale(0.15);
            
            // Señal de peligro después del hueco
            let sign2 = this.add.image(gap.x + gap.width + 40, 500, 'danger_sign');
            sign2.setScale(0.15);
            sign2.setFlipX(true);
            
            // Texto de advertencia flotante
            let warningText = this.add.text(gap.x + gap.width / 2, 520, '⚠ PELIGRO', {
                fontSize: '12px',
                fill: '#ff4400',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0.5);
            
            this.tweens.add({
                targets: warningText,
                alpha: { from: 0.5, to: 1 },
                duration: 600,
                yoyo: true,
                repeat: -1
            });
        }
    }

    createBridge(bridgeConfig) {
        const { x, width } = bridgeConfig;
        const numPlanks = Math.floor(width / 80);
        
        // Pilares del puente (decorativos)
        let pillarLeft = this.add.image(x + 10, 520, 'bridge_pillar');
        pillarLeft.setScale(0.3, 0.5);
        pillarLeft.setTint(0x888888);
        
        let pillarRight = this.add.image(x + width - 10, 520, 'bridge_pillar');
        pillarRight.setScale(0.3, 0.5);
        pillarRight.setTint(0x888888);
        
        // Cuerdas/cables del puente (líneas decorativas)
        let ropeGraphics = this.add.graphics();
        ropeGraphics.lineStyle(2, 0x8B4513, 0.8);
        
        // Cuerda superior
        ropeGraphics.beginPath();
        ropeGraphics.moveTo(x, 530);
        for (let i = 0; i <= width; i += 10) {
            ropeGraphics.lineTo(x + i, 530 + Math.sin(i / 30) * 5);
        }
        ropeGraphics.strokePath();
        
        // Cuerda inferior
        ropeGraphics.lineStyle(2, 0x8B4513, 0.6);
        ropeGraphics.beginPath();
        ropeGraphics.moveTo(x, 575);
        for (let i = 0; i <= width; i += 10) {
            ropeGraphics.lineTo(x + i, 575 + Math.sin(i / 25) * 3);
        }
        ropeGraphics.strokePath();
        
        // Tablones del puente (cada uno es una plataforma jugable)
        this.bridgePlanks = [];
        for (let i = 0; i < numPlanks; i++) {
            const plankX = x + 40 + (i * (width / numPlanks));
            const plankWidth = 70;
            
            // Visual del tablón
            let plankVisual = this.add.image(plankX, 558, 'bridge_plank');
            plankVisual.setScale(0.12, 0.08);
            plankVisual.setTint(0xaa8855);
            
            // Física del tablón (plataforma sólida estrecha)
            let plankBody = this.add.rectangle(plankX, 552, plankWidth, 12, 0x000000, 0);
            this.physics.add.existing(plankBody, true);
            this.platforms.add(plankBody);
            
            // Efecto de "balanceo" sutil en los tablones
            this.tweens.add({
                targets: plankVisual,
                y: 558 + Phaser.Math.FloatBetween(-2, 2),
                angle: Phaser.Math.FloatBetween(-1, 1),
                duration: Phaser.Math.Between(1500, 2500),
                yoyo: true,
                repeat: -1,
                delay: i * 100
            });
            
            this.bridgePlanks.push(plankVisual);
        }
        
        // Zona de muerte debajo del puente (por si se cae entre los tablones)
        let bridgeDeathZone = this.add.rectangle(x + width / 2, 595, width, 10, 0x000000, 0);
        this.physics.add.existing(bridgeDeathZone, true);
        this.deathZones.add(bridgeDeathZone);
        
        // Efecto visual de abismo debajo del puente
        let abyss = this.add.rectangle(x + width / 2, 585, width, 30, 0x111122, 0.9);
        
        // Texto del puente
        let bridgeLabel = this.add.text(x + width / 2, 510, '🌉 PUENTE DESTRUIDO', {
            fontSize: '11px',
            fill: '#ccaa77',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
    }

    createJumpPlatforms() {
        // Plataformas de salto con textura propia, diseñadas para hacer el nivel más vertical
        const jumpPlatformData = [
            // Zona 1: Tutorial de plataformas (antes del primer hueco)
            { x: 350, y: 420, w: 2 },
            { x: 500, y: 350, w: 3 },
            { x: 700, y: 280, w: 2 },
            { x: 550, y: 200, w: 2 }, // Plataforma alta con recompensa cerca
            
            // Zona 2: Alrededor del primer hueco (x=1200)
            { x: 1050, y: 380, w: 3 },
            { x: 1150, y: 280, w: 2 }, // Ayuda a saltar el hueco por arriba
            { x: 1300, y: 300, w: 2 },
            { x: 1450, y: 380, w: 2 },
            
            // Zona 3: Sección de escalada (1600-2200)
            { x: 1600, y: 420, w: 2 },
            { x: 1750, y: 340, w: 3 },
            { x: 1900, y: 260, w: 2 },
            { x: 2050, y: 180, w: 3 },
            { x: 1850, y: 400, w: 2 },
            { x: 2200, y: 320, w: 2 },
            
            // Zona 4: Alrededor del segundo hueco (x=2400)
            { x: 2300, y: 350, w: 2 },
            { x: 2450, y: 250, w: 3 }, // Puente aéreo sobre el hueco
            { x: 2600, y: 200, w: 2 },
            { x: 2700, y: 350, w: 3 },
            
            // Zona 5: Pre-puente (2800-3200)
            { x: 2850, y: 400, w: 2 },
            { x: 3000, y: 300, w: 3 },
            { x: 3100, y: 200, w: 2 },
            
            // Zona 6: Sobre el puente (3200-3700) - plataformas altas
            { x: 3350, y: 350, w: 2 },
            { x: 3500, y: 250, w: 3 },
            { x: 3650, y: 350, w: 2 },
            
            // Zona 7: Post-puente y tercer hueco (3700-4500)
            { x: 3800, y: 400, w: 3 },
            { x: 3950, y: 300, w: 2 },
            { x: 4100, y: 380, w: 2 },
            { x: 4150, y: 250, w: 3 }, // Sobre el tercer hueco
            { x: 4350, y: 200, w: 2 },
            { x: 4500, y: 350, w: 3 },
            
            // Zona 8: Recta final (4500-5800)
            { x: 4700, y: 400, w: 2 },
            { x: 4850, y: 300, w: 3 },
            { x: 5000, y: 200, w: 2 },
            { x: 5150, y: 350, w: 3 },
            { x: 5300, y: 250, w: 2 },
            { x: 5500, y: 380, w: 3 },
            { x: 5650, y: 280, w: 2 },
        ];
        
        for (const data of jumpPlatformData) {
            for (let j = 0; j < data.w; j++) {
                let plat = this.platforms.create(data.x + (j * 64), data.y, 'jump_platform');
                plat.setScale(0.12, 0.1);
                plat.body.setSize(64, 16);
                plat.body.setOffset((plat.displayWidth - 64) / 2, (plat.displayHeight - 16) / 2);
                plat.refreshBody();
                // Solo colisión desde arriba (se puede saltar desde abajo)
                plat.body.checkCollision.down = false;
                plat.body.checkCollision.left = false;
                plat.body.checkCollision.right = false;
            }
        }
    }

    // =============================================
    // SISTEMA DE ENEMIGOS VARIADOS
    // =============================================

    createPowerup(x, type, spriteKey) {
        let p = this.physics.add.sprite(x, 100, spriteKey);
        p.body.setBounce(0.5);
        p.body.setCollideWorldBounds(true);
        p.weaponType = type;
        this.powerups.add(p);
    }

    spawnStaticEnemy(x, y, type) {
        if (x < 0 || x > 6400) return;
        let enemy = this.enemies.create(x, y, 'dude');
        this.configureEnemy(enemy, type);
    }

    spawnEnemy(x, type = 'normal') {
        if (x < 0 || x > 6400 || this.bossActive) return;
        let enemy = this.enemies.create(x, 0, 'dude');
        this.configureEnemy(enemy, type);
    }

    configureEnemy(enemy, type) {
        enemy.setBounce(0.2);
        enemy.setCollideWorldBounds(true);
        enemy.enemyType = type;
        
        switch (type) {
            case 'runner':
                // Rápido, débil, color cyan
                enemy.setTint(0x00ffff);
                enemy.health = 1;
                enemy.speed = 200;
                enemy.scoreValue = 150;
                enemy.setScale(0.9);
                break;
            case 'jumper':
                // Salta frecuentemente, color verde
                enemy.setTint(0x00ff00);
                enemy.health = 1;
                enemy.speed = 120;
                enemy.scoreValue = 200;
                enemy.setScale(1.0);
                break;
            case 'sniper':
                // Dispara desde lejos, no se acerca, color amarillo
                enemy.setTint(0xffff00);
                enemy.health = 1;
                enemy.speed = 50;
                enemy.scoreValue = 250;
                enemy.setScale(0.85);
                break;
            case 'heavy':
                // Lento, tanque, mucha vida, color púrpura
                enemy.setTint(0xff00ff);
                enemy.health = 3;
                enemy.speed = 60;
                enemy.scoreValue = 500;
                enemy.setScale(1.3);
                break;
            default: // 'normal'
                enemy.setTint(0xff0000);
                enemy.health = 1;
                enemy.speed = 100;
                enemy.scoreValue = 100;
                break;
        }
    }

    update(time) {
        if (this.p1Health <= 0) return;

        // =============================================
        // ANALYTICS: Rastreo de botones (detección de edge para contar presses, no holds)
        // =============================================
        const a = this.analytics;
        const bs = a._buttonStates;

        // Detectar transición de no-presionado a presionado
        if (this.cursors.left.isDown && !bs.left) { a.buttonPresses.left++; }
        if (this.cursors.right.isDown && !bs.right) { a.buttonPresses.right++; }
        if (this.cursors.up.isDown && !bs.up) { a.buttonPresses.up++; }
        if (this.cursors.down.isDown && !bs.down) { a.buttonPresses.down++; }
        if (this.spaceBar.isDown && !bs.space) { a.buttonPresses.space++; }

        // Actualizar estados
        bs.left = this.cursors.left.isDown;
        bs.right = this.cursors.right.isDown;
        bs.up = this.cursors.up.isDown;
        bs.down = this.cursors.down.isDown;
        bs.space = this.spaceBar.isDown;

        // ANALYTICS: Máximo avance
        if (this.player.x > a.maxProgressX) {
            a.maxProgressX = Math.round(this.player.x);
        }

        // ANALYTICS: Heatmap de posición (muestreo cada ~500ms)
        if (time - a._lastHeatmapSample > 500) {
            a.positionHeatmap.push({
                t: Math.round(time),
                x: Math.round(this.player.x),
                y: Math.round(this.player.y)
            });
            a._lastHeatmapSample = time;
        }

        // ANALYTICS: Tiempo en zonas
        if (time - a._lastZoneUpdate > 100) {
            const zoneIndex = Math.min(Math.floor(this.player.x / 800), 7);
            const zoneKeys = Object.keys(a.timeInZones);
            if (zoneKeys[zoneIndex]) {
                a.timeInZones[zoneKeys[zoneIndex]] += 0.1; // ~100ms en segundos
            }
            a._lastZoneUpdate = time;
        }

        // Bajar de plataformas (Flecha Abajo + Salto)
        if (this.cursors.down.isDown && this.spaceBar.isDown && this.player.body.touching.down) {
            this.playerPlatformCollider.active = false;
            this.time.delayedCall(300, () => { this.playerPlatformCollider.active = true; });
        }
        // Salto normal
        else if (this.cursors.up.isDown && this.player.body.touching.down) {
            this.player.setVelocityY(-550);
            this.playJumpSound();
            a.totalJumps++; // ANALYTICS: Contar salto
        }

        // Movimiento Horizontal
        if (this.cursors.left.isDown) {
            this.player.setVelocityX(-250);
            this.player.anims.play('left', true);
            this.lastFacing = -1;
        } else if (this.cursors.right.isDown) {
            this.player.setVelocityX(250);
            this.player.anims.play('right', true);
            this.lastFacing = 1;
        } else {
            this.player.setVelocityX(0);
            this.player.anims.play('turn');
        }

        // Disparo jugador
        if (this.spaceBar.isDown && time > this.lastFired && !this.cursors.down.isDown) {
            this.fireBullet();
            a.shotsFired++; // ANALYTICS: Contar disparo
            a.shotsByWeapon[this.currentWeapon] = (a.shotsByWeapon[this.currentWeapon] || 0) + 1;
            // Cadencias de armas
            let delay = 200;
            if (this.currentWeapon === 'spread') delay = 400;
            if (this.currentWeapon === 'machinegun') delay = 100;
            if (this.currentWeapon === 'laser') delay = 50;
            this.lastFired = time + delay;
        }

        // IA Enemigos variados
        this.enemies.children.each((enemy) => {
            if (enemy.active) {
                let dist = Math.abs(enemy.x - this.player.x);
                let speed = enemy.speed || 100;
                let type = enemy.enemyType || 'normal';
                
                switch (type) {
                    case 'runner':
                        // Siempre persigue agresivamente
                        if (dist < 600) {
                            enemy.setVelocityX(enemy.x > this.player.x ? -speed : speed);
                            enemy.anims.play(enemy.body.velocity.x > 0 ? 'right' : 'left', true);
                        } else {
                            enemy.setVelocityX(0);
                            enemy.anims.play('turn');
                        }
                        break;
                        
                    case 'jumper':
                        // Persigue y salta frecuentemente
                        if (dist < 500) {
                            enemy.setVelocityX(enemy.x > this.player.x ? -speed : speed);
                            enemy.anims.play(enemy.body.velocity.x > 0 ? 'right' : 'left', true);
                            if (enemy.body.touching.down && Phaser.Math.Between(0, 60) === 0) {
                                enemy.setVelocityY(-450);
                            }
                        } else {
                            enemy.setVelocityX(0);
                            enemy.anims.play('turn');
                        }
                        break;
                        
                    case 'sniper':
                        // Se mantiene a distancia, retrocede si el jugador se acerca mucho
                        if (dist < 150) {
                            // Huir
                            enemy.setVelocityX(enemy.x > this.player.x ? speed : -speed);
                            enemy.anims.play(enemy.body.velocity.x > 0 ? 'right' : 'left', true);
                        } else if (dist < 600) {
                            enemy.setVelocityX(0);
                            enemy.anims.play('turn');
                        } else {
                            enemy.setVelocityX(0);
                            enemy.anims.play('turn');
                        }
                        break;
                        
                    case 'heavy':
                        // Avance lento pero imparable
                        if (dist < 500) {
                            enemy.setVelocityX(enemy.x > this.player.x ? -speed : speed);
                            enemy.anims.play(enemy.body.velocity.x > 0 ? 'right' : 'left', true);
                        } else {
                            enemy.setVelocityX(0);
                            enemy.anims.play('turn');
                        }
                        break;
                        
                    default:
                        if (dist < 400) {
                            enemy.setVelocityX(enemy.x > this.player.x ? -speed : speed);
                            enemy.anims.play(enemy.body.velocity.x > 0 ? 'right' : 'left', true);
                        } else {
                            enemy.setVelocityX(0);
                            enemy.anims.play('turn');
                        }
                        break;
                }
            }
        });

        // Limpiar balas
        this.cleanupBullets(this.bullets);
        this.cleanupBullets(this.enemyBullets);

        // Activar Jefe Final si llegamos al final del nivel
        if (this.player.x > 5800 && !this.bossActive) {
            this.activateBoss();
        }

        // Lógica del Jefe
        if (this.bossActive && this.boss.active) {
            // Movimiento vertical del jefe
            this.boss.y = 300 + Math.sin(time / 500) * 200;
            
            // Disparos del jefe
            if (Phaser.Math.Between(0, 100) > 90) {
                this.createBullet(this.enemyBullets, this.boss.x - 50, this.boss.y, -400, Phaser.Math.Between(-100, 100), 0xff00ff);
            }
        }
    }

    fallIntoPit(player) {
        // Muerte instantánea al caer en un hueco
        this.cameras.main.shake(300, 0.03);
        this.cameras.main.flash(300, 255, 100, 0);
        
        // Efecto de caída
        let fallText = this.add.text(player.x, player.y - 60, '💀 ¡CAÍDA!', {
            fontSize: '24px',
            fill: '#ff4400',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        this.tweens.add({ targets: fallText, y: player.y - 120, alpha: 0, duration: 1000, onComplete: () => fallText.destroy() });
        
        // ANALYTICS: Daño por caída en hueco
        this.analytics.damageBySource.pit_fall += 50;
        this.analytics.damageEvents.push({
            time: Date.now() - this.analytics.startTime,
            x: Math.round(player.x),
            y: Math.round(player.y),
            source: 'pit_fall',
            amount: 50
        });
        
        this.takeDamage(50, 'pit_fall'); // Daño masivo por caer
        
        if (this.p1Health > 0) {
            // Reposicionar al jugador en la última superficie segura
            player.setPosition(player.x - 100, 400);
            player.setVelocity(0, -300);
        }
    }

    playJumpSound() {
        const actx = this.sound.context;
        if(!actx) return;
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, actx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, actx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.05, actx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.1);
        osc.start(actx.currentTime);
        osc.stop(actx.currentTime + 0.1);
    }

    playShootSound() {
        const actx = this.sound.context;
        if(!actx) return;
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.connect(gain);
        gain.connect(actx.destination);
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, actx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, actx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.05, actx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.1);
        osc.start(actx.currentTime);
        osc.stop(actx.currentTime + 0.1);
    }

    activateBoss() {
        this.bossActive = true;
        this.boss.setActive(true).setVisible(true);
        this.analytics.bossReached = true; // ANALYTICS
        if (window.showBossHud) window.showBossHud();
        if (window.updateBossEnergy) window.updateBossEnergy(100);
        // Destruir enemigos existentes para la pelea 1v1
        this.enemies.clear(true, true);
    }

    switchWeapon() {
        // Bloquear si el modal de input está activo
        if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

        this.activeSlot = this.activeSlot === 0 ? 1 : 0;
        if (window.updateWeapon) window.updateWeapon(this.currentWeapon);
        this.analytics.buttonPresses.Q++; // ANALYTICS
        this.analytics.weaponSwitches++; // ANALYTICS
    }

    useBomb() {
        // Bloquear si el modal de input está activo para que al escribir la "B" en el nombre no detone bombas
        if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

        this.analytics.buttonPresses.B++; // ANALYTICS

        if (this.bombs > 0) {
            this.bombs--;
            this.analytics.bombsUsed++; // ANALYTICS
            if (window.updateBombs) window.updateBombs(this.bombs);

            // Flash de pantalla
            this.cameras.main.flash(500, 255, 255, 255);
            
            // Animación de la bomba masiva
            let boom = this.add.sprite(this.cameras.main.scrollX + 400, 300, 'flare').setScale(0.1);
            boom.setTint(0xffaa00);
            boom.setBlendMode(Phaser.BlendModes.ADD);
            this.tweens.add({
                targets: boom, scale: 50, alpha: 0, duration: 800,
                onComplete: () => { boom.destroy(); }
            });

            // Limpiar enemigos y balas
            this.enemies.clear(true, true);
            this.enemyBullets.clear(true, true);

            // Daño al jefe
            if (this.bossActive && this.boss.active) {
                this.bossHealth -= 100;
                this.analytics.bossDamageDealt += 100; // ANALYTICS
                this.updateBossUI();
                this.boss.setTintFill(0xffffff);
                this.time.delayedCall(200, () => { this.boss.setTint(0xff00ff); });
                if (this.bossHealth <= 0) this.killBoss();
            }
        }
    }

    cleanupBullets(bulletGroup) {
        bulletGroup.children.each((b) => {
            if (b.active && (b.y > 600 || b.y < 0 || b.x > this.physics.world.bounds.width || b.x < 0)) {
                b.destroy();
            }
        });
    }

    fireBullet() {
        let dirX = (this.cursors.left.isDown) ? -1 : ((this.cursors.right.isDown) ? 1 : 0);
        let dirY = (this.cursors.up.isDown) ? -1 : 0;

        if (dirX === 0 && dirY === 0) {
            dirX = this.lastFacing;
        }

        let mag = Math.sqrt(dirX*dirX + dirY*dirY);
        if (mag !== 0) { dirX /= mag; dirY /= mag; }

        let speed = 800;
        this.playShootSound();

        if (this.currentWeapon === 'standard') {
            this.createBullet(this.bullets, this.player.x, this.player.y, dirX * speed, dirY * speed, 0x00ffff);
        } else if (this.currentWeapon === 'spread') {
            this.createBullet(this.bullets, this.player.x, this.player.y, dirX * speed, dirY * speed, 0xff00ff);
            let angle = Math.atan2(dirY, dirX);
            this.createBullet(this.bullets, this.player.x, this.player.y, Math.cos(angle + 0.2) * speed, Math.sin(angle + 0.2) * speed, 0xff00ff);
            this.createBullet(this.bullets, this.player.x, this.player.y, Math.cos(angle - 0.2) * speed, Math.sin(angle - 0.2) * speed, 0xff00ff);
        } else if (this.currentWeapon === 'machinegun') {
            // Disparo más rápido, menos precisión
            let spreadY = Phaser.Math.Between(-50, 50);
            this.createBullet(this.bullets, this.player.x, this.player.y, dirX * speed, dirY * speed + spreadY, 0xffff00);
        } else if (this.currentWeapon === 'laser') {
            // Bala muy rápida, roja
            this.createBullet(this.bullets, this.player.x, this.player.y, dirX * 1500, dirY * 1500, 0xff0000);
        }
    }

    createBullet(group, x, y, vx, vy, colorTint) {
        let bullet = this.add.sprite(x, y, 'bullet');
        if (colorTint) bullet.setTint(colorTint);
        this.physics.add.existing(bullet);
        group.add(bullet);
        bullet.body.allowGravity = false;
        bullet.body.setVelocity(vx, vy);
    }

    enemiesFire() {
        if (this.bossActive) return; // Enemigos normales dejan de disparar en el jefe
        this.enemies.children.each((enemy) => {
            if (enemy.active) {
                let dist = Math.abs(enemy.x - this.player.x);
                let type = enemy.enemyType || 'normal';
                
                let fireChance = 40; // porcentaje de disparo
                let fireRange = 500;
                let bulletSpeed = 300;
                
                switch (type) {
                    case 'runner':
                        fireChance = 30;
                        fireRange = 300;
                        bulletSpeed = 350;
                        break;
                    case 'sniper':
                        fireChance = 70; // Dispara mucho más seguido
                        fireRange = 800; // Mayor alcance
                        bulletSpeed = 500; // Balas más rápidas
                        break;
                    case 'heavy':
                        fireChance = 50;
                        fireRange = 400;
                        bulletSpeed = 250;
                        break;
                    case 'jumper':
                        fireChance = 25;
                        fireRange = 350;
                        bulletSpeed = 300;
                        break;
                }
                
                if (dist < fireRange && Phaser.Math.Between(0, 100) < fireChance) {
                    let dx = this.player.x - enemy.x;
                    let dy = this.player.y - enemy.y;
                    let mag = Math.sqrt(dx*dx + dy*dy);
                    
                    let bulletColor = 0xff0000;
                    if (type === 'sniper') bulletColor = 0xffff00;
                    if (type === 'heavy') bulletColor = 0xff00ff;
                    
                    this.createBullet(this.enemyBullets, enemy.x, enemy.y, (dx/mag)*bulletSpeed, (dy/mag)*bulletSpeed, bulletColor);
                    
                    // Heavy dispara 3 balas
                    if (type === 'heavy') {
                        this.createBullet(this.enemyBullets, enemy.x, enemy.y, (dx/mag)*bulletSpeed, (dy/mag)*bulletSpeed - 80, bulletColor);
                        this.createBullet(this.enemyBullets, enemy.x, enemy.y, (dx/mag)*bulletSpeed, (dy/mag)*bulletSpeed + 80, bulletColor);
                    }
                }
            }
        });
    }

    hitPlayerWithBullet(player, bullet) {
        bullet.destroy();
        // ANALYTICS: Daño por bala enemiga
        this.analytics.damageBySource.enemy_bullet += 10;
        this.analytics.damageEvents.push({
            time: Date.now() - this.analytics.startTime,
            x: Math.round(player.x),
            y: Math.round(player.y),
            source: 'enemy_bullet',
            amount: 10
        });
        this.takeDamage(10, 'enemy_bullet');
    }

    hitPlayerBoss(player, boss) {
        // ANALYTICS: Daño por contacto con boss
        this.analytics.damageBySource.boss_contact += 20;
        this.analytics.damageEvents.push({
            time: Date.now() - this.analytics.startTime,
            x: Math.round(player.x),
            y: Math.round(player.y),
            source: 'boss_contact',
            amount: 20
        });
        this.takeDamage(20, 'boss_contact');
        player.setVelocityX(player.x < boss.x ? -400 : 400);
    }

    hitPlayer(player, enemy) {
        let damage = 15;
        if (enemy.enemyType === 'heavy') damage = 25;
        if (enemy.enemyType === 'runner') damage = 10;
        
        // ANALYTICS: Daño por contacto enemigo
        this.analytics.damageBySource.enemy_contact += damage;
        this.analytics.damageEvents.push({
            time: Date.now() - this.analytics.startTime,
            x: Math.round(player.x),
            y: Math.round(player.y),
            source: 'enemy_contact_' + (enemy.enemyType || 'normal'),
            amount: damage
        });
        
        this.takeDamage(damage, 'enemy_contact');
        player.setVelocityX(player.x < enemy.x ? -300 : 300);
        player.setVelocityY(-300);
        
        // Enemigos de contacto mueren al tocarte (excepto heavy)
        if (enemy.enemyType !== 'heavy') {
            enemy.destroy();
        } else {
            enemy.health--;
            if (enemy.health <= 0) enemy.destroy();
        }
    }

    takeDamage(amount, source = 'unknown') {
        this.p1Health -= amount;
        if (this.p1Health < 0) this.p1Health = 0;
        this.analytics.totalDamageTaken += amount; // ANALYTICS
        if (window.updateEnergy) window.updateEnergy(1, this.p1Health);

        if (this.p1Health <= 0) {
            // ANALYTICS: Registrar muerte
            this.analytics.deathPosition = {
                x: Math.round(this.player.x),
                y: Math.round(this.player.y)
            };
            this.analytics.deathCause = source;
            this.analytics.outcome = 'death';
            this.analytics.endTime = Date.now();
            this.analytics.finalScore = this.p1Score;
            this.finalizeAnalytics(); // Exportar data

            this.physics.pause();
            this.player.setTint(0xff0000);
            this.player.anims.play('turn');
            this.bgm.stop(); // Detener música
            
            // Mostrar modal de Game Over
            if (window.showGameOverModal) {
                window.showGameOverModal(this.p1Score);
            }
        } else {
            this.player.setTint(0xffaaaa);
            this.time.delayedCall(200, () => { this.player.clearTint(); });
        }
    }

    hitEnemy(bullet, enemy) {
        bullet.destroy();
        
        enemy.health = (enemy.health || 1) - 1;
        
        if (enemy.health <= 0) {
            let score = enemy.scoreValue || 100;
            this.p1Score += score;
            if (window.updateScore) window.updateScore(1, this.p1Score);
            
            // ANALYTICS: Kill tracking
            this.analytics.enemiesKilled++;
            const enemyType = enemy.enemyType || 'normal';
            this.analytics.killsByType[enemyType] = (this.analytics.killsByType[enemyType] || 0) + 1;
            
            // Efecto de muerte según tipo
            let deathColor = '#ff0000';
            if (enemy.enemyType === 'heavy') deathColor = '#ff00ff';
            if (enemy.enemyType === 'sniper') deathColor = '#ffff00';
            
            let txt = this.add.text(enemy.x, enemy.y - 20, '+' + score, { fontSize: '16px', fill: deathColor, fontStyle: 'bold', stroke: '#000', strokeThickness: 2 }).setOrigin(0.5);
            this.tweens.add({ targets: txt, y: enemy.y - 60, alpha: 0, duration: 600, onComplete: () => txt.destroy() });
            
            enemy.destroy();
        } else {
            // Flash blanco al recibir daño
            enemy.setTintFill(0xffffff);
            this.time.delayedCall(100, () => {
                if (enemy.active) {
                    // Restaurar tinte original según tipo
                    const tints = { runner: 0x00ffff, jumper: 0x00ff00, sniper: 0xffff00, heavy: 0xff00ff, normal: 0xff0000 };
                    enemy.setTint(tints[enemy.enemyType] || 0xff0000);
                }
            });
        }
    }

    hitBoss(boss, bullet) {
        bullet.destroy();
        if (!this.bossActive) return;

        // Daño según arma
        let damage = 10;
        if (this.currentWeapon === 'laser') damage = 5;
        if (this.currentWeapon === 'machinegun') damage = 8;
        
        this.bossHealth -= damage;
        this.analytics.bossDamageDealt += damage; // ANALYTICS
        this.updateBossUI();

        // Efecto visual
        boss.setTintFill(0xffffff);
        this.time.delayedCall(50, () => { boss.setTint(0xff00ff); });

        if (this.bossHealth <= 0) {
            this.killBoss();
        }
    }

    updateBossUI() {
        let pct = (this.bossHealth / this.bossMaxHealth) * 100;
        if (window.updateBossEnergy) window.updateBossEnergy(pct);
    }

    killBoss() {
        this.boss.destroy();
        this.bossActive = false;
        
        // ANALYTICS: Victoria
        this.analytics.outcome = 'victory';
        this.analytics.endTime = Date.now();
        this.analytics.finalScore = this.p1Score + 5000;
        this.finalizeAnalytics();
        
        // Explosiones de victoria
        this.cameras.main.shake(2000, 0.05);
        
        this.p1Score += 5000;
        if (window.updateScore) window.updateScore(1, this.p1Score);

        this.time.delayedCall(2000, () => {
            this.add.text(this.cameras.main.scrollX + 400, 300, 'MISSION ACCOMPLISHED', { fontSize: '48px', fill: '#00ff00', fontStyle: 'bold' }).setOrigin(0.5);
            this.physics.pause();
            this.bgm.stop();
            
            // Mostrar modal de victoria
            this.time.delayedCall(2000, () => {
                if (window.showGameOverModal) {
                    window.showGameOverModal(this.p1Score);
                }
            });
        });
    }

    collectPowerup(player, powerup) {
        let type = powerup.weaponType;
        powerup.destroy();
        
        // ANALYTICS: Registrar power-up recogido
        this.analytics.powerupsCollected.push({
            type: type,
            time: Date.now() - this.analytics.startTime,
            x: Math.round(player.x)
        });
        
        if (type === 'bomb') {
            this.bombs++;
            if (window.updateBombs) window.updateBombs(this.bombs);
            let txt = this.add.text(player.x, player.y - 40, '+1 BOMB!', { fontSize: '20px', fill: '#ffff00', fontStyle: 'bold' });
            this.tweens.add({ targets: txt, y: player.y - 100, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
            return;
        }

        // En Contra III, al recoger un arma, ésta reemplaza tu arma actual en el slot activo.
        this.inventory[this.activeSlot] = type;

        if (window.updateWeapon) window.updateWeapon(this.currentWeapon);
        
        let txt = this.add.text(player.x, player.y - 40, type.toUpperCase() + ' GUN!', { fontSize: '20px', fill: '#00ff00', fontStyle: 'bold' });
        this.tweens.add({ targets: txt, y: player.y - 100, alpha: 0, duration: 1000, onComplete: () => txt.destroy() });
    }

    // =============================================
    // EXPORTACIÓN DE ANALYTICS A CSV
    // =============================================

    finalizeAnalytics() {
        const a = this.analytics;
        a.endTime = a.endTime || Date.now();
        const durationSec = ((a.endTime - a.startTime) / 1000).toFixed(1);

        // Redondear tiempos en zonas
        for (const key in a.timeInZones) {
            a.timeInZones[key] = parseFloat(a.timeInZones[key].toFixed(1));
        }

        // ====== CSV 1: Resumen de sesión (1 fila por partida) ======
        const summaryHeaders = [
            'session_id', 'fecha', 'duracion_seg', 'resultado', 'score_final',
            'max_progreso_x', 'saltos_totales', 'disparos_totales',
            'disparos_standard', 'disparos_spread', 'disparos_machinegun', 'disparos_laser',
            'enemigos_eliminados', 'kills_normal', 'kills_runner', 'kills_jumper', 'kills_sniper', 'kills_heavy',
            'daño_total_recibido', 'daño_contacto_enemigo', 'daño_bala_enemiga', 'daño_contacto_boss', 'daño_bala_boss', 'daño_caida',
            'bombas_usadas', 'cambios_arma', 'powerups_recogidos',
            'boss_alcanzado', 'daño_al_boss',
            'muerte_x', 'muerte_y', 'causa_muerte',
            'presses_izquierda', 'presses_derecha', 'presses_arriba', 'presses_abajo', 'presses_espacio', 'presses_Q', 'presses_B',
            'tiempo_zona_0_800', 'tiempo_zona_800_1600', 'tiempo_zona_1600_2400', 'tiempo_zona_2400_3200',
            'tiempo_zona_3200_4000', 'tiempo_zona_4000_4800', 'tiempo_zona_4800_5600', 'tiempo_zona_5600_6400'
        ];

        const zoneValues = Object.values(a.timeInZones);
        const summaryRow = [
            a.sessionId,
            new Date(a.startTime).toISOString(),
            durationSec,
            a.outcome || 'unknown',
            a.finalScore,
            a.maxProgressX,
            a.totalJumps,
            a.shotsFired,
            a.shotsByWeapon.standard || 0,
            a.shotsByWeapon.spread || 0,
            a.shotsByWeapon.machinegun || 0,
            a.shotsByWeapon.laser || 0,
            a.enemiesKilled,
            a.killsByType.normal || 0,
            a.killsByType.runner || 0,
            a.killsByType.jumper || 0,
            a.killsByType.sniper || 0,
            a.killsByType.heavy || 0,
            a.totalDamageTaken,
            a.damageBySource.enemy_contact,
            a.damageBySource.enemy_bullet,
            a.damageBySource.boss_contact,
            a.damageBySource.boss_bullet,
            a.damageBySource.pit_fall,
            a.bombsUsed,
            a.weaponSwitches,
            a.powerupsCollected.length,
            a.bossReached ? 'SI' : 'NO',
            a.bossDamageDealt,
            a.deathPosition ? a.deathPosition.x : '',
            a.deathPosition ? a.deathPosition.y : '',
            a.deathCause || '',
            a.buttonPresses.left,
            a.buttonPresses.right,
            a.buttonPresses.up,
            a.buttonPresses.down,
            a.buttonPresses.space,
            a.buttonPresses.Q,
            a.buttonPresses.B,
            ...zoneValues
        ];

        // ====== CSV 2: Eventos de daño (múltiples filas) ======
        const damageHeaders = ['session_id', 'tiempo_ms', 'posicion_x', 'posicion_y', 'fuente', 'cantidad'];
        let damageRows = a.damageEvents.map(e => [
            a.sessionId, e.time, e.x, e.y, e.source, e.amount
        ]);

        // ====== CSV 3: Heatmap de posición ======
        const heatmapHeaders = ['session_id', 'tiempo_game', 'posicion_x', 'posicion_y'];
        let heatmapRows = a.positionHeatmap.map(p => [
            a.sessionId, p.t, p.x, p.y
        ]);

        // ====== CSV 4: Power-ups recogidos ======
        const powerupHeaders = ['session_id', 'tipo', 'tiempo_ms', 'posicion_x'];
        let powerupRows = a.powerupsCollected.map(p => [
            a.sessionId, p.type, p.time, p.x
        ]);

        // Guardar en localStorage para acumular sesiones
        this.appendToLocalStorage('gontra_analytics_summary', summaryHeaders, [summaryRow]);
        this.appendToLocalStorage('gontra_analytics_damage', damageHeaders, damageRows);
        this.appendToLocalStorage('gontra_analytics_heatmap', heatmapHeaders, heatmapRows);
        this.appendToLocalStorage('gontra_analytics_powerups', powerupHeaders, powerupRows);

        // Exponer función de descarga global
        window.downloadAnalyticsCSV = () => this.downloadAllCSV();

        console.log('📊 Analytics guardado. Sesión:', a.sessionId);
        console.log('📊 Resumen:', {
            duracion: durationSec + 's',
            resultado: a.outcome,
            score: a.finalScore,
            enemigos: a.enemiesKilled,
            disparos: a.shotsFired,
            saltos: a.totalJumps,
            daño_recibido: a.totalDamageTaken
        });

        // Descargar automáticamente los CSVs actualizados
        this.downloadAllCSV();
    }

    appendToLocalStorage(key, headers, rows) {
        let existing = JSON.parse(localStorage.getItem(key) || 'null');
        if (!existing) {
            existing = { headers: headers, rows: [] };
        }
        existing.rows.push(...rows);
        localStorage.setItem(key, JSON.stringify(existing));
    }

    downloadAllCSV() {
        const files = [
            { key: 'gontra_analytics_summary', filename: 'gontra_sesiones_resumen.csv' },
            { key: 'gontra_analytics_damage', filename: 'gontra_eventos_daño.csv' },
            { key: 'gontra_analytics_heatmap', filename: 'gontra_heatmap_posicion.csv' },
            { key: 'gontra_analytics_powerups', filename: 'gontra_powerups.csv' }
        ];

        for (const file of files) {
            const data = JSON.parse(localStorage.getItem(file.key) || 'null');
            if (data && data.rows.length > 0) {
                const csvContent = [data.headers.join(','), ...data.rows.map(r => r.join(','))].join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = file.filename;
                link.click();
                URL.revokeObjectURL(url);
            }
        }
    }
}
