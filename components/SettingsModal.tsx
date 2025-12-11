
import React, { useState, useEffect } from 'react';
import { StyleFramework, Theme, ClaudeSettings } from '../types';
import { FRAMEWORKS } from '../constants';
import { Button } from './Button';
import { X, Layers, CheckCircle2, Moon, Sun, Loader2, AlertCircle, Check, ChevronDown, Sparkles, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { testClaudeConnection, CLAUDE_MODELS } from '../services/claudeCliService';

interface SettingsModalProps {
  currentFramework: StyleFramework;
  onFrameworkChange: (framework: StyleFramework) => void;
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
  claudeSettings: ClaudeSettings;
  onClaudeSettingsChange: (settings: ClaudeSettings) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  currentFramework,
  onFrameworkChange,
  currentTheme,
  onThemeChange,
  claudeSettings,
  onClaudeSettingsChange,
  isOpen,
  onClose
}) => {
  const [localClaudeConfig, setLocalClaudeConfig] = useState<ClaudeSettings>(claudeSettings);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ success?: boolean; error?: string } | null>(null);
  const [configSaved, setConfigSaved] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);

  useEffect(() => {
    setLocalClaudeConfig(claudeSettings);
    setConfigSaved(false);
  }, [claudeSettings]);

  useEffect(() => {
    if (isOpen) {
      setConfigSaved(false);
    }
  }, [isOpen]);

  const handleServerUrlChange = (serverUrl: string) => {
    setLocalClaudeConfig({ ...localClaudeConfig, serverUrl });
    setConnectionStatus(null);
    setConfigSaved(false);
  };

  const handleModelChange = (model: 'opus' | 'sonnet' | 'haiku') => {
    setLocalClaudeConfig({ ...localClaudeConfig, model });
    setConfigSaved(false);
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus(null);
    setConfigSaved(false);

    const result = await testClaudeConnection(localClaudeConfig);
    setConnectionStatus(result);

    setIsTestingConnection(false);
  };

  const handleSaveConfig = () => {
    onClaudeSettingsChange(localClaudeConfig);
    setConfigSaved(true);

    setTimeout(() => setConfigSaved(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-md-sys-color-surface-container rounded-[28px] shadow-elevation-3 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 pb-2">
          <div className="flex items-center gap-3">
            <Layers className="text-md-sys-color-primary" size={24} />
            <h2 className="text-2xl font-normal text-md-sys-color-on-surface">Settings</h2>
          </div>
          <Button variant="icon" onClick={onClose}>
            <X size={24} />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">

          {/* Appearance Section */}
          <div className="mb-8">
            <h3 className="text-sm font-medium text-md-sys-color-primary mb-4">Appearance</h3>
            <div className="flex gap-3">
              <button
                onClick={() => onThemeChange('light')}
                className={clsx(
                  "flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all",
                  currentTheme === 'light'
                    ? "bg-md-sys-color-secondary-container border-md-sys-color-secondary-container text-md-sys-color-on-secondary-container"
                    : "bg-transparent border-md-sys-color-outline-variant hover:border-md-sys-color-outline text-md-sys-color-on-surface"
                )}
              >
                <Sun size={22} />
                <span className="font-medium text-xs">Light</span>
              </button>

              <button
                onClick={() => onThemeChange('dark')}
                className={clsx(
                  "flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all",
                  currentTheme === 'dark'
                    ? "bg-md-sys-color-secondary-container border-md-sys-color-secondary-container text-md-sys-color-on-secondary-container"
                    : "bg-transparent border-md-sys-color-outline-variant hover:border-md-sys-color-outline text-md-sys-color-on-surface"
                )}
              >
                <Moon size={22} />
                <span className="font-medium text-xs">Dark</span>
              </button>

              <button
                onClick={() => onThemeChange('cyberpunk')}
                className={clsx(
                  "flex-1 flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all",
                  currentTheme === 'cyberpunk'
                    ? "bg-md-sys-color-secondary-container border-md-sys-color-secondary-container text-md-sys-color-on-secondary-container"
                    : "bg-transparent border-md-sys-color-outline-variant hover:border-md-sys-color-outline text-md-sys-color-on-surface"
                )}
              >
                <Zap size={22} />
                <span className="font-medium text-xs">Cyberpunk</span>
              </button>
            </div>
          </div>

          {/* Claude Configuration Section */}
          <div className="mb-8">
            <h3 className="text-sm font-medium text-md-sys-color-primary mb-4">Claude Settings</h3>
            <div className="p-4 rounded-2xl border border-md-sys-color-outline-variant bg-md-sys-color-surface-container-low space-y-4">
              <div className="text-xs text-md-sys-color-on-surface-variant p-3 bg-md-sys-color-surface-container rounded-lg border border-md-sys-color-outline-variant">
                <p className="font-medium mb-1">⚡ Uses your Claude subscription limits</p>
                <p>Requires a local proxy server. Run: <code className="bg-md-sys-color-surface-container-high px-1 py-0.5 rounded">npm run claude-proxy</code></p>
              </div>

              <div>
                <label className="text-xs font-medium text-md-sys-color-on-surface-variant mb-2 block">Proxy Server URL</label>
                <input
                  type="text"
                  value={localClaudeConfig.serverUrl}
                  onChange={(e) => handleServerUrlChange(e.target.value)}
                  placeholder="http://localhost:3456"
                  className="w-full px-4 py-3 rounded-xl bg-md-sys-color-surface-container border border-md-sys-color-outline-variant text-md-sys-color-on-surface placeholder:text-md-sys-color-on-surface-variant/50 focus:outline-none focus:border-md-sys-color-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-md-sys-color-on-surface-variant mb-2 block">Model</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowModelDropdown(!showModelDropdown)}
                    className="w-full px-4 py-3 rounded-xl bg-md-sys-color-surface-container border border-md-sys-color-outline-variant text-md-sys-color-on-surface focus:outline-none focus:border-md-sys-color-primary flex items-center justify-between"
                  >
                    <span>
                      {CLAUDE_MODELS.find(m => m.value === localClaudeConfig.model)?.name || localClaudeConfig.model}
                    </span>
                    <ChevronDown size={16} className={clsx("transition-transform", showModelDropdown && "rotate-180")} />
                  </button>

                  {showModelDropdown && (
                    <div className="absolute z-50 w-full mt-1 py-1 bg-md-sys-color-surface-container border border-md-sys-color-outline-variant rounded-xl shadow-lg max-h-64 overflow-y-auto">
                      {CLAUDE_MODELS.map((model) => (
                        <button
                          key={model.value}
                          type="button"
                          onClick={() => {
                            handleModelChange(model.value as 'opus' | 'sonnet' | 'haiku');
                            setShowModelDropdown(false);
                          }}
                          className={clsx(
                            "w-full px-4 py-2 text-left hover:bg-md-sys-color-surface-container-high transition-colors",
                            localClaudeConfig.model === model.value && "bg-md-sys-color-primary/10"
                          )}
                        >
                          <div className="font-medium text-sm text-md-sys-color-on-surface">{model.name}</div>
                          <div className="text-xs text-md-sys-color-on-surface-variant">{model.description}</div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleTestConnection}
                  disabled={isTestingConnection}
                  className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-md-sys-color-surface-container-high border border-md-sys-color-outline-variant text-md-sys-color-on-surface hover:bg-md-sys-color-surface-container transition-all disabled:opacity-50"
                >
                  {isTestingConnection ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Sparkles size={16} />
                  )}
                  <span className="text-sm font-medium">Test Connection</span>
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={!localClaudeConfig.model || !localClaudeConfig.serverUrl}
                  className={clsx(
                    "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl transition-all",
                    configSaved
                      ? "bg-green-500 text-white"
                      : "bg-md-sys-color-primary text-md-sys-color-on-primary hover:opacity-90",
                    (!localClaudeConfig.model || !localClaudeConfig.serverUrl) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Check size={16} />
                  <span className="text-sm font-medium">{configSaved ? 'Saved!' : 'Save Config'}</span>
                </button>
              </div>

              {connectionStatus && (
                <div className={clsx(
                  "flex items-center gap-2 p-3 rounded-xl text-sm",
                  connectionStatus.success
                    ? "bg-green-500/10 text-green-400"
                    : "bg-red-500/10 text-red-400"
                )}>
                  {connectionStatus.success ? (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Connected to Claude CLI proxy!</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle size={16} />
                      <span>{connectionStatus.error || 'Connection failed'}</span>
                    </>
                  )}
                </div>
              )}

              {/* Current Config Display */}
              {claudeSettings.model && (
                <div className="text-xs text-md-sys-color-on-surface-variant p-2 bg-md-sys-color-surface-container rounded-lg">
                  <span className="font-medium">Active: </span>
                  <span className="text-md-sys-color-primary">{CLAUDE_MODELS.find(m => m.value === claudeSettings.model)?.name || claudeSettings.model}</span>
                  <span className="mx-1">@</span>
                  <span className="opacity-70">{claudeSettings.serverUrl}</span>
                </div>
              )}
            </div>
          </div>

          {/* Framework Section */}
          <div className="mb-2">
            <h3 className="text-sm font-medium text-md-sys-color-primary mb-4">Output Framework</h3>
            <div className="grid grid-cols-1 gap-2">
              {(Object.entries(FRAMEWORKS) as [string, typeof FRAMEWORKS.tailwind][]).map(([key, config]) => (
                <div
                  key={key}
                  onClick={() => onFrameworkChange(key as StyleFramework)}
                  className={clsx(
                    "flex items-center gap-4 p-4 rounded-2xl cursor-pointer transition-all border",
                    currentFramework === key
                      ? "bg-md-sys-color-secondary-container border-md-sys-color-secondary-container text-md-sys-color-on-secondary-container"
                      : "bg-transparent border-md-sys-color-outline-variant hover:border-md-sys-color-outline text-md-sys-color-on-surface"
                  )}
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-base">{config.name}</h4>
                    <p className={clsx(
                        "text-sm mt-1 leading-relaxed",
                         currentFramework === key ? "text-md-sys-color-on-secondary-container opacity-80" : "text-md-sys-color-on-surface-variant"
                    )}>
                       {config.description}
                    </p>
                  </div>
                  {currentFramework === key && <CheckCircle2 size={24} />}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 pt-2 flex justify-end">
          <Button variant="text" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};
