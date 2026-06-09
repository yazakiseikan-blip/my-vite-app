import { useState } from 'react'
import { useStore } from '../store/useStore'

export default function OrderForm() {
  const events = useStore(s => s.events)
  const setEvents = useStore(s => s.setEvents)
  const setScreenMode = useStore(s => s.setScreenMode)

  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [machine, setMachine] = useState('A') // ← ★設備

  
const importCsv = (event) => {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()

  reader.onload = (e) => {
    const text = e.target.result

    const lines = text
      .replace(/\r/g, '')
      .split('\n')
      .filter(line => line.trim() !== '')

      

const newEvents = lines.slice(1).map((line, index) => {
  const cols = line.split(',')

  return {
    id: Date.now() + index,
    title: cols[0],
    start: new Date(cols[1]).toISOString(),
    end: new Date(cols[2]).toISOString(),
    machine: cols[3] || 'A',
    changeCount: 0,
    logs: []
  }
})

console.log(newEvents)

setEvents([...events, ...newEvents])

  }

  reader.readAsText(file)
}

const addEvent = () => {
  if (!title || !date) return

  const startDate = new Date(date)
  const endDate = new Date(startDate)

  // 仮：1時間の長さ
  endDate.setHours(endDate.getHours() + 1)

  const newEvent = {
    id: Date.now(),
    title,

    start: startDate.toISOString(),   // ← ★これに変える
    end: endDate.toISOString(),       // ← ★これに変える

    machine,

    changeCount: 0,
    logs: []
  }

  setEvents([...events, newEvent])

  setTitle('')
  setDate('')
  setMachine('A')
}

  return (
    <div>
      <h2>入力画面</h2>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="タイトル"
      />

      <input
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      {/* ★ここが設備選択 */}
      <select
        value={machine}
        onChange={(e) => setMachine(e.target.value)}
      >
        <option value="A">設備A</option>
        <option value="B">設備B</option>
        <option value="C">設備C</option>
      </select>

      <br />

      <button onClick={addEvent}>
        イベント追加
      </button>

      
      <button onClick={() => setScreenMode('gantt')}>
       ガントへ
      </button>
      
      <input
        type="file"
        accept=".csv"
        onChange={importCsv}
       />

      <button onClick={() => setScreenMode('gantt')}>
        ガントへ
      </button>
    </div>
  )
}
``