import { useState } from "react"
import { useStore } from "./store/useStore"

export default function TabletView() {
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

  const resourceMaster = {
    MC: ["MC09", "MC11", "MC12", "MC13", "110"],
    ラジアル: ["ラジアル"],
    研磨: ["研磨"],
    放電: ["放電新", "放電旧"],
    ワイヤ: ["ワイヤ"],
    HW: ["LAS溶接", "TIG溶接", "溶接(アーク・ﾛｳ付け)", "開先", "バラシ・組付", "ミガキ"],
    CAM: ["3Dデータ作成・設計", "PRG作成"],
    検査: ["ATOS", "三次元"],
    出荷前確認: ["出荷前確認"],
    その他: ["打ち合わせ"]
  }

  const [selectedGroup, setSelectedGroup] = useState(null)
  const [selectedMachine, setSelectedMachine] = useState(null)
  const [inputDailyNo, setInputDailyNo] = useState("")
  const [moveDailyNo, setMoveDailyNo] = useState("")
  const [showTodayOnly, setShowTodayOnly] = useState(false)

  const setScreenMode = useStore(s => s.setScreenMode)
  const events = useStore(s => s.events)
  const setEvents = useStore(s => s.setEvents)

  const today = new Date().toLocaleDateString("sv-SE")

  const filtered = events.filter(e => {
    const eventDate = new Date(e.start).toLocaleDateString("sv-SE")
    const todayFilter = !showTodayOnly || eventDate === today

    const normalSearch =
      inputDailyNo === "" ||
      String(e.dailyNo || "").includes(inputDailyNo)

    const moveSearch =
      moveDailyNo === "" ||
      String(e.dailyNo || "").includes(moveDailyNo)

    if (moveDailyNo !== "") {
      const sameGroupMachines = resourceMaster[selectedGroup] || []
      return (
        todayFilter &&
        moveSearch &&
        sameGroupMachines.includes(e.resourceId)
      )
    }

    return (
      todayFilter &&
      selectedMachine &&
      e.resourceId === selectedMachine &&
      normalSearch
    )
  })

  const dailyNoCount = new Set(
    filtered.map(e => e.dailyNo).filter(Boolean)
  ).size

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
            actualMachine: e.actualMachine || selectedMachine,
            workLogs: [...logs, { start: now, end: null }]
          }
        }

        const updatedLogs = logs.map((l, i) =>
          i === logs.length - 1 ? { ...l, end: now } : l
        )

        return { ...e, workLogs: updatedLogs }
      })
    )
  }

  const completeWork = (id) => {
    setEvents(prev =>
      prev.map(e => e.id === id ? { ...e, isCompleted: true } : e)
    )
  }

  const undoComplete = (id) => {
    setEvents(prev =>
      prev.map(e => e.id === id ? { ...e, isCompleted: false } : e)
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <div style={styles.appTitle}>作業実績入力</div>
          <div style={styles.subTitle}>
            設備：{selectedMachine || "未選択"}
          </div>
        </div>

        <button
          onClick={() => setScreenMode("gantt")}
          style={styles.backButton}
        >
          ガントに戻る
        </button>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>工程グループ</div>

        <div style={styles.buttonGrid}>
          {groupOrder.map(group => (
            <button
              key={group}
              onClick={() => {
                setSelectedGroup(group)
                setSelectedMachine(null)
              }}
              style={{
                ...styles.groupButton,
                ...(selectedGroup === group ? styles.selectedButton : {})
              }}
            >
              {group}
            </button>
          ))}
        </div>
      </div>

      {selectedGroup && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>設備選択</div>

          <div style={styles.buttonGrid}>
            {resourceMaster[selectedGroup].map(machine => (
              <button
                key={machine}
                onClick={() => setSelectedMachine(machine)}
                style={{
                  ...styles.machineButton,
                  ...(selectedMachine === machine ? styles.selectedMachineButton : {})
                }}
              >
                {machine}
              </button>
            ))}
          </div>
        </div>
      )}

      <div style={styles.filterCard}>
        <div style={styles.filterTitle}>検索・フィルター</div>

        <div style={styles.filterGrid}>
          <div>
            <div style={styles.label}>日報番号検索</div>
            <input
              type="text"
              value={inputDailyNo}
              onChange={(e) => setInputDailyNo(e.target.value)}
              style={styles.input}
              placeholder="例：MKS1003"
            />
          </div>

          <div>
            <div style={styles.label}>振替検索</div>
            <input
              type="text"
              value={moveDailyNo}
              onChange={(e) => setMoveDailyNo(e.target.value)}
              style={styles.input}
              placeholder="同グループ内"
            />
          </div>

          <div style={styles.switchArea}>
            <div style={styles.label}>表示条件</div>

            <div style={styles.switchRow}>
              <div style={styles.switchLabel}>今日のみ</div>

              <div
                onClick={() => setShowTodayOnly(prev => !prev)}
                style={{
                  ...styles.switchBody,
                  background: showTodayOnly ? "#22c55e" : "#d1d5db",
                  boxShadow: showTodayOnly
                    ? "0 0 16px rgba(34,197,94,0.55)"
                    : "none"
                }}
              >
                <div
                  style={{
                    ...styles.switchKnob,
                    left: showTodayOnly ? "42px" : "4px"
                  }}
                />
              </div>

              <div
                style={{
                  ...styles.switchStatus,
                  color: showTodayOnly ? "#16a34a" : "#6b7280"
                }}
              >
                {showTodayOnly ? "ON" : "OFF"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={styles.countBar}>
        <div>
          <div style={styles.countLabel}>
            {showTodayOnly ? "本日の予定" : "該当件数"}
          </div>
          <div style={styles.countSub}>
            工程数：{filtered.length} 件
          </div>
        </div>

        <div style={styles.countNumber}>
          {dailyNoCount}
          <span style={styles.countUnit}> 件</span>
        </div>
      </div>

      {filtered.map(e => {
        const last = e.workLogs?.[e.workLogs.length - 1]
        const isWorking = last && !last.end && !e.isCompleted

        const totalWork = (e.workLogs || []).reduce((sum, l) => {
          if (!l.end) return sum

          const start = new Date(l.start)
          const end = new Date(l.end)

          return sum + (end - start) / (1000 * 60 * 60)
        }, 0)

        return (
          <div
            key={e.id}
            style={{
              ...styles.workCard,
              ...(e.isCompleted
                ? styles.completedCard
                : isWorking
                  ? styles.workingCard
                  : {})
            }}
          >
            <div style={styles.cardTop}>
              <div>
                <div style={styles.dailyNo}>{e.dailyNo}</div>
                <div style={styles.process}>{e.process}</div>
              </div>

              <div
                style={{
                  ...styles.statusBadge,
                  ...(e.isCompleted
                    ? styles.completedBadge
                    : isWorking
                      ? styles.workingBadge
                      : styles.waitingBadge)
                }}
              >
                {e.isCompleted ? "完了" : isWorking ? "作業中" : "未開始"}
              </div>
            </div>

            <div style={styles.workInfoGrid}>
              <div style={styles.infoBox}>
                <div style={styles.infoLabel}>予定</div>
                <div style={styles.infoValue}>
                  {e.work !== undefined && e.work !== ""
                    ? `${Number(e.work).toFixed(1)}h`
                    : "-"}
                </div>
              </div>

              <div style={styles.infoBox}>
                <div style={styles.infoLabel}>自動</div>
                <div style={styles.infoValue}>
                  {totalWork.toFixed(1)}h
                </div>
              </div>

              <div style={styles.infoBox}>
                <div style={styles.infoLabel}>実投入</div>
                <div style={styles.infoValue}>
                  {e.manualWork !== undefined
                    ? `${e.manualWork.toFixed(1)}h`
                    : "-"}
                </div>
              </div>

              <div style={styles.infoBox}>
                <div style={styles.infoLabel}>差異</div>
                <div style={styles.infoValue}>
                  {e.manualWork !== undefined
                    ? `${(e.manualWork - totalWork).toFixed(1)}h`
                    : "-"}
                </div>
              </div>
            </div>

            <input
              type="number"
              step="0.1"
              placeholder="手入力工数"
              style={styles.manualInput}
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
            />

            <div style={styles.actionRow}>
              <button
                onClick={() => handleWork(e.id)}
                style={{
                  ...styles.mainActionButton,
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
    </div>
  )
}

const styles = {
  page: {
    minHeight: "100vh",
    padding: "24px",
    paddingBottom: "120px",
    background: "#f3f4f6",
    color: "#111827",
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px"
  },

  appTitle: {
    fontSize: "38px",
    fontWeight: "900"
  },

  subTitle: {
    fontSize: "22px",
    color: "#6b7280",
    marginTop: "4px"
  },

  backButton: {
    fontSize: "22px",
    padding: "14px 24px",
    borderRadius: "14px",
    border: "none",
    background: "#111827",
    color: "#fff",
    fontWeight: "bold"
  },

  section: {
    background: "#fff",
    borderRadius: "22px",
    padding: "20px",
    marginBottom: "18px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.08)"
  },

  sectionTitle: {
    fontSize: "24px",
    fontWeight: "800",
    marginBottom: "14px"
  },

  buttonGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px"
  },

  groupButton: {
    fontSize: "24px",
    padding: "16px 24px",
    minHeight: "64px",
    borderRadius: "18px",
    border: "2px solid #e5e7eb",
    background: "#f9fafb",
    color: "#374151",
    fontWeight: "800"
  },

  machineButton: {
    fontSize: "28px",
    padding: "18px 28px",
    minWidth: "130px",
    minHeight: "76px",
    borderRadius: "20px",
    border: "2px solid #e5e7eb",
    background: "#f9fafb",
    color: "#111827",
    fontWeight: "900"
  },

  selectedButton: {
    background: "#2563eb",
    color: "#fff",
    borderColor: "#2563eb",
    boxShadow: "0 8px 18px rgba(37,99,235,0.35)"
  },

  selectedMachineButton: {
    background: "#16a34a",
    color: "#fff",
    borderColor: "#16a34a",
    boxShadow: "0 8px 18px rgba(22,163,74,0.35)"
  },

  filterCard: {
    background: "#fff",
    borderRadius: "22px",
    padding: "20px",
    marginBottom: "18px",
    boxShadow: "0 8px 20px rgba(0,0,0,0.08)"
  },

  filterTitle: {
    fontSize: "24px",
    fontWeight: "900",
    marginBottom: "16px"
  },

  filterGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 280px",
    gap: "16px",
    alignItems: "end"
  },

  label: {
    display: "block",
    fontSize: "22px",
    fontWeight: "800",
    marginBottom: "8px"
  },

  input: {
    width: "100%",
    height: "62px",
    fontSize: "28px",
    padding: "8px 14px",
    borderRadius: "16px",
    border: "2px solid #d1d5db",
    outline: "none",
    boxSizing: "border-box"
  },

  switchArea: {
    minWidth: "260px"
  },

  switchRow: {
    height: "62px",
    display: "flex",
    alignItems: "center",
    gap: "12px"
  },

  switchLabel: {
    fontSize: "22px",
    fontWeight: "900"
  },

  switchBody: {
    width: "80px",
    height: "42px",
    borderRadius: "999px",
    position: "relative",
    cursor: "pointer",
    transition: "0.3s"
  },

  switchKnob: {
    width: "34px",
    height: "34px",
    borderRadius: "50%",
    background: "#fff",
    position: "absolute",
    top: "4px",
    transition: "0.3s",
    boxShadow: "0 2px 6px rgba(0,0,0,0.3)"
  },

  switchStatus: {
    fontSize: "22px",
    fontWeight: "900"
  },

  countBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: "24px",
    fontWeight: "800",
    marginBottom: "16px",
    padding: "16px 22px",
    borderRadius: "18px",
    background: "#111827",
    color: "#fff"
  },

  countLabel: {
    fontSize: "24px",
    fontWeight: "900"
  },

  countSub: {
    fontSize: "18px",
    color: "#d1d5db",
    marginTop: "4px"
  },

  countNumber: {
    fontSize: "42px",
    fontWeight: "900",
    color: "#facc15"
  },

  countUnit: {
    fontSize: "22px"
  },

  workCard: {
    background: "#fff",
    borderRadius: "24px",
    padding: "22px",
    marginBottom: "18px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
    borderLeft: "10px solid #9ca3af"
  },

  workingCard: {
    borderLeftColor: "#f59e0b",
    background: "#fffbeb"
  },

  completedCard: {
    borderLeftColor: "#6b7280",
    background: "#e5e7eb",
    opacity: 0.85
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "18px"
  },

  dailyNo: {
    fontSize: "38px",
    fontWeight: "900",
    color: "#111827"
  },

  process: {
    fontSize: "26px",
    color: "#374151",
    marginTop: "4px"
  },

  statusBadge: {
    fontSize: "22px",
    fontWeight: "900",
    padding: "10px 18px",
    borderRadius: "999px"
  },

  waitingBadge: {
    background: "#e5e7eb",
    color: "#374151"
  },

  workingBadge: {
    background: "#f59e0b",
    color: "#fff"
  },

  completedBadge: {
    background: "#6b7280",
    color: "#fff"
  },

  workInfoGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "12px",
    marginBottom: "16px"
  },

  infoBox: {
    background: "#f9fafb",
    borderRadius: "16px",
    padding: "14px",
    textAlign: "center"
  },

  infoLabel: {
    fontSize: "20px",
    color: "#6b7280",
    fontWeight: "700"
  },

  infoValue: {
    fontSize: "30px",
    fontWeight: "900",
    marginTop: "4px"
  },

  manualInput: {
    width: "100%",
    height: "58px",
    fontSize: "26px",
    padding: "8px 14px",
    borderRadius: "16px",
    border: "2px solid #d1d5db",
    marginBottom: "16px",
    boxSizing: "border-box"
  },

  actionRow: {
    display: "flex",
    gap: "12px",
    flexWrap: "wrap"
  },

  mainActionButton: {
    flex: 1,
    minWidth: "160px",
    fontSize: "30px",
    padding: "18px",
    borderRadius: "18px",
    border: "none",
    color: "#fff",
    fontWeight: "900"
  },

  completeButton: {
    flex: 1,
    minWidth: "160px",
    fontSize: "26px",
    padding: "18px",
    borderRadius: "18px",
    border: "none",
    background: "#16a34a",
    color: "#fff",
    fontWeight: "900"
  },

  undoButton: {
    flex: 1,
    minWidth: "160px",
    fontSize: "26px",
    padding: "18px",
    borderRadius: "18px",
    border: "none",
    background: "#6b7280",
    color: "#fff",
    fontWeight: "900"
  }
}