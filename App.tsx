
import React, { useState, useEffect, useCallback } from 'react';
import { Menu, Settings, BrainCircuit } from 'lucide-react';
import { Message, Role, User, ChatSession, CodeVersion, StyleFramework, Skill, Theme, ProjectTemplate, ClaudeSettings, OllamaSettings, AIProvider } from './types';
import { CanvasItemData, ChatNodeData, CanvasConnection, Point } from './types/canvas';
import { sendClaudeMessageStream, initializeClaudeChat } from './services/claudeCliService';
import { sendOllamaMessageStream, initializeOllamaChat } from './services/ollamaService';
import { storage } from './services/storage';
import { extractHtmlCode, generateId, applyThemeToBody, cleanupDrafts } from './utils/helpers';
import { InfiniteCanvas } from './components/InfiniteCanvas';
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
  const [isThinking, setIsThinking] = useState(false);
  const [claudeSettings, setClaudeSettings] = useState<ClaudeSettings>(storage.getClaudeSettings());
  const [ollamaSettings, setOllamaSettings] = useState<OllamaSettings>(storage.getOllamaSettings());
  const [aiProvider, setAIProvider] = useState<AIProvider>(storage.getAIProvider());
  const [canvasItems, setCanvasItems] = useState<CanvasItemData[]>([]);
  const [chatNodes, setChatNodes] = useState<ChatNodeData[]>([]);
  const [connections, setConnections] = useState<CanvasConnection[]>([]);


  // Apply theme class to body
  useEffect(() => {
    const loadedTheme = storage.getTheme();
    setTheme(loadedTheme);
    applyThemeToBody(loadedTheme);
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    storage.saveTheme(newTheme);
    applyThemeToBody(newTheme);
  };

  // Helper to get enabled skills string
  const getEnabledSkillsContext = useCallback((currentSkills: Skill[]) => {
    return currentSkills
      .filter(s => s.isEnabled)
      .map(s => `${s.name}:\n${s.content}`)
      .join('\n\n');
  }, []);

  // Helper to calculate next position for mindmap flow layout
  const getNextFlowPosition = useCallback((
    existingChatNodes: ChatNodeData[],
    existingItems: CanvasItemData[],
    parentItemId?: string
  ): { chatPos: Point; itemPos: Point } => {
    const CHAT_WIDTH = 280;
    const CHAT_HEIGHT = 100;
    const ITEM_WIDTH = 400;
    const ITEM_HEIGHT = 300;
    const HORIZONTAL_GAP = 100;
    const VERTICAL_GAP = 150;
    const START_X = 100;
    const START_Y = 100;

    // If there's a parent item, position to the right of it (branching)
    if (parentItemId) {
      const parentItem = existingItems.find(i => i.id === parentItemId);
      if (parentItem) {
        // Find siblings (items with same parent)
        const siblings = existingItems.filter(i => i.parentItemId === parentItemId);
        const siblingOffset = siblings.length * (ITEM_HEIGHT + VERTICAL_GAP / 2);

        return {
          chatPos: {
            x: parentItem.position.x + parentItem.size.width + HORIZONTAL_GAP,
            y: parentItem.position.y + siblingOffset,
          },
          itemPos: {
            x: parentItem.position.x + parentItem.size.width + HORIZONTAL_GAP,
            y: parentItem.position.y + CHAT_HEIGHT + VERTICAL_GAP / 2 + siblingOffset,
          },
        };
      }
    }

    // No parent - add to the bottom of the flow
    if (existingItems.length === 0 && existingChatNodes.length === 0) {
      return {
        chatPos: { x: START_X, y: START_Y },
        itemPos: { x: START_X, y: START_Y + CHAT_HEIGHT + VERTICAL_GAP / 2 },
      };
    }

    // Find the bottommost element
    let maxY = 0;
    let lastX = START_X;

    existingChatNodes.forEach(node => {
      const bottom = node.position.y + CHAT_HEIGHT;
      if (bottom > maxY) {
        maxY = bottom;
        lastX = node.position.x;
      }
    });

    existingItems.forEach(item => {
      const bottom = item.position.y + item.size.height;
      if (bottom > maxY) {
        maxY = bottom;
        lastX = item.position.x;
      }
    });

    return {
      chatPos: { x: lastX, y: maxY + VERTICAL_GAP },
      itemPos: { x: lastX, y: maxY + VERTICAL_GAP + CHAT_HEIGHT + VERTICAL_GAP / 2 },
    };
  }, []);

  // Helper to initialize chat for the active provider
  const initializeChat = useCallback((
    framework: StyleFramework,
    history: Message[],
    skillsContext: string,
    provider: AIProvider = aiProvider,
    claude: ClaudeSettings = claudeSettings,
    ollama: OllamaSettings = ollamaSettings
  ) => {
    if (provider === 'ollama') {
      initializeOllamaChat(ollama, framework, history, skillsContext);
    } else {
      initializeClaudeChat(claude, framework, history, skillsContext);
    }
  }, [aiProvider, claudeSettings, ollamaSettings]);

  // Helper to send message based on active provider
  const sendMessageStream = useCallback(async (
    content: string,
    onChunk: (text: string) => void
  ): Promise<string> => {
    if (aiProvider === 'ollama') {
      return sendOllamaMessageStream(content, onChunk);
    } else {
      return sendClaudeMessageStream(content, onChunk);
    }
  }, [aiProvider]);

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
    initializeChat(newSession.framework, newSession.messages, getEnabledSkillsContext(currentSkills));
    
    if (window.innerWidth < 768) setIsHistoryOpen(false);
    
    return newSession;
  }, [skills, templates, getEnabledSkillsContext, initializeChat]);

  useEffect(() => {
    const loadedUser = storage.getUser();
    if (loadedUser) setUser(loadedUser);
    
    const loadedSessions = storage.getSessions();
    setSessions(loadedSessions);

    const loadedSkills = storage.getSkills();
    setSkills(loadedSkills);

    const loadedTemplates = storage.getTemplates();
    setTemplates(loadedTemplates);

    const loadedClaudeSettings = storage.getClaudeSettings();
    setClaudeSettings(loadedClaudeSettings);

    const loadedOllamaSettings = storage.getOllamaSettings();
    setOllamaSettings(loadedOllamaSettings);

    const loadedAIProvider = storage.getAIProvider();
    setAIProvider(loadedAIProvider);

    // Clean up orphaned drafts from deleted sessions
    cleanupDrafts(loadedSessions.map(s => s.id));

    if (loadedSessions.length > 0) {
      setActiveSessionId(loadedSessions[0].id);
      if (loadedAIProvider === 'ollama') {
        initializeOllamaChat(
          loadedOllamaSettings,
          loadedSessions[0].framework,
          loadedSessions[0].messages,
          getEnabledSkillsContext(loadedSkills)
        );
      } else {
        initializeClaudeChat(
          loadedClaudeSettings,
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

  useEffect(() => {
    if (activeSession) {
      initializeChat(
        activeSession.framework,
        activeSession.messages,
        getEnabledSkillsContext(skills)
      );
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
    if (activeSession) {
      initializeChat(activeSession.framework, activeSession.messages, getEnabledSkillsContext(newSkills));
    }
  };

  const handleClaudeSettingsChange = (newSettings: ClaudeSettings) => {
    setClaudeSettings(newSettings);
    storage.saveClaudeSettings(newSettings);
    if (activeSession && aiProvider === 'claude') {
      initializeChat(activeSession.framework, activeSession.messages, getEnabledSkillsContext(skills), 'claude', newSettings);
    }
  };

  const handleOllamaSettingsChange = (newSettings: OllamaSettings) => {
    setOllamaSettings(newSettings);
    storage.saveOllamaSettings(newSettings);
    if (activeSession && aiProvider === 'ollama') {
      initializeChat(activeSession.framework, activeSession.messages, getEnabledSkillsContext(skills), 'ollama', claudeSettings, newSettings);
    }
  };

  const handleAIProviderChange = (newProvider: AIProvider) => {
    setAIProvider(newProvider);
    storage.saveAIProvider(newProvider);
    if (activeSession) {
      initializeChat(activeSession.framework, activeSession.messages, getEnabledSkillsContext(skills), newProvider);
    }
  };
  
  const handleSaveTemplates = (newTemplates: ProjectTemplate[]) => {
      setTemplates(newTemplates);
      storage.saveTemplates(newTemplates);
  };

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

      // Ensure chat is initialized before sending
      initializeChat(
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
        
        await sendMessageStream(promptText, (streamedText) => {
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
            // Find the user message that triggered this generation
            const userMessage = currentSession.messages.find(
              m => m.role === Role.USER && m.content === promptText
            ) || currentSession.messages.filter(m => m.role === Role.USER).pop();

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

            // Create mindmap nodes for the canvas
            if (userMessage) {
              const positions = getNextFlowPosition(chatNodes, canvasItems);

              // Create chat node for the user message
              const chatNodeId = generateId();
              const newChatNode: ChatNodeData = {
                id: chatNodeId,
                messageId: userMessage.id,
                role: 'user',
                content: promptText.length > 100 ? promptText.substring(0, 100) + '...' : promptText,
                fullContent: promptText,
                position: positions.chatPos,
                timestamp: userMessage.timestamp,
              };

              // Create canvas item for the generated code
              const canvasItemId = generateId();
              const newCanvasItem: CanvasItemData = {
                id: canvasItemId,
                type: 'code-preview',
                position: positions.itemPos,
                size: { width: 400, height: 300 },
                content: extractedCode,
                title: promptText.length > 30 ? promptText.substring(0, 30) + '...' : promptText,
                sourceMessageId: userMessage.id,
              };

              // Create connection between chat node and canvas item
              const newConnection: CanvasConnection = {
                id: generateId(),
                fromId: chatNodeId,
                fromType: 'chat',
                toId: canvasItemId,
                toType: 'item',
                connectionType: 'generated',
              };

              // Update state
              setChatNodes(prev => [...prev, newChatNode]);
              setCanvasItems(prev => [...prev, newCanvasItem]);
              setConnections(prev => [...prev, newConnection]);
            }
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

  const handleSendMessage = async (messageContent: string) => {
    if (!messageContent.trim() || isThinking) return;

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
        messages={messages}
        isThinking={isThinking}
        onSendMessage={handleSendMessage}
      />

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        currentFramework={activeSession?.framework || 'tailwind'}
        onFrameworkChange={handleFrameworkChange}
        currentTheme={theme}
        onThemeChange={handleThemeChange}
        claudeSettings={claudeSettings}
        onClaudeSettingsChange={handleClaudeSettingsChange}
        ollamaSettings={ollamaSettings}
        onOllamaSettingsChange={handleOllamaSettingsChange}
        aiProvider={aiProvider}
        onAIProviderChange={handleAIProviderChange}
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

        {/* Infinite Canvas - unified chat + canvas experience */}
        <InfiniteCanvas
          theme={theme}
          initialItems={canvasItems}
          chatNodes={chatNodes}
          connections={connections}
          onItemsChange={setCanvasItems}
          onChatNodesChange={setChatNodes}
          onConnectionsChange={setConnections}
          showConnections={true}
        />
      </div>
    </div>
  );
}
