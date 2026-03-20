export class CyberPongGame {
    constructor(canvasManager, audioController, onGameOver) {
        this.ctx = canvasManager.ctx;
        this.canvas = canvasManager.canvas;
        this.audio = audioController;
        this.onGameOver = onGameOver;
        this.animationId = null;
        
        // Configuración
        this.paddleHeight = 80;
        this.paddleWidth = 12;
        this.ballSize = 8;
        
        // Estado
        this.playerY = 0;
        this.aiY = 0;
        this.ball = { x: 0, y: 0, dx: 0, dy: 0, speed: 0 };
        this.score = 0; 
        this.lives = 3; 
        this.isPlaying = false;
        this.difficulty = 1;
        this.mode = "NORMAL";
        this.uiContainer = document.getElementById("game-ui-overlay");

        // Control de Teclado
        this.keys = { up: false, down: false };
    }

    init() {
        this.showModeSelect();
    }

    showModeSelect() {
        if(!this.uiContainer) this.uiContainer = document.getElementById('game-ui-overlay');
        const modes = [
            { id:'pong-normal', mc:'#3b82f6', icon:'fa-table-tennis-paddle-ball', name:'NORMAL',   desc:'Dificultad progresiva'        },
            { id:'pong-fast',   mc:'#ef4444', icon:'fa-forward-fast',             name:'TURBO',    desc:'Bola x2 velocidad · 5 vidas'  },
            { id:'pong-chaos',  mc:'#a855f7', icon:'fa-tornado',                  name:'CAOS',     desc:'Bola acelera tras cada golpe'  },
        ];
        this.uiContainer.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:28px;width:100%;background:rgba(0,0,10,0.5);">
            <div style="text-align:center;">
                <div style="font-family:var(--font-display);font-size:1.6rem;color:white;letter-spacing:4px;margin-bottom:4px;">CYBER PONG</div>
                <div style="font-size:0.65rem;color:#3b82f6;letter-spacing:3px;font-family:monospace;">PROTOCOLO DE COLISIÓN</div>
                <div style="width:120px;height:1px;background:#3b82f6;margin:10px auto 0;opacity:0.5;"></div>
            </div>
            <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;">
                ${modes.map(m=>`
                <div style="width:160px;min-height:155px;background:rgba(10,16,30,0.9);border:1px solid ${m.mc}25;border-radius:14px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;cursor:pointer;transition:all 0.15s;padding:18px 12px;position:relative;overflow:hidden;"
                     id="${m.id}"
                     onmouseenter="this.style.transform='translateY(-4px)';this.style.borderColor='${m.mc}';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.4)';"
                     onmouseleave="this.style.transform='';this.style.borderColor='${m.mc}25';this.style.boxShadow='';">
                    <div style="position:absolute;top:0;left:0;right:0;height:2px;background:${m.mc};opacity:0.6;"></div>
                    <i class="fa-solid ${m.icon}" style="font-size:1.8rem;color:${m.mc};filter:drop-shadow(0 0 8px ${m.mc});"></i>
                    <div style="font-family:var(--font-display);font-size:0.76rem;letter-spacing:2px;color:${m.mc};">${m.name}</div>
                    <div style="font-size:0.6rem;color:#475569;font-family:monospace;text-align:center;line-height:1.5;">${m.desc}</div>
                </div>`).join('')}
            </div>
            <button class="btn btn-secondary" id="pong-back" style="width:180px;">
                <i class="fa-solid fa-arrow-left"></i> VOLVER AL LOBBY
            </button>
        </div>`;
        document.getElementById('pong-normal').onclick = () => this.startWithMode('NORMAL');
        document.getElementById('pong-fast').onclick   = () => this.startWithMode('TURBO');
        document.getElementById('pong-chaos').onclick  = () => this.startWithMode('CHAOS');
        document.getElementById('pong-back').onclick   = () => { if(this.onGameOver) this.onGameOver(0); };
    }

    startWithMode(mode) {
        this.mode = mode;
        if(this.uiContainer) this.uiContainer.innerHTML = '';
        this.playerY = this.canvas.height / 2 - this.paddleHeight / 2;
        this.aiY = this.canvas.height / 2 - this.paddleHeight / 2;
        this.resetBall();
        this.lives = mode === 'TURBO' ? 5 : 3;
        this.score = 0;
        this.difficulty = mode === 'TURBO' ? 2 : 1;
        this.isPlaying = true;

        // Pausar el fondo animado para que Pong controle el canvas
        if (window.app && window.app.canvas) window.app.canvas.pauseBackground();

        // Eventos Mouse
        this.moveHandler = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const root = document.documentElement;
            const mouseY = e.clientY - rect.top - root.scrollTop;
            this.playerY = mouseY - this.paddleHeight / 2;
        };

        // Eventos Teclado
        this.keyDownHandler = (e) => {
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.keys.up = true;
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.keys.down = true;
        };
        this.keyUpHandler = (e) => {
            if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.keys.up = false;
            if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') this.keys.down = false;
        };

        // Eventos Touch
        this.touchHandler = (e) => {
            e.preventDefault();
            const rect = this.canvas.getBoundingClientRect();
            const touchY = e.touches[0].clientY - rect.top;
            this.playerY = touchY - this.paddleHeight / 2;
        };

        this.canvas.addEventListener('mousemove', this.moveHandler);
        this.canvas.addEventListener('touchmove', this.touchHandler, { passive: false });
        window.addEventListener('keydown', this.keyDownHandler);
        window.addEventListener('keyup', this.keyUpHandler);

        this.loop();
    }

    resetBall() {
        this.ball.x = this.canvas.width / 2;
        this.ball.y = this.canvas.height / 2;
        const baseSpeed = this.mode === 'TURBO' ? 10 : this.mode === 'CHAOS' ? 5 : 6;
        this.ball.speed = baseSpeed + (this.score * 0.5);
        this.ball.dx = (Math.random() > 0.5 ? 1 : -1) * this.ball.speed;
        this.ball.dy = (Math.random() * 2 - 1) * this.ball.speed;
    }

    update() {
        if(!this.isPlaying) return;

        // Lógica Teclado
        if (this.keys.up) this.playerY -= 10;
        if (this.keys.down) this.playerY += 10;

        // Límites Jugador
        if(this.playerY < 0) this.playerY = 0;
        if(this.playerY > this.canvas.height - this.paddleHeight) this.playerY = this.canvas.height - this.paddleHeight;

        // Mover bola
        this.ball.x += this.ball.dx;
        this.ball.y += this.ball.dy;

        // Rebote paredes
        if(this.ball.y < 0 || this.ball.y > this.canvas.height) {
            this.ball.dy *= -1;
            this.audio.playTone(200, 'square', 0.05);
        }

        // IA predictiva — predice dónde llegará la bola
        const aiSpeed  = 5 + this.difficulty;
        let targetY;
        if(this.ball.dx > 0) {
            // Bola yendo hacia la IA — predecir rebotes
            let bx = this.ball.x, by = this.ball.y, bdx = this.ball.dx, bdy = this.ball.dy;
            const aiX = this.canvas.width - this.paddleWidth - 20;
            let steps = 0;
            while(bx < aiX && steps < 200) {
                bx += bdx; by += bdy; steps++;
                if(by < 0)                        { by = -by; bdy = -bdy; }
                if(by > this.canvas.height)        { by = 2*this.canvas.height - by; bdy = -bdy; }
            }
            // Añadir error humano proporcional a la dificultad
            const errorRange = Math.max(0, 40 - this.difficulty * 8);
            const error = (Math.random() - 0.5) * errorRange;
            // En modo CHAOS la IA comete más errores
            const chaosError = this.mode === 'CHAOS' ? (Math.random()-0.5)*60 : 0;
            targetY = by + error + chaosError;
        } else {
            // Bola alejándose — volver al centro gradualmente
            targetY = this.canvas.height / 2;
        }

        const centerPaddle = this.aiY + this.paddleHeight / 2;
        const diff = targetY - centerPaddle;
        if(Math.abs(diff) > 4) {
            this.aiY += Math.sign(diff) * Math.min(aiSpeed, Math.abs(diff));
        }

        if(this.aiY < 0) this.aiY = 0;
        if(this.aiY > this.canvas.height - this.paddleHeight) this.aiY = this.canvas.height - this.paddleHeight;

        // Colisión Jugador
        if(this.ball.x < 20 + this.paddleWidth) {
            if(this.ball.y > this.playerY && this.ball.y < this.playerY + this.paddleHeight) {
                this.ball.dx *= this.mode==="CHAOS" ? -1.22 : -1.1;
                this.ball.x = 20 + this.paddleWidth; 
                this.audio.playTone(400, 'square', 0.1);
                if(window.app && window.app.canvas) window.app.canvas.explode(this.ball.x, this.ball.y, '#00ff00');
            } else if (this.ball.x < 0) {
                this.lives--;
                this.audio.playLose();
                // ELIMINADO EL FLASH QUE CAUSABA EL CRASH
                if(this.lives <= 0) {
                    this.end();
                } else {
                    this.resetBall();
                }
            }
        }

        // Colisión IA
        if(this.ball.x > this.canvas.width - 20 - this.paddleWidth) {
            if(this.ball.y > this.aiY && this.ball.y < this.aiY + this.paddleHeight) {
                this.ball.dx *= this.mode==="CHAOS" ? -1.22 : -1.1;
                this.ball.x = this.canvas.width - 20 - this.paddleWidth;
                this.audio.playTone(300, 'square', 0.1);
            } else if (this.ball.x > this.canvas.width) {
                this.score++;
                this.difficulty += 0.3;
                this.audio.playWin(5);
                if(window.app && window.app.canvas) window.app.canvas.explode(this.ball.x, this.ball.y, '#fbbf24');
                this.resetBall();
            }
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.beginPath();
        this.ctx.setLineDash([10, 15]);
        this.ctx.moveTo(this.canvas.width / 2, 0);
        this.ctx.lineTo(this.canvas.width / 2, this.canvas.height);
        this.ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        this.ctx.stroke();
        this.ctx.setLineDash([]);

        this.ctx.fillStyle = '#00ff00'; 
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#00ff00';
        this.ctx.fillRect(20, this.playerY, this.paddleWidth, this.paddleHeight);

        this.ctx.fillStyle = '#ef4444'; 
        this.ctx.shadowColor = '#ef4444';
        this.ctx.fillRect(this.canvas.width - 20 - this.paddleWidth, this.aiY, this.paddleWidth, this.paddleHeight);

        this.ctx.beginPath();
        this.ctx.fillStyle = '#fff';
        this.ctx.shadowColor = '#fff';
        this.ctx.arc(this.ball.x, this.ball.y, this.ballSize, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = "rgba(255,255,255,0.8)";
        this.ctx.font = "bold 40px 'Courier New'";
        this.ctx.textAlign = "center";
        this.ctx.shadowBlur = 0;
        this.ctx.fillText(this.score, this.canvas.width / 2, 50);
        
        let hearts = "";
        for(let i=0; i<this.lives; i++) hearts += "❤ ";
        this.ctx.font = "20px Arial";
        this.ctx.fillStyle = "#ef4444";
        this.ctx.fillText(hearts, this.canvas.width / 2, 80);
    }

    loop() {
        if(!this.isPlaying) return;
        this.update();
        this.draw();
        this.animationId = requestAnimationFrame(() => this.loop());
    }

    pause() {
        if(!this.isPlaying) return;
        this._wasPaused = true;
        cancelAnimationFrame(this.animationId);
        this.animationId = null;
    }
    resume() {
        if(!this._wasPaused) return;
        this._wasPaused = false;
        if(this.isPlaying) this.animationId = requestAnimationFrame(() => this.loop());
    }


    end() {
        this.isPlaying = false;
        this.cleanup();
        // Ahora esto invocará la tarjeta automáticamente gracias al cambio en main.js
        if(this.onGameOver) this.onGameOver(this.score);
    }

    cleanup() {
        this.canvas.removeEventListener('mousemove', this.moveHandler);
        this.canvas.removeEventListener('touchmove', this.touchHandler);
        window.removeEventListener('keydown', this.keyDownHandler);
        window.removeEventListener('keyup', this.keyUpHandler);
        cancelAnimationFrame(this.animationId);
        // Reanudar el fondo animado del CanvasManager
        if (window.app && window.app.canvas) window.app.canvas.resumeBackground();
    }
}