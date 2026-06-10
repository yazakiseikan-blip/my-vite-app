import { useState } from "react"
import { useStore } from "./store/useStore"
import FullCalendar from "@fullcalendar/react"
import resourceTimelinePlugin from "@fullcalendar/resource-timeline"
import interactionPlugin from "@fullcalendar/interaction"
import jaLocale from "@fullcalendar/core/locales/ja"

export default function TabletView() {
  const [tabletMode, setTabletMode] = useState("gantt")
  const [selectedMachine, setSelectedMachine] = useState("")
  const [inputDailyNo, setInputDailyNo] = useState("")
  const [showTodayOnly, setShowTodayOnly] = useState(false)

  const events = useStore(s => s.events)
  const setEvents = useStore(s => s.setEvents)
  const setScreenMode = useStore(s => s.setScreenMode)

  const today = new Date().toLocaleDateString("sv-SE")

  const resources = [
    "MC09", "MC11", "MC12", "MC13", "110",
    "ラジアル", "研磨", "放電新", "放電旧", "ワイヤ",
    "LAS溶接", "TIG溶接", "溶接(アーク・ﾛｳ付け)",
    "開先", "バラシ・組付", "ミガキ",
    "3Dデータ作成・設計", "PRG作成",
    "ATOS", "三次元", "出荷前確認", "打ち合わせ"
  ].map((id, index) => ({
    id,
    title: id,
    sortOrder: index
  }))

  const filtered = events.filter(e => {
    const eventDate = new Date(e.start).toLocaleDateString("sv-SE")
    const todayFilter = !showTodayOnly || eventDate === today
    const machineFilter = !selectedMachine || e.resourceId === selectedMachine
    const dailyNoFilter =
      inputDailyNo === "" ||
      String(e.dailyNo || "").includes(inputDailyNo)

    return todayFilter && machineFilter && dailyNoFilter
  })

  const handleWork = (id) => {
    const now = new Date().toISOString()

    setEvents(prev =>
      prev.map(e => {
        if (e.id !== id) return e

        const logs = e.workLogs || []
        const last = logs[logs.length - 1]

        if (!last || last.end) {
          return {
            ...e,
            workLogs: [...logs, { start: now, end: null }]
          }
        }

        return {
          ...e,
          workLogs: logs.map((l, i) =>
            i === logs.length - 1 ? { ...l, end: now } : l
          )
        }
      })
    )
  }

  const completeWork = (id) => {
    setEvents(prev =>
      prev.map(e =>
        e.id === id ? { ...e, isCompleted: true } : e
      )
    )
  }

  const undoComplete = (id) => {
    setEvents(prev =>
      prev.map(e =>
        e.id === id ? { ...e, isCompleted: false } : e
      )
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>現場タブレット</div>
          <div style={styles.subTitle}>
            全体予定確認・実績入力
          </div>
        </div>

        <button
          onClick={() => setScreenMode("login")}
          style={styles.logoutButton}
        >
          ログアウト
        </button>
      </div>

      <div style={styles.modeTabs}>
        <button
          onClick={() => setTabletMode("gantt")}
          style={{
            ...styles.modeButton,
            ...(tabletMode === "gantt" ? styles.activeMode : {})
          }}
        >
          全体予定
        </button>

        <button
          onClick={() => setTabletMode("work")}
          style={{
            ...styles.modeButton,
            ...(tabletMode === "work" ? styles.activeMode : {})
          }}
        >
          実績入力
        </button>
      </div>

      {tabletMode === "gantt" && (
        <div style={styles.calendarCard}>
          <FullCalendar
            resourceAreaHeaderContent="設備"
            resourceOrder="sortOrder"
            schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"
            locale={jaLocale}
            plugins={[resourceTimelinePlugin, interactionPlugin]}
            initialView="resourceTimelineWeek"
            height="650px"
            resources={resources}
            events={
              Array.isArray(events)
                ? events.map(e => ({
                    ...e,
                    title: `${e.dailyNo || ""} ${e.process || ""}`,
                    start: e.start,
                    end: e.end || e.start
                  }))
                : []
            }
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "resourceTimelineDay,resourceTimelineWeek,resourceTimelineMonth"
            }}
            editable={false}
            eventResourceEditable={false}
            eventStartEditable={false}
            eventDurationEditable={false}
            selectable={false}
            displayEventTime={false}
          />
        </div>
      )}

      {tabletMode === "work" && (
        <>
          <div style={styles.filterCard}>
            <select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
              style={styles.input}
            >
              <option value="">全設備</option>
              {resources.map(r => (
                <option key={r.id} value={r.id}>
                  {r.title}
                </option>
              ))}
            </select>

            <input
              value={inputDailyNo}
              onChange={(e) => setInputDailyNo(e.target.value)}
              placeholder="日報番号検索"
              style={styles.input}
            />

            <button
              onClick={() => setShowTodayOnly(prev => !prev)}
              style={{
                ...styles.todayButton,
                background: showTodayOnly ? "#16a34a" : "#6b7280"
              }}
            >
              {showTodayOnly ? "今日のみ ON" : "今日のみ OFF"}
            </button>
          </div>

          <div style={styles.countBar}>
            表示件数：{filtered.length} 件
          </div>

          {filtered.map(e => {
            const last = e.workLogs?.[e.workLogs.length - 1]
            const isWorking = last && !last.end && !e.isCompleted

            return (
              <div
                key={e.id}
                style={{
                  ...styles.workCard,
                  ...(e.isCompleted ? styles.completedCard : {}),
                  ...(isWorking ? styles.workingCard : {})
                }}
              >
                <div style={styles.cardTop}>
                  <div>
                    <div style={styles.dailyNo}>{e.dailyNo}</div>
                    <div style={styles.process}>{e.process}</div>
                    <div style={styles.info}>
                      設備：{e.resourceId}
                    </div>
                    <div style={styles.info}>
                      開始：{e.start?.substring(0, 10)}
                    </div>
                    <div style={styles.info}>
                      予定工数：{e.work}h
                    </div>
                  </div>

                  <div style={styles.badge}>
                    {e.isCompleted
                      ? "完了"
                      : isWorking
                        ? "作業中"
                        : "未開始"}
                  </div>
                </div>

                <input
                  type="number"
                  step="0.1"
                  placeholder="実績工数"
                  value={e.manualWork ?? ""}
                  onChange={(event) => {
                    const value = parseFloat(event.target.value || 0)

                    setEvents(prev =>
                      prev.map(ev =>
                        ev.id === e.id
                          ? { ...ev, manualWork: value }
                          : ev
                      )
                    )
                  }}
                  style={styles.manualInput}
                />

                <div style={styles.actionRow}>
                  <button
                    onClick={() => handleWork(e.id)}
                    style={{
                      ...styles.startButton,
                      background: isWorking ? "#ef4444" : "#2563eb"
                    }}
                  >
                    {isWorking ? "終了" : "開始"}
                  </button>

                  <button
                    onClick={() => completeWork(e.id)}
                    style={styles.completeButton}
                  >
                    工程完了
                  </button>

                  {e.isCompleted && (
                    <button
                      onClick={() => undoComplete(e.id)}
                      style={styles.undoButton}
                    >
                      完了解除
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "20px",
    background: "#f3f4f6",
    fontFamily: "system-ui, sans-serif",
    color: "#111827"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "18px"
  },
  title: {
    fontSize: "34px",
    fontWeight: "900"
  },
  subTitle: {
    fontSize: "18px",
    color: "#6b7280"
  },
  logoutButton: {
    padding: "12px 20px",
    borderRadius: "14px",
    border: "none",
    background: "#111827",
    color: "#fff",
    fontSize: "18px",
    fontWeight: "900"
  },
  modeTabs: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    marginBottom: "18px"
  },
  modeButton: {
    padding: "18px",
    borderRadius: "18px",
    border: "2px solid #d1d5db",
    background: "#fff",
    fontSize: "24px",
    fontWeight: "900"
  },
  activeMode: {
    background: "#2563eb",
    color: "#fff",
    borderColor: "#2563eb"
  },
  calendarCard: {
    background: "#fff",
    padding: "14px",
    borderRadius: "22px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
    overflowX: "auto"
  },
  filterCard: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr auto",
    gap: "12px",
    background: "#fff",
    padding: "16px",
    borderRadius: "20px",
    marginBottom: "16px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.08)"
  },
  input: {
    height: "56px",
    fontSize: "22px",
    padding: "8px 12px",
    borderRadius: "14px",
    border: "2px solid #d1d5db"
  },
  todayButton: {
    height: "56px",
    padding: "0 20px",
    borderRadius: "14px",
    border: "none",
    color: "#fff",
    fontSize: "20px",
    fontWeight: "900"
  },
  countBar: {
    background: "#111827",
    color: "#fff",
    padding: "16px",
    borderRadius: "16px",
    fontSize: "22px",
    fontWeight: "900",
    marginBottom: "16px"
  },
  workCard: {
    background: "#fff",
    borderRadius: "22px",
    padding: "20px",
    marginBottom: "16px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
    borderLeft: "10px solid #9ca3af"
  },
  workingCard: {
    borderLeftColor: "#f59e0b",
    background: "#fffbeb"
  },
  completedCard: {
    borderLeftColor: "#16a34a",
    background: "#ecfdf5"
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    marginBottom: "14px"
  },
  dailyNo: {
    fontSize: "30px",
    fontWeight: "900"
  },
  process: {
    fontSize: "22px",
    fontWeight: "800",
    color: "#374151"
  },
  info: {
    fontSize: "17px",
    marginTop: "4px",
    color: "#4b5563",
    fontWeight: "700"
  },
  badge: {
    height: "fit-content",
    padding: "8px 14px",
    borderRadius: "999px",
    background: "#111827",
    color: "#fff",
    fontSize: "18px",
    fontWeight: "900"
  },
  manualInput: {
    width: "100%",
    height: "56px",
    fontSize: "24px",
    padding: "8px 12px",
    borderRadius: "14px",
    border: "2px solid #d1d5db",
    marginBottom: "14px"
  },
  actionRow: {
    display: "flex",
    gap: "10px",
    flexWrap: "wrap"
  },
  startButton: {
    flex: 1,
    minWidth: "130px",
    padding: "16px",
    borderRadius: "16px",
    border: "none",
    color: "#fff",
    fontSize: "24px",
    fontWeight: "900"
  },
  completeButton: {
    flex: 1,
    minWidth: "130px",
    padding: "16px",
    borderRadius: "16px",
    border: "none",
    background: "#16a34a",
    color: "#fff",
    fontSize: "22px",
    fontWeight: "900"
  },
  undoButton: {
    flex: 1,
    minWidth: "130px",
    padding: "16px",
    borderRadius: "16px",
    border: "none",
    background: "#6b7280",
    color: "#fff",
    fontSize: "22px",
    fontWeight: "900"
  }
}