
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { 
  RefreshCw, Code, Maximize2, Minimize2, Undo2, Redo2, 
  Monitor, FileCode, Folder, ChevronRight, ChevronDown, ChevronUp,
  Settings, Image as ImageIcon, Box, FlaskConical, Play,
  AlertCircle, CheckCircle2, XCircle, Copy, Check, X, Cloud, Loader2
} from 'lucide-react';
import { Button } from './Button';
import { CodeVersion } from '../types';
import { clsx } from 'clsx';

interface CodePreviewProps {
  sessionId: string;
  code: string | null;
  testCode?: string;
  versions: CodeVersion[];
  currentVersionIndex: number;
  onUndo: () => void;
  onRedo: () => void;
  onCodeChange: (newCode: string) => void;
  onTestCodeChange: (newTestCode: string) => void;
}

type ViewMode = 'preview' | 'code' | 'tests';

interface LintError {
  line: number;
  message: string;
  id: string;
}

declare global {
  interface Window {
    Babel: any;
  }
}

export const CodePreview: React.FC<CodePreviewProps> = ({ 
  sessionId,
  code, 
  testCode = '',
  versions, 
  currentVersionIndex,
  onUndo, 
  onRedo,
  onCodeChange,
  onTestCodeChange
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const testIframeRef = useRef<HTMLIFrameElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  
  const [key, setKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [isFilesOpen, setIsFilesOpen] = useState(true);
  
  // State to trigger tests run after view switch
  const [shouldRunTests, setShouldRunTests] = useState(false);

  // Linting State
  const [lintErrors, setLintErrors] = useState<LintError[]>([]);
  const [isProblemsOpen, setIsProblemsOpen] = useState(false);

  // Copy State
  const [isCopied, setIsCopied] = useState(false);

  // Cursor Tracking
  const [currentLine, setCurrentLine] = useState(1);

  // Autosave & Local State
  const [localCode, setLocalCode] = useState(code || '');
  const [isSaving, setIsSaving] = useState(false);
  const lastSavedToParent = useRef(code || '');
  const [debouncedCode, setDebouncedCode] = useState(code); // For Iframe preview

  // Initialize & Sync with Props (and check for crash drafts)
  useEffect(() => {
    const draftKey = `vibecoder_draft_${sessionId}`;
    const draft = localStorage.getItem(draftKey);
    
    // Logic: If we have a draft that is different from what we thought we had, assume crash recovery
    // BUT we must prioritize prop updates if they are "newer" (like Undo/Redo or AI generation).
    // The heuristic: If prop matches what we last saved to parent, then prop hasn't changed externally.
    // If prop doesn't match lastSavedToParent, it's an external change (Undo/AI), so we accept it over draft.
    
    const isExternalChange = code !== lastSavedToParent.current;

    if (isExternalChange) {
        // External update (AI or Undo) takes precedence
        setLocalCode(code || '');
        lastSavedToParent.current = code || '';
        // Clear draft as it's now obsolete/conflicting
        localStorage.removeItem(draftKey);
    } else if (draft && draft !== localCode) {
        // No external change, but we found a draft (crash recovery)
        setLocalCode(draft);
    }
    // Else: No external change, no draft (or draft matches). Keep localCode as is.
  }, [code, sessionId]);

  // Autosave / Debounce Effect
  useEffect(() => {
      // If local matches what we last sent, no save needed
      if (localCode === lastSavedToParent.current) {
          setIsSaving(false);
          return;
      }

      setIsSaving(true);
      const draftKey = `vibecoder_draft_${sessionId}`;
      
      // Immediate draft save (synchronous, cheap for text)
      localStorage.setItem(draftKey, localCode); 
      
      // Debounce the heavy save to parent/persistent storage
      const timer = setTimeout(() => {
          onCodeChange(localCode);
          lastSavedToParent.current = localCode;
          localStorage.removeItem(draftKey); // Clear draft after successful handoff
          setIsSaving(false);
      }, 2000); // 2 seconds delay

      // Sync preview slightly faster than save
      const previewTimer = setTimeout(() => {
          setDebouncedCode(localCode);
      }, 1000);

      return () => {
          clearTimeout(timer);
          clearTimeout(previewTimer);
      };
  }, [localCode, sessionId, onCodeChange]);

  // Handle manual refresh of preview
  useEffect(() => {
    if (viewMode === 'preview' && iframeRef.current && debouncedCode) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(debouncedCode);
        doc.close();
      }
    }
  }, [debouncedCode, key, viewMode]);

  // Linting Logic (runs on localCode)
  useEffect(() => {
    if (!localCode || viewMode !== 'code') return;

    const timer = setTimeout(() => {
        if (window.Babel) {
            try {
                const scriptRegex = /<script\s+type=["']text\/babel["']>([\s\S]*?)<\/script>/i;
                const match = localCode.match(scriptRegex);
                
                if (match) {
                    const scriptContent = match[1];
                    const index = match.index || 0;
                    const linesBefore = localCode.substring(0, index).split('\n').length;
                    
                    window.Babel.transform(scriptContent, {
                        presets: ['react', 'env'],
                        filename: 'file.js'
                    });
                    
                    setLintErrors([]);
                } else {
                    setLintErrors([]);
                }
            } catch (err: any) {
                if (err.loc) {
                    const scriptRegex = /<script\s+type=["']text\/babel["']>([\s\S]*?)<\/script>/i;
                    const match = localCode.match(scriptRegex);
                    const linesBefore = match ? localCode.substring(0, match.index || 0).split('\n').length : 0;
                    const errorLine = linesBefore + err.loc.line - 1;
                    
                    setLintErrors([{
                        id: `err-${Date.now()}`,
                        line: errorLine, 
                        message: err.message.replace(/\s*\(\d+:\d+\)$/, '')
                    }]);
                } else {
                    setLintErrors([]);
                }
            }
        }
    }, 500);

    return () => clearTimeout(timer);
  }, [localCode, viewMode]);

  const updateCurrentLine = useCallback(() => {
    if (textareaRef.current) {
        const { value, selectionStart } = textareaRef.current;
        if (value && selectionStart !== null) {
            const line = value.substring(0, selectionStart).split('\n').length;
            setCurrentLine(line);
        } else {
            setCurrentLine(1);
        }
    }
  }, []);

  const runTests = useCallback(() => {
    if (!testIframeRef.current || !localCode) return;
    
    const doc = testIframeRef.current.contentDocument;
    if (doc) {
      let testHarnessHTML = localCode;

      const headInjection = `
        <link href="https://unpkg.com/mocha/mocha.css" rel="stylesheet" />
        <script src="https://unpkg.com/chai/chai.js"></script>
        <script src="https://unpkg.com/mocha/mocha.js"></script>
        <style>
            #mocha { margin: 0; padding: 20px; background: #fff; min-height: 100vh; }
            body { background: #fff !important; color: #333 !important; }
        </style>
      `;

      const bodyInjection = `
        <div id="mocha"></div>
        <script>
            mocha.setup('bdd');
            const expect = chai.expect;
        </script>
        <script type="text/babel">
          ${testCode}
        </script>
        <script>
           setTimeout(() => {
               mocha.run();
           }, 1000);
        </script>
      `;

      if (testHarnessHTML.includes('</head>')) {
        testHarnessHTML = testHarnessHTML.replace('</head>', `${headInjection}</head>`);
      } else {
        testHarnessHTML = headInjection + testHarnessHTML;
      }

      if (testHarnessHTML.includes('</body>')) {
        testHarnessHTML = testHarnessHTML.replace('</body>', `${bodyInjection}</body>`);
      } else {
        testHarnessHTML = testHarnessHTML + bodyInjection;
      }

      doc.open();
      doc.write(testHarnessHTML);
      doc.close();
    }
  }, [localCode, testCode]);

  useEffect(() => {
    if (shouldRunTests && viewMode === 'tests') {
      const timer = setTimeout(() => {
        runTests();
        setShouldRunTests(false);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [shouldRunTests, viewMode, runTests]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!localCode) return;
      const isInputActive = document.activeElement?.tagName === 'INPUT' || 
                           (document.activeElement?.tagName === 'TEXTAREA' && !document.activeElement.closest('.code-editor')); 

      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        setViewMode('tests');
        setShouldRunTests(true);
      }

      if (e.altKey && e.key === '1') { e.preventDefault(); setViewMode('preview'); }
      if (e.altKey && e.key === '2') { e.preventDefault(); setViewMode('code'); }
      if (e.altKey && e.key === '3') { e.preventDefault(); setViewMode('tests'); }

      if (!isInputActive) {
          if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
            if (e.shiftKey) {
                e.preventDefault();
                onRedo();
            } else {
                e.preventDefault();
                onUndo();
            }
          }
          if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
             e.preventDefault();
             onRedo();
          }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [localCode, onUndo, onRedo]);

  const handleRefresh = () => {
    setDebouncedCode(localCode); 
    setKey(prev => prev + 1);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
        gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const scrollToLine = (line: number) => {
    if (textareaRef.current) {
        const lineHeight = 24; 
        const top = (line - 1) * lineHeight;
        textareaRef.current.scrollTo({ top, behavior: 'smooth' });
        setCurrentLine(line);
    }
  };

  const handleCopy = async () => {
    if (!localCode) return;
    try {
        await navigator.clipboard.writeText(localCode);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
        console.error('Failed to copy code', err);
    }
  };

  const canUndo = currentVersionIndex > 0;
  const canRedo = currentVersionIndex < versions.length - 1;

  const lineCount = useMemo(() => localCode ? localCode.split('\n').length : 0, [localCode]);
  const lines = useMemo(() => Array.from({ length: lineCount }, (_, i) => i + 1), [lineCount]);

  if (!localCode && !code) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-md-sys-color-surface-container text-md-sys-color-on-surface-variant rounded-tl-[24px] rounded-bl-[24px] border border-md-sys-color-outline-variant/20 m-2 ml-0">
        <div className="bg-md-sys-color-surface-container-high p-6 rounded-full mb-4">
            <Code size={48} className="opacity-50" />
        </div>
        <p className="text-lg font-medium">Ready to Vibe</p>
        <p className="text-sm opacity-70 mt-1">Generate a UI to see it here</p>
      </div>
    );
  }

  return (
    <div className={clsx(
      "relative flex flex-col h-full bg-md-sys-color-surface-container rounded-tl-[24px] rounded-bl-[24px] overflow-hidden transition-all duration-300 shadow-elevation-1 border border-md-sys-color-outline-variant/20 my-2 ml-0 mr-2",
      isFullscreen ? "fixed inset-4 z-50 rounded-[24px] shadow-elevation-3 m-0" : ""
    )}>
      
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-md-sys-color-surface-container-high border-b border-md-sys-color-outline-variant/20">
        <div className="flex items-center gap-2">
            <div className="flex bg-md-sys-color-surface-container rounded-full p-1 border border-md-sys-color-outline-variant/20">
                <button
                    onClick={() => setViewMode('preview')}
                    title="Preview (Alt + 1)"
                    className={clsx(
                        "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                        viewMode === 'preview' 
                            ? "bg-md-sys-color-secondary-container text-md-sys-color-on-secondary-container shadow-sm" 
                            : "text-md-sys-color-on-surface-variant hover:text-md-sys-color-on-surface"
                    )}
                >
                    <Monitor size={16} />
                    Preview
                </button>
                <button
                    onClick={() => setViewMode('code')}
                    title="Code Editor (Alt + 2)"
                    className={clsx(
                        "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                        viewMode === 'code' 
                            ? "bg-md-sys-color-secondary-container text-md-sys-color-on-secondary-container shadow-sm" 
                            : "text-md-sys-color-on-surface-variant hover:text-md-sys-color-on-surface"
                    )}
                >
                    <Code size={16} />
                    Editor
                </button>
                <button
                    onClick={() => setViewMode('tests')}
                    title="Unit Tests (Alt + 3)"
                    className={clsx(
                        "flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all",
                        viewMode === 'tests' 
                            ? "bg-md-sys-color-secondary-container text-md-sys-color-on-secondary-container shadow-sm" 
                            : "text-md-sys-color-on-surface-variant hover:text-md-sys-color-on-surface"
                    )}
                >
                    <FlaskConical size={16} />
                    Tests
                </button>
            </div>
            
            <div className="h-6 w-px bg-md-sys-color-outline-variant/20 mx-2"></div>

            <div className="flex items-center">
                <Button variant="icon" size="sm" onClick={onUndo} disabled={!canUndo} title="Undo (Ctrl + Z)">
                    <Undo2 size={18} />
                </Button>
                <Button variant="icon" size="sm" onClick={onRedo} disabled={!canRedo} title="Redo (Ctrl + Shift + Z)">
                    <Redo2 size={18} />
                </Button>
            </div>

            {/* Autosave Status Indicator */}
            <div className="flex items-center gap-1.5 ml-2 px-2 py-1 rounded bg-black/20 text-[10px] font-medium text-md-sys-color-on-surface-variant/80">
                {isSaving ? (
                    <>
                        <Loader2 size={10} className="animate-spin" />
                        <span>Saving...</span>
                    </>
                ) : (
                    <>
                        <Cloud size={10} />
                        <span>Saved</span>
                    </>
                )}
            </div>
        </div>

        <div className="flex gap-1">
          {viewMode === 'tests' && (
             <Button 
                variant="filled" 
                size="sm" 
                onClick={runTests} 
                title="Run Tests (Ctrl + R)"
                className="h-8 text-xs gap-1 px-3 mr-2 bg-green-700 hover:bg-green-600 text-white"
             >
                <Play size={14} fill="currentColor" /> Run Tests
             </Button>
          )}
          {viewMode === 'preview' && (
            <Button variant="icon" size="sm" onClick={handleRefresh} title="Reload Preview">
                <RefreshCw size={18} />
            </Button>
          )}
          <Button variant="icon" size="sm" onClick={toggleFullscreen} title="Toggle Fullscreen">
             {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
          </Button>
        </div>
      </div>

      <div className="flex-1 w-full bg-md-sys-color-surface relative flex overflow-hidden">
        {/* PREVIEW MODE */}
        <div className={clsx("w-full h-full", viewMode === 'preview' ? 'block' : 'hidden')}>
            <iframe
            ref={iframeRef}
            title="Preview"
            className="w-full h-full border-0 bg-white"
            sandbox="allow-scripts allow-modals allow-forms allow-popups allow-same-origin allow-presentation"
            />
        </div>

        {/* EDITOR MODE */}
        <div className={clsx("w-full h-full flex", viewMode === 'code' ? 'flex' : 'hidden')}>
            
            {/* File Explorer */}
            <div className="w-64 bg-md-sys-color-surface-container-low border-r border-md-sys-color-outline-variant/20 flex flex-col">
                <div className="p-4 pb-2 text-xs font-bold text-md-sys-color-on-surface-variant tracking-wider uppercase">
                    Explorer
                </div>
                <div className="flex-1 overflow-y-auto py-2">
                    <div className="px-2">
                        <div 
                            className="flex items-center gap-1 py-1 px-2 text-md-sys-color-on-surface hover:bg-md-sys-color-on-surface/5 rounded cursor-pointer select-none"
                            onClick={() => setIsFilesOpen(!isFilesOpen)}
                        >
                            {isFilesOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            <Folder size={16} className="text-md-sys-color-secondary" />
                            <span className="text-sm font-medium">project-root</span>
                        </div>
                        {isFilesOpen && (
                            <div className="ml-4 mt-1 space-y-0.5">
                                <FileItem name="index.html" active />
                                <FileItem name="package.json" />
                                <FileItem name="readme.md" />
                                <FileItem name="assets" isFolder />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Enhanced Code Editor */}
            <div className="flex-1 flex flex-col bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm relative code-editor">
                {/* Tabs */}
                <div className="flex items-center justify-between bg-[#252526] pr-2">
                    <div className="px-4 py-2 bg-[#1e1e1e] border-t-2 border-md-sys-color-primary text-md-sys-color-on-surface flex items-center gap-2 text-xs">
                        <FileCode size={14} className="text-orange-400" />
                        index.html
                    </div>
                    <button
                        onClick={handleCopy}
                        className="text-gray-400 hover:text-white transition-colors p-1 rounded flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider"
                        title="Copy Code"
                    >
                        {isCopied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                        {isCopied ? 'Copied' : 'Copy'}
                    </button>
                </div>

                {/* Editor Surface */}
                <div className="flex-1 relative overflow-hidden flex flex-col">
                    <div className="flex-1 relative overflow-hidden flex">
                        {/* Line Numbers Gutter */}
                        <div 
                            ref={gutterRef}
                            className="w-12 bg-[#1e1e1e] border-r border-[#333] text-right text-[#858585] select-none pt-4 pb-4 overflow-hidden"
                        >
                            {lines.map(lineNum => {
                                const error = lintErrors.find(e => e.line === lineNum);
                                const isCurrent = currentLine === lineNum;
                                return (
                                    <div key={lineNum} className={clsx(
                                        "relative pr-3 h-6 leading-6 text-xs flex items-center justify-end group transition-colors",
                                        error ? "bg-red-900/30" : (isCurrent ? "bg-[#2c2c2c]" : "")
                                    )}>
                                        {error && (
                                            <div title={error.message} className="absolute left-1 cursor-help z-10">
                                                <XCircle size={10} className="text-red-500" />
                                            </div>
                                        )}
                                        <span className={clsx(
                                            error ? "text-red-400 font-bold" : (isCurrent ? "text-md-sys-color-primary font-bold" : "")
                                        )}>{lineNum}</span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* TextArea */}
                        <textarea
                            ref={textareaRef}
                            className="flex-1 h-full p-4 pl-2 bg-transparent text-inherit font-inherit resize-none focus:outline-none custom-scrollbar leading-6 whitespace-pre"
                            value={localCode}
                            onChange={(e) => setLocalCode(e.target.value)}
                            onScroll={handleScroll}
                            onSelect={updateCurrentLine}
                            onClick={updateCurrentLine}
                            onKeyUp={updateCurrentLine}
                            spellCheck={false}
                            autoCapitalize="off"
                            autoComplete="off"
                        />
                    </div>
                    
                    {/* Problems Panel (Expandable) */}
                    {isProblemsOpen && (
                        <div className="h-40 bg-[#1e1e1e] border-t border-[#333] flex flex-col animate-in slide-in-from-bottom-5">
                            <div className="px-4 py-1 bg-[#252526] text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center justify-between">
                                <span>Problems</span>
                                <button onClick={() => setIsProblemsOpen(false)} className="hover:text-white" title="Close problems panel" aria-label="Close problems panel">
                                    <X size={14} />
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
                                {lintErrors.length === 0 ? (
                                    <div className="p-4 text-center text-gray-500 text-xs italic">
                                        No problems detected in the workspace.
                                    </div>
                                ) : (
                                    lintErrors.map(err => (
                                        <div 
                                            key={err.id}
                                            onClick={() => scrollToLine(err.line)}
                                            className="px-4 py-2 hover:bg-[#2a2d2e] cursor-pointer flex items-start gap-2 border-b border-[#333]/50 last:border-0 group"
                                        >
                                            <XCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                                            <div className="flex-1">
                                                <span className="text-red-300 text-xs font-mono">{err.message}</span>
                                                <div className="text-gray-500 text-[10px] mt-0.5">
                                                    index.html [{err.line}, 1]
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* Status Bar */}
                    <div 
                        className={clsx(
                            "h-6 flex items-center justify-between px-3 text-[10px] select-none transition-colors duration-300 cursor-pointer border-t border-[#333]",
                            lintErrors.length > 0 
                                ? "bg-red-900/20 text-red-200 hover:bg-red-900/30" 
                                : "bg-md-sys-color-primary-container text-md-sys-color-on-primary-container"
                        )}
                        onClick={() => setIsProblemsOpen(!isProblemsOpen)}
                    >
                        <div className="flex items-center gap-2">
                            {lintErrors.length > 0 ? (
                                <>
                                    <AlertCircle size={12} className="text-red-400" />
                                    <span className="font-semibold">{lintErrors.length} Problem{lintErrors.length > 1 ? 's' : ''}</span>
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 size={12} className="text-green-600 dark:text-green-400" />
                                    <span>No Issues</span>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-4 opacity-70">
                            <span>Ln {currentLine}</span>
                            <span>{isProblemsOpen ? <ChevronDown size={12} /> : <ChevronUp size={12} />}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* TESTS MODE */}
        <div className={clsx("w-full h-full flex flex-col md:flex-row", viewMode === 'tests' ? 'flex' : 'hidden')}>
            <div className="flex-1 flex flex-col bg-[#1e1e1e] text-[#d4d4d4] font-mono text-sm border-r border-md-sys-color-outline-variant/20 code-editor">
                <div className="px-4 py-2 bg-[#252526] text-xs font-medium text-md-sys-color-on-surface flex justify-between items-center">
                    <span>app.test.js</span>
                    <span className="opacity-50 text-[10px]">Mocha/Chai BDD</span>
                </div>
                <div className="flex-1 relative">
                    <textarea
                        className="absolute inset-0 w-full h-full p-4 bg-transparent text-inherit font-inherit resize-none focus:outline-none custom-scrollbar leading-6"
                        value={testCode}
                        onChange={(e) => onTestCodeChange(e.target.value)}
                        placeholder="// Write your tests here..."
                        spellCheck={false}
                    />
                </div>
            </div>

            <div className="flex-1 bg-white relative">
                 <div className="absolute top-0 left-0 right-0 h-8 bg-gray-100 border-b flex items-center px-4 text-xs text-gray-500 font-medium z-10">
                    Test Runner Output
                 </div>
                 <div className="absolute inset-0 top-8">
                    <iframe
                        ref={testIframeRef}
                        title="Test Runner"
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-modals allow-same-origin"
                    />
                 </div>
            </div>
        </div>
      </div>
    </div>
  );
};

const FileItem = ({ name, isFolder = false, active = false }: { name: string, isFolder?: boolean, active?: boolean }) => (
    <div className={clsx(
        "flex items-center gap-2 py-1 px-2 rounded cursor-pointer text-sm",
        active 
            ? "bg-md-sys-color-secondary-container text-md-sys-color-on-secondary-container" 
            : "text-md-sys-color-on-surface-variant hover:text-md-sys-color-on-surface hover:bg-md-sys-color-on-surface/5"
    )}>
        <div className="w-4 flex justify-center">
            {isFolder ? (
                <Folder size={14} className="text-blue-400" />
            ) : name.endsWith('html') ? (
                <FileCode size={14} className="text-orange-400" />
            ) : name.endsWith('json') ? (
                <Settings size={14} className="text-yellow-400" />
            ) : name.endsWith('md') ? (
                <Box size={14} className="text-purple-400" />
            ) : (
                <ImageIcon size={14} className="text-green-400" />
            )}
        </div>
        <span className="truncate">{name}</span>
    </div>
);
