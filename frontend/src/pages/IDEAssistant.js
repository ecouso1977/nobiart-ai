import { useState, useRef, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import axios from "axios";
import {
  Code2, Send, Sparkles, Bug, Wrench, FileCode2, Eye,
  Copy, Trash2, ChevronDown, Play, RotateCcw, Download,
  MessageSquare, Zap, CheckCheck, Loader2, Plus, X,
  Terminal, GitBranch, Globe
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const LANGUAGES = [
  { id: "python", label: "Python", color: "#3B82F6", ext: ".py" },
  { id: "javascript", label: "JavaScript", color: "#F59E0B", ext: ".js" },
  { id: "typescript", label: "TypeScript", color: "#06B6D4", ext: ".ts" },
  { id: "react", label: "React / JSX", color: "#61DAFB", ext: ".jsx" },
  { id: "java", label: "Java", color: "#FF007A", ext: ".java" },
  { id: "cpp", label: "C++", color: "#9D4CDD", ext: ".cpp" },
  { id: "go", label: "Go", color: "#00E5FF", ext: ".go" },
  { id: "rust", label: "Rust", color: "#E2FF31", ext: ".rs" },
  { id: "sql", label: "SQL", color: "#FF6B35", ext: ".sql" },
  { id: "bash", label: "Bash / Shell", color: "#00FF9D", ext: ".sh" },
];

const ACTIONS = [
  { id: "explain", label: "Explain", icon: Eye, color: "#00E5FF", desc: "Understand what this code does" },
  { id: "debug", label: "Debug", icon: Bug, color: "#FF007A", desc: "Find and fix bugs" },
  { id: "refactor", label: "Refactor", icon: Wrench, color: "#E2FF31", desc: "Improve code quality" },
  { id: "complete", label: "Complete", icon: Zap, color: "#9D4CDD", desc: "Fill in missing logic" },
  { id: "review", label: "Review", icon: Eye, color: "#00FF9D", desc: "Full code review" },
];

const STARTER_SNIPPETS = {
  python: `def fibonacci(n):
    """Return the nth Fibonacci number."""
    if n <= 0:
        return 0
    elif n == 1:
        return 1
    # TODO: implement recursive case
    pass

# Test the function
print(fibonacci(10))`,
  javascript: `async function fetchUserData(userId) {
  // TODO: add error handling
  const response = await fetch(\`/api/users/\${userId}\`);
  const data = response.json();
  return data;
}

fetchUserData(42).then(console.log);`,
  typescript: `interface User {
  id: number;
  name: string;
  email: string;
}

// TODO: fix type errors and add validation
function processUsers(users: any[]): User[] {
  return users.map(u => ({
    id: u.id,
    name: u.name,
  }));
}`,
  react: `import { useState, useEffect } from 'react';

function DataTable({ endpoint }) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  // TODO: implement data fetching with error handling
  useEffect(() => {
    setLoading(true);
  }, [endpoint]);

  return (
    <div>
      {loading ? <p>Loading...</p> : null}
    </div>
  );
}`,
  java: `public class BinarySearch {
    public static int search(int[] arr, int target) {
        int left = 0;
        int right = arr.length - 1;

        // TODO: implement binary search
        while (left <= right) {
            // add logic here
        }
        return -1;
    }
}`,
  go: `package main

import "fmt"

func reverseString(s string) string {
    // TODO: implement without using built-in reverse
    return s
}

func main() {
    fmt.Println(reverseString("hello world"))
}`,
  sql: `-- Find top 10 customers by total order value
SELECT
    c.customer_id,
    c.name,
    -- TODO: calculate total order value
    COUNT(o.id) as order_count
FROM customers c
-- TODO: join with orders table
GROUP BY c.customer_id, c.name
ORDER BY order_count DESC
LIMIT 10;`,
  bash: `#!/bin/bash
# Backup script for important directories

SOURCE_DIR="/var/www"
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# TODO: add error checking and logging
tar -czf "$BACKUP_DIR/backup_$DATE.tar.gz" "$SOURCE_DIR"
echo "Backup completed: backup_$DATE.tar.gz"`,
};

function formatMarkdown(text) {
  if (!text) return "";
  return text
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<div class="code-block"><div class="code-lang">${lang || "code"}</div><pre><code>${code.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre></div>`
    )
    .replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>')
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/^### (.+)$/gm, '<h3 class="md-h3">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="md-h2">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="md-h1">$1</h1>')
    .replace(/^- (.+)$/gm, '<li class="md-li">$1</li>')
    .replace(/(<li[\s\S]*?<\/li>)/g, '<ul class="md-ul">$1</ul>')
    .replace(/^\d+\. (.+)$/gm, '<li class="md-oli">$1</li>')
    .replace(/\n\n/g, '</p><p class="md-p">')
    .replace(/^(?!<[huplic])/gm, "")
    .trim();
}

export default function IDEAssistant() {
  const [code, setCode] = useState(STARTER_SNIPPETS.python);
  const [language, setLanguage] = useState(LANGUAGES[0]);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "# Welcome to the Nobisys AI Coding Assistant\n\nI'm your expert AI pair programmer, powered by Nobisys. I can help you:\n\n- **Explain** complex code logic clearly\n- **Debug** errors and find hidden issues\n- **Refactor** code for performance and readability\n- **Complete** unfinished implementations\n- **Review** your code with professional feedback\n\nPaste your code on the left and choose an action, or type a question below.",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [activeTab, setActiveTab] = useState("editor");
  const [scrollTop, setScrollTop] = useState(0);

  const textareaRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const chatEndRef = useRef(null);
  const langMenuRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleClick = (e) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const lineCount = code.split("\n").length;

  const handleScroll = useCallback((e) => {
    if (lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = e.target.scrollTop;
    }
    setScrollTop(e.target.scrollTop);
  }, []);

  const handleTabKey = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = e.target.selectionStart;
      const end = e.target.selectionEnd;
      const newCode = code.substring(0, start) + "  " + code.substring(end);
      setCode(newCode);
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 2;
          textareaRef.current.selectionEnd = start + 2;
        }
      });
    }
  };

  const sendAction = async (action, customPrompt = null) => {
    if (!code.trim()) return;
    setLoading(true);

    const userMsg = {
      role: "user",
      content: customPrompt || `**${action.charAt(0).toUpperCase() + action.slice(1)}** this ${language.label} code`,
      action,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const { data } = await axios.post(
        `${API}/code/assist`,
        { code, language: language.id, action, custom_prompt: customPrompt },
        { withCredentials: true }
      );
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.response, timestamp: new Date() },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "**Error:** Failed to get AI response. Please check your connection and try again.",
          timestamp: new Date(),
          error: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const sendCustom = async () => {
    if (!inputText.trim() || loading) return;
    const prompt = inputText.trim();
    setInputText("");
    await sendAction("custom", prompt);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendCustom();
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearCode = () => {
    setCode(STARTER_SNIPPETS[language.id] || "// Start coding here...");
    setMessages((m) => [m[0]]);
  };

  const switchLanguage = (lang) => {
    setLanguage(lang);
    setCode(STARTER_SNIPPETS[lang.id] || `// ${lang.label} code here...`);
    setShowLangMenu(false);
  };

  const downloadCode = () => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `code${language.ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearChat = () => {
    setMessages((m) => [m[0]]);
  };

  return (
    <div className="flex min-h-screen bg-[#050505]">
      <Navbar />

      <main className="flex-1 md:ml-64 flex flex-col h-screen overflow-hidden">
        {/* Top Bar */}
        <div className="flex-shrink-0 bg-[#0A0A0E] border-b border-white/8 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00E5FF] to-[#9D4CDD] flex items-center justify-center shadow-[0_0_16px_rgba(0,229,255,0.3)]">
              <Code2 size={15} className="text-white" />
            </div>
            <div>
              <h1
                className="text-white font-bold text-base leading-none"
                style={{ fontFamily: "Unbounded, sans-serif" }}
              >
                IDE <span className="text-[#00E5FF]">Assistant</span>
              </h1>
              <p className="text-[#50505C] text-[10px] tracking-widest uppercase mt-0.5">
                Powered by Nobisys · AI Pair Programmer
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00FF9D]/8 border border-[#00FF9D]/20">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00FF9D] animate-pulse" />
              <span className="text-[#00FF9D] text-xs font-medium">Live</span>
            </div>
            <a
              href="https://www.nobisys.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/8 transition-all text-[#A0A0AB] hover:text-white text-xs"
            >
              <Globe size={12} />
              nobisys.com
            </a>
          </div>
        </div>

        {/* Mobile Tabs */}
        <div className="md:hidden flex-shrink-0 flex border-b border-white/8 bg-[#0A0A0E]">
          {["editor", "chat"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 text-sm font-medium capitalize transition-all ${
                activeTab === tab
                  ? "text-[#00E5FF] border-b-2 border-[#00E5FF]"
                  : "text-[#70707C]"
              }`}
            >
              {tab === "editor" ? <FileCode2 size={14} className="inline mr-1.5" /> : <MessageSquare size={14} className="inline mr-1.5" />}
              {tab}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* === LEFT: CODE EDITOR === */}
          <div
            className={`${
              activeTab === "chat" ? "hidden" : "flex"
            } md:flex flex-col w-full md:w-[55%] border-r border-white/8 overflow-hidden`}
          >
            {/* Editor Toolbar */}
            <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2 bg-[#0D0D12] border-b border-white/8">
              {/* Window Dots */}
              <div className="flex items-center gap-1.5 mr-2">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
              </div>

              {/* File Tab */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-t bg-[#1A1A24] border border-white/10 border-b-0 text-xs text-white">
                <FileCode2 size={11} style={{ color: language.color }} />
                <span>main{language.ext}</span>
                <div className="w-1 h-1 rounded-full bg-[#FF007A] ml-1" title="unsaved" />
              </div>

              <div className="flex-1" />

              {/* Language Selector */}
              <div className="relative" ref={langMenuRef}>
                <button
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs hover:bg-white/8 transition-all"
                  style={{ color: language.color }}
                >
                  <span className="font-medium">{language.label}</span>
                  <ChevronDown size={10} className={`transition-transform ${showLangMenu ? "rotate-180" : ""}`} />
                </button>
                {showLangMenu && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-[#0F0F13] border border-white/15 rounded-xl overflow-hidden z-50 shadow-2xl">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.id}
                        onClick={() => switchLanguage(lang)}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs hover:bg-white/5 transition-colors ${
                          language.id === lang.id ? "bg-white/5" : ""
                        }`}
                      >
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: lang.color }} />
                        <span className={language.id === lang.id ? "text-white font-medium" : "text-[#A0A0AB]"}>
                          {lang.label}
                        </span>
                        {language.id === lang.id && <CheckCheck size={10} className="ml-auto text-[#00E5FF]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Editor Actions */}
              <button onClick={copyCode} title="Copy code" className="p-1.5 rounded-lg text-[#70707C] hover:text-white hover:bg-white/5 transition-all">
                {copied ? <CheckCheck size={13} className="text-[#00FF9D]" /> : <Copy size={13} />}
              </button>
              <button onClick={downloadCode} title="Download" className="p-1.5 rounded-lg text-[#70707C] hover:text-white hover:bg-white/5 transition-all">
                <Download size={13} />
              </button>
              <button onClick={clearCode} title="Reset to starter" className="p-1.5 rounded-lg text-[#70707C] hover:text-white hover:bg-white/5 transition-all">
                <RotateCcw size={13} />
              </button>
            </div>

            {/* Editor Area */}
            <div className="flex-1 flex overflow-hidden bg-[#080810] font-mono text-sm">
              {/* Line Numbers */}
              <div
                ref={lineNumbersRef}
                className="select-none overflow-hidden flex-shrink-0 pt-4 pb-4 pr-3 pl-3 text-right"
                style={{
                  width: "48px",
                  color: "#3A3A4A",
                  fontSize: "12px",
                  lineHeight: "1.6",
                  letterSpacing: "0.02em",
                  borderRight: "1px solid rgba(255,255,255,0.05)",
                  overflowY: "hidden",
                  fontFamily: "JetBrains Mono, monospace",
                }}
              >
                {Array.from({ length: Math.max(lineCount, 20) }, (_, i) => (
                  <div key={i + 1} style={{ height: "19.2px" }}>
                    {i + 1}
                  </div>
                ))}
              </div>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onScroll={handleScroll}
                onKeyDown={handleTabKey}
                spellCheck={false}
                data-testid="code-editor"
                className="flex-1 resize-none outline-none bg-transparent text-[#E2E8F0] p-4 pl-4 leading-relaxed"
                style={{
                  fontFamily: "JetBrains Mono, monospace",
                  fontSize: "13px",
                  lineHeight: "1.6",
                  caretColor: "#00E5FF",
                  minHeight: "100%",
                }}
                placeholder="// Paste your code here..."
              />
            </div>

            {/* Action Buttons */}
            <div className="flex-shrink-0 bg-[#0A0A0E] border-t border-white/8 px-3 py-2.5">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[#50505C] text-[10px] uppercase tracking-widest mr-1">AI Actions:</span>
                {ACTIONS.map(({ id, label, icon: Icon, color, desc }) => (
                  <button
                    key={id}
                    onClick={() => sendAction(id)}
                    disabled={loading || !code.trim()}
                    title={desc}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 active:scale-95"
                    style={{
                      backgroundColor: `${color}12`,
                      border: `1px solid ${color}25`,
                      color,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = `${color}22`;
                      e.currentTarget.style.boxShadow = `0 0 12px ${color}30`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = `${color}12`;
                      e.currentTarget.style.boxShadow = "none";
                    }}
                  >
                    {loading ? <Loader2 size={11} className="animate-spin" /> : <Icon size={11} />}
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Bar */}
            <div className="flex-shrink-0 bg-[#0D0D12] border-t border-white/5 px-3 py-1 flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Terminal size={10} className="text-[#40404C]" />
                <span className="text-[#40404C] text-[10px]">{lineCount} lines</span>
              </div>
              <div className="flex items-center gap-1.5">
                <GitBranch size={10} className="text-[#40404C]" />
                <span className="text-[#40404C] text-[10px]">main</span>
              </div>
              <div className="flex items-center gap-1.5 ml-auto">
                <div className="w-1 h-1 rounded-full" style={{ backgroundColor: language.color }} />
                <span className="text-[#40404C] text-[10px]">{language.label}</span>
              </div>
              <span className="text-[#30303C] text-[10px]">UTF-8</span>
            </div>
          </div>

          {/* === RIGHT: AI CHAT === */}
          <div
            className={`${
              activeTab === "editor" ? "hidden" : "flex"
            } md:flex flex-col w-full md:w-[45%] overflow-hidden`}
          >
            {/* Chat Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-[#0A0A0E] border-b border-white/8">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#FF007A] to-[#9D4CDD] flex items-center justify-center">
                  <Sparkles size={13} className="text-white" />
                </div>
                <div>
                  <p className="text-white text-xs font-semibold">Nobisys AI</p>
                  <p className="text-[#40404C] text-[10px]">Expert coding assistant</p>
                </div>
              </div>
              <button
                onClick={clearChat}
                title="Clear chat"
                className="p-1.5 rounded-lg text-[#50505C] hover:text-white hover:bg-white/5 transition-all"
              >
                <Trash2 size={13} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-thin">
              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                  {/* Avatar */}
                  <div
                    className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
                      msg.role === "assistant"
                        ? "bg-gradient-to-br from-[#FF007A] to-[#9D4CDD]"
                        : "bg-gradient-to-br from-[#00E5FF] to-[#9D4CDD]"
                    }`}
                  >
                    {msg.role === "assistant" ? "AI" : "ME"}
                  </div>

                  {/* Bubble */}
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-[#00E5FF]/10 border border-[#00E5FF]/20 text-[#E2E8F0] rounded-tr-sm"
                        : msg.error
                        ? "bg-[#FF007A]/8 border border-[#FF007A]/20 text-[#E2E8F0] rounded-tl-sm"
                        : "bg-[#0F0F18] border border-white/8 text-[#E2E8F0] rounded-tl-sm"
                    }`}
                  >
                    {msg.role === "user" ? (
                      <p className="text-sm">{msg.content}</p>
                    ) : (
                      <div
                        className="text-sm prose-ide"
                        dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                      />
                    )}
                    <p className="text-[10px] text-[#40404C] mt-2">
                      {msg.timestamp?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-[#FF007A] to-[#9D4CDD] flex items-center justify-center text-white text-xs font-bold">
                    AI
                  </div>
                  <div className="bg-[#0F0F18] border border-white/8 rounded-2xl rounded-tl-sm px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 size={13} className="animate-spin text-[#FF007A]" />
                      <span className="text-[#70707C] text-sm">Analyzing code...</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Prompts */}
            <div className="flex-shrink-0 border-t border-white/8 bg-[#0A0A0E] px-3 pt-2.5">
              <div className="flex gap-1.5 flex-wrap mb-2">
                {[
                  "What does this do?",
                  "Add error handling",
                  "Write unit tests",
                  "Add type hints",
                  "Optimize performance",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      setInputText(prompt);
                    }}
                    disabled={loading}
                    className="px-2.5 py-1 rounded-full text-[10px] bg-white/5 border border-white/10 text-[#A0A0AB] hover:text-white hover:bg-white/8 hover:border-white/20 transition-all disabled:opacity-40"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Input */}
            <div className="flex-shrink-0 px-3 pb-3 bg-[#0A0A0E]">
              <div className="flex items-end gap-2 bg-[#0F0F18] border border-white/10 rounded-xl p-2 focus-within:border-[#00E5FF]/40 transition-all">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder="Ask anything about your code..."
                  data-testid="chat-input"
                  className="flex-1 bg-transparent text-white text-sm placeholder-[#40404C] outline-none resize-none px-1 py-0.5 max-h-24"
                  style={{ fontFamily: "Manrope, sans-serif" }}
                />
                <button
                  onClick={sendCustom}
                  disabled={loading || !inputText.trim()}
                  data-testid="send-btn"
                  className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF007A] to-[#9D4CDD] flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(255,0,122,0.3)]"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
              <p className="text-[#30303C] text-[10px] text-center mt-1.5">
                Shift+Enter for new line · Enter to send · Powered by{" "}
                <span className="text-[#40404C]">nobisys.com</span>
              </p>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        .prose-ide h1.md-h1 { font-size: 1rem; font-weight: 700; color: #fff; margin: 0.75rem 0 0.5rem; font-family: Unbounded, sans-serif; }
        .prose-ide h2.md-h2 { font-size: 0.9rem; font-weight: 600; color: #E2E8F0; margin: 0.6rem 0 0.4rem; }
        .prose-ide h3.md-h3 { font-size: 0.85rem; font-weight: 600; color: #00E5FF; margin: 0.5rem 0 0.3rem; }
        .prose-ide p.md-p { margin: 0.4rem 0; line-height: 1.6; color: #C0C0CB; }
        .prose-ide ul.md-ul { margin: 0.3rem 0 0.3rem 0; padding: 0; list-style: none; }
        .prose-ide li.md-li { color: #C0C0CB; padding: 0.15rem 0 0.15rem 1rem; position: relative; font-size: 0.8125rem; }
        .prose-ide li.md-li::before { content: "▸"; position: absolute; left: 0; color: #FF007A; font-size: 0.65rem; top: 0.2rem; }
        .prose-ide li.md-oli { color: #C0C0CB; padding: 0.15rem 0; font-size: 0.8125rem; }
        .prose-ide strong { color: #E2FF31; font-weight: 600; }
        .prose-ide em { color: #9D4CDD; font-style: italic; }
        .inline-code { background: rgba(0,229,255,0.1); border: 1px solid rgba(0,229,255,0.2); color: #00E5FF; padding: 0.1rem 0.35rem; border-radius: 4px; font-family: JetBrains Mono, monospace; font-size: 0.78rem; }
        .code-block { margin: 0.6rem 0; border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); background: #060608; }
        .code-lang { font-size: 0.65rem; color: #50505C; text-transform: uppercase; letter-spacing: 0.1em; padding: 0.4rem 0.75rem; background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.06); font-family: JetBrains Mono, monospace; }
        .code-block pre { margin: 0; padding: 0.75rem; overflow-x: auto; }
        .code-block code { font-family: JetBrains Mono, monospace; font-size: 0.78rem; color: #C0C0CB; line-height: 1.7; white-space: pre; }
        .scrollbar-thin::-webkit-scrollbar { width: 4px; }
        .scrollbar-thin::-webkit-scrollbar-track { background: transparent; }
        .scrollbar-thin::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 2px; }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
      `}</style>
    </div>
  );
}
