
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Menu, Settings, BrainCircuit } from 'lucide-react';
import { Message, Role, User, ChatSession, CodeVersion, StyleFramework, Skill, Theme, ProjectTemplate, LLMSettings } from './types';
import { sendMessageStream, initializeChat } from './services/geminiService';
import { sendLocalMessageStream, initializeLocalChat } from './services/localLLMService';
import { sendClaudeMessageStream, initializeClaudeChat } from './services/claudeCliService';
import { storage } from './services/storage';
import { extractHtmlCode, generateId } from './utils/helpers';
import { ChatMessage } from './components/ChatMessage';
import { CodePreview } from './components/CodePreview';
import { Button } from './components/Button';
import { AuthModal } from './components/AuthModal';
import { HistorySidebar } from './components/HistorySidebar';
import { SettingsModal } from './components/SettingsModal';
import { SkillsModal } from './components/SkillsModal';
import { TemplateSelectionModal } from './components/TemplateSelectionModal';
import { Logo } from './components/Logo';
import { DEFAULT_TEST_CODE, DEFAULT_PROJECT_TEMPLATES } from './constants';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState<Theme>('dark');
  const [isHistoryOpen, setIsHistoryOpen] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSkillsOpen, setIsSkillsOpen] = useState(false);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [llmSettings, setLLMSettings] = useState<LLMSettings>(storage.getLLMSettings());

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Apply theme class to body
  useEffect(() => {
    const loadedTheme = storage.getTheme();
    setTheme(loadedTheme);
    // Remove all theme classes first
    document.body.classList.remove('dark', 'cyberpunk');
    // Add the appropriate class
    if (loadedTheme === 'dark') {
      document.body.classList.add('dark');
    } else if (loadedTheme === 'cyberpunk') {
      document.body.classList.add('cyberpunk');
    }
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    storage.saveTheme(newTheme);
    // Remove all theme classes first
    document.body.classList.remove('dark', 'cyberpunk');
    // Add the appropriate class
    if (newTheme === 'dark') {
      document.body.classList.add('dark');
    } else if (newTheme === 'cyberpunk') {
      document.body.classList.add('cyberpunk');
    }
  };

  // Helper to get enabled skills string
  const getEnabledSkillsContext = useCallback((currentSkills: Skill[]) => {
    return currentSkills
      .filter(s => s.isEnabled)
      .map(s => `${s.name}:\n${s.content}`)
      .join('\n\n');
  }, []);

  // Helper to initialize chat with the correct provider
  const initializeChatWithProvider = useCallback((
    framework: StyleFramework,
    history: Message[],
    skillsContext: string,
    settings: LLMSettings = llmSettings
  ) => {
    if (settings.provider === 'local') {
      initializeLocalChat(settings.localConfig, framework, history, skillsContext);
    } else if (settings.provider === 'claude-cli') {
      initializeClaudeChat(settings.claudeCliConfig, framework, history, skillsContext);
    } else {
      initializeChat(framework, history, skillsContext);
    }
  }, [llmSettings]);

  // Helper to send message with the correct provider
  // Note: For local LLM, initialization happens via initializeChatWithProvider before this is called
  const sendMessageWithProvider = useCallback(async (
    content: string,
    onChunk: (text: string) => void
  ): Promise<string> => {
    if (llmSettings.provider === 'local') {
      return sendLocalMessageStream(content, onChunk);
    } else if (llmSettings.provider === 'claude-cli') {
      return sendClaudeMessageStream(content, onChunk);
    } else {
      return sendMessageStream(content, onChunk);
    }
  }, [llmSettings]);

  const createNewSession = useCallback((templateId: string = 'blank', currentSkills = skills) => {
    // Look up in dynamic templates, fallback to defaults just in case
    const template = templates.find(t => t.id === templateId) || DEFAULT_PROJECT_TEMPLATES.find(t => t.id === templateId);
    
    // Initial messages based on template
    const messages: Message[] = [];
    
    if (templateId === 'blank') {
       messages.push({
        id: generateId(),
        role: Role.MODEL,
        content: "I'm VibeCoder. What are we building?",
        timestamp: Date.now(),
      });
    } else {
       // For templates, we immediately inject the prompt as a user message
       messages.push({
         id: generateId(),
         role: Role.USER,
         content: template?.prompt || "",
         timestamp: Date.now()
       });
    }

    const newSession: ChatSession = {
      id: generateId(),
      title: templateId === 'blank' ? 'New Project' : template?.name || 'New Project',
      messages: messages,
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
    initializeChatWithProvider(newSession.framework, newSession.messages, getEnabledSkillsContext(currentSkills));
    
    if (window.innerWidth < 768) setIsHistoryOpen(false);
    
    return newSession;
  }, [skills, templates, getEnabledSkillsContext, initializeChatWithProvider]);

  useEffect(() => {
    const loadedUser = storage.getUser();
    if (loadedUser) setUser(loadedUser);
    
    const loadedSessions = storage.getSessions();
    setSessions(loadedSessions);

    const loadedSkills = storage.getSkills();
    setSkills(loadedSkills);

    const loadedTemplates = storage.getTemplates();
    setTemplates(loadedTemplates);

    const loadedLLMSettings = storage.getLLMSettings();
    setLLMSettings(loadedLLMSettings);

    if (loadedSessions.length > 0) {
      setActiveSessionId(loadedSessions[0].id);
      // Use the loaded settings directly since state hasn't updated yet
      if (loadedLLMSettings.provider === 'local') {
        initializeLocalChat(
          loadedLLMSettings.localConfig,
          loadedSessions[0].framework, 
          loadedSessions[0].messages, 
          getEnabledSkillsContext(loadedSkills)
        );
      } else if (loadedLLMSettings.provider === 'claude-cli') {
        initializeClaudeChat(
          loadedLLMSettings.claudeCliConfig,
          loadedSessions[0].framework,
          loadedSessions[0].messages,
          getEnabledSkillsContext(loadedSkills)
        );
      } else {
        initializeChat(
          loadedSessions[0].framework, 
          loadedSessions[0].messages, 
          getEnabledSkillsContext(loadedSkills)
        );
      }
    } else {
      // Don't auto-create on load to avoid clutter, let user choose from template modal if they want
      // But if we truly have nothing, maybe prompt? For now, leave empty state.
      // Actually, let's select blank automatically if completely empty to show the UI
      if (loadedSessions.length === 0) {
          // We can't call createNewSession here easily because it depends on templates state which might update
          // Just let the UI handle the empty state
      }
    }
  }, [getEnabledSkillsContext]);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession ? activeSession.messages : [];
  const currentVersionIndex = activeSession ? activeSession.currentVersionIndex : 0;
  const versions = activeSession ? activeSession.codeVersions : [];
  const currentCode = versions.length > 0 && versions[currentVersionIndex] ? versions[currentVersionIndex].code : null;
  const testCode = activeSession?.testCode || DEFAULT_TEST_CODE;

  useEffect(() => {
    if (activeSession) {
      initializeChatWithProvider(
        activeSession.framework, 
        activeSession.messages,
        getEnabledSkillsContext(skills)
      );
      scrollToBottom();
    }
  }, [activeSessionId]);

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
    initializeChatWithProvider(framework, activeSession.messages, getEnabledSkillsContext(skills));
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
    if (activeSession) {
      initializeChatWithProvider(activeSession.framework, activeSession.messages, getEnabledSkillsContext(newSkills));
    }
  };

  const handleLLMSettingsChange = (newSettings: LLMSettings) => {
    setLLMSettings(newSettings);
    storage.saveLLMSettings(newSettings);
    if (activeSession) {
      initializeChatWithProvider(activeSession.framework, activeSession.messages, getEnabledSkillsContext(skills), newSettings);
    }
  };
  
  const handleSaveTemplates = (newTemplates: ProjectTemplate[]) => {
      setTemplates(newTemplates);
      storage.saveTemplates(newTemplates);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  // Handle template selection
  const handleTemplateSelect = (templateId: string) => {
      setIsTemplateModalOpen(false);
      const newSession = createNewSession(templateId);
      
      // If it's a template (not blank), trigger the generation automatically
      if (templateId !== 'blank' && newSession) {
          triggerModelGeneration(newSession.id, newSession.messages[0].content, newSession);
      }
  };

  const triggerModelGeneration = async (sessionId: string, promptText: string, sessionObj?: ChatSession) => {
      if (isThinking) return;
      setIsThinking(true);
      
      let currentSession = sessionObj || sessions.find(s => s.id === sessionId);
      if (!currentSession) {
        console.error('No session found for id:', sessionId);
        setIsThinking(false);
        return;
      }

      // Ensure chat is initialized with current provider before sending
      initializeChatWithProvider(
        currentSession.framework,
        currentSession.messages,
        getEnabledSkillsContext(skills)
      );

      try {
        const modelMessageId = generateId();
        const initialModelMessage: Message = {
            id: modelMessageId,
            role: Role.MODEL,
            content: '',
            timestamp: Date.now(),
        };

        const updatedMessages = [...currentSession.messages, initialModelMessage];
        
        setSessions(prev => prev.map(session => {
            if (session.id === sessionId) {
                const updated = { ...session, messages: updatedMessages };
                storage.saveSession(updated);
                return updated;
            }
            return session;
        }));

        let accumulatedText = "";
        
        await sendMessageWithProvider(promptText, (streamedText) => {
            accumulatedText = streamedText;
            setSessions(prev => prev.map(session => {
            if (session.id === sessionId) {
                const updatedMsgs = session.messages.map(msg => 
                    msg.id === modelMessageId ? { ...msg, content: streamedText } : msg
                );
                return { ...session, messages: updatedMsgs };
            }
            return session;
            }));
        });

        const extractedCode = extractHtmlCode(accumulatedText);
        if (extractedCode) {
            setSessions(prev => prev.map(session => {
                if (session.id === sessionId) {
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
                const session = prev.find(s => s.id === sessionId);
                if (session) storage.saveSession(session);
                return prev;
            });
        }

      } catch (error) {
        console.error(error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setSessions(prev => prev.map(session => {
             if (session.id === sessionId) {
                 const errMsg: Message = {
                    id: generateId(),
                    role: Role.MODEL,
                    content: `I encountered an error: ${errorMessage}. Please check your settings and try again.`,
                    timestamp: Date.now()
                 };
                 // Remove the empty model message if it exists
                 const filteredMessages = session.messages.filter(msg => msg.content !== '');
                 return { ...session, messages: [...filteredMessages, errMsg] };
             }
             return session;
        }));
      } finally {
        setIsThinking(false);
      }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isThinking) return;
    
    const messageContent = inputValue.trim();
    setInputValue('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    
    // If no active session, create one first
    let currentSession: ChatSession | undefined;
    let sessionId = activeSessionId;
    
    if (!sessionId) {
      const newSession = createNewSession('blank');
      sessionId = newSession.id;
      currentSession = newSession;
    } else {
      currentSession = sessions.find(s => s.id === sessionId);
    }
    
    if (!currentSession) {
      console.error('Failed to get or create session');
      return;
    }
    
    const userMessage: Message = {
      id: generateId(),
      role: Role.USER,
      content: messageContent,
      timestamp: Date.now(),
    };

    // Update the session with the user message
    const updatedSession: ChatSession = {
      ...currentSession,
      messages: [...currentSession.messages, userMessage],
      title: currentSession.messages.length <= 1 ? messageContent.slice(0, 30) : currentSession.title,
      lastModified: Date.now()
    };

    setSessions(prev => {
      const exists = prev.find(s => s.id === sessionId);
      if (exists) {
        return prev.map(session => session.id === sessionId ? updatedSession : session);
      }
      return prev;
    });
    storage.saveSession(updatedSession);

    // Pass the updated session directly so we don't have stale state issues
    await triggerModelGeneration(sessionId, messageContent, updatedSession);
  };

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
      else {
          // If deleted last session, maybe just clear active ID. 
          // User can click new project.
      }
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
      
      <div className="fixed inset-0 cyber-grid pointer-events-none z-0 opacity-20"></div>

      <HistorySidebar 
        sessions={sessions}
        currentSessionId={activeSessionId}
        onSelectSession={(id) => { setActiveSessionId(id); if (window.innerWidth < 768) setIsHistoryOpen(false); }}
        onNewChat={() => setIsTemplateModalOpen(true)}
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
        llmSettings={llmSettings}
        onLLMSettingsChange={handleLLMSettingsChange}
      />
      
      <SkillsModal
        isOpen={isSkillsOpen}
        onClose={() => setIsSkillsOpen(false)}
        skills={skills}
        onSaveSkills={handleSkillsSave}
      />

      <TemplateSelectionModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        onSelect={handleTemplateSelect}
        templates={templates}
        onSaveTemplates={handleSaveTemplates}
      />

      <div className="flex-1 flex flex-col h-full min-w-0 bg-md-sys-color-surface/80 backdrop-blur-sm transition-colors duration-300 z-10 relative">
        <header className="flex items-center justify-between px-4 h-16 bg-md-sys-color-surface/90 backdrop-blur-md text-md-sys-color-on-surface z-20 border-b border-md-sys-color-outline-variant/30 transition-colors duration-300 shadow-sm">
          <div className="flex items-center gap-4">
            <Button variant="icon" onClick={() => setIsHistoryOpen(!isHistoryOpen)}>
              <Menu size={24} />
            </Button>
            <div className="flex items-center gap-3">
               <Logo size={28} />
               <h1 className="font-normal text-xl tracking-tight hidden sm:block">VibeCoder</h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="icon" onClick={() => setIsSkillsOpen(true)} title="Skills">
               <BrainCircuit size={24} />
            </Button>
            <Button variant="icon" onClick={() => setIsSettingsOpen(true)} title="Settings">
              <Settings size={24} />
            </Button>
            <div className="w-8 h-8 rounded-full bg-md-sys-color-primary-container text-md-sys-color-on-primary-container flex items-center justify-center text-sm font-bold ml-2 shadow-inner ring-2 ring-md-sys-color-primary/20">
               {user.username.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
           <div className={`flex flex-col w-full md:w-1/2 lg:w-[45%] h-full ${activeSession?.codeVersions.length ? 'hidden md:flex' : 'flex'} border-r border-md-sys-color-outline-variant/20`}>
              <div className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth p-2">
                  {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))}
                  {isThinking && (
                     <div className="flex items-center gap-3 px-6 py-4 opacity-70">
                       <div className="w-2 h-2 bg-md-sys-color-primary rounded-full animate-bounce shadow-[0_0_10px_var(--md-sys-color-primary)]" />
                       <div className="w-2 h-2 bg-md-sys-color-primary rounded-full animate-bounce delay-75 shadow-[0_0_10px_var(--md-sys-color-primary)]" />
                       <div className="w-2 h-2 bg-md-sys-color-primary rounded-full animate-bounce delay-150 shadow-[0_0_10px_var(--md-sys-color-primary)]" />
                     </div>
                  )}
                  <div ref={messagesEndRef} />
              </div>

              <div className="p-4 bg-md-sys-color-surface/50 backdrop-blur-md transition-colors duration-300">
                <div className="relative flex items-end gap-2 p-1 bg-md-sys-color-surface-container-high/80 backdrop-blur rounded-[28px] border border-md-sys-color-outline-variant/30 focus-within:border-md-sys-color-primary focus-within:ring-1 focus-within:ring-md-sys-color-primary/50 transition-all shadow-lg">
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
                    className="mb-2 mr-2 w-10 h-10 min-w-[40px] min-h-[40px] p-0 shadow-md"
                  >
                    <Send size={20} />
                  </Button>
                </div>
              </div>
           </div>

           <div className={`flex-1 flex-col h-full ${activeSession?.codeVersions.length ? 'flex' : 'hidden md:flex'}`}>
              <CodePreview 
                sessionId={activeSessionId || 'default'}
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
