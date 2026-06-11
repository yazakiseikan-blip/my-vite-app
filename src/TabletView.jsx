import { useState } from "react"
import { useStore } from "./store/useStore"
import FullCalendar from "@fullcalendar/react"
import resourceTimelinePlugin from "@fullcalendar/resource-timeline"
import interactionPlugin from "@fullcalendar/interaction"
import jaLocale from "@fullcalendar/core/locales/ja"

export default function TabletView() {
  const isMobile = window.innerWidth < 768

  const [tabletMode, setTabletMode] = useState(
    localStorage.getItem("tabletMode") || "work"
  )

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
  const workerMaster = {
    MC: ["片野", "野田"],
    ラジアル: ["志賢"],
    研磨: ["志賢"],
    放電: ["胡"],
    ワイヤ: ["松本"]
  }


  const resources = groupOrder.flatMap((group, groupIndex) =>
    (resourceMaster[group] || []).map((id, index) => ({
      id,
      title: `${group} - ${id}`,
      sortOrder: groupIndex * 100 + index
    }))
  )

  const [selectedGroup, setSelectedGroup] = useState(null)
  const [selectedMachine, setSelectedMachine] = useState(null)
  const [selectedWorker, setSelectedWorker] = useState("")

  const setScreenMode = useStore(s => s.setScreenMode)
  const events = useStore(s => s.events)
  const setEvents = useStore(s => s.setEvents)

  const [inputDailyNo, setInputDailyNo] = useState("")
  const [moveDailyNo, setMoveDailyNo] = useState("")
  const [showTodayOnly, setShowTodayOnly] = useState(true)


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
            workLogs: [...logs, {
              start: now,
              end: null,
              worker: selectedWorker
            }]
          }
        }

        const updatedLogs = logs.map((l, i) => {
          if (i !== logs.length - 1) return l
          return { ...l, end: now }
        })

        return {
          ...e,
          workLogs: updatedLogs
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

  const filtered = events.filter(e => {
    const today = new Date().toISOString().slice(0, 10)

    const isToday =
      String(e.start || "").slice(0, 10) === today ||
      String(e.end || "").slice(0, 10) === today

    if (showTodayOnly && !isToday) {
      return false
    }

    const normalSearch =
      inputDailyNo === "" ||
      String(e.dailyNo || "").includes(inputDailyNo)

    const moveSearch =
      moveDailyNo === "" ||
      String(e.dailyNo || "").includes(moveDailyNo)

    if (moveDailyNo !== "") {
      const sameGroupMachines = resourceMaster[selectedGroup] || []

      return (
        moveSearch &&
        sameGroupMachines.includes(e.resourceId)
      )
    }

    return (
      selectedMachine &&
      e.resourceId === selectedMachine &&
      normalSearch
    )
  })

  return (
    <>
      <div style={{ marginBottom: "22px" }}>
        <button
          onClick={() => {
            setTabletMode("work")
            localStorage.setItem("tabletMode", "work")
          }}
          style={{
            width: "100%",
            fontSize: "28px",
            padding: "18px",
            borderRadius: "18px",
            border: "none",
            background: tabletMode === "work" ? "#16a34a" : "#e5e7eb",
            color: tabletMode === "work" ? "#fff" : "#111827",
            fontWeight: "900",
            marginBottom: "10px"
          }}
        >
          実績入力
        </button>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => {
              setTabletMode("gantt")
              localStorage.setItem("tabletMode", "gantt")
            }}
            style={{
              flex: 1,
              fontSize: "20px",
              padding: "14px",
              borderRadius: "14px",
              border: "none",
              background: tabletMode === "gantt" ? "#2563eb" : "#e5e7eb",
              color: tabletMode === "gantt" ? "#fff" : "#111827",
              fontWeight: "900"
            }}
          >
            全体予定
          </button>

          <button
            onClick={() => setScreenMode("login")}
            style={{
              flex: 1,
              fontSize: "20px",
              padding: "14px",
              borderRadius: "14px",
              border: "none",
              background: "#111827",
              color: "#fff",
              fontWeight: "900"
            }}
          >
            ログアウト
          </button>
        </div>
      </div>

      {tabletMode === "gantt" && (
        <div style={{
          background: "#fff",
          borderRadius: "18px",
          padding: "14px",
          boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
          overflowX: "auto"
        }}>
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

            eventClick={(info) => {
              const clicked = events.find(e => String(e.id) === String(info.event.id))
              if (!clicked) return

              const machine = clicked.resourceId || info.event.getResources?.()[0]?.id

              setSelectedGroup(
                Object.keys(resourceMaster).find(group =>
                  resourceMaster[group].includes(machine)
                ) || null
              )

              setSelectedMachine(machine)
              setInputDailyNo(String(clicked.dailyNo || ""))
              setMoveDailyNo("")
              setShowTodayOnly(false)

              setTabletMode("work")
              localStorage.setItem("tabletMode", "work")
            }}
          />
        </div>

      )
      }

      {
        tabletMode === "work" && (
          <>
            <div>
              {Object.keys(resourceMaster).map(group => (
                <button
                  key={group}
                  onClick={() => {
                    setSelectedGroup(group)
                    setSelectedMachine(null)
                  }}
                  style={{
                    fontSize: isMobile ? "20px" : "24px",
                    padding: isMobile ? "10px 14px" : "12px 20px",
                    margin: "6px",
                    minHeight: isMobile ? "52px" : "60px",
                    whiteSpace: "nowrap",
                    borderRadius: "12px",
                    border: "none",
                    background: selectedGroup === group ? "#2563eb" : "#e5e7eb",
                    color: selectedGroup === group ? "#fff" : "#111827",
                    fontWeight: "bold"
                  }}
                >
                  {group}
                </button>
              ))}
            </div>

            {selectedGroup && (
              <div>
                {resourceMaster[selectedGroup].map(machine => (
                  <button
                    key={machine}
                    onClick={() => {
                      setSelectedMachine(machine)
                      setSelectedWorker("")
                    }}
                    style={{
                      fontSize: "28px",
                      padding: "16px 24px",
                      margin: "6px",
                      minWidth: "120px",
                      minHeight: "70px",
                      borderRadius: "12px",
                      border: "none",
                      background: selectedMachine === machine ? "#16a34a" : "#e5e7eb",
                      color: selectedMachine === machine ? "#fff" : "#111827",
                      fontWeight: "bold"
                    }}
                  >
                    {machine}
                  </button>
                ))}
              </div>
            )}

            {selectedGroup && (
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "8px" }}>
                  作業者
                </div>

                {(workerMaster[selectedGroup] || []).map(worker => (
                  <button
                    key={worker}
                    onClick={() => setSelectedWorker(worker)}
                    style={{
                      fontSize: "24px",
                      padding: "12px 20px",
                      margin: "6px",
                      borderRadius: "12px",
                      border: "none",
                      background: selectedWorker === worker ? "#2563eb" : "#e5e7eb",
                      color: selectedWorker === worker ? "#fff" : "#111827",
                      fontWeight: "bold"
                    }}
                  >
                    {worker}
                  </button>
                ))}
              </div>
            )}

            <h2 style={{ fontSize: "32px", marginBottom: "12px" }}>
              設備 {selectedMachine || "-"}
            </h2>

            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "12px",
                fontSize: "24px",
                fontWeight: "bold",
                marginBottom: "12px",
                cursor: "pointer"
              }}
            >
              今日のみ

              <input
                type="checkbox"
                checked={showTodayOnly}
                onChange={() => setShowTodayOnly(prev => !prev)}
                style={{ display: "none" }}
              />

              <span
                style={{
                  width: "76px",
                  height: "40px",
                  borderRadius: "999px",
                  background: showTodayOnly ? "#16a34a" : "#9ca3af",
                  position: "relative",
                  display: "inline-block"
                }}
              >
                <span
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "999px",
                    background: "#fff",
                    position: "absolute",
                    top: "4px",
                    left: showTodayOnly ? "40px" : "4px"
                  }}
                />
              </span>
            </label>
            <div
              style={{
                display: "flex",
                flexDirection: isMobile ? "column" : "row",
                gap: "16px",
                marginBottom: "16px"
              }}
            >

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "22px", fontWeight: "bold" }}>
                  日報番号検索
                </div>
                <input
                  type="text"
                  value={inputDailyNo}
                  onChange={(e) => setInputDailyNo(e.target.value)}
                  style={{
                    width: "100%",
                    height: "58px",
                    fontSize: "26px",
                    padding: "8px"
                  }}
                />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ fontSize: "22px", fontWeight: "bold" }}>
                  振替検索
                </div>
                <input
                  type="text"
                  value={moveDailyNo}
                  onChange={(e) => setMoveDailyNo(e.target.value)}
                  style={{
                    width: "100%",
                    height: "58px",
                    fontSize: "26px",
                    padding: "8px"
                  }}
                />
              </div>
            </div>

            <div style={{ fontSize: "22px", fontWeight: "bold", marginBottom: "12px" }}>
              該当件数：{filtered.length}件
            </div>

            <div
              style={{
                display: "flex",
                gap: "12px",
                overflowX: "auto",
                marginBottom: "18px"
              }}
            >
              {filtered.slice(0, 30).map(e => {
                const selected = String(inputDailyNo) === String(e.dailyNo)

                return (
                  <div
                    key={`card-${e.id}`}
                    onClick={() => setInputDailyNo(String(e.dailyNo))}
                    style={{
                      minWidth: "160px",
                      padding: "14px",
                      borderRadius: "16px",
                      background: selected ? "#2563eb" : "#ffffff",
                      border: selected ? "3px solid #1d4ed8" : "2px solid #d1d5db",
                      boxShadow: "0 4px 10px rgba(0,0,0,0.08)",
                      cursor: "pointer"
                    }}
                  >
                    <div
                      style={{
                        fontSize: "28px",
                        fontWeight: "900",
                        color: selected ? "#ffffff" : "#111827"
                      }}
                    >
                      {e.dailyNo}
                    </div>

                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: "700",
                        color: selected ? "#ffffff" : "#374151"
                      }}
                    >
                      {e.process}
                    </div>
                  </div>
                )
              })}
            </div>

            {filtered
              .filter(e => String(e.dailyNo) === String(inputDailyNo))
              .map(e => {
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
                    key={`detail-${e.id}`}
                    style={{
                      marginBottom: "18px",
                      padding: "20px",
                      borderRadius: "22px",
                      background: "#fff",
                      boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
                      border: isWorking
                        ? "4px solid #f59e0b"
                        : e.isCompleted
                          ? "4px solid #9ca3af"
                          : "4px solid #e5e7eb"
                    }}
                  >
                    <div style={{ fontSize: "42px", fontWeight: "900" }}>
                      {e.dailyNo}
                    </div>

                    <div style={{ fontSize: "24px", fontWeight: "800" }}>
                      {e.process}
                    </div>

                    <div style={{ fontSize: "20px", fontWeight: "bold" }}>
                      作業者：{last?.worker || "-"}
                    </div>

                    <div style={{ fontSize: "20px", fontWeight: "bold" }}>
                      作業者：{last?.worker || "-"}
                    </div>

                    <div>自動：{totalWork.toFixed(1)}</div>

                    <div>
                      実投入：
                      {e.manualWork !== undefined ? e.manualWork.toFixed(1) : "-"}
                    </div>

                    <div>
                      差異：
                      {e.manualWork !== undefined
                        ? (e.manualWork - totalWork).toFixed(1)
                        : "-"}
                    </div>

                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      placeholder="0.0"
                      value={e.manualWork ?? ""}
                      onChange={(event) => {
                        const value = event.target.value

                        setEvents(prev =>
                          prev.map(ev =>
                            ev.id === e.id
                              ? {
                                ...ev,
                                manualWork: value === "" ? undefined : parseFloat(value)
                              }
                              : ev
                          )
                        )
                      }}
                      style={{
                        width: "140px",
                        height: "70px",
                        fontSize: "36px",
                        fontWeight: "900",
                        textAlign: "center",
                        borderRadius: "14px",
                        border: "2px solid #9ca3af",
                        marginRight: "12px"
                      }}
                    />

                    <button
                      onClick={() => handleWork(e.id)}
                      style={{
                        fontSize: isMobile ? "24px" : "26px",
                        padding: isMobile ? "16px 24px" : "16px 32px",
                        margin: "8px",
                        minWidth: isMobile ? "130px" : "160px",
                        background: isWorking ? "#f59e0b" : "#16a34a",
                        color: "#fff",
                        border: "none",
                        borderRadius: "12px",
                        fontWeight: "bold"
                      }}
                    >
                      {isWorking ? "中断" : "開始"}
                    </button>

                    <button
                      onClick={() => completeWork(e.id)}
                      style={{
                        fontSize: "22px",
                        padding: "14px 24px",
                        margin: "6px"
                      }}
                    >
                      工程完了
                    </button>

                    {e.isCompleted && (
                      <button
                        onClick={() => undoComplete(e.id)}
                        style={{
                          fontSize: "22px",
                          padding: "14px 24px",
                          margin: "6px"
                        }}
                      >
                        完了解除
                      </button>
                    )}
                  </div>
                )
              })}
          </>
        )}
    </>
  )
}