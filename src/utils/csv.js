export const clean = (str) => {
    return str
        ?.replace(/^"+|"+$/g, "")
        .replace(/\r/g, "")
        .replace(/\n/g, "")
        .trim()
}

export const parseDate = (str) => {
    if (!str) return null

    const cleaned = str.trim().split(" ")[0]
    const normalized = cleaned.replace(/\//g, "-")
    const [y, m, d] = normalized.split("-")

    if (!y || !m || !d) return null

    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

export const calcEnd = (start, work) => {
    const base = new Date(start + "T00:00:00")
    if (isNaN(base)) return start

    const days = work / 10
    const endDate = new Date(base.getTime() + days * 86400000)

    return endDate.toISOString()
}

export const parseProductionCsv = (text) => {
    const lines = text
        .replace(/\r/g, "")
        .split("\n")
        .filter(l => l.trim())

    const data = lines.slice(1)
    const batchId = `IMP-${new Date().toISOString().slice(0, 10)}`

    return data.map((line, index) => {
        const c = line
            .replace(/^"+|"+$/g, "")
            .split(",")
            .map(v => v.trim())

        const work = parseFloat(clean(c[3] || "1"))
        const fixedStart = parseDate(clean(c[2])) || ""

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

        return {
            id: Date.now() + "-" + index,
            PlanId: `PL-${Date.now()}-${index}`,
            ImportBatchId: `IMP-${new Date().toISOString().slice(0, 10)}`,
            ImportKey: `${clean(c[0])}_${clean(c[1])}_${index}`,

            dailyNo: clean(c[0]),
            title: `${clean(c[0])} ${clean(c[1])}`,
            process: clean(c[1]),
            work,
            order: index,
            resourceId: clean(c[4])?.trim() || "A",
            actualMachine: null,
            start: start + "T00:00:00",
            end: calcEnd(start, work),

            status: "未着手",
            isAdditional: false,
            additionalReason: "",
            registeredBy: "",
            createdAt: new Date().toISOString()
        }
    }).filter(e => e !== null)
}