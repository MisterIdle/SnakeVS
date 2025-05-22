const express = require('express')
const sqlite3 = require('sqlite3').verbose()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const path = require('path')
const http = require('http')
const { Server } = require('socket.io')

const SECRET = 'secret_key'

class UserController {
    constructor(app, db) {
        this.app = app
        this.db = db
        this.setupRoutes()
    }

    setupRoutes() {
        this.app.post('/register', this.register.bind(this))
        this.app.post('/login', this.login.bind(this))
    }

    async register(req, res) {
        const { username, email, password, confirmPassword } = req.body
        if (!username || !email || !password || !confirmPassword)
            return res.status(400).send('Missing fields')
        if (password !== confirmPassword)
            return res.status(400).send('Passwords do not match')

        const hash = await bcrypt.hash(password, 10)
        this.db.run(
            `INSERT INTO users (username, email, password) VALUES (?, ?, ?)`,
            [username, email, hash],
            function (err) {
                if (err) return res.status(400).send('User exists or DB error')
                res.status(201).send('Registered')
            }
        )
    }

    async login(req, res) {
        const { email, password } = req.body
        this.db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
            if (err || !user) return res.status(400).send('Invalid credentials')
            const match = await bcrypt.compare(password, user.password)
            if (!match) return res.status(400).send('Invalid credentials')
            const token = jwt.sign({ id: user.id, username: user.username }, SECRET)
            res.json({ token })
        })
    }
}

class Game {
    constructor(io) {
        this.io = io
        this.players = {}
        this.food = this.spawnFood()
        this.setupSocket()
        this.startGameLoop()
    }

    spawnFood() {
        return { x: Math.floor(Math.random() * 40), y: Math.floor(Math.random() * 40) }
    }

    spawnNewSnake() {
        const x = Math.floor(Math.random() * 40)
        const y = Math.floor(Math.random() * 40)
        return {
            x,
            y,
            dir: { x: 1, y: 0 },
            tail: [{ x, y }],
            score: 0
        }
    }

    setupSocket() {
        this.io.on('connection', socket => {
            socket.on('join', () => {
                this.players[socket.id] = this.spawnNewSnake()
            })

            socket.on('dir', dir => {
                if (this.players[socket.id]) this.players[socket.id].dir = dir
            })

            socket.on('dead', id => {
                delete this.players[id]
                this.io.emit('dead', id)
            })

            socket.on('disconnect', () => {
                delete this.players[socket.id]
            })
        })
    }

    startGameLoop() {
        setInterval(() => {
            for (let id in this.players) {
                const p = this.players[id]
                if (!p) continue

                p.x = (p.x + p.dir.x + 40) % 40
                p.y = (p.y + p.dir.y + 40) % 40
                p.tail.unshift({ x: p.x, y: p.y })

                if (p.x === this.food.x && p.y === this.food.y) {
                    this.food = this.spawnFood()
                    p.score++
                } else {
                    p.tail.pop()
                }
            }

            this.io.emit("state", {
                players: Object.fromEntries(Object.entries(this.players).map(([id, p]) => [
                    id,
                    { x: p.x, y: p.y, score: p.score, tail: p.tail }
                ])),
                food: this.food
            })
        }, 80)
    }
}

class ServerApp {
    constructor() {
        this.app = express()
        this.server = http.createServer(this.app)
        this.io = new Server(this.server)
        this.db = new sqlite3.Database('./data.db')

        this.setupMiddlewares()
        this.setupDatabase()
        this.setupControllers()
        this.setupGame()
        this.listen()
    }

    setupMiddlewares() {
        this.app.use(express.static(path.join(__dirname, 'public')))
        this.app.use(express.json())

        // Pour loguer les requêtes entrantes
        this.app.use((req, res, next) => {
            console.log(`Request received: ${req.method} ${req.url}`)
            next()
        })
    }

    setupDatabase() {
        this.db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            email TEXT UNIQUE,
            password TEXT
        )`)
    }

    setupControllers() {
        new UserController(this.app, this.db)
    }

    setupGame() {
        new Game(this.io)
    }

    listen() {
        this.server.listen(3000, () => console.log('http://localhost:3000'))
    }
}

new ServerApp()
