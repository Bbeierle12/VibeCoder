

import React, { useState, useEffect } from 'react';
import { StyleFramework, Theme, LLMSettings, LocalLLMConfig, ClaudeCliConfig } from '../types';
import { FRAMEWORKS } from '../constants';
import { Button } from './Button';
import { X, Layers, CheckCircle2, Moon, Sun, Cloud, Server, Loader2, AlertCircle, Check, ChevronDown, Sparkles, Zap } from 'lucide-react';
import { clsx } from 'clsx';
import { testLocalConnection, getDefaultEndpoint } from '../services/localLLMService';
import { testClaudeConnection, CLAUDE_MODELS, getDefaultClaudeConfig } from '../services/claudeCliService';

// Popular model presets
const MODEL_PRESETS = [
  { name: 'Qwen 3 Coder 480B', value: 'qwen3-coder:480b', description: 'Best for complex code generation' },
  { name: 'Qwen 2.5 Coder 32B', value: 'qwen2.5-coder:32b', description: 'Excellent code quality' },
  { name: 'DeepSeek Coder 33B', value: 'deepseek-coder:33b', description: 'Strong coding capabilities' },
  { name: 'CodeLlama 34B', value: 'codellama:34b', description: 'Meta\'s code-focused model' },
  { name: 'CodeLlama 13B', value: 'codellama:13b', description: 'Good balance of speed/quality' },
  { name: 'Mistral 7B', value: 'mistral:7b', description: 'Fast general purpose' },
  { name: 'Llama 3.2 3B', value: 'llama3.2:3b', description: 'Lightweight and fast' },
  { name: 'Custom', value: '', description: 'Enter custom model name' },
];

interface SettingsModalProps {
  currentFramework: StyleFramework;
  onFrameworkChange: (framework: StyleFramework) => void;
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
  llmSettings: LLMSettings;
  onLLMSettingsChange: (settings: LLMSettings) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  currentFramework,
  onFrameworkChange,
  currentTheme,
  onThemeChange,
  llmSettings,
  onLLMSettingsChange,
  isOpen,
  onClose
}) => {
  const [localConfig, setLocalConfig] = useState<LocalLLMConfig>(llmSettings.localConfig);
  const [claudeConfig, setClaudeConfig] = useState<ClaudeCliConfig>(llmSettings.claudeCliConfig || getDefaultClaudeConfig());
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isTestingClaudeConnection, setIsTestingClaudeConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{ success?: boolean; error?: string; models?: string[] } | null>(null);
  const [claudeConnectionStatus, setClaudeConnectionStatus] = useState<{ success?: boolean; error?: string } | null>(null);
  const [configSaved, setConfigSaved] = useState(false);
  const [claudeConfigSaved, setClaudeConfigSaved] = useState(false);
  const [useCustomModel, setUseCustomModel] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [showClaudeModelDropdown, setShowClaudeModelDropdown] = useState(false);

  useEffect(() => {
    setLocalConfig(llmSettings.localConfig);
    setClaudeConfig(llmSettings.claudeCliConfig || getDefaultClaudeConfig());
    setConfigSaved(false);
    setClaudeConfigSaved(false);
    // Check if current model is a preset or custom
    const isPreset = MODEL_PRESETS.some(p => p.value === llmSettings.localConfig.modelName);
    setUseCustomModel(!isPreset && llmSettings.localConfig.modelName !== '');
  }, [llmSettings.localConfig, llmSettings.claudeCliConfig]);

  // Reset configSaved when modal opens
  useEffect(() => {
    if (isOpen) {
      setConfigSaved(false);
      setClaudeConfigSaved(false);
    }
  }, [isOpen]);

  const handleProviderChange = (provider: 'gemini' | 'local' | 'claude-cli') => {
    onLLMSettingsChange({
      ...llmSettings,
      provider
    });
    setConfigSaved(false);
    setClaudeConfigSaved(false);
  };

  const handleLocalProviderChange = (localProvider: 'ollama' | 'lmstudio' | 'custom') => {
    const newConfig = {
      ...localConfig,
      provider: localProvider,
      endpoint: getDefaultEndpoint(localProvider)
    };
    setLocalConfig(newConfig);
    setConnectionStatus(null);
    setConfigSaved(false);
  };

  const handleEndpointChange = (endpoint: string) => {
    setLocalConfig({ ...localConfig, endpoint });
    setConnectionStatus(null);
    setConfigSaved(false);
  };

  const handleModelChange = (modelName: string) => {
    setLocalConfig({ ...localConfig, modelName });
    setConfigSaved(false);
  };

  // Claude CLI handlers
  const handleClaudeServerUrlChange = (serverUrl: string) => {
    setClaudeConfig({ ...claudeConfig, serverUrl });
    setClaudeConnectionStatus(null);
    setClaudeConfigSaved(false);
  };

  const handleClaudeModelChange = (model: string) => {
    setClaudeConfig({ ...claudeConfig, model });
    setClaudeConfigSaved(false);
  };

  const handleTestClaudeConnection = async () => {
    setIsTestingClaudeConnection(true);
    setClaudeConnectionStatus(null);
    setClaudeConfigSaved(false);
    
    const result = await testClaudeConnection(claudeConfig);
    setClaudeConnectionStatus(result);
    
    setIsTestingClaudeConnection(false);
  };

  const handleSaveClaudeConfig = () => {
    onLLMSettingsChange({
      ...llmSettings,
      provider: 'claude-cli',
      claudeCliConfig: claudeConfig
    });
    setClaudeConfigSaved(true);
    
    setTimeout(() => setClaudeConfigSaved(false), 2000);
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setConnectionStatus(null);
    setConfigSaved(false);
    
    const result = await testLocalConnection(localConfig);
    setConnectionStatus(result);
    
    // Auto-select first model if available and no model is set
    if (result.success && result.models && result.models.length > 0) {
      const modelToUse = localConfig.modelName && result.models.includes(localConfig.modelName) 
        ? localConfig.modelName 
        : result.models[0];
      setLocalConfig(prev => ({ ...prev, modelName: modelToUse }));
    }
    
    setIsTestingConnection(false);
  };

  const handleSaveLocalConfig = () => {
    // Update the LLM settings with the new local config and ensure provider is set to 'local'
    onLLMSettingsChange({
      ...llmSettings,
      provider: 'local',
      localConfig
    });
    setConfigSaved(true);
    
    // Clear the saved indicator after 2 seconds
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

          {/* LLM Provider Section */}
          <div className="mb-8">
            <h3 className="text-sm font-medium text-md-sys-color-primary mb-4">AI Provider</h3>
            <div className="flex gap-4 mb-4">
              <button 
                onClick={() => handleProviderChange('gemini')}
                className={clsx(
                  "flex-1 flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all",
                  llmSettings.provider === 'gemini'
                    ? "bg-md-sys-color-secondary-container border-md-sys-color-secondary-container text-md-sys-color-on-secondary-container"
                    : "bg-transparent border-md-sys-color-outline-variant hover:border-md-sys-color-outline text-md-sys-color-on-surface"
                )}
              >
                <Cloud size={24} />
                <span className="font-medium text-sm">Gemini</span>
              </button>

              <button 
                onClick={() => handleProviderChange('claude-cli')}
                className={clsx(
                  "flex-1 flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all",
                  llmSettings.provider === 'claude-cli'
                    ? "bg-md-sys-color-secondary-container border-md-sys-color-secondary-container text-md-sys-color-on-secondary-container"
                    : "bg-transparent border-md-sys-color-outline-variant hover:border-md-sys-color-outline text-md-sys-color-on-surface"
                )}
              >
                <Sparkles size={24} />
                <span className="font-medium text-sm">Claude CLI</span>
              </button>
              
              <button 
                onClick={() => handleProviderChange('local')}
                className={clsx(
                  "flex-1 flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all",
                  llmSettings.provider === 'local'
                    ? "bg-md-sys-color-secondary-container border-md-sys-color-secondary-container text-md-sys-color-on-secondary-container"
                    : "bg-transparent border-md-sys-color-outline-variant hover:border-md-sys-color-outline text-md-sys-color-on-surface"
                )}
              >
                <Server size={24} />
                <span className="font-medium text-sm">Local LLM</span>
              </button>
            </div>

            {/* Claude CLI Configuration */}
            {llmSettings.provider === 'claude-cli' && (
              <div className="p-4 rounded-2xl border border-md-sys-color-outline-variant bg-md-sys-color-surface-container-low space-y-4">
                <div className="text-xs text-md-sys-color-on-surface-variant p-3 bg-md-sys-color-surface-container rounded-lg border border-md-sys-color-outline-variant">
                  <p className="font-medium mb-1">⚡ Uses your Claude subscription limits</p>
                  <p>Requires a local proxy server. Run: <code className="bg-md-sys-color-surface-container-high px-1 py-0.5 rounded">npx claude-cli-proxy</code></p>
                </div>

                <div>
                  <label className="text-xs font-medium text-md-sys-color-on-surface-variant mb-2 block">Proxy Server URL</label>
                  <input
                    type="text"
                    value={claudeConfig.serverUrl}
                    onChange={(e) => handleClaudeServerUrlChange(e.target.value)}
                    placeholder="http://localhost:3456"
                    className="w-full px-4 py-3 rounded-xl bg-md-sys-color-surface-container border border-md-sys-color-outline-variant text-md-sys-color-on-surface placeholder:text-md-sys-color-on-surface-variant/50 focus:outline-none focus:border-md-sys-color-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-md-sys-color-on-surface-variant mb-2 block">Model</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowClaudeModelDropdown(!showClaudeModelDropdown)}
                      className="w-full px-4 py-3 rounded-xl bg-md-sys-color-surface-container border border-md-sys-color-outline-variant text-md-sys-color-on-surface focus:outline-none focus:border-md-sys-color-primary flex items-center justify-between"
                    >
                      <span>
                        {CLAUDE_MODELS.find(m => m.value === claudeConfig.model)?.name || claudeConfig.model}
                      </span>
                      <ChevronDown size={16} className={clsx("transition-transform", showClaudeModelDropdown && "rotate-180")} />
                    </button>
                    
                    {showClaudeModelDropdown && (
                      <div className="absolute z-50 w-full mt-1 py-1 bg-md-sys-color-surface-container border border-md-sys-color-outline-variant rounded-xl shadow-lg max-h-64 overflow-y-auto">
                        {CLAUDE_MODELS.map((model) => (
                          <button
                            key={model.value}
                            type="button"
                            onClick={() => {
                              handleClaudeModelChange(model.value);
                              setShowClaudeModelDropdown(false);
                            }}
                            className={clsx(
                              "w-full px-4 py-2 text-left hover:bg-md-sys-color-surface-container-high transition-colors",
                              claudeConfig.model === model.value && "bg-md-sys-color-primary/10"
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
                    onClick={handleTestClaudeConnection}
                    disabled={isTestingClaudeConnection}
                    className="flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-md-sys-color-surface-container-high border border-md-sys-color-outline-variant text-md-sys-color-on-surface hover:bg-md-sys-color-surface-container transition-all disabled:opacity-50"
                  >
                    {isTestingClaudeConnection ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Sparkles size={16} />
                    )}
                    <span className="text-sm font-medium">Test Connection</span>
                  </button>
                  <button
                    onClick={handleSaveClaudeConfig}
                    disabled={!claudeConfig.model || !claudeConfig.serverUrl}
                    className={clsx(
                      "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl transition-all",
                      claudeConfigSaved 
                        ? "bg-green-500 text-white"
                        : "bg-md-sys-color-primary text-md-sys-color-on-primary hover:opacity-90",
                      (!claudeConfig.model || !claudeConfig.serverUrl) && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Check size={16} />
                    <span className="text-sm font-medium">{claudeConfigSaved ? 'Saved!' : 'Save Config'}</span>
                  </button>
                </div>

                {claudeConnectionStatus && (
                  <div className={clsx(
                    "flex items-center gap-2 p-3 rounded-xl text-sm",
                    claudeConnectionStatus.success 
                      ? "bg-green-500/10 text-green-400" 
                      : "bg-red-500/10 text-red-400"
                  )}>
                    {claudeConnectionStatus.success ? (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Connected to Claude CLI proxy!</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle size={16} />
                        <span>{claudeConnectionStatus.error || 'Connection failed'}</span>
                      </>
                    )}
                  </div>
                )}

                {/* Current Config Display */}
                {llmSettings.claudeCliConfig?.model && (
                  <div className="text-xs text-md-sys-color-on-surface-variant p-2 bg-md-sys-color-surface-container rounded-lg">
                    <span className="font-medium">Active: </span>
                    <span className="text-md-sys-color-primary">{CLAUDE_MODELS.find(m => m.value === llmSettings.claudeCliConfig.model)?.name || llmSettings.claudeCliConfig.model}</span>
                    <span className="mx-1">@</span>
                    <span className="opacity-70">{llmSettings.claudeCliConfig.serverUrl}</span>
                  </div>
                )}
              </div>
            )}

            {/* Local LLM Configuration */}
            {llmSettings.provider === 'local' && (
              <div className="p-4 rounded-2xl border border-md-sys-color-outline-variant bg-md-sys-color-surface-container-low space-y-4">
                <div>
                  <label className="text-xs font-medium text-md-sys-color-on-surface-variant mb-2 block">Provider Type</label>
                  <div className="flex gap-2">
                    {(['ollama', 'lmstudio', 'custom'] as const).map((provider) => (
                      <button
                        key={provider}
                        onClick={() => handleLocalProviderChange(provider)}
                        className={clsx(
                          "flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-all border",
                          localConfig.provider === provider
                            ? "bg-md-sys-color-primary text-md-sys-color-on-primary border-md-sys-color-primary"
                            : "bg-transparent border-md-sys-color-outline-variant text-md-sys-color-on-surface hover:border-md-sys-color-outline"
                        )}
                      >
                        {provider === 'lmstudio' ? 'LM Studio' : provider.charAt(0).toUpperCase() + provider.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-md-sys-color-on-surface-variant mb-2 block">Endpoint URL</label>
                  <input
                    type="text"
                    value={localConfig.endpoint}
                    onChange={(e) => handleEndpointChange(e.target.value)}
                    placeholder="http://localhost:11434"
                    className="w-full px-4 py-3 rounded-xl bg-md-sys-color-surface-container border border-md-sys-color-outline-variant text-md-sys-color-on-surface placeholder:text-md-sys-color-on-surface-variant/50 focus:outline-none focus:border-md-sys-color-primary"
                  />
                  <p className="text-xs text-md-sys-color-on-surface-variant mt-1 opacity-70">
                    Use your cloud URL for remote Ollama (e.g., http://your-server:11434)
                  </p>
                </div>

                <div>
                  <label className="text-xs font-medium text-md-sys-color-on-surface-variant mb-2 block" id="model-label">Model</label>
                  
                  {/* Model Presets Dropdown */}
                  <div className="relative mb-2">
                    <button
                      type="button"
                      onClick={() => setShowModelDropdown(!showModelDropdown)}
                      className="w-full px-4 py-3 rounded-xl bg-md-sys-color-surface-container border border-md-sys-color-outline-variant text-md-sys-color-on-surface focus:outline-none focus:border-md-sys-color-primary flex items-center justify-between"
                    >
                      <span>
                        {useCustomModel ? 'Custom Model' : (MODEL_PRESETS.find(p => p.value === localConfig.modelName)?.name || 'Select a model')}
                      </span>
                      <ChevronDown size={16} className={clsx("transition-transform", showModelDropdown && "rotate-180")} />
                    </button>
                    
                    {showModelDropdown && (
                      <div className="absolute z-50 w-full mt-1 py-1 bg-md-sys-color-surface-container border border-md-sys-color-outline-variant rounded-xl shadow-lg max-h-64 overflow-y-auto">
                        {MODEL_PRESETS.map((preset) => (
                          <button
                            key={preset.value || 'custom'}
                            type="button"
                            onClick={() => {
                              if (preset.value === '') {
                                setUseCustomModel(true);
                                setLocalConfig({ ...localConfig, modelName: '' });
                              } else {
                                setUseCustomModel(false);
                                handleModelChange(preset.value);
                              }
                              setShowModelDropdown(false);
                            }}
                            className={clsx(
                              "w-full px-4 py-2 text-left hover:bg-md-sys-color-surface-container-high transition-colors",
                              (localConfig.modelName === preset.value || (preset.value === '' && useCustomModel)) && "bg-md-sys-color-primary/10"
                            )}
                          >
                            <div className="font-medium text-sm text-md-sys-color-on-surface">{preset.name}</div>
                            <div className="text-xs text-md-sys-color-on-surface-variant">{preset.description}</div>
                          </button>
                        ))}
                        
                        {/* Show detected models from connection test */}
                        {connectionStatus?.models && connectionStatus.models.length > 0 && (
                          <>
                            <div className="px-4 py-2 text-xs font-medium text-md-sys-color-primary border-t border-md-sys-color-outline-variant mt-1">
                              Detected Models
                            </div>
                            {connectionStatus.models.map((model) => (
                              <button
                                key={model}
                                type="button"
                                onClick={() => {
                                  setUseCustomModel(false);
                                  handleModelChange(model);
                                  setShowModelDropdown(false);
                                }}
                                className={clsx(
                                  "w-full px-4 py-2 text-left hover:bg-md-sys-color-surface-container-high transition-colors",
                                  localConfig.modelName === model && "bg-md-sys-color-primary/10"
                                )}
                              >
                                <div className="font-medium text-sm text-md-sys-color-on-surface">{model}</div>
                                <div className="text-xs text-md-sys-color-on-surface-variant">From your Ollama instance</div>
                              </button>
                            ))}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {/* Custom model input */}
                  {useCustomModel && (
                    <input
                      type="text"
                      value={localConfig.modelName}
                      onChange={(e) => handleModelChange(e.target.value)}
                      placeholder="Enter model name (e.g., qwen3-coder:480b)"
                      className="w-full px-4 py-3 rounded-xl bg-md-sys-color-surface-container border border-md-sys-color-outline-variant text-md-sys-color-on-surface placeholder:text-md-sys-color-on-surface-variant/50 focus:outline-none focus:border-md-sys-color-primary"
                    />
                  )}
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
                      <Server size={16} />
                    )}
                    <span className="text-sm font-medium">Test Connection</span>
                  </button>
                  <button
                    onClick={handleSaveLocalConfig}
                    disabled={!localConfig.modelName || !localConfig.endpoint}
                    className={clsx(
                      "flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-xl transition-all",
                      configSaved 
                        ? "bg-green-500 text-white"
                        : "bg-md-sys-color-primary text-md-sys-color-on-primary hover:opacity-90",
                      (!localConfig.modelName || !localConfig.endpoint) && "opacity-50 cursor-not-allowed"
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
                        <span>Connected! {connectionStatus.models?.length} model(s) available.</span>
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
                {llmSettings.localConfig.modelName && (
                  <div className="text-xs text-md-sys-color-on-surface-variant p-2 bg-md-sys-color-surface-container rounded-lg">
                    <span className="font-medium">Active: </span>
                    <span className="text-md-sys-color-primary">{llmSettings.localConfig.modelName}</span>
                    <span className="mx-1">@</span>
                    <span className="opacity-70">{llmSettings.localConfig.endpoint}</span>
                  </div>
                )}
              </div>
            )}
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