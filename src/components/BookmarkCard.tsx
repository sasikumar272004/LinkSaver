import React, { useState, useEffect, useRef } from 'react';
import { 
  ExternalLink, 
  Trash2, 
  Tag, 
  Calendar, 
  Edit2, 
  X, 
  Check, 
  MoreHorizontal,
  Clock,
  Globe,
  Bookmark as BookmarkIcon
} from 'lucide-react';
import { Bookmark } from '../types';
import { BookmarkAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { gsap } from 'gsap';
import { useInView } from 'react-intersection-observer';
import toast from 'react-hot-toast';

interface BookmarkCardProps {
  bookmark: Bookmark;
  onDelete: (id: string) => void;
  onUpdate: () => void;
  index: number;
}

export const BookmarkCard: React.FC<BookmarkCardProps> = ({ 
  bookmark, 
  onDelete, 
  onUpdate, 
  index 
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTags, setEditTags] = useState(bookmark.tags.join(', '));
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const { user } = useAuth();
  
  const cardRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true
  });

  useEffect(() => {
    if (inView && cardRef.current) {
      gsap.fromTo(cardRef.current,
        { y: 50, opacity: 0, scale: 0.95 },
        { 
          y: 0, 
          opacity: 1, 
          scale: 1,
          duration: 0.6, 
          ease: "back.out(1.7)",
          delay: index * 0.05
        }
      );
    }
  }, [inView, index]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDelete = async () => {
    if (!user) return;
    setLoading(true);
    
    try {
      await BookmarkAPI.deleteBookmark(bookmark.id, user.id);
      onDelete(bookmark.id);
      toast.success('Bookmark deleted');
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      toast.error('Failed to delete bookmark');
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
      toast.success('Tags updated');
    } catch (error) {
      console.error('Error updating tags:', error);
      toast.error('Failed to update tags');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    
    return date.toLocaleDateString('en-US', {
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

  const getReadingTime = (summary: string) => {
    const words = summary.split(' ').length;
    const readingTime = Math.ceil(words / 200); // Average reading speed
    return `${readingTime} min read`;
  };

  return (
    <div ref={inViewRef}>
      <div 
        ref={cardRef}
        className="group card-interactive relative overflow-hidden"
      >
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-xl flex items-center justify-center shadow-sm">
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
                  className="block font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors line-clamp-2 mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400"
                >
                  {bookmark.title}
                </a>
                <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                  <Globe className="w-3 h-3" />
                  <span>{getDomainFromUrl(bookmark.url)}</span>
                  <span>•</span>
                  <Clock className="w-3 h-3" />
                  <span>{getReadingTime(bookmark.summary)}</span>
                </div>
              </div>
            </div>
            
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              
              {showMenu && (
                <div className="absolute right-0 top-full mt-1 w-48 surface-elevated rounded-xl shadow-lg py-1 z-20 animate-scale-in">
                  <a
                    href={bookmark.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 mr-3" />
                    Open Link
                  </a>
                  <button
                    onClick={() => {
                      setEditing(true);
                      setShowMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <Edit2 className="w-4 h-4 mr-3" />
                    Edit Tags
                  </button>
                  <div className="divider my-1"></div>
                  <button
                    onClick={() => {
                      setShowDeleteConfirm(true);
                      setShowMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-4 h-4 mr-3" />
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
                  className="flex-1 input text-sm"
                  placeholder="Enter tags separated by commas"
                  autoFocus
                />
                <button
                  onClick={handleUpdateTags}
                  disabled={loading}
                  className="p-2 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
                {bookmark.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {bookmark.tags.map((tag) => (
                      <span
                        key={tag}
                        className="badge-secondary text-xs"
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
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(bookmark.created_at)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <BookmarkIcon className="w-3 h-3" />
              <span>Saved</span>
            </div>
          </div>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-2xl flex items-center justify-center z-30">
            <div className="surface-elevated rounded-xl p-6 m-4 shadow-xl max-w-sm w-full animate-scale-in">
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  Delete Bookmark?
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  This action cannot be undone. The bookmark will be permanently removed.
                </p>
                <div className="flex space-x-3">
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="btn-danger flex-1 py-2 text-sm disabled:opacity-50"
                  >
                    {loading ? 'Deleting...' : 'Delete'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="btn-secondary flex-1 py-2 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};