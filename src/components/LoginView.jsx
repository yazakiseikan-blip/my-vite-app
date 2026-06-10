import { useStore } from "../store/useStore"

export default function LoginView() {
  const setScreenMode = useStore(s => s.setScreenMode)

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>生産計画システム</h1>
        <p style={styles.subTitle}>利用する画面を選択してください</p>

        <button
          style={styles.adminButton}
          onClick={() => setScreenMode("gantt")}
        >
          生産管理PC
          <span style={styles.smallText}>ガント編集・計画作成</span>
        </button>

        <button
          style={styles.tabletButton}
          onClick={() => setScreenMode("tablet")}
        >
          現場スマホ・タブレット
          <span style={styles.smallText}>閲覧・実績入力</span>
        </button>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#eef2f7",
    fontFamily: "system-ui, sans-serif"
  },
  card: {
    width: "420px",
    background: "#fff",
    padding: "36px",
    borderRadius: "24px",
    boxShadow: "0 14px 35px rgba(0,0,0,0.18)",
    textAlign: "center"
  },
  title: {
    fontSize: "32px",
    fontWeight: "900",
    marginBottom: "8px"
  },
  subTitle: {
    fontSize: "16px",
    color: "#6b7280",
    marginBottom: "28px"
  },
  adminButton: {
    width: "100%",
    padding: "18px",
    marginBottom: "14px",
    border: "none",
    borderRadius: "16px",
    background: "#2563eb",
    color: "#fff",
    fontSize: "20px",
    fontWeight: "900",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },
  tabletButton: {
    width: "100%",
    padding: "18px",
    border: "none",
    borderRadius: "16px",
    background: "#16a34a",
    color: "#fff",
    fontSize: "20px",
    fontWeight: "900",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    gap: "4px"
  },
  smallText: {
    fontSize: "13px",
    fontWeight: "600",
    opacity: 0.9
  }
}