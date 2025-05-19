const socket = io()
let players = {}
let food = { x: 0, y: 0 }
let me = null
let currentDir = { x: 0, y: 0 }

const GameState = {
    MENU: "menu",
    PLAYING: "playing",
    GAME_OVER: "gameOver"
}

let gameState = GameState.MENU

function setup() {
    createCanvas(400, 400)
    frameRate(60)

    socket.on("state", data => {
        players = data.players
        food = data.food
        me = socket.id
    })

    socket.on("dead", id => {
        delete players[id]
    })
}

function draw() {
    background(0)

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
    text("Main Menu\nPress ENTER to Join", width / 2, height / 2)
}

function drawGame() {
    update()
    drawCell(food.x, food.y, color(255, 0, 0))

    for (let id in players) {
        const snake = players[id]
        const col = id === me ? color(0, 255, 0) : color(0, 0, 255)
        for (let segment of snake.tail) {
            drawCell(segment.x, segment.y, col)
        }
    }
}

function drawGameOver() {
    fill(255, 0, 0)
    textAlign(CENTER, CENTER)
    textSize(24)
    text("Game Over\nPress ENTER to Restart", width / 2, height / 2)
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
    }
}

function checkHeadToHeadCollision(snake, allPlayers) {
    const head = snake.tail[0]
    for (let id in allPlayers) {
        if (id === me) continue
        const otherHead = allPlayers[id].tail[0]
        if (head.x === otherHead.x && head.y === otherHead.y) {
            return true
        }
    }
    return false
}

function getLateralDirection(dir) {
    const options = []
    if (dir.x !== 0) {
        options.push({ x: 0, y: -1 }, { x: 0, y: 1 })
    } else if (dir.y !== 0) {
        options.push({ x: -1, y: 0 }, { x: 1, y: 0 })
    }
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

function drawCell(x, y, col) {
    fill(col)
    rect(x * 10, y * 10, 10, 10)
}

function keyPressed() {
    if (gameState === GameState.MENU || gameState === GameState.GAME_OVER) {
        if (keyCode === ENTER) {
            socket.emit("join")
            gameState = GameState.PLAYING
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
