import React, { useState, useEffect, useRef } from 'react';
import { ExternalLink, Trash2, Tag, Calendar, Edit2, X, Check, MoreHorizontal } from 'lucide-react';
import { Bookmark } from '../types';
import { BookmarkAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { gsap } from 'gsap';
import { useInView } from 'react-intersection-observer';

interface BookmarkCardProps {
  bookmark: Bookmark;
  onDelete: (id: string) => void;
  onUpdate: () => void;
  index: number;
}

export const BookmarkCard: React.FC<BookmarkCardProps> = ({ bookmark, onDelete, onUpdate, index }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTags, setEditTags] = useState(bookmark.tags.join(', '));
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { user } = useAuth();
  
  const cardRef = useRef<HTMLDivElement>(null);
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  });

  useEffect(() => {
    if (inView && cardRef.current) {
      gsap.fromTo(cardRef.current,
        { y: 30, opacity: 0 },
        { 
          y: 0, 
          opacity: 1, 
          duration: 0.6, 
          ease: "power2.out",
          delay: index * 0.1
        }
      );
    }
  }, [inView, index]);

  const handleDelete = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await BookmarkAPI.deleteBookmark(bookmark.id, user.id);
      onDelete(bookmark.id);
    } catch (error) {
      console.error('Error deleting bookmark:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTags = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const tags = editTags.split(',').map(tag => tag.trim()).filter(tag => tag);
      await BookmarkAPI.updateBookmarkTags(bookmark.id, tags, user.id);
      setEditing(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDomainFromUrl = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return 'Unknown';
    }
  };

  return (
    <div ref={inViewRef}>
      <div 
        ref={cardRef}
        className="group glass-effect rounded-2xl p-6 card-shadow hover:card-shadow-hover transition-all duration-300 hover:-translate-y-1"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="flex-shrink-0 w-10 h-10 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center">
              <img
                src={bookmark.favicon}
                alt="Favicon"
                className="w-6 h-6 rounded"
                onError={(e) => {
                  e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTQgN0gyMUwxNSAxMUwxNyAyMEwxMiAxNkw3IDIwTDkgMTFMMyA3SDEwTDEyIDJaIiBmaWxsPSIjNjM2NjcwIi8+Cjwvc3ZnPgo=';
                }}
              />
            </div>
            <div className="flex-1 min-w-0">
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-2 mb-1"
              >
                {bookmark.title}
              </a>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {getDomainFromUrl(bookmark.url)}
              </p>
            </div>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 focus-ring"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
            
            {showMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 glass-effect rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Open Link
                </a>
                <button
                  onClick={() => {
                    setEditing(true);
                    setShowMenu(false);
                  }}
                  className="flex items-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Tags
                </button>
                <button
                  onClick={() => {
                    setShowDeleteConfirm(true);
                    setShowMenu(false);
                  }}
                  className="flex items-center w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Summary */}
        <div className="mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed">
            {bookmark.summary}
          </p>
        </div>

        {/* Tags */}
        <div className="mb-4">
          {editing ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg input-focus"
                placeholder="Enter tags separated by commas"
              />
              <button
                onClick={handleUpdateTags}
                disabled={loading}
                className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg focus-ring"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={() => setEditing(false)}
                className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg focus-ring"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Tag className="w-4 h-4 text-gray-400" />
              {bookmark.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {bookmark.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sm text-gray-400">No tags</span>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
          <Calendar className="w-3 h-3 mr-1" />
          <span>Saved {formatDate(bookmark.created_at)}</span>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 m-4 shadow-xl">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Delete Bookmark?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                This action cannot be undone.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm font-medium rounded-lg transition-colors focus-ring"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 button-secondary text-sm rounded-lg focus-ring"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};