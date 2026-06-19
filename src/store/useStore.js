import { create } from 'zustand'
import { persist } from 'zustand/middleware'


export const useStore = create(
  persist(
    (set) => ({

      events: [],

      plans: [],
      actualLogs: [],
      changeLogs: [],

      screenMode: 'login',

      setEvents: (updater) =>
        set((state) => ({
          events:
            typeof updater === "function"
              ? updater(state.events)
              : updater
        })),

      setPlans: (updater) =>
        set((state) => ({
          plans:
            typeof updater === "function"
              ? updater(state.plans)
              : updater
        })),

      setActualLogs: (updater) =>
        set((state) => ({
          actualLogs:
            typeof updater === "function"
              ? updater(state.actualLogs)
              : updater
        })),

      setChangeLogs: (updater) =>
        set((state) => ({
          changeLogs:
            typeof updater === "function"
              ? updater(state.changeLogs)
              : updater
        })),

      setScreenMode: (mode) => set({ screenMode: mode }),

    }),
    {
      name: 'gantt-storage-v2'
    }
  )
)

