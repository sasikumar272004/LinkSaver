import React, { useState, useEffect, useRef } from 'react';
import { Header } from './Header';
import { BookmarkForm } from './BookmarkForm';
import { BookmarkList } from './BookmarkList';
import { Analytics } from './Analytics';
import { BookmarkAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Bookmark } from '../types';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TrendingUp, BookOpen, Clock, Zap } from 'lucide-react';
import toast from 'react-hot-toast';

gsap.registerPlugin(ScrollTrigger);

export const Dashboard: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bookmarks' | 'analytics'>('bookmarks');
  const { user } = useAuth();
  
  const heroRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    if (!user) return;
    
    try {
      const [bookmarksResult, analyticsResult] = await Promise.allSettled([
        BookmarkAPI.getBookmarks(user.id),
        BookmarkAPI.getAnalytics(user.id)
      ]);

      if (bookmarksResult.status === 'fulfilled') {
        setBookmarks(bookmarksResult.value.bookmarks);
      }

      if (analyticsResult.status === 'fulfilled') {
        setAnalytics(analyticsResult.value);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  useEffect(() => {
    if (!loading && heroRef.current && statsRef.current && contentRef.current) {
      const tl = gsap.timeline();
      
      // Hero animation
      tl.fromTo(heroRef.current,
        { y: 50, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: "power3.out" }
      );
      
      // Stats cards stagger
      tl.fromTo(statsRef.current.children,
        { y: 30, opacity: 0, scale: 0.95 },
        { 
          y: 0, 
          opacity: 1, 
          scale: 1,
          duration: 0.6, 
          stagger: 0.1, 
          ease: "back.out(1.7)" 
        },
        "-=0.7"
      );
      
      // Content fade in
      tl.fromTo(contentRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "power2.out" },
        "-=0.4"
      );

      // Scroll-triggered animations
      gsap.utils.toArray('.animate-on-scroll').forEach((element: any) => {
        gsap.fromTo(element, 
          { y: 50, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: element,
              start: "top 80%",
              end: "bottom 20%",
              toggleActions: "play none none reverse"
            }
          }
        );
      });
    }
  }, [loading]);

  const handleBookmarkCreated = () => {
    fetchData();
    toast.success('Bookmark saved successfully!');
  };

  const handleBookmarkDeleted = (id: string) => {
    setBookmarks(prev => prev.filter(bookmark => bookmark.id !== id));
    toast.success('Bookmark deleted');
  };

  const handleBookmarkUpdated = () => {
    fetchData();
    toast.success('Bookmark updated');
  };

  const handleBookmarksReordered = (reorderedBookmarks: Bookmark[]) => {
    setBookmarks(reorderedBookmarks);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header />
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center space-y-4">
            <div className="loading-spinner w-8 h-8"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading your bookmarks...</p>
          </div>
        </div>
      </div>
    );
  }

  const stats = [
    { 
      label: 'Total Bookmarks', 
      value: bookmarks.length,
      icon: <BookOpen className="w-5 h-5" />,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    },
    { 
      label: 'This Week', 
      value: analytics?.bookmarksThisWeek || 0,
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30'
    },
    { 
      label: 'This Month', 
      value: analytics?.bookmarksThisMonth || 0,
      icon: <Clock className="w-5 h-5" />,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-100 dark:bg-purple-900/30'
    },
    { 
      label: 'Top Tags', 
      value: analytics?.topTags?.length || 0,
      icon: <Zap className="w-5 h-5" />,
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-100 dark:bg-orange-900/30'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div ref={heroRef} className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold text-gradient mb-6 text-balance">
            Your Digital Knowledge
            <br />
            <span className="text-gradient-accent">Vault</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto text-balance leading-relaxed">
            Capture, organize, and rediscover the web's most valuable content with 
            intelligent AI-powered summaries and lightning-fast search.
          </p>
        </div>

        {/* Stats */}
        <div ref={statsRef} className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className="card-interactive group"
            >
              <div className="flex items-center space-x-4">
                <div className={`p-3 rounded-xl ${stat.bgColor} ${stat.color} group-hover:scale-110 transition-transform duration-200`}>
                  {stat.icon}
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="surface rounded-xl p-1 inline-flex">
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'bookmarks'
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Bookmarks
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                activeTab === 'analytics'
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Analytics
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div ref={contentRef}>
          {activeTab === 'bookmarks' ? (
            <>
              <div className="animate-on-scroll">
                <BookmarkForm onBookmarkCreated={handleBookmarkCreated} />
              </div>
              
              <div className="animate-on-scroll">
                <BookmarkList
                  bookmarks={bookmarks}
                  onBookmarkDeleted={handleBookmarkDeleted}
                  onBookmarkUpdated={handleBookmarkUpdated}
                  onBookmarksReordered={handleBookmarksReordered}
                />
              </div>
            </>
          ) : (
            <div className="animate-on-scroll">
              <Analytics analytics={analytics} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};