import React, { useEffect, useRef } from 'react';
import { LogOut, Moon, Sun, Bookmark } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { gsap } from 'gsap';

export const Header: React.FC = () => {
  const { user, signOut } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const headerRef = useRef<HTMLElement>(null);
  const logoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (headerRef.current && logoRef.current) {
      gsap.fromTo(headerRef.current, 
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: "power2.out" }
      );
      
      gsap.fromTo(logoRef.current,
        { scale: 0.8, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.8, ease: "back.out(1.7)", delay: 0.2 }
      );
    }
  }, []);

  return (
    <header 
      ref={headerRef}
      className="sticky top-0 z-50 glass-effect border-b border-gray-200/50 dark:border-gray-700/50"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div ref={logoRef} className="flex items-center space-x-3">
            <div className="p-2 bg-gray-900 dark:bg-white rounded-xl">
              <Bookmark className="w-5 h-5 text-white dark:text-gray-900" />
            </div>
            <div>
              <h1 className="text-lg font-semibold gradient-text">
                LinkSaver
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Professional
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="hidden sm:block px-3 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {user?.email}
              </span>
            </div>
            
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus-ring"
              aria-label="Toggle theme"
            >
              {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={signOut}
              className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 focus-ring"
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};