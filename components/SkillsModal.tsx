
import React, { useState } from 'react';
import { Skill } from '../types';
import { Button } from './Button';
import { X, BrainCircuit, Plus, Trash2, Edit2, Save } from 'lucide-react';
import { generateId } from '../utils/helpers';
import { clsx } from 'clsx';

interface SkillsModalProps {
  skills: Skill[];
  onSaveSkills: (skills: Skill[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const SkillsModal: React.FC<SkillsModalProps> = ({
  skills: initialSkills,
  onSaveSkills,
  isOpen,
  onClose
}) => {
  const [skills, setSkills] = useState<Skill[]>(initialSkills);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editContent, setEditContent] = useState('');

  const handleToggle = (id: string) => {
    const updated = skills.map(s => s.id === id ? { ...s, isEnabled: !s.isEnabled } : s);
    setSkills(updated);
    onSaveSkills(updated);
  };

  const handleDelete = (id: string) => {
    const updated = skills.filter(s => s.id !== id);
    setSkills(updated);
    onSaveSkills(updated);
  };

  const startEdit = (skill: Skill) => {
    setEditingId(skill.id);
    setEditName(skill.name);
    setEditContent(skill.content);
  };

  const saveEdit = () => {
    if (!editName.trim() || !editContent.trim()) return;

    if (editingId === 'new') {
      const newSkill: Skill = {
        id: generateId(),
        name: editName,
        content: editContent,
        isEnabled: true
      };
      const updated = [...skills, newSkill];
      setSkills(updated);
      onSaveSkills(updated);
    } else {
      const updated = skills.map(s => 
        s.id === editingId ? { ...s, name: editName, content: editContent } : s
      );
      setSkills(updated);
      onSaveSkills(updated);
    }
    setEditingId(null);
  };

  const startNew = () => {
    setEditingId('new');
    setEditName('');
    setEditContent('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-md-sys-color-surface-container rounded-[28px] shadow-elevation-3 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-md-sys-color-outline-variant/20">
          <div className="flex items-center gap-3">
            <div className="bg-md-sys-color-secondary-container text-md-sys-color-on-secondary-container p-2 rounded-xl">
               <BrainCircuit size={24} />
            </div>
            <div>
                <h2 className="text-xl font-normal text-md-sys-color-on-surface">Skills Library</h2>
                <p className="text-xs text-md-sys-color-on-surface-variant">Custom instructions for VibeCoder</p>
            </div>
          </div>
          <Button variant="icon" onClick={onClose}>
            <X size={24} />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
           {editingId ? (
              <div className="bg-md-sys-color-surface-container-high rounded-xl p-4 space-y-4 animate-in fade-in slide-in-from-bottom-2">
                 <div>
                    <label className="text-xs font-medium text-md-sys-color-primary ml-1">Skill Name</label>
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="e.g., Code Guidelines"
                      className="w-full bg-md-sys-color-surface-container border border-md-sys-color-outline-variant rounded-lg px-4 py-2 mt-1 text-md-sys-color-on-surface focus:outline-none focus:border-md-sys-color-primary transition-colors"
                    />
                 </div>
                 <div>
                    <label className="text-xs font-medium text-md-sys-color-primary ml-1">Instruction Content</label>
                    <textarea 
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="Enter the prompt instructions here..."
                      className="w-full h-40 bg-md-sys-color-surface-container border border-md-sys-color-outline-variant rounded-lg px-4 py-3 mt-1 text-md-sys-color-on-surface focus:outline-none focus:border-md-sys-color-primary transition-colors resize-none leading-relaxed font-mono text-sm"
                    />
                 </div>
                 <div className="flex justify-end gap-2 pt-2">
                    <Button variant="text" onClick={() => setEditingId(null)}>Cancel</Button>
                    <Button variant="filled" onClick={saveEdit} className="gap-2">
                       <Save size={16} /> Save Skill
                    </Button>
                 </div>
              </div>
           ) : (
             <>
               {skills.length === 0 && (
                   <div className="text-center py-10 opacity-50">
                       <BrainCircuit size={48} className="mx-auto mb-3 text-md-sys-color-outline" />
                       <p>No skills defined yet.</p>
                   </div>
               )}
               
               {skills.map(skill => (
                 <div key={skill.id} className={clsx(
                    "group flex items-start gap-4 p-4 rounded-xl border transition-all",
                    skill.isEnabled 
                        ? "bg-md-sys-color-secondary-container/10 border-md-sys-color-secondary-container/30" 
                        : "bg-md-sys-color-surface border-md-sys-color-outline-variant/20 opacity-70"
                 )}>
                    {/* Toggle Switch */}
                    <button 
                        onClick={() => handleToggle(skill.id)}
                        aria-label={`Toggle ${skill.name} skill`}
                        title={skill.isEnabled ? 'Disable skill' : 'Enable skill'}
                        className={clsx(
                            "mt-1 w-10 h-6 rounded-full relative transition-colors duration-200 focus:outline-none",
                            skill.isEnabled ? "bg-md-sys-color-primary" : "bg-md-sys-color-surface-container-highest"
                        )}
                    >
                        <span className={clsx(
                            "absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-200",
                            skill.isEnabled ? "translate-x-4" : "translate-x-0"
                        )} />
                    </button>

                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className={clsx(
                                "font-medium text-base",
                                skill.isEnabled ? "text-md-sys-color-on-surface" : "text-md-sys-color-on-surface-variant"
                            )}>{skill.name}</h3>
                            {!skill.isEnabled && <span className="text-[10px] uppercase tracking-wider font-bold text-md-sys-color-outline px-1.5 py-0.5 border border-md-sys-color-outline-variant rounded">Disabled</span>}
                        </div>
                        <p className="text-sm text-md-sys-color-on-surface-variant line-clamp-2 font-mono bg-black/20 p-2 rounded-lg border border-white/5">
                            {skill.content}
                        </p>
                    </div>

                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="icon" size="sm" onClick={() => startEdit(skill)}>
                            <Edit2 size={16} />
                        </Button>
                        <Button variant="icon" size="sm" onClick={() => handleDelete(skill.id)} className="text-md-sys-color-error hover:bg-md-sys-color-error/10">
                            <Trash2 size={16} />
                        </Button>
                    </div>
                 </div>
               ))}
             </>
           )}
        </div>

        {/* Footer */}
        {!editingId && (
            <div className="p-4 border-t border-md-sys-color-outline-variant/20 bg-md-sys-color-surface-container-low flex justify-end">
                <Button variant="filled" onClick={startNew} className="gap-2">
                    <Plus size={18} /> Add New Skill
                </Button>
            </div>
        )}
      </div>
    </div>
  );
};