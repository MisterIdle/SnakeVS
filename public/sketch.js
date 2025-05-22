// Snake Multiplayer Game (P.O.O. Version)

class Game {
    constructor(socket) {
        this.socket = socket
        this.players = {}
        this.food = { x: 0, y: 0 }
        this.me = null
        this.currentDir = { x: 1, y: 0 }
        this.score = 0
        this.state = GameState.MENU
        this.setupSocket()
    }

    setupSocket() {
        this.socket.on("state", data => {
            this.players = data.players
            this.food = data.food
            this.me = this.socket.id
            if (this.players[this.me]) {
                this.score = this.players[this.me].score
                UI.updateScore(this.score)
            }
            UI.updatePlayersList(this.players, this.me)
        })

        this.socket.on("dead", id => {
            delete this.players[id]
        })
    }

    update() {
        if (!this.me || !this.players[this.me]) return
        const mySnake = this.players[this.me]

        if (Collision.checkHeadToHead(mySnake, this.players, this.me)) {
            const lateral = Direction.getLateral(this.currentDir)
            this.socket.emit("dir", lateral)
            this.currentDir = lateral
            return
        }

        if (Collision.check(this.players[this.me], this.players, this.me)) {
            this.socket.emit("dead", this.me)
            delete this.players[this.me]
            this.state = GameState.GAME_OVER
        }
    }

    draw() {
        background(20)
        switch (this.state) {
            case GameState.MENU:
                UI.drawMenu()
                break
            case GameState.PLAYING:
                this.update()
                UI.drawGame(this.players, this.food, this.me)
                break
            case GameState.GAME_OVER:
                UI.drawGameOver()
                break
        }
    }

    handleKey(keyCode) {
        if (this.state === GameState.MENU || this.state === GameState.GAME_OVER) {
            if (keyCode === ENTER) {
                this.socket.emit("join")
                this.state = GameState.PLAYING
                this.score = 0
                UI.updateScore(this.score)
            }
            return
        }

        let newDir = Direction.fromKey(keyCode)
        if (newDir && (newDir.x !== -this.currentDir.x || newDir.y !== -this.currentDir.y)) {
            this.socket.emit("dir", newDir)
            this.currentDir = newDir
        }
    }
}

const GameState = {
    MENU: "menu",
    PLAYING: "playing",
    GAME_OVER: "gameOver"
}

class UI {
    static drawMenu() {
        fill(255)
        textAlign(CENTER, CENTER)
        textSize(24)
        text("Snake Multiplayer\nAppuie sur ENTER pour jouer", width / 2, height / 2)
    }

    static drawGameOver() {
        fill(255, 0, 0)
        textAlign(CENTER, CENTER)
        textSize(24)
        text("Game Over\nENTER pour recommencer", width / 2, height / 2)
    }

    static drawGame(players, food, me) {
        UI.drawCell(food.x, food.y, color(255, 0, 0), true)

        for (let id in players) {
            const snake = players[id]
            const col = id === me ? color(0, 255, 0) : color(0, 0, 255)
            for (let segment of snake.tail) {
                UI.drawCell(segment.x, segment.y, col)
            }
        }
    }

    static drawCell(x, y, col, isFood = false) {
        push()
        translate(x * 10 + 5, y * 10 + 5)
        if (isFood) {
            let scaleVal = 1 + 0.15 * sin(frameCount * 0.3)
            scale(scaleVal)
            noStroke()
            fill(255, 50, 50)
            ellipse(0, 0, 12, 12)
            stroke(255, 100, 100, 150)
            strokeWeight(2)
            noFill()
            ellipse(0, 0, 16, 16)
        } else {
            noStroke()
            fill(col.levels ? col : color(col))
            rectMode(CENTER)
            rect(0, 0, 10, 10, 3)
            drawingContext.shadowColor = col.levels ? col : color(col)
            drawingContext.shadowBlur = 8
        }
        pop()
    }

    static updateScore(score) {
        document.getElementById("scoreboard").innerText = `Score: ${score}`
    }

    static updatePlayersList(players, me) {
        const listDiv = document.getElementById("players-list")
        const playersArray = Object.entries(players).map(([id, p]) => ({ id, score: p.score || 0, isMe: id === me }))
            .sort((a, b) => b.score - a.score)

        listDiv.innerHTML = playersArray.map(p => `<div${p.isMe ? ' style="font-weight:bold"' : ''}>Joueur ${p.id.substring(0, 5)} : ${p.score}</div>`).join("")
    }
}

class Direction {
    static fromKey(keyCode) {
        if (keyCode === UP_ARROW) return { x: 0, y: -1 }
        if (keyCode === DOWN_ARROW) return { x: 0, y: 1 }
        if (keyCode === LEFT_ARROW) return { x: -1, y: 0 }
        if (keyCode === RIGHT_ARROW) return { x: 1, y: 0 }
        return null
    }

    static getLateral(dir) {
        return random(dir.x !== 0 ? [{ x: 0, y: -1 }, { x: 0, y: 1 }] : [{ x: -1, y: 0 }, { x: 1, y: 0 }])
    }
}

class Collision {
    static check(snake, allPlayers, me) {
        const head = snake.tail[0]
        for (let id in allPlayers) {
            const body = allPlayers[id].tail
            const start = id === me ? 1 : 0
            for (let i = start; i < body.length; i++) {
                if (body[i].x === head.x && body[i].y === head.y) return true
            }
        }
        return false
    }

    static checkHeadToHead(snake, allPlayers, me) {
        const head = snake.tail[0]
        for (let id in allPlayers) {
            if (id === me) continue
            const otherHead = allPlayers[id].tail[0]
            if (head.x === otherHead.x && head.y === otherHead.y) return true
        }
        return false
    }
}

let game

function setup() {
    let canvas = createCanvas(400, 400)
    canvas.parent("canvas-container")
    frameRate(20)
    game = new Game(io())
}

function draw() {
    game.draw()
}

function keyPressed() {
    game.handleKey(keyCode)
}
