const express = require('express')
const cors = require('cors')
const sqlite3 = require('sqlite3').verbose()

const app = express()

app.use(cors())
app.use(express.json())

const db = new sqlite3.Database('production_planner.db')

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT,
      resource_id TEXT,
      title TEXT,
      start_time TEXT,
      end_time TEXT
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS plan_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id TEXT,
      change_type TEXT,
      title TEXT,
      resource_id TEXT,
      start_time TEXT,
      end_time TEXT,
      changed_at TEXT
    )
  `)
})

app.post('/U', (req, res) => {
  const { events, changeHistory } = req.body

  db.serialize(() => {
    db.run('DELETE FROM plans')

    const planStmt = db.prepare(`
      INSERT INTO plans (
        event_id,
        resource_id,
        title,
        start_time,
        end_time
      ) VALUES (?, ?, ?, ?, ?)
    `)

    events.forEach(event => {
      planStmt.run(
        event.id,
        event.resourceId,
        event.title,
        event.start,
        event.end
      )
    })

    planStmt.finalize()

    const historyStmt = db.prepare(`
      INSERT INTO plan_history (
        event_id,
        change_type,
        title,
        resource_id,
        start_time,
        end_time,
        changed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    changeHistory.forEach(history => {
      historyStmt.run(
        history.eventId,
        history.type,
        history.title,
        history.resourceId || '',
        history.start,
        history.end,
        history.changedAt
      )
    })

    historyStmt.finalize()
  })

console.log('SQLiteに保存しました')

res.json({
  success: true,
  message: 'SQLiteに保存しました'
})

})

app.get('/plans', (req, res) => {

  db.all('SELECT * FROM plans', (err, rows) => {

    if (err) {
      res.status(500).json(err)
      return
    }

    res.json(rows)

  })

})

app.listen(3001, () => {
  console.log('API起動 http://localhost:3001')
})