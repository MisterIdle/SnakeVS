const socket = io()
let players = {}
let food = { x: 0, y: 0 }
let me = null

function setup() {
    createCanvas(400, 400)
    frameRate(15)
    socket.on("state", data => {
        players = data.players
        food = data.food
        me = socket.id
    })
}

function draw() {
    background(0)
    drawCell(food.x, food.y, color(255, 0, 0))
    for (let id in players) {
        const snake = players[id]
        for (let i = 0; i < snake.tail.length; i++) {
            const c = id === me ? color(0, 255, 0) : color(0, 0, 255)
            drawCell(snake.tail[i].x, snake.tail[i].y, c)
        }
    }
}

function drawCell(x, y, col) {
    fill(col)
    rect(x * 10, y * 10, 10, 10)
}

function keyPressed() {
    if (keyCode === UP_ARROW) socket.emit("dir", { x: 0, y: -1 })
    else if (keyCode === DOWN_ARROW) socket.emit("dir", { x: 0, y: 1 })
    else if (keyCode === LEFT_ARROW) socket.emit("dir", { x: -1, y: 0 })
    else if (keyCode === RIGHT_ARROW) socket.emit("dir", { x: 1, y: 0 })
}
