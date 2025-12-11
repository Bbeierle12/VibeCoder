
import React, { useState } from 'react';
import { Button } from './Button';
import { 
  X, FilePlus, Briefcase, Layout, LayoutDashboard, Newspaper, ChevronRight, 
  Trash2, Plus, ArrowLeft, Save, Code, Smartphone, Globe, ShoppingCart, Zap, Terminal
} from 'lucide-react';
import { ProjectTemplate } from '../types';
import { generateId } from '../utils/helpers';
import { clsx } from 'clsx';

interface TemplateSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateId: string) => void;
  templates?: ProjectTemplate[];
  onSaveTemplates?: (templates: ProjectTemplate[]) => void;
}

const ICONS: Record<string, React.ElementType> = {
  FilePlus, Briefcase, Layout, LayoutDashboard, Newspaper, 
  Code, Smartphone, Globe, ShoppingCart, Zap, Terminal
};

export const TemplateSelectionModal: React.FC<TemplateSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelect,
  templates = [],
  onSaveTemplates
}) => {
  const [view, setView] = useState<'list' | 'create'>('list');
  
  // Form State
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newPrompt, setNewPrompt] = useState('');
  const [newIcon, setNewIcon] = useState('Code');

  if (!isOpen) return null;

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveTemplates) return;

    const newTemplate: ProjectTemplate = {
      id: generateId(),
      name: newName,
      description: newDesc,
      prompt: newPrompt,
      icon: newIcon,
      isCustom: true
    };

    onSaveTemplates([...templates, newTemplate]);
    resetForm();
    setView('list');
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!onSaveTemplates) return;
    const updated = templates.filter(t => t.id !== id);
    onSaveTemplates(updated);
  };

  const resetForm = () => {
    setNewName('');
    setNewDesc('');
    setNewPrompt('');
    setNewIcon('Code');
  };

  const handleClose = () => {
    setView('list');
    resetForm();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-md-sys-color-surface-container rounded-[28px] shadow-elevation-3 overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-md-sys-color-outline-variant/20">
          <div className="flex items-center gap-3">
             {view === 'create' && (
                <Button variant="icon" onClick={() => setView('list')} className="-ml-2">
                    <ArrowLeft size={24} />
                </Button>
             )}
             <div>
                <h2 className="text-2xl font-normal text-md-sys-color-on-surface">
                    {view === 'create' ? 'Create Custom Template' : 'New Project'}
                </h2>
                <p className="text-sm text-md-sys-color-on-surface-variant mt-1">
                    {view === 'create' ? 'Define a starting prompt for your workflow' : 'Choose a starting point for your next creation'}
                </p>
             </div>
          </div>
          <Button variant="icon" onClick={handleClose}>
            <X size={24} />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {view === 'list' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* Create New Card */}
                <button
                  onClick={() => setView('create')}
                  className="flex flex-col items-center justify-center text-center h-full p-5 rounded-2xl border border-dashed border-md-sys-color-primary/50 bg-md-sys-color-surface/50 hover:bg-md-sys-color-primary/5 transition-all group min-h-[200px]"
                >
                  <div className="w-12 h-12 rounded-full bg-md-sys-color-primary-container text-md-sys-color-on-primary-container flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                     <Plus size={24} />
                  </div>
                  <h3 className="text-lg font-medium text-md-sys-color-primary">Create Custom</h3>
                  <p className="text-sm text-md-sys-color-on-surface-variant mt-1 max-w-[150px]">
                    Design your own reusable project starter
                  </p>
                </button>

                {/* Template List */}
                {templates.map((template) => {
                  const IconComponent = ICONS[template.icon as keyof typeof ICONS] || FilePlus;
                  
                  return (
                    <div
                      key={template.id}
                      onClick={() => onSelect(template.id)}
                      className="relative flex flex-col text-left h-full p-5 rounded-2xl border border-md-sys-color-outline-variant/30 bg-md-sys-color-surface hover:bg-md-sys-color-surface-container-high hover:border-md-sys-color-primary/50 hover:shadow-elevation-1 transition-all group cursor-pointer"
                    >
                      <div className="flex justify-between items-start mb-4">
                          <div className={clsx(
                            "w-12 h-12 rounded-xl flex items-center justify-center transition-colors",
                            template.id === 'blank' 
                              ? "bg-md-sys-color-surface-container-high text-md-sys-color-on-surface-variant group-hover:bg-md-sys-color-primary-container group-hover:text-md-sys-color-on-primary-container"
                              : "bg-md-sys-color-secondary-container text-md-sys-color-on-secondary-container"
                          )}>
                            <IconComponent size={24} />
                          </div>
                          
                          {template.isCustom && (
                             <button 
                                onClick={(e) => handleDelete(e, template.id)}
                                className="p-2 text-md-sys-color-on-surface-variant hover:text-md-sys-color-error hover:bg-md-sys-color-error/10 rounded-full transition-colors opacity-0 group-hover:opacity-100"
                                title="Delete Template"
                             >
                                <Trash2 size={16} />
                             </button>
                          )}
                      </div>
                      
                      <h3 className="text-lg font-medium text-md-sys-color-on-surface mb-2">{template.name}</h3>
                      <p className="text-sm text-md-sys-color-on-surface-variant flex-1 leading-relaxed line-clamp-3">
                        {template.description}
                      </p>
                      
                      <div className="mt-4 flex items-center text-xs font-bold text-md-sys-color-primary uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                        Start Building <ChevronRight size={14} className="ml-1" />
                      </div>
                    </div>
                  );
                })}
              </div>
          ) : (
             /* Create Form */
             <form onSubmit={handleCreateSubmit} className="max-w-2xl mx-auto space-y-6">
                <div>
                   <label className="block text-sm font-medium text-md-sys-color-primary mb-2">Template Name</label>
                   <input 
                      required
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g., E-commerce Starter"
                      className="w-full bg-md-sys-color-surface-container-high border-none rounded-xl px-4 py-3 text-md-sys-color-on-surface focus:ring-2 focus:ring-md-sys-color-primary"
                   />
                </div>
                
                <div>
                   <label className="block text-sm font-medium text-md-sys-color-primary mb-2">Description</label>
                   <input 
                      required
                      value={newDesc}
                      onChange={(e) => setNewDesc(e.target.value)}
                      placeholder="Short description of what this template does"
                      className="w-full bg-md-sys-color-surface-container-high border-none rounded-xl px-4 py-3 text-md-sys-color-on-surface focus:ring-2 focus:ring-md-sys-color-primary"
                   />
                </div>

                <div>
                   <label className="block text-sm font-medium text-md-sys-color-primary mb-2">Icon</label>
                   <div className="grid grid-cols-6 sm:grid-cols-11 gap-2">
                      {Object.keys(ICONS).map(iconName => {
                         const Icon = ICONS[iconName];
                         return (
                            <button
                               type="button"
                               key={iconName}
                               onClick={() => setNewIcon(iconName)}
                               title={`Select ${iconName} icon`}
                               aria-label={`Select ${iconName} icon`}
                               className={clsx(
                                  "p-3 rounded-xl flex items-center justify-center transition-all",
                                  newIcon === iconName 
                                     ? "bg-md-sys-color-primary text-md-sys-color-on-primary shadow-lg scale-110" 
                                     : "bg-md-sys-color-surface-container-high text-md-sys-color-on-surface-variant hover:bg-md-sys-color-surface-container-highest"
                               )}
                            >
                               <Icon size={20} />
                            </button>
                         )
                      })}
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-md-sys-color-primary mb-2">Starting Prompt</label>
                   <textarea 
                      required
                      value={newPrompt}
                      onChange={(e) => setNewPrompt(e.target.value)}
                      placeholder="The instruction sent to AI to generate the initial code..."
                      className="w-full h-40 bg-md-sys-color-surface-container-high border-none rounded-xl px-4 py-3 text-md-sys-color-on-surface focus:ring-2 focus:ring-md-sys-color-primary resize-none"
                   />
                </div>

                <div className="flex justify-end gap-3 pt-4">
                   <Button type="button" variant="text" onClick={() => setView('list')}>Cancel</Button>
                   <Button type="submit" variant="filled" className="gap-2">
                      <Save size={18} /> Save Template
                   </Button>
                </div>
             </form>
          )}

        </div>
        
        {view === 'list' && (
            <div className="p-4 border-t border-md-sys-color-outline-variant/20 bg-md-sys-color-surface-container-low flex justify-between items-center text-xs text-md-sys-color-on-surface-variant">
                <span>Select 'Blank Canvas' for a custom start.</span>
                <Button variant="text" onClick={onClose}>Cancel</Button>
            </div>
        )}
      </div>
    </div>
  );
};
