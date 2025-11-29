
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Menu, Settings, BrainCircuit } from 'lucide-react';
import { Message, Role, User, ChatSession, CodeVersion, StyleFramework, Skill, Theme } from './types';
import { sendMessageStream, initializeChat } from './services/geminiService';
import { storage } from './services/storage';
import { extractHtmlCode, generateId } from './utils/helpers';
import { ChatMessage } from './components/ChatMessage';
import { CodePreview } from './components/CodePreview';
import { Button } from './components/Button';
import { AuthModal } from './components/AuthModal';
import { HistorySidebar } from './components/HistorySidebar';
import { SettingsModal } from './components/SettingsModal';
import { SkillsModal } from './components/SkillsModal';
import { Logo } from './components/Logo';
import { DEFAULT_TEST_CODE } from './constants';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<Theme>('dark');
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSkillsOpen, setIsSkillsOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Apply theme class to body
  useEffect(() => {
    const loadedTheme = storage.getTheme();
    setTheme(loadedTheme);
    if (loadedTheme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    storage.saveTheme(newTheme);
    if (newTheme === 'dark') {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  };

  // Helper to get enabled skills string
  const getEnabledSkillsContext = useCallback((currentSkills: Skill[]) => {
    return currentSkills
      .filter(s => s.isEnabled)
      .map(s => `${s.name}:\n${s.content}`)
      .join('\n\n');
  }, []);

  useEffect(() => {
    const loadedUser = storage.getUser();
    if (loadedUser) setUser(loadedUser);
    
    const loadedSessions = storage.getSessions();
    setSessions(loadedSessions);

    const loadedSkills = storage.getSkills();
    setSkills(loadedSkills);

    if (loadedSessions.length > 0) {
      setActiveSessionId(loadedSessions[0].id);
      initializeChat(
        loadedSessions[0].framework, 
        loadedSessions[0].messages, 
        getEnabledSkillsContext(loadedSkills)
      );
    } else {
      createNewSession(loadedSkills);
    }
  }, [getEnabledSkillsContext]);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession ? activeSession.messages : [];
  const currentVersionIndex = activeSession ? activeSession.currentVersionIndex : 0;
  const versions = activeSession ? activeSession.codeVersions : [];
  const currentCode = versions.length > 0 && versions[currentVersionIndex] ? versions[currentVersionIndex].code : null;
  const testCode = activeSession?.testCode || DEFAULT_TEST_CODE;

  // Re-initialize chat when switching sessions
  useEffect(() => {
    if (activeSession) {
      initializeChat(
        activeSession.framework, 
        activeSession.messages,
        getEnabledSkillsContext(skills)
      );
      scrollToBottom();
    }
  }, [activeSessionId]);

  const createNewSession = useCallback((currentSkills = skills) => {
    const newSession: ChatSession = {
      id: generateId(),
      title: 'New Project',
      messages: [{
        id: generateId(),
        role: Role.MODEL,
        content: "I'm VibeCoder. What are we building?",
        timestamp: Date.now(),
      }],
      codeVersions: [],
      currentVersionIndex: 0,
      createdAt: Date.now(),
      lastModified: Date.now(),
      framework: 'tailwind',
      testCode: DEFAULT_TEST_CODE
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    storage.saveSession(newSession);
    initializeChat(newSession.framework, newSession.messages, getEnabledSkillsContext(currentSkills));
    if (window.innerWidth < 768) setIsHistoryOpen(false);
  }, [skills, getEnabledSkillsContext]);

  const updateActiveSession = (updates: Partial<ChatSession>) => {
    if (!activeSessionId) return;
    setSessions(prev => prev.map(session => {
      if (session.id === activeSessionId) {
        const updated = { ...session, ...updates, lastModified: Date.now() };
        storage.saveSession(updated);
        return updated;
      }
      return session;
    }));
  };

  const handleFrameworkChange = (framework: StyleFramework) => {
    if (!activeSession) return;
    updateActiveSession({ framework });
    initializeChat(framework, activeSession.messages, getEnabledSkillsContext(skills));
    const systemMsg: Message = {
      id: generateId(),
      role: Role.MODEL,
      content: `Framework switched to ${framework}.`,
      timestamp: Date.now()
    };
    updateActiveSession({
      messages: [...activeSession.messages, systemMsg],
      framework
    });
  };

  const handleSkillsSave = (newSkills: Skill[]) => {
    setSkills(newSkills);
    storage.saveSkills(newSkills);
    // Re-initialize chat with new skills context if we have an active session
    if (activeSession) {
      initializeChat(activeSession.framework, activeSession.messages, getEnabledSkillsContext(newSkills));
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const handleSendMessage = useCallback(async () => {
    if (!inputValue.trim() || isThinking || !activeSessionId) return;
    const userMessage: Message = {
      id: generateId(),
      role: Role.USER,
      content: inputValue.trim(),
      timestamp: Date.now(),
    };

    updateActiveSession({
      messages: [...(activeSession?.messages || []), userMessage],
      title: activeSession?.messages.length === 1 ? userMessage.content.slice(0, 30) : activeSession?.title
    });
    
    setInputValue('');
    setIsThinking(true);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    try {
      const modelMessageId = generateId();
      const initialModelMessage: Message = {
        id: modelMessageId,
        role: Role.MODEL,
        content: '',
        timestamp: Date.now(),
      };

      updateActiveSession({
        messages: [...(activeSession?.messages || []), userMessage, initialModelMessage]
      });

      let accumulatedText = "";
      
      await sendMessageStream(userMessage.content, (streamedText) => {
        accumulatedText = streamedText;
        setSessions(prev => prev.map(session => {
           if (session.id === activeSessionId) {
             const updatedMessages = session.messages.map(msg => 
               msg.id === modelMessageId ? { ...msg, content: streamedText } : msg
             );
             return { ...session, messages: updatedMessages };
           }
           return session;
        }));
      });

      const extractedCode = extractHtmlCode(accumulatedText);
      if (extractedCode) {
         setSessions(prev => prev.map(session => {
            if (session.id === activeSessionId) {
               const newVersion: CodeVersion = {
                 id: generateId(),
                 code: extractedCode,
                 timestamp: Date.now()
               };
               const updatedSession = {
                 ...session,
                 messages: session.messages.map(msg => 
                    msg.id === modelMessageId ? { ...msg, content: accumulatedText } : msg
                 ),
                 codeVersions: [...session.codeVersions, newVersion],
                 currentVersionIndex: session.codeVersions.length
               };
               storage.saveSession(updatedSession);
               return updatedSession;
            }
            return session;
         }));
      } else {
         setSessions(prev => {
            const session = prev.find(s => s.id === activeSessionId);
            if (session) storage.saveSession(session);
            return prev;
         });
      }

    } catch (error) {
      updateActiveSession({
        messages: [...(activeSession?.messages || []), {
          id: generateId(),
          role: Role.MODEL,
          content: "I encountered an error. Please try again.",
          timestamp: Date.now()
        }]
      });
    } finally {
      setIsThinking(false);
    }
  }, [inputValue, isThinking, activeSessionId, activeSession]);

  const handleUndo = () => {
    if (!activeSession || activeSession.currentVersionIndex <= 0) return;
    updateActiveSession({ currentVersionIndex: activeSession.currentVersionIndex - 1 });
  };

  const handleRedo = () => {
    if (!activeSession || activeSession.currentVersionIndex >= activeSession.codeVersions.length - 1) return;
    updateActiveSession({ currentVersionIndex: activeSession.currentVersionIndex + 1 });
  };

  const handleCodeUpdate = (newCode: string) => {
      if (!activeSession || activeSession.codeVersions.length === 0) return;
      
      setSessions(prev => prev.map(session => {
        if (session.id === activeSessionId) {
            const updatedVersions = [...session.codeVersions];
            updatedVersions[session.currentVersionIndex] = {
                ...updatedVersions[session.currentVersionIndex],
                code: newCode
            };
            const updatedSession = { ...session, codeVersions: updatedVersions };
            storage.saveSession(updatedSession);
            return updatedSession;
        }
        return session;
      }));
  };
  
  const handleTestCodeUpdate = (newTestCode: string) => {
    updateActiveSession({ testCode: newTestCode });
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    storage.deleteSession(id);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(null);
      const remaining = sessions.filter(s => s.id !== id);
      if (remaining.length > 0) setActiveSessionId(remaining[0].id);
      else createNewSession();
    }
  };

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    storage.setUser(newUser);
  };

  const handleLogout = () => {
    storage.clearUser();
    setUser(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleInputResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
  };

  if (!user) return <AuthModal onLogin={handleLogin} />;

  return (
    <div className="flex h-screen w-full bg-md-sys-color-background text-md-sys-color-on-background overflow-hidden font-sans transition-colors duration-300">
      
      <HistorySidebar 
        sessions={sessions}
        currentSessionId={activeSessionId}
        onSelectSession={(id) => { setActiveSessionId(id); if (window.innerWidth < 768) setIsHistoryOpen(false); }}
        onNewChat={() => createNewSession(skills)}
        onDeleteSession={handleDeleteSession}
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentFramework={activeSession?.framework || 'tailwind'}
        onFrameworkChange={handleFrameworkChange}
        currentTheme={theme}
        onThemeChange={handleThemeChange}
      />
      
      <SkillsModal
        isOpen={isSkillsOpen}
        onClose={() => setIsSkillsOpen(false)}
        skills={skills}
        onSaveSkills={handleSkillsSave}
      />

      <div className="flex-1 flex flex-col h-full min-w-0 bg-md-sys-color-surface transition-colors duration-300">
        {/* M3 Top App Bar */}
        <header className="flex items-center justify-between px-4 h-16 bg-md-sys-color-surface text-md-sys-color-on-surface z-10 border-b border-md-sys-color-outline-variant/20 transition-colors duration-300">
          <div className="flex items-center gap-4">
            <Button variant="icon" onClick={() => setIsHistoryOpen(!isHistoryOpen)}>
              <Menu size={24} />
            </Button>
            <div className="flex items-center gap-3">
               <Logo size={28} />
               <h1 className="font-normal text-xl tracking-tight">VibeCoder</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="icon" onClick={() => setIsSkillsOpen(true)} title="Skills">
               <BrainCircuit size={24} />
            </Button>
            <Button variant="icon" onClick={() => setIsSettingsOpen(true)} title="Settings">
              <Settings size={24} />
            </Button>
            <div className="w-8 h-8 rounded-full bg-md-sys-color-primary-container text-md-sys-color-on-primary-container flex items-center justify-center text-sm font-bold ml-2">
               {user.username.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
           {/* Chat Area */}
           <div className={`flex flex-col w-full md:w-1/2 lg:w-[45%] h-full ${activeSession?.codeVersions.length ? 'hidden md:flex' : 'flex'}`}>
              <div className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth p-2">
                  {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))}
                  {isThinking && (
                     <div className="flex items-center gap-3 px-6 py-4 opacity-70">
                       <div className="w-2 h-2 bg-md-sys-color-primary rounded-full animate-bounce" />
                       <div className="w-2 h-2 bg-md-sys-color-primary rounded-full animate-bounce delay-75" />
                       <div className="w-2 h-2 bg-md-sys-color-primary rounded-full animate-bounce delay-150" />
                     </div>
                  )}
                  <div ref={messagesEndRef} />
              </div>

              {/* Input Area - M3 Style */}
              <div className="p-4 bg-md-sys-color-surface transition-colors duration-300">
                <div className="relative flex items-end gap-2 p-1 bg-md-sys-color-surface-container-high rounded-[28px] border-2 border-transparent focus-within:border-md-sys-color-primary transition-all">
                  <textarea
                    ref={textareaRef}
                    value={inputValue}
                    onChange={handleInputResize}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe your UI..."
                    className="flex-1 max-h-[200px] min-h-[56px] w-full bg-transparent text-md-sys-color-on-surface placeholder:text-md-sys-color-on-surface-variant text-base px-6 py-4 focus:outline-none resize-none overflow-y-auto"
                    rows={1}
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={!inputValue.trim() || isThinking}
                    variant="filled"
                    className="mb-2 mr-2 w-10 h-10 min-w-[40px] min-h-[40px] p-0"
                  >
                    <Send size={20} />
                  </Button>
                </div>
              </div>
           </div>

           {/* Canvas Area */}
           <div className={`flex-1 flex-col h-full ${activeSession?.codeVersions.length ? 'flex' : 'hidden md:flex'}`}>
              <CodePreview 
                code={currentCode} 
                testCode={testCode}
                versions={versions}
                currentVersionIndex={currentVersionIndex}
                onUndo={handleUndo}
                onRedo={handleRedo}
                onCodeChange={handleCodeUpdate}
                onTestCodeChange={handleTestCodeUpdate}
              />
           </div>
        </div>
      </div>
    </div>
  );
}