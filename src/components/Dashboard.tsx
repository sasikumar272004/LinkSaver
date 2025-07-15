import React, { useState, useEffect } from 'react';
import { Header } from './Header';
import { BookmarkForm } from './BookmarkForm';
import { BookmarkList } from './BookmarkList';
import { BookmarkAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Bookmark } from '../types';

export const Dashboard: React.FC = () => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth();

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
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BookmarkForm onBookmarkCreated={handleBookmarkCreated} />
        
        {error && (
          <div className="mb-6 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            {error}
          </div>
        )}
        
        <BookmarkList
          bookmarks={bookmarks}
          onBookmarkDeleted={handleBookmarkDeleted}
          onBookmarkUpdated={handleBookmarkUpdated}
          onBookmarksReordered={handleBookmarksReordered}
        />
      </main>
    </div>
  );
};