import React, { useEffect, useRef } from 'react';
import { LogOut, Moon, Sun, Bookmark, Settings, User, BarChart3 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { gsap } from 'gsap';

export const Header: React.FC = () => {
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const headerRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const tl = gsap.timeline();
    
    if (headerRef.current && logoRef.current && navRef.current) {
      // Header slide down
      tl.fromTo(headerRef.current, 
        { y: -100, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }
      );
      
      // Logo scale in
      tl.fromTo(logoRef.current,
        { scale: 0, rotation: -180 },
        { scale: 1, rotation: 0, duration: 0.6, ease: "back.out(1.7)" },
        "-=0.4"
      );
      
      // Navigation items stagger
      tl.fromTo(navRef.current.children,
        { x: 50, opacity: 0 },
        { 
          x: 0, 
          opacity: 1, 
          duration: 0.5, 
          stagger: 0.1, 
          ease: "power2.out" 
        },
        "-=0.3"
      );
    }
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Sign out failed:', error);
    }
  };

  return (
    <header 
      ref={headerRef}
      className="sticky top-0 z-50 glass-morphism border-b border-gray-200/50 dark:border-gray-700/30"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div ref={logoRef} className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl blur opacity-75"></div>
              <div className="relative p-2.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                <Bookmark className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gradient">
                LinkSaver
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                Enterprise
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div ref={navRef} className="flex items-center space-x-2">
            {/* User Info */}
            <div className="hidden sm:flex items-center space-x-3 px-3 py-2 bg-gray-100/50 dark:bg-gray-800/50 rounded-xl">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="text-sm">
                <div className="font-medium text-gray-900 dark:text-white">
                  {user?.email?.split('@')[0]}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {user?.email?.split('@')[1]}
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-1">
              <button
                className="p-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all duration-200 group"
                aria-label="Analytics"
              >
                <BarChart3 className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
              </button>
              
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all duration-200 group"
                aria-label="Toggle theme"
              >
                {isDark ? (
                  <Sun className="w-4 h-4 group-hover:rotate-180 transition-transform duration-300" />
                ) : (
                  <Moon className="w-4 h-4 group-hover:-rotate-12 transition-transform duration-300" />
                )}
              </button>

              <button
                className="p-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white transition-all duration-200 group"
                aria-label="Settings"
              >
                <Settings className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
              </button>

              <button
                onClick={handleSignOut}
                className="p-2.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 group"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};