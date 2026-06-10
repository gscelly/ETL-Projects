import GameScene from './scenes/Game.js';

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 800 },
            debug: false
        }
    },
    scene: [GameScene]
};

const game = new Phaser.Game(config);

// Lógica para actualizar la UI HTML desde el juego
window.updateEnergy = function(player, percentage) {
    const el = document.getElementById(player === 1 ? 'p1-energy' : 'p2-energy');
    if (el) {
        el.style.width = Math.max(0, percentage) + '%';
        if (percentage < 30) {
            el.style.backgroundColor = '#ff0000';
        } else if (percentage < 60) {
            el.style.backgroundColor = '#ffff00';
        } else {
            el.style.backgroundColor = player === 1 ? '#00ff00' : '#0088ff';
        }
    }
};

window.updateScore = function(player, score) {
    const el = document.getElementById(player === 1 ? 'p1-score' : 'p2-score');
    if (el) el.innerText = score;
};

window.updateBombs = function(count) {
    const el = document.getElementById('p1-bombs');
    if (el) el.innerText = count;
};

window.updateWeapon = function(weaponName) {
    const el = document.getElementById('p1-weapon');
    if (el) {
        let icon = '⚪ STANDARD';
        if (weaponName === 'spread') icon = '🔵 SPREAD';
        else if (weaponName === 'machinegun') icon = '🟡 MACHINE GUN';
        else if (weaponName === 'laser') icon = '🔴 LASER';
        el.innerText = icon;
    }
};

window.showBossHud = function() {
    const el = document.getElementById('boss-hud');
    if (el) el.style.display = 'block';
};

window.updateBossEnergy = function(percentage) {
    const el = document.getElementById('boss-energy');
    if (el) {
        el.style.width = Math.max(0, percentage) + '%';
    }
};

// --- LÓGICA DE GAME OVER Y HIGH SCORES --- //
let currentFinalScore = 0;

window.showGameOverModal = function(score) {
    currentFinalScore = score;
    document.getElementById('final-score').innerText = score;
    document.getElementById('game-over-modal').style.display = 'flex';
    document.getElementById('name-input-section').style.display = 'block';
    document.getElementById('leaderboard-section').style.display = 'none';
    
    let nameInput = document.getElementById('player-name');
    nameInput.value = '';
    
    // Desactivar input de Phaser mientras se escribe para evitar conflictos (como usar la B o barra espaciadora)
    if (game.input && game.input.keyboard) {
        game.input.keyboard.enabled = false;
    }
    
    nameInput.focus();
};

document.getElementById('save-score-btn').addEventListener('click', () => {
    let name = document.getElementById('player-name').value.trim().toUpperCase() || 'ANON';
    if (name.length > 12) name = name.substring(0, 12);
    
    saveHighScore(name, currentFinalScore);
    showLeaderboard();
});

function saveHighScore(name, score) {
    let scores = JSON.parse(localStorage.getItem('gontraScores')) || [];
    scores.push({ name, score });
    // Ordenar de mayor a menor
    scores.sort((a, b) => b.score - a.score);
    // Guardar top 10
    scores = scores.slice(0, 10);
    localStorage.setItem('gontraScores', JSON.stringify(scores));
}

function showLeaderboard() {
    document.getElementById('name-input-section').style.display = 'none';
    document.getElementById('leaderboard-section').style.display = 'block';
    
    const listEl = document.getElementById('high-score-list');
    listEl.innerHTML = '';
    
    let scores = JSON.parse(localStorage.getItem('gontraScores')) || [];
    scores.forEach((s, i) => {
        let li = document.createElement('li');
        li.innerHTML = `<span>${i+1}. ${s.name}</span> <span>${s.score}</span>`;
        listEl.appendChild(li);
    });
}

document.getElementById('restart-btn').addEventListener('click', () => {
    document.getElementById('game-over-modal').style.display = 'none';
    document.getElementById('boss-hud').style.display = 'none';
    
    // Reiniciar UI
    window.updateScore(1, 0);
    window.updateBombs(3);
    window.updateEnergy(1, 100);
    window.updateWeapon('standard');
    
    // Reactivar input de Phaser
    if (game.input && game.input.keyboard) {
        game.input.keyboard.enabled = true;
    }
    
    // Reiniciar Escena
    game.scene.stop('GameScene');
    game.scene.start('GameScene');
});

// Botón para descargar analytics CSV
document.getElementById('download-csv-btn').addEventListener('click', () => {
    if (window.downloadAnalyticsCSV) {
        window.downloadAnalyticsCSV();
    } else {
        alert('No hay datos de analytics disponibles aún.');
    }
});
