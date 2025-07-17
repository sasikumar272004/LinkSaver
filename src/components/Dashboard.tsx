import React, { useState, useEffect, useRef } from 'react';
import { Header } from './Header';
import { BookmarkForm } from './BookmarkForm';
import { BookmarkList } from './BookmarkList';
import { BookmarkAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Bookmark } from '../types';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export const Dashboard: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();
  
  const heroRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  const fetchBookmarks = async () => {
    if (!user) return;
    
    try {
      const data = await BookmarkAPI.getBookmarks(user.id);
      setBookmarks(data);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Failed to fetch bookmarks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookmarks();
  }, [user]);

  useEffect(() => {
    if (heroRef.current && statsRef.current && !loading) {
      gsap.fromTo(heroRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" }
      );
      
      gsap.fromTo(statsRef.current.children,
        { y: 20, opacity: 0 },
        { 
          y: 0, 
          opacity: 1, 
          duration: 0.6, 
          stagger: 0.1, 
          ease: "power2.out",
          delay: 0.3
        }
      );
    }
  }, [loading]);

  const handleBookmarkCreated = () => {
    fetchBookmarks();
  };

  const handleBookmarkDeleted = (id: string) => {
    setBookmarks(prev => prev.filter(bookmark => bookmark.id !== id));
  };

  const handleBookmarkUpdated = () => {
    fetchBookmarks();
  };

  const handleBookmarksReordered = (reorderedBookmarks: Bookmark[]) => {
    setBookmarks(reorderedBookmarks);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="w-8 h-8 border-2 border-gray-300 dark:border-gray-600 border-t-gray-900 dark:border-t-white rounded-full animate-spin"></div>
        </div>
      </div>
    );
  }

  const stats = [
    { label: 'Total Bookmarks', value: bookmarks.length },
    { label: 'This Week', value: bookmarks.filter(b => new Date(b.created_at) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length },
    { label: 'Today', value: bookmarks.filter(b => new Date(b.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)).length }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div ref={heroRef} className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-4 text-balance">
            Your Personal Link Library
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto text-balance">
            Save, organize, and rediscover your favorite content with intelligent summaries and seamless search.
          </p>
        </div>

        {/* Stats */}
        <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="glass-effect rounded-2xl p-6 card-shadow hover:card-shadow-hover transition-all duration-200"
            >
              <div className="text-center">
                <div className="text-3xl font-bold gradient-text mb-2">{stat.value}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
        
        <BookmarkForm onBookmarkCreated={handleBookmarkCreated} />
        
        {error && (
          <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
        
        <BookmarkList
          bookmarks={bookmarks}
          onBookmarkDeleted={handleBookmarkDeleted}
          onBookmarkUpdated={handleBookmarkUpdated}
          onBookmarksReordered={handleBookmarksReordered}
        />
      </div>
    </div>
  );
};