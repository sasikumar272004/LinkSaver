import React, { useState } from 'react';
import { ExternalLink, Trash2, Tag, Calendar, Edit2, X, Check, Star, Clock, Globe } from 'lucide-react';
import { Bookmark } from '../types';
import { BookmarkAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface BookmarkCardProps {
  bookmark: Bookmark;
  onDelete: (id: string) => void;
  onUpdate: () => void;
}

export const BookmarkCard: React.FC<BookmarkCardProps> = ({ bookmark, onDelete, onUpdate }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTags, setEditTags] = useState(bookmark.tags.join(', '));
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const { user } = useAuth();

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
    <div 
      className="group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Glow Effect */}
      <div className={`absolute -inset-1 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-3xl blur opacity-0 group-hover:opacity-30 transition-all duration-500 ${isHovered ? 'animate-pulse' : ''}`}></div>
      
      <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden border border-white/20 dark:border-gray-700/50 group-hover:-translate-y-2 group-hover:scale-[1.02]">
        
        {/* Header Section */}
        <div className="p-6 pb-4">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-4 flex-1 min-w-0">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl blur opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
                <div className="relative bg-white dark:bg-gray-700 p-3 rounded-2xl shadow-lg">
                  <img
                    src={bookmark.favicon}
                    alt="Favicon"
                    className="w-8 h-8 rounded-lg"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTQgN0gyMUwxNSAxMUwxNyAyMEwxMiAxNkw3IDIwTDkgMTFMMyA3SDEwTDEyIDJaIiBmaWxsPSIjOTQ5NWE3Ii8+Cjwvc3ZnPgo=';
                    }}
                  />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <a
                  href={bookmark.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xl font-bold text-gray-900 dark:text-white hover:bg-gradient-to-r hover:from-blue-600 hover:to-purple-600 hover:bg-clip-text hover:text-transparent transition-all duration-300 line-clamp-2 mb-2"
                >
                  {bookmark.title}
                </a>
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 space-x-2">
                  <Globe className="w-4 h-4" />
                  <span>{getDomainFromUrl(bookmark.url)}</span>
                </div>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-xl transition-all duration-200 hover:scale-110"
                aria-label="Open link"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
              
              <button
                onClick={() => setEditing(!editing)}
                className="p-3 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-xl transition-all duration-200 hover:scale-110"
                aria-label="Edit tags"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-3 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl transition-all duration-200 hover:scale-110"
                aria-label="Delete bookmark"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Summary Section */}
          <div className="mb-6">
            <div className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-700/50 dark:to-blue-900/20 rounded-2xl p-4 border border-gray-200/50 dark:border-gray-600/50">
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed line-clamp-4">
                {bookmark.summary}
              </p>
            </div>
          </div>

          {/* Tags Section */}
          <div className="mb-4">
            {editing ? (
              <div className="flex items-center space-x-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    className="w-full px-4 py-3 text-sm border-2 border-gray-300 dark:border-gray-600 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-all duration-300"
                    placeholder="Enter tags separated by commas"
                  />
                </div>
                <button
                  onClick={handleUpdateTags}
                  disabled={loading}
                  className="p-3 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-xl transition-all duration-200 hover:scale-110"
                >
                  <Check className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="p-3 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all duration-200 hover:scale-110"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Tag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tags:</span>
                </div>
                {bookmark.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {bookmark.tags.map((tag, index) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700 animate-scale-in hover:scale-105 transition-transform duration-200"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-gray-500 dark:text-gray-400 italic">No tags added</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer Section */}
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50/50 to-blue-50/50 dark:from-gray-800/50 dark:to-blue-900/20 border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg mr-3">
                <Calendar className="w-4 h-4" />
              </div>
              <span>Saved on {formatDate(bookmark.created_at)}</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                <Star className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <Clock className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Delete Confirmation */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-3xl flex items-center justify-center animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 m-6 shadow-2xl animate-scale-in">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Delete Bookmark?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                This action cannot be undone. The bookmark will be permanently removed.
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 disabled:from-gray-400 disabled:to-gray-500 text-white text-sm font-medium rounded-xl transition-all duration-300 hover:scale-105"
                >
                  {loading ? 'Deleting...' : 'Delete'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-all duration-300 hover:scale-105"
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