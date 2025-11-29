

import React from 'react';
import { StyleFramework, Theme } from '../types';
import { FRAMEWORKS } from '../constants';
import { Button } from './Button';
import { X, Layers, CheckCircle2, Moon, Sun } from 'lucide-react';
import { clsx } from 'clsx';

interface SettingsModalProps {
  currentFramework: StyleFramework;
  onFrameworkChange: (framework: StyleFramework) => void;
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  currentFramework,
  onFrameworkChange,
  currentTheme,
  onThemeChange,
  isOpen,
  onClose
}) => {
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
            <div className="flex gap-4">
              <button 
                onClick={() => onThemeChange('light')}
                className={clsx(
                  "flex-1 flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all",
                  currentTheme === 'light'
                    ? "bg-md-sys-color-secondary-container border-md-sys-color-secondary-container text-md-sys-color-on-secondary-container"
                    : "bg-transparent border-md-sys-color-outline-variant hover:border-md-sys-color-outline text-md-sys-color-on-surface"
                )}
              >
                <Sun size={24} />
                <span className="font-medium text-sm">Light</span>
              </button>
              
              <button 
                onClick={() => onThemeChange('dark')}
                className={clsx(
                  "flex-1 flex flex-col items-center gap-3 p-4 rounded-2xl border transition-all",
                  currentTheme === 'dark'
                    ? "bg-md-sys-color-secondary-container border-md-sys-color-secondary-container text-md-sys-color-on-secondary-container"
                    : "bg-transparent border-md-sys-color-outline-variant hover:border-md-sys-color-outline text-md-sys-color-on-surface"
                )}
              >
                <Moon size={24} />
                <span className="font-medium text-sm">Dark</span>
              </button>
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