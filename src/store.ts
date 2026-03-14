import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type PerformanceScores = {
  energy: number;
  focus: number;
  mood: number;
};

export type LogEntry = {
  id: string;
  timestamp: number;
  meal: string;
  scores: PerformanceScores;
  insight?: string;
  tags: string[];
};

interface AppState {
  entries: LogEntry[];
  addEntry: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  removeEntry: (id: string) => void;
  clearEntries: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      entries: [
        {
          id: 'mock-1',
          timestamp: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
          meal: 'Oatmeal with blueberries and walnuts',
          scores: { energy: 8, focus: 9, mood: 8 },
          insight: 'Complex carbs and omega-3s noticed. Your focus remained high for 4 hours.',
          tags: ['oatmeal', 'blueberries', 'walnuts']
        },
        {
          id: 'mock-2',
          timestamp: Date.now() - 1000 * 60 * 60 * 20,
          meal: 'Large pepperoni pizza and soda',
          scores: { energy: 4, focus: 3, mood: 5 },
          insight: 'High refined carb and saturated fat intake. Significant energy crash detected 90 mins later.',
          tags: ['pizza', 'soda']
        },
        {
          id: 'mock-3',
          timestamp: Date.now() - 1000 * 60 * 60 * 16,
          meal: 'Salmon salad with olive oil dressing',
          scores: { energy: 7, focus: 8, mood: 9 },
          insight: 'Clean protein and healthy fats correlate with stable mood and sustained focus.',
          tags: ['salmon', 'salad']
        }
      ],
      addEntry: (entry) =>
        set((state) => ({
          entries: [
            {
              ...entry,
              id: crypto.randomUUID(),
              timestamp: Date.now(),
            },
            ...state.entries,
          ],
        })),
      removeEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        })),
      clearEntries: () => set({ entries: [] }),
    }),
    {
      name: 'fuel-focus-storage',
    }
  )
);
