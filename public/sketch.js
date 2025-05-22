const socket = io()
let players = {}
let food = { x: 0, y: 0 }
let me = null
let currentDir = { x: 1, y: 0 }
let score = 0

const GameState = {
    MENU: "menu",
    PLAYING: "playing",
    GAME_OVER: "gameOver"
}

let gameState = GameState.MENU

function setup() {
    let canvas = createCanvas(400, 400)
    canvas.parent("canvas-container")
    frameRate(20)

    socket.on("state", data => {
        players = data.players
        food = data.food
        me = socket.id
        if (players[me]) {
            score = players[me].score
            updateScore()
        }
        updatePlayersList()
    })

    socket.on("dead", id => {
        delete players[id]
    })
}

function draw() {
    background(20)

    switch (gameState) {
        case GameState.MENU:
            drawMenu()
            break
        case GameState.PLAYING:
            drawGame()
            break
        case GameState.GAME_OVER:
            drawGameOver()
            break
    }
}

function drawMenu() {
    fill(255)
    textAlign(CENTER, CENTER)
    textSize(24)
    text("Snake Multiplayer\nAppuie sur ENTER pour jouer", width / 2, height / 2)
}

function drawGameOver() {
    fill(255, 0, 0)
    textAlign(CENTER, CENTER)
    textSize(24)
    text("Game Over\nENTER pour recommencer", width / 2, height / 2)
}

function drawGame() {
    update()
    drawCell(food.x, food.y, color(255, 0, 0), true)

    for (let id in players) {
        const snake = players[id]
        const col = id === me ? color(0, 255, 0) : color(0, 0, 255)
        for (let segment of snake.tail) {
            drawCell(segment.x, segment.y, col)
        }
    }
}

function update() {
    if (!me || !players[me]) return

    const mySnake = players[me]

    if (checkHeadToHeadCollision(mySnake, players)) {
        const lateral = getLateralDirection(currentDir)
        socket.emit("dir", lateral)
        currentDir = lateral
        return
    }

    if (checkCollision(mySnake, players)) {
        socket.emit("dead", me)
        delete players[me]
        gameState = GameState.GAME_OVER
        return
    }
}


function updateScore() {
    const board = document.getElementById("scoreboard")
    board.innerText = `Score: ${score}`
}

function drawCell(x, y, col, isFood = false) {
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
        // Glow effect
        drawingContext.shadowColor = col.levels ? col : color(col)
        drawingContext.shadowBlur = 8
    }
    pop()
}


function keyPressed() {
    if (gameState === GameState.MENU || gameState === GameState.GAME_OVER) {
        if (keyCode === ENTER) {
            socket.emit("join")
            gameState = GameState.PLAYING
            score = 0
            updateScore()
        }
        return
    }

    let newDir = null
    if (keyCode === UP_ARROW) newDir = { x: 0, y: -1 }
    else if (keyCode === DOWN_ARROW) newDir = { x: 0, y: 1 }
    else if (keyCode === LEFT_ARROW) newDir = { x: -1, y: 0 }
    else if (keyCode === RIGHT_ARROW) newDir = { x: 1, y: 0 }

    if (newDir) {
        if (newDir.x !== -currentDir.x || newDir.y !== -currentDir.y) {
            socket.emit("dir", newDir)
            currentDir = newDir
        }
    }
}

function checkHeadToHeadCollision(snake, allPlayers) {
    const head = snake.tail[0]
    for (let id in allPlayers) {
        if (id === me) continue
        const otherHead = allPlayers[id].tail[0]
        if (head.x === otherHead.x && head.y === otherHead.y) return true
    }
    return false
}

function getLateralDirection(dir) {
    const options = dir.x !== 0
        ? [{ x: 0, y: -1 }, { x: 0, y: 1 }]
        : [{ x: -1, y: 0 }, { x: 1, y: 0 }]
    return random(options)
}

function checkCollision(snake, allPlayers) {
    const head = snake.tail[0]
    for (let id in allPlayers) {
        const body = allPlayers[id].tail
        const limit = id === me ? 1 : 0
        for (let i = limit; i < body.length; i++) {
            if (body[i].x === head.x && body[i].y === head.y) return true
        }
    }
    return false
}

function updatePlayersList() {
    const listDiv = document.getElementById("players-list")
    const playersArray = Object.entries(players)
        .map(([id, player]) => ({
            id,
            score: player.score || 0,
            isMe: id === me
        }))
        .sort((a, b) => b.score - a.score)

    listDiv.innerHTML = playersArray.map(p =>
        `<div${p.isMe ? ' style="font-weight:bold"' : ''}>` +
        `Joueur ${p.id.substring(0, 5)} : ${p.score}` +
        `</div>`
    ).join("")
}

