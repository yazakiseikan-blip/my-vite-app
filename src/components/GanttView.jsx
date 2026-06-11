import { useState, useEffect } from "react"
import FullCalendar from "@fullcalendar/react"
import resourceTimelinePlugin from "@fullcalendar/resource-timeline"
import interactionPlugin from "@fullcalendar/interaction"
import jaLocale from "@fullcalendar/core/locales/ja"
import { useStore } from "../store/useStore"

export default function GanttView() {
  const events = useStore(s => s.events)
  const setEvents = useStore(s => s.setEvents)
  const setScreenMode = useStore(s => s.setScreenMode)
  const dailyNoCount = new Set(
    events.map(e => e.dailyNo).filter(Boolean)
  ).size

  const [history, setHistory] = useState([])
  const [redoStack, setRedoStack] = useState([])
  const [selected, setSelected] = useState(null)

  const resourceMaster = {
    MC: ["MC11", "MC12", "MC13", "MC09", "110"],
    ラジアル: ["ラジアル"],
    研磨: ["研磨"],
    放電: ["放電新", "放電旧"],
    ワイヤ: ["ワイヤ"],
    HW: [
      "LAS溶接",
      "TIG溶接",
      "溶接(アーク・ﾛｳ付け)",
      "開先",
      "バラシ・組付",
      "ミガキ"
    ],
    CAM: ["3Dデータ作成・設計", "PRG作成"],
    検査: ["ATOS", "三次元"],
    出荷前確認: ["出荷前確認"],
    その他: ["打ち合わせ"]
  }

  const groupOrder = [
    "MC",
    "ラジアル",
    "研磨",
    "放電",
    "ワイヤ",
    "HW",
    "CAM",
    "検査",
    "出荷前確認",
    "その他"
  ]

  const resources = groupOrder.flatMap((group, groupIndex) =>
    (resourceMaster[group] || []).map((id, index) => ({
      id,
      title: `${group} - ${id}`,
      sortOrder: groupIndex * 100 + index
    }))
  )

  useEffect(() => {
    console.log("最終events:", events)
  }, [events])

  const clean = (str) => {
    return str
      ?.replace(/^"+|"+$/g, "")
      .replace(/\r/g, "")
      .replace(/\n/g, "")
      .trim()
  }

  const ensureEnd = (start, end) => {
    if (!end || start === end) {
      const d = new Date(start)
      d.setDate(d.getDate() + 1)
      return d.toISOString().split("T")[0]
    }
    return end
  }

  const importMultiOrderCsv = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    let loaded = false

    reader.onload = (e) => {
      if (loaded) return
      loaded = true

      const lines = e.target.result
        .replace(/\r/g, "")
        .split("\n")
        .filter(l => l.trim())

      const data = lines.slice(1)

      const newEvents = data
        .map((line, index) => {
          const c = line
            .replace(/^"+|"+$/g, "")
            .split(",")
            .map(v => v.trim())

          const rawStart = clean(c[2] || "")
          const work = parseFloat(clean(c[3] || "1"))

          let fixedStart = rawStart.replace(/\//g, "-")
          fixedStart = fixedStart.split(" ")[0]

          const parts = fixedStart.split("-")
          let start

          if (parts.length === 3) {
            const y = parts[0]
            const m = String(parts[1]).padStart(2, "0")
            const d = String(parts[2]).padStart(2, "0")
            start = `${y}-${m}-${d}`
          } else {
            const tmp = new Date()
            tmp.setDate(tmp.getDate() + 1)
            start = tmp.toISOString().split("T")[0]
          }

          const calcEnd = (start, work) => {
            const base = new Date(start + "T00:00:00")

            if (isNaN(base)) {
              console.error("日付壊れてる", start)
              return start
            }

            const days = work / 10
            const endDate = new Date(base.getTime() + days * 86400000)

            return endDate.toISOString()
          }

          return {
            id: Date.now() + "-" + index,
            dailyNo: clean(c[0]),
            title: `${clean(c[0])} ${clean(c[1])}`,
            process: clean(c[1]),
            work: work,
            order: index,
            resourceId: clean(c[4]).trim() || "A",
            actualMachine: null,
            start: start + "T00:00:00",
            end: calcEnd(start, work)
          }
        })
        .filter(e => e !== null)

      setEvents(prev => {
        const existing = new Set(
          prev.map(e => `${e.dailyNo}_${e.start}_${e.resourceId}`)
        )

        const filtered = newEvents.filter(e =>
          !existing.has(`${e.dailyNo}_${e.start}_${e.resourceId}`)
        )

        if (filtered.length === 0) {
          alert("追加対象のデータはありませんでした")
          return prev
        }

        // 日報番号の重複を除いて件数を数える
        const dailyNoCount = new Set(
          filtered.map(e => e.dailyNo)
        ).size

        alert(`日報番号 ${dailyNoCount}件 取り込みました`)
        return [...prev, ...filtered]
      })
    }

    reader.readAsText(file, "UTF-8")
    event.target.value = ""
  }

  const copyEvent = (eventObj) => {
    const base = events.find(e => e.id === eventObj.id)
    if (!base) return
    if (!base.start) return

    const nextStart = base.end || base.start
    const step = events.filter(e => e.groupId === base.groupId).length + 1

    const newEvent = {
      ...base,
      id: Date.now().toString(),
      title: `${base.title}(${step})`,
      start: nextStart,
      end: nextStart
    }

    setHistory(prev => [...prev, { type: "copy", after: newEvent }])
    setEvents(prev => [...prev, newEvent])
    setRedoStack([])
  }

  const undoLast = () => {
    const last = history[history.length - 1]
    if (!last) {
      alert("戻れる履歴がありません")
      return
    }

    setRedoStack(prev => [...prev, last])

    if (last.type === "delete") {
      setEvents(prev => [...prev, last.before])
    }

    if (last.type === "copy") {
      setEvents(prev => prev.filter(e => e.id !== last.after.id))
    }

    if (last.type === "move") {
      setEvents(prev =>
        prev.map(ev =>
          ev.id === last.id
            ? {
              ...ev,
              start: last.before.start,
              end: last.before.end,
              resourceId: last.before.resourceId
            }
            : ev
        )
      )
    }

    setHistory(prev => prev.slice(0, -1))
  }

const deleteEvent = (id) => {
  setEvents(prev => {
    const target = prev.find(e => e.id === id)
    if (!target) return prev

    setHistory(h => [...h, {
      type: "delete",
      before: structuredClone(target)
    }])

    setRedoStack([])
    return prev.filter(e => e.id !== id)
  })
}

  const redoLast = () => {
    const last = redoStack[redoStack.length - 1]
    if (!last) return

    if (last.type === "copy") {
      setEvents(prev => [...prev, last.after])
    }

    if (last.type === "delete") {
      setEvents(prev => prev.filter(e => e.id !== last.before.id))
    }

    if (last.type === "move") {
      setEvents(prev =>
        prev.map(ev =>
          ev.id === last.id
            ? {
              ...ev,
              start: last.after.start,
              end: last.after.end,
              resourceId: last.after.resourceId
            }
            : ev
        )
      )
    }

    setHistory(prev => [...prev, last])
    setRedoStack(prev => prev.slice(0, -1))
  }

  const moveUp = (id) => {
    setEvents(prev => {
      const target = prev.find(e => e.id === id)
      if (!target) return prev

      const same = prev
        .filter(e => e.dailyNo === target.dailyNo)
        .sort((a, b) => a.order - b.order)

      const index = same.findIndex(e => e.id === id)
      if (index <= 0) return prev

      const upper = same[index - 1]

      const updated = prev.map(e => {
        if (e.id === target.id) return { ...e, order: upper.order }
        if (e.id === upper.id) return { ...e, order: target.order }
        return e
      })

      return updated.map(e => {
        if (e.id === target.id) return { ...e, start: upper.start }
        if (e.id === upper.id) return { ...e, start: target.start }
        return e
      })
    })
  }

const moveDown = (id) => {
  setEvents(prev => {
    const target = prev.find(e => e.id === id)
    if (!target) return prev

    const same = prev
      .filter(e => e.dailyNo === target.dailyNo)
      .sort((a, b) => a.order - b.order)

    const index = same.findIndex(e => e.id === id)
    if (index === -1 || index >= same.length - 1) return prev

    const lower = same[index + 1]

    return prev.map(e => {
      if (e.id === target.id) {
        return {
          ...e,
          order: lower.order,
          start: lower.start
        }
      }

      if (e.id === lower.id) {
        return {
          ...e,
          order: target.order,
          start: target.start
        }
      }

      return e
    })
  })
}

  const exportHistory = () => {
    const header = [
      "操作",
      "ID",
      "変更前_開始",
      "変更前_終了",
      "変更前_設備",
      "変更後_開始",
      "変更後_終了",
      "変更後_設備"
    ]

    const rows = history.map(h => {
      if (h.type === "move") {
        return [
          "移動",
          h.id,
          h.before?.start || "",
          h.before?.end || "",
          h.before?.resourceId || "",
          h.after?.start || "",
          h.after?.end || "",
          h.after?.resourceId || ""
        ]
      }

      if (h.type === "copy") {
        return [
          "コピー",
          h.after?.id || "",
          "",
          "",
          "",
          h.after?.start || "",
          h.after?.end || "",
          h.after?.resourceId || ""
        ]
      }

      if (h.type === "delete") {
        return [
          "削除",
          h.before?.id || "",
          h.before?.start || "",
          h.before?.end || "",
          h.before?.resourceId || "",
          "",
          "",
          ""
        ]
      }

      return []
    })

    const csv = [
      header.join(","),
      ...rows.map(r => r.join(","))
    ].join("\n")

    const blob = new Blob(
      [new Uint8Array([0xef, 0xbb, 0xbf]), csv],
      { type: "text/csv;charset=utf-8;" }
    )

    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")

    a.href = url
    a.download = `gantt_history_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()

    URL.revokeObjectURL(url)

    alert("計画を確定しました（履歴CSV出力済み）")
  }

  const saveJson = () => {
    const json = JSON.stringify(events, null, 2)

    const blob = new Blob([json], {
      type: "application/json"
    })

    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")

    a.href = url
    a.download = `工程ガント_${new Date().toISOString().slice(0, 10)}.json`
    a.click()

    URL.revokeObjectURL(url)

    alert("JSONを保存しました")
  }

  const loadJson = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result)

        if (!Array.isArray(data)) {
          alert("JSON形式が正しくありません")
          return
        }

        setEvents(data)
        alert(`${data.length}工程を読み込みました`)
      } catch (error) {
        alert("JSONの読み込みに失敗しました")
      }
    }

    reader.readAsText(file, "UTF-8")
    event.target.value = ""
  }

  const handleEventDrop = (info) => {
    const movedEvent = info.event
    const before = events.find(ev => ev.id === movedEvent.id)
    if (!before) return

    const newResourceId =
      movedEvent.getResources()?.[0]?.id || before.resourceId

    const newStart = movedEvent.startStr
    const newEnd = movedEvent.endStr || ensureEnd(newStart, newStart)

    const movedAfter = {
      ...before,
      start: newStart,
      end: newEnd,
      resourceId: newResourceId
    }

    const sameDailyEvents = events
      .filter(e => e.dailyNo === before.dailyNo && e.id !== before.id)
      .concat(movedAfter)
      .sort((a, b) => a.order - b.order)

    for (let i = 0; i < sameDailyEvents.length - 1; i++) {
      const current = sameDailyEvents[i]
      const next = sameDailyEvents[i + 1]

      const currentStart = new Date(current.start)
      const nextStart = new Date(next.start)

      if (currentStart > nextStart) {
        alert(
          `工程順序が逆転するため、ドラッグ移動できません。\n\n` +
          `前工程：${current.process}\n` +
          `次工程：${next.process}\n\n` +
          `順番を変更したい場合は、右側パネルの ▲ ▼ を使用してください。`
        )

        info.revert()
        return
      }
    }

    setHistory(prev => [
      ...prev,
      {
        type: "move",
        id: movedEvent.id,
        time: new Date().toISOString(),
        before,
        after: {
          start: newStart,
          end: newEnd,
          resourceId: newResourceId
        }
      }
    ])

    setEvents(prev =>
      prev.map(ev =>
        ev.id === movedEvent.id
          ? {
            ...ev,
            start: newStart,
            end: newEnd,
            resourceId: newResourceId
          }
          : ev
      )
    )

    setRedoStack([])
  }

  const handleEventDidMount = (info) => {
    const e = info.event

    const toDate = (str) =>
      new Date(str).toLocaleDateString("sv-SE")

    const today = toDate(new Date())
    const startDate = toDate(e.start)

    const isCompleted =
      e.extendedProps.isCompleted ?? false

    const logs =
      e.extendedProps.workLogs || []

    const lastLog =
      logs.length > 0
        ? logs[logs.length - 1]
        : null

    const isWorking =
      lastLog &&
      !lastLog.end &&
      !isCompleted

    const isDelayed =
      !isCompleted &&
      !isWorking &&
      startDate <= today

    // 共通
    info.el.style.borderRadius = "8px"
    info.el.style.border = "none"
    info.el.style.boxShadow =
      "0 4px 10px rgba(0,0,0,0.18)"
    info.el.style.fontWeight = "800"
    info.el.style.padding = "2px 4px"
    info.el.style.minWidth = "90px"

    // いったんリセット
    info.el.style.animation = "none"

    // ✅ 完了
    if (isCompleted) {
      info.el.style.background = "#16a34a"
      info.el.style.color = "#fff"
      return
    }

    // ✅ 着手中
    if (isWorking) {
      info.el.style.background = "#2563eb"
      info.el.style.color = "#fff"
      info.el.style.animation = "blink 1s infinite"
      return
    }

    // ✅ 未仕掛遅れ
    if (isDelayed) {
      info.el.style.background = "#ef4444"
      info.el.style.color = "#fff"
      info.el.style.animation = "blink 1s infinite"
      return
    }

    // ✅ 予定
    info.el.style.background = "#9ca3af"
    info.el.style.color = "#fff"
  }

return (
  <div style={styles.page}>
    <div style={styles.header}>
      <div>
        <div style={styles.appTitle}>工程ガント</div>
        <div style={styles.subTitle}>
          生産計画・設備別スケジュール
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={() => setScreenMode("tablet")}
          style={styles.tabletButton}
        >
          タブレット
        </button>

        <button
          onClick={() => setScreenMode("login")}
          style={styles.tabletButton}
        >
          ログアウト
        </button>
      </div>
    </div>

    
    <div style={styles.statusRow}>
          <div style={styles.statusCard}>
            <div style={styles.statusLabel}>日報番号件数</div>
            <div style={styles.statusValue}>{dailyNoCount}</div>
          </div>

          <div style={styles.statusCard}>
            <div style={styles.statusLabel}>変更履歴</div>
            <div style={styles.statusValue}>{history.length}</div>
          </div>

          <div style={styles.statusCard}>
            <div style={styles.statusLabel}>設備数</div>
            <div style={styles.statusValue}>{resources.length}</div>
          </div>
        </div>

        <div style={styles.toolbarArea}>
          <div style={styles.toolbarGroup}>
            <div style={styles.toolbarTitle}>計画操作</div>

            <label style={styles.primaryButton}>
              CSV取込
              <input
                type="file"
                style={{ display: "none" }}
                onChange={importMultiOrderCsv}
              />
            </label>

            <button
              onClick={saveJson}
              style={styles.successButton}
            >
              計画保存
            </button>

            <label style={styles.primaryButton}>
              計画読込
              <input
                type="file"
                accept=".json"
                style={{ display: "none" }}
                onChange={loadJson}
              />
            </label>

            <button onClick={undoLast} style={styles.toolButton}>
              戻る
            </button>

            <button onClick={redoLast} style={styles.toolButton}>
              やり直し
            </button>

            <button
              onClick={exportHistory}
              style={styles.successButton}
            >
              計画確定
            </button>
          </div>

          <div style={styles.dangerGroup}>
            <div style={styles.toolbarTitle}>危険操作</div>

            <button
              onClick={() => setEvents([])}
              style={styles.dangerButton}
            >
              全部削除
            </button>

            <button
              onClick={() => {
                setEvents([])
                setHistory([])
                setRedoStack([])
              }}
              style={styles.dangerButton}
            >
              全部リセット
             </button>
          </div>
          </div>

        <div style={styles.calendarCard}>
          <FullCalendar
            resourceAreaHeaderContent="設備"
            resourceOrder="sortOrder"
            schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"
            locale={jaLocale}
            plugins={[resourceTimelinePlugin, interactionPlugin]}
            initialView="resourceTimelineWeek"
            initialDate={new Date().toISOString().slice(0, 10)}
            height="100%"

            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "resourceTimelineDay,resourceTimelineWeek,resourceTimelineMonth"
            }}

            titleFormat={{
              year: "numeric",
              month: "long"
            }}

            slotLaneClassNames={(arg) => {
               const day = arg.date.getDay()
               if (day === 0) return ["sunday-lane"]
               if (day === 6) return ["saturday-lane"]
               return []
            }}

            slotLabelClassNames={(arg) => {
               const day = arg.date.getDay()
               if (day === 0) return ["sunday-label"]
               if (day === 6) return ["saturday-label"]
               return []
            }}

            eventMinWidth={90}
            eventContent={(arg) => {
              const dailyNo =
                arg.event.extendedProps.dailyNo || ""

              const process =
                arg.event.extendedProps.process || ""

              return (
                <div
                  style={{
                    width: "100%",
                    overflow: "hidden",
                    color: "#fff",
                    padding: "2px 4px",
                    lineHeight: "1.1"
                  }}
                >
                  <div
                    style={{
                      fontSize: "12px",
                      fontWeight: "900"
                    }}
                  >
                    {dailyNo}
                  </div>

                  <div
                    style={{
                      fontSize: "10px",
                      opacity: 0.9,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap"
                    }}
                  >
                    {process}
                  </div>
                </div>
              )

            }}

            datesSet={() => {
              console.log("datesSet実行")

              setTimeout(() => {
                console.log(
                  document.querySelectorAll("[data-date]").length
                )
              }, 500)
            }}

            dayHeaderDidMount={(arg) => {
              console.log(arg.date)

              const day = arg.date.getDay()

              if (day === 0) {
                arg.el.style.backgroundColor = "red"
              }

              if (day === 6) {
                arg.el.style.backgroundColor = "blue"
              }
            }}


            slotLabelContent={(arg) => {
              if (arg.view.type === "resourceTimelineWeek") {
                const level = arg.level
                const hour = arg.date.getHours()

                // 下段だけ 午前 / 午後 にする
                if (level === 1) {
                  if (hour === 0) return "午前"
                  if (hour === 12) return "午後"
                }

                // 上段は日付を表示
                if (level === 0) {
                  return arg.text
                }
              }

              return arg.text
            }}

            views={{
              // 日表示
              resourceTimelineDay: {
                type: "resourceTimeline",
                duration: { days: 1 },

                slotDuration: { hours: 1 },

                slotLabelFormat: {
                  hour: "numeric"
                }
              },

              // 週表示
              resourceTimelineWeek: {
                type: "resourceTimeline",
                duration: { weeks: 1 },
                slotDuration: { hours: 12 },
                slotMinWidth: 70,
                slotLabelFormat: [
                  {
                    month: "numeric",
                    day: "numeric",
                    weekday: "short"
                  },
                  {
                    hour: "numeric"
                  }
                ]
              },

              // 月表示
              resourceTimelineMonth: {
                type: "resourceTimeline",
                duration: { months: 1 },

                slotDuration: { days: 1 },

                slotLabelFormat: {
                  month: "numeric",
                  day: "numeric"
                }
              }
            }}
            dateClick={() => {
              setSelected(null)
            }}
            editable={true}
            eventResourceEditable={true}
            resources={resources}
            events={
              Array.isArray(events)
                ? events.map(e => ({
                  ...e,
                  start: e.start,
                  end: e.end || e.start
                }))
                : []
            }
            displayEventTime={false}
            eventTimeFormat={false}
            eventClick={(info) => {
              setSelected(info.event)
            }}
            selectable={true}
            select={() => {
              setSelected(null)
            }}
            eventDrop={handleEventDrop}
            eventDidMount={handleEventDidMount}
          />
        </div>

        {selected && (
          <div style={styles.sidePanel}>
            <div style={styles.sideHeader}>
              <div>
                <div style={styles.sideTitle}>
                  {selected.extendedProps.dailyNo}
                </div>
                <div style={styles.sideSubTitle}>
                  工程順序
                </div>
              </div>

              <button
                onClick={() => setSelected(null)}
                style={styles.closeButton}
              >
                ×
              </button>
            </div>

            {events
              .filter(e => e.dailyNo === selected.extendedProps.dailyNo)
              .sort((a, b) => a.order - b.order)
              .map(r => {
                const today = new Date().toISOString()
                const now = new Date()
                const start = new Date(r.start)
                const end = new Date(r.end)

                const isNow = start <= now && end >= now
                const isPast = new Date(r.end) < new Date()

                let bg = "#f3f4f6"
                let label = "予定"

                if (isNow) {
                  bg = "#fef3c7"
                  label = "進行中"
                } else if (isPast) {
                  bg = "#dcfce7"
                  label = "完了予定"
                }

                return (
                  <div
                    key={r.id}
                    style={{
                      ...styles.sideItem,
                      background: bg
                    }}
                  >
                    <div style={styles.sideItemTop}>
                      <div style={styles.sideItemHeader}>
                        {isNow && "▶ "}
                        {r.process}
                      </div>

                      <div style={styles.sideBadge}>
                        {label}
                      </div>
                    </div>

                    <div style={styles.sideInfo}>
                      開始：{r.start?.substring(0, 10)}
                    </div>

                    <div style={styles.sideInfo}>
                      工数：{r.work}h
                    </div>

                    <div style={styles.sideInfo}>
                      設備：{r.resourceId}
                    </div>

                    <div style={styles.orderButtons}>
                      <button
                        onClick={() => moveUp(r.id)}
                        style={styles.smallButton}
                      >
                        ▲
                      </button>

                      <button
                        onClick={() => moveDown(r.id)}
                        style={styles.smallButton}
                      >
                        ▼
                      </button>
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>
  )
}

      const styles = {
        page: {
        minHeight: "100vh",
      padding: "20px",
      background: "#eef2f7",
      color: "#111827",
      fontFamily:
      "system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
  },

      header: {
        display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: "18px"
  },

      appTitle: {
        fontSize: "36px",
      fontWeight: "900",
      letterSpacing: "1px"
  },

      subTitle: {
        fontSize: "18px",
      color: "#6b7280",
      marginTop: "4px"
  },

      tabletButton: {
        fontSize: "20px",
      fontWeight: "900",
      padding: "14px 26px",
      borderRadius: "18px",
      border: "none",
      background: "#111827",
      color: "#fff",
      cursor: "pointer",
      boxShadow: "0 8px 18px rgba(0,0,0,0.2)"
  },

      statusRow: {
        display: "grid",
      gridTemplateColumns: "repeat(3, 1fr)",
      gap: "14px",
      marginBottom: "16px"
  },

      statusCard: {
        background: "#fff",
      borderRadius: "20px",
      padding: "18px",
      boxShadow: "0 8px 20px rgba(0,0,0,0.08)"
  },

      statusLabel: {
        fontSize: "16px",
      color: "#6b7280",
      fontWeight: "800"
  },

      statusValue: {
        fontSize: "34px",
      fontWeight: "900",
      marginTop: "4px"
  },

      toolbar: {
        display: "flex",
      flexWrap: "wrap",
      gap: "10px",
      background: "#fff",
      borderRadius: "22px",
      padding: "14px",
      marginBottom: "16px",
      boxShadow: "0 8px 20px rgba(0,0,0,0.08)"
  },

      toolbarArea: {
        display: "grid",
      gridTemplateColumns: "1fr auto",
      gap: "14px",
      marginBottom: "16px"
},

      toolbarGroup: {
        display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "10px",
      background: "#fff",
      borderRadius: "22px",
      padding: "14px",
      boxShadow: "0 8px 20px rgba(0,0,0,0.08)"
},

      dangerGroup: {
        display: "flex",
      alignItems: "center",
      flexWrap: "wrap",
      gap: "10px",
      background: "#fff5f5",
      borderRadius: "22px",
      padding: "14px",
      border: "2px solid #fecaca",
      boxShadow: "0 8px 20px rgba(0,0,0,0.08)"
},

      toolbarTitle: {
        fontSize: "16px",
      fontWeight: "900",
      color: "#6b7280",
      marginRight: "4px"
},

      primaryButton: {
        fontSize: "18px",
      fontWeight: "900",
      padding: "12px 20px",
      borderRadius: "14px",
      border: "none",
      background: "#2563eb",
      color: "#fff",
      cursor: "pointer"
  },

      toolButton: {
        fontSize: "18px",
      fontWeight: "900",
      padding: "12px 20px",
      borderRadius: "14px",
      border: "none",
      background: "#f3f4f6",
      color: "#111827",
      cursor: "pointer"
  },

      successButton: {
        fontSize: "18px",
      fontWeight: "900",
      padding: "12px 20px",
      borderRadius: "14px",
      border: "none",
      background: "#16a34a",
      color: "#fff",
      cursor: "pointer"
  },

      dangerButton: {
        fontSize: "18px",
      fontWeight: "900",
      padding: "12px 20px",
      borderRadius: "14px",
      border: "none",
      background: "#fee2e2",
      color: "#991b1b",
      cursor: "pointer"
  },

       calendarCard: {
       height: "calc(100vh - 260px)",
       background: "#fff",
       borderRadius: "26px",
       padding: "18px",
       boxShadow: "0 12px 28px rgba(0,0,0,0.12)",
       overflow: "hidden"
   },

      sidePanel: {
        position: "fixed",
      right: 0,
      top: 0,
      width: "360px",
      height: "100%",
      background: "#fff",
      padding: "18px",
      borderLeft: "1px solid #e5e7eb",
      boxShadow: "-10px 0 25px rgba(0,0,0,0.12)",
      zIndex: 9999,
      overflowY: "auto"
  },

      sideHeader: {
        display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: "16px"
  },

      sideTitle: {
        fontSize: "30px",
      fontWeight: "900"
  },

      sideSubTitle: {
        fontSize: "16px",
      color: "#6b7280",
      marginTop: "4px"
  },

      closeButton: {
        width: "42px",
      height: "42px",
      borderRadius: "999px",
      border: "none",
      background: "#111827",
      color: "#fff",
      fontSize: "26px",
      fontWeight: "900",
      cursor: "pointer"
  },

      sideItem: {
        marginBottom: "12px",
      padding: "14px",
      borderRadius: "18px",
      border: "1px solid #e5e7eb"
  },

      sideItemTop: {
        display: "flex",
      justifyContent: "space-between",
      gap: "8px",
      alignItems: "flex-start",
      marginBottom: "8px"
  },

      sideItemHeader: {
        fontSize: "18px",
      fontWeight: "900"
  },

      sideBadge: {
        fontSize: "13px",
      fontWeight: "900",
      padding: "5px 9px",
      borderRadius: "999px",
      background: "#111827",
      color: "#fff",
      whiteSpace: "nowrap"
  },

      sideInfo: {
        fontSize: "15px",
      color: "#374151",
      marginBottom: "4px",
      fontWeight: "700"
  },

      orderButtons: {
        display: "flex",
      gap: "8px",
      marginTop: "10px"
  },

      smallButton: {
        flex: 1,
      padding: "10px",
      borderRadius: "12px",
      border: "none",
      background: "#111827",
      color: "#fff",
      fontWeight: "900",
      cursor: "pointer"
  }
}