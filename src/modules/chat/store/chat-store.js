import { create } from "zustand";

export const useChatStore = create((set) => ({
  activeChatId: null,
  messages: [],
  isLoading: false,
  error: null,

  setActiveChatId: (id) => set({ activeChatId: id }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) =>
    set((state) => ({
      messages: [...state.messages, message],
    })),

  updateLastMessage: (content) =>
    set((state) => {
      const messages = [...state.messages];
      if (messages.length === 0) return state;
      messages[messages.length - 1] = {
        ...messages[messages.length - 1],
        content,
      };
      return { messages };
    }),

  setIsLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  clearMessages: () => set({ messages: [] }),

  reset: () =>
    set({
      activeChatId: null,
      messages: [],
      isLoading: false,
      error: null,
    }),
}));