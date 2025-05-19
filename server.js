const express = require('express')
const sqlite3 = require('sqlite3').verbose()
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const path = require('path')

const app = express()
const SECRET = 'secret_key'

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

app.listen(3000, () => console.log('http://localhost:3000'))
