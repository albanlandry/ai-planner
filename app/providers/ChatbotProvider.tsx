"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type ChatbotSettings = {
  model: string;
  temperature: number;
  proactive: boolean;
};

type ChatbotContextType = {
  settings: ChatbotSettings;
  setSettings: (s: ChatbotSettings) => void;
};

const ChatbotContext = createContext<ChatbotContextType | undefined>(undefined);

interface ChatbotProviderProps {
  children: React.ReactNode;
  floating?: React.ReactNode; // floating assistant UI injected here
}

export function ChatbotProvider({ children, floating }: ChatbotProviderProps) {
  const [settings, setSettingsState] = useState<ChatbotSettings>(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("chatbotSettings");
        if (raw) return JSON.parse(raw);
      } catch {}
    }
    return {
      model: process.env.NEXT_PUBLIC_OPENAI_MODEL || "gpt-3.5-turbo",
      temperature: 0.7,
      proactive: true,
    };
  });

  const setSettings = (s: ChatbotSettings) => {
    setSettingsState(s);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("chatbotSettings", JSON.stringify(s));
      } catch {}
    }
  };

  const value = useMemo(() => ({ settings, setSettings }), [settings]);

  return (
    <ChatbotContext.Provider value={value}>
      {children}
      {floating}
    </ChatbotContext.Provider>
  );
}

export function useChatbot() {
  const ctx = useContext(ChatbotContext);
  if (!ctx) throw new Error("useChatbot must be used within ChatbotProvider");
  return ctx;
}


