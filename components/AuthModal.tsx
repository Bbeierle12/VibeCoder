import React, { useState } from 'react';
import { Button } from './Button';
import { User } from '../types';
import { Logo } from './Logo';
import { generateId } from '../utils/helpers';
import { clsx } from 'clsx';

interface AuthModalProps {
  onLogin: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onLogin }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    setTimeout(() => {
      const user: User = {
        id: generateId(),
        username,
        email,
      };
      onLogin(user);
      setLoading(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4">
      <div className="w-full max-w-[400px] bg-md-sys-color-surface-container-high rounded-[32px] shadow-elevation-3 overflow-hidden animate-in fade-in zoom-in-95 duration-500 p-10 relative">
        
        {/* Decorative background blur */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-md-sys-color-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-md-sys-color-secondary/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col items-center mb-10 relative z-10">
          <div className="mb-6 shadow-elevation-2 rounded-[24px]">
            <Logo size={80} />
          </div>
          <h2 className="text-3xl font-normal text-md-sys-color-on-surface tracking-tight">
            {isSignUp ? 'Join VibeCoder' : 'Welcome Back'}
          </h2>
          <p className="text-md-sys-color-on-surface-variant text-base mt-2 text-center leading-relaxed">
            {isSignUp ? 'Start building your ideas instantly.' : 'Continue your creative flow.'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div className="space-y-4">
            <div className={clsx(
                "bg-md-sys-color-surface-container rounded-t-[8px] border-b border-md-sys-color-outline-variant transition-colors focus-within:border-md-sys-color-primary relative group",
                !isSignUp && "rounded-b-[8px]" // rounded bottom if single field
            )}>
              <label className="absolute top-2 left-4 text-xs text-md-sys-color-primary font-medium tracking-wide">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-transparent border-none px-4 pt-7 pb-3 text-md-sys-color-on-surface focus:ring-0 placeholder:text-transparent text-base"
                placeholder="Username"
              />
            </div>

            {isSignUp && (
              <div className="bg-md-sys-color-surface-container border-b border-md-sys-color-outline-variant transition-colors focus-within:border-md-sys-color-primary relative">
                 <label className="absolute top-2 left-4 text-xs text-md-sys-color-primary font-medium tracking-wide">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent border-none px-4 pt-7 pb-3 text-md-sys-color-on-surface focus:ring-0 text-base"
                    placeholder="Email"
                  />
              </div>
            )}

            <div className={clsx(
                "bg-md-sys-color-surface-container border-b border-md-sys-color-outline-variant transition-colors focus-within:border-md-sys-color-primary relative",
                isSignUp ? "rounded-b-[8px]" : "rounded-[8px] mt-4"
            )}>
               <label className="absolute top-2 left-4 text-xs text-md-sys-color-primary font-medium tracking-wide">Password</label>
               <input
                  type="password"
                  required
                  className="w-full bg-transparent border-none px-4 pt-7 pb-3 text-md-sys-color-on-surface focus:ring-0 text-base"
                  placeholder="Password"
               />
            </div>
          </div>

          <div className="flex flex-col gap-4 mt-8">
            <Button type="submit" variant="filled" className="w-full h-12 text-base font-semibold shadow-none hover:shadow-elevation-1" disabled={loading}>
              {loading ? 'Authenticating...' : (isSignUp ? 'Create Account' : 'Sign In')}
            </Button>
            
            <div className="flex items-center justify-center gap-2 mt-2">
                <span className="text-sm text-md-sys-color-on-surface-variant">
                    {isSignUp ? 'Already have an account?' : 'No account yet?'}
                </span>
                <button 
                    type="button" 
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-sm font-semibold text-md-sys-color-primary hover:text-md-sys-color-on-primary-container transition-colors"
                >
                    {isSignUp ? 'Log in' : 'Sign up'}
                </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};