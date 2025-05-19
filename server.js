const express = require('express')
const sqlite3 = require('sqlite3').verbose()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const path = require('path')

const http = require('http')
const { Server } = require('socket.io')

const app = express()
const SECRET = 'secret_key'

const server = http.createServer(app)
const io = new Server(server)

const db = new sqlite3.Database('./data.db')

app.use(express.static(path.join(__dirname, 'public')))
app.use(express.json())

db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    email TEXT UNIQUE,
    password TEXT
)`)

app.post('/register', async (req, res) => {
    const { username, email, password, confirmPassword } = req.body
    if (!username || !email || !password || !confirmPassword)
        return res.status(400).send('Missing fields')
    if (password !== confirmPassword)
        return res.status(400).send('Passwords do not match')

    const hash = await bcrypt.hash(password, 10)
    db.run(`INSERT INTO users (username, email, password) VALUES (?, ?, ?)`,
        [username, email, hash], function(err) {
            if (err) return res.status(400).send('User exists or DB error')
            res.status(201).send('Registered')
        })
})

app.post('/login', (req, res) => {
    const { email, password } = req.body
    db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
        if (err || !user) return res.status(400).send('Invalid credentials')
        const match = await bcrypt.compare(password, user.password)
        if (!match) return res.status(400).send('Invalid credentials')
        const token = jwt.sign({ id: user.id, username: user.username }, SECRET)
        res.json({ token })
    })
})

let players = {}
let food = { x: Math.floor(Math.random() * 40), y: Math.floor(Math.random() * 40) }

io.on("connection", socket => {
    const startX = Math.floor(Math.random() * 40)
    const startY = Math.floor(Math.random() * 40)
    players[socket.id] = {
        id: socket.id,
        x: startX,
        y: startY,
        dir: { x: 1, y: 0 },
        tail: [{ x: startX, y: startY }]
    }

    socket.on("dir", dir => {
        players[socket.id].dir = dir
    })

    socket.on("disconnect", () => {
        delete players[socket.id]
    })
})


setInterval(() => {
    for (let id in players) {
        const player = players[id]
        player.x = (player.x + player.dir.x + 40) % 40
        player.y = (player.y + player.dir.y + 40) % 40
        player.tail.unshift({ x: player.x, y: player.y })
        if (player.x === food.x && player.y === food.y) {
            food = { x: Math.floor(Math.random() * 40), y: Math.floor(Math.random() * 40) }
        } else {
            player.tail.pop()
        }
    }
    io.emit("state", { players, food })
}, 100)


server.listen(3000, () => console.log('http://localhost:3000'))
