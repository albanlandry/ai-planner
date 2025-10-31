"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { MessageSquare, X, Minus, Wifi, WifiOff, RefreshCw, Send, Settings as SettingsIcon } from "lucide-react";
import { useChatbot } from "@/app/providers/ChatbotProvider";

type WSState = "connecting" | "open" | "closed";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function AIFloatingChat() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 16, y: 16 });
  const dragRef = useRef<{ dragging: boolean; startX: number; startY: number; baseX: number; baseY: number }>({ dragging: false, startX: 0, startY: 0, baseX: 16, baseY: 16 });
  const [wsState, setWsState] = useState<WSState>("closed");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const { settings, setSettings } = useChatbot();
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8000";
  const WS_PATH = "/ws/ai"; // socket.io namespace path

  useEffect(() => {
    if (!open) return;
    connect();
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const connect = () => {
    try {
      setWsState("connecting");
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : undefined;
      const s = io(WS_URL, {
        path: WS_PATH,
        transports: ["websocket"],
        auth: { token },
        withCredentials: true,
      });
      socketRef.current = s;

      s.on('connect', () => setWsState('open'));
      s.on('disconnect', () => setWsState('closed'));

      s.on('chat:chunk', (data: any) => {
        try {
          if (data && typeof data.delta === 'string') {
            // append to streaming assistant message
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.role === 'assistant' && last.id.startsWith('stream-')) {
                // Update existing streaming message
                return [
                  ...prev.slice(0, -1),
                  { ...last, content: last.content + data.delta },
                ];
              }
              // Create new streaming message
              return [
                ...prev,
                { 
                  id: `stream-${Date.now()}`, 
                  role: 'assistant' as const, 
                  content: data.delta 
                },
              ];
            });
            if (!open) setUnread(true);
          }
        } catch (e) {
          console.error('chat:chunk error', e);
        }
      });
      s.on('chat:final', (data: any) => {
        try {
          if (data && typeof data.message === 'string') {
            // Save conversation_id to localStorage
            if (data.conversation_id && typeof window !== 'undefined') {
              localStorage.setItem('aiConversationId', data.conversation_id);
            }
            
            setMessages((prev) => {
              // Remove streaming message if exists
              const filtered = prev.filter(m => !m.id.startsWith('stream-'));
              // Add final message
              return [
                ...filtered,
                { 
                  id: crypto.randomUUID(), 
                  role: 'assistant' as const, 
                  content: data.message 
                },
              ];
            });
            if (!open) setUnread(true);
          }
        } catch (e) {
          console.error('chat:final error', e);
        }
      });
      s.on('chat:error', (data: any) => {
        const errorMsg = data?.message || 'Connection error';
        setMessages((prev) => [
          ...prev,
          { 
            id: crypto.randomUUID(), 
            role: 'assistant' as const, 
            content: `Error: ${errorMsg}` 
          },
        ]);
        console.error('Socket.IO error:', errorMsg);
      });
    } catch (e) {
      setWsState("closed");
    }
  };

  const cleanup = () => {
    try {
      socketRef.current?.disconnect();
    } catch {}
    socketRef.current = null;
    setWsState("closed");
  };

  const reconnect = () => {
    cleanup();
    connect();
  };

  const send = () => {
    const text = input.trim();
    if (!text) return;
    sendText(text);
  };

  const sendText = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", content: trimmed }]);
    setInput("");
    
    // Get conversation_id from localStorage
    const conversationId = typeof window !== 'undefined' 
      ? localStorage.getItem('aiConversationId') 
      : null;
    
    try {
      socketRef.current?.emit('chat:send', {
        message: trimmed,
        conversation_id: conversationId || undefined,
        model: settings.model,
        temperature: settings.temperature,
      });
    } catch (e) {
      console.error('Failed to send message:', e);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const StatusIcon = () => {
    if (wsState === "open") return <Wifi className="w-4 h-4 text-green-600" />;
    if (wsState === "connecting") return <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />;
    return <WifiOff className="w-4 h-4 text-red-600" />;
  };

  // Minimized button
  if (!open) {
    return (
      <button
        aria-label="Open AI Assistant"
        onClick={() => setOpen(true)}
        className="fixed z-50 h-12 w-12 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center hover:bg-blue-700"
        style={{ right: pos.x, bottom: pos.y, position: 'fixed' as const }}
      >
        <MessageSquare className="w-6 h-6" />
        {unread && <span className="absolute -top-1 -right-1 h-3 w-3 bg-red-500 rounded-full" />}
      </button>
    );
  }

  return (
    <div
      className="fixed z-50 w-[360px] max-w-[92vw] h-[600px] max-h-[85vh] bg-white border border-gray-200 rounded-xl shadow-2xl flex flex-col"
      style={{ right: pos.x, bottom: pos.y }}
    >
      {/* Header */}
      <div
        className="h-11 px-3 flex items-center justify-between border-b cursor-move"
        onMouseDown={(e) => {
          dragRef.current.dragging = true;
          dragRef.current.startX = e.clientX;
          dragRef.current.startY = e.clientY;
          dragRef.current.baseX = pos.x;
          dragRef.current.baseY = pos.y;
        }}
        onMouseUp={() => {
          dragRef.current.dragging = false;
        }}
        onMouseMove={(e) => {
          if (!dragRef.current.dragging) return;
          const dx = dragRef.current.startX - e.clientX;
          const dy = dragRef.current.startY - e.clientY;
          setPos({ x: Math.max(8, dragRef.current.baseX + dx), y: Math.max(8, dragRef.current.baseY + dy) });
        }}
      >
        <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
          <MessageSquare className="w-4 h-4 text-blue-600" /> AI Assistant
          <span className="ml-2 inline-flex items-center gap-1 text-xs text-gray-600">
            <StatusIcon /> {wsState}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowSettings((s) => !s)} className="p-1 text-gray-500 hover:text-gray-700" aria-label="Settings">
            <SettingsIcon className="w-4 h-4" />
          </button>
          {wsState !== "open" && (
            <button onClick={reconnect} className="p-1 text-gray-500 hover:text-gray-700" aria-label="Reconnect">
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => { setOpen(false); setUnread(false); }} className="p-1 text-gray-500 hover:text-gray-700" aria-label="Minimize">
            <Minus className="w-4 h-4" />
          </button>
          <button onClick={() => { cleanup(); setOpen(false); }} className="p-1 text-gray-500 hover:text-gray-700" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="border-b p-3 bg-gray-50">
          <div className="text-sm font-medium text-gray-800 mb-2">Assistant Settings</div>
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Model</label>
              <select
                className="w-full border border-gray-300 rounded-md p-2 text-sm"
                value={settings.model}
                onChange={(e) => setSettings({ ...settings, model: e.target.value })}
              >
                <option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
                <option value="gpt-4">gpt-4</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Temperature ({settings.temperature.toFixed(1)})</label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={settings.temperature}
                onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="proactive"
                type="checkbox"
                checked={settings.proactive}
                onChange={(e) => setSettings({ ...settings, proactive: e.target.checked })}
              />
              <label htmlFor="proactive" className="text-sm text-gray-700">Enable proactive suggestions</label>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 text-sm mt-6">
            Type your message below to start chatting.
          </div>
        )}
        {/* Quick Suggestions */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {['What do I have tomorrow?', 'Create a task to call Sarah tomorrow', 'Suggest a meeting next week'].map((s) => (
              <button key={s} onClick={() => sendText(s)} className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full border">
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                m.role === "user" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900 border border-gray-200"
              }`}
            >
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t p-2">
        <div className="flex items-end gap-2">
          <textarea
            rows={2}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={wsState === "open" ? "Message AI..." : "Connecting..."}
            className="flex-1 resize-none border border-gray-300 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={send}
            disabled={wsState !== "open" || input.trim().length === 0}
            className={`h-9 w-9 rounded-md flex items-center justify-center shadow-sm ${
              wsState !== "open" || input.trim().length === 0
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
            aria-label="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}


