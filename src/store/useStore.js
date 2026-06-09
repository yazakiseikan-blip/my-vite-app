import { create } from 'zustand'
import { persist } from 'zustand/middleware'


export const useStore = create(
  persist(
    (set) => ({

      events: [],

      screenMode: 'input',

      setEvents: (updater) =>
        set((state) => ({
          events:
            typeof updater === "function"
              ? updater(state.events)
              : updater
        })),

      setScreenMode: (mode) => set({ screenMode: mode }),

    }),
    {
      name: 'gantt-storage'
    }
  )
)

