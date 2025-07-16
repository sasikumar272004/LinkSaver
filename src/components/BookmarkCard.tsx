import React, { useState } from 'react';
import { ExternalLink, Trash2, Tag, Calendar, Edit2, X, Check } from 'lucide-react';
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

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden border border-gray-200 dark:border-gray-700">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <img
              src={bookmark.favicon}
              alt="Favicon"
              className="w-8 h-8 rounded-full flex-shrink-0"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTQgN0gyMUwxNSAxMUwxNyAyMEwxMiAxNkw3IDIwTDkgMTFMMyA3SDEwTDEyIDJaIiBmaWxsPSIjOTQ5NWE3Ii8+Cjwvc3ZnPgo=';
              }}
            />
            <div className="flex-1 min-w-0">
              <a
                href={bookmark.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-lg font-semibold text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors truncate block"
              >
                {bookmark.title}
              </a>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                {new URL(bookmark.url).hostname}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2 flex-shrink-0">
            <a
              href={bookmark.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Open link"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            
            <button
              onClick={() => setEditing(!editing)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Edit tags"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Delete bookmark"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        <p className="text-gray-700 dark:text-gray-300 text-sm mb-4 line-clamp-3">
          {bookmark.summary}
        </p>

        <div className="space-y-3">
          {/* Tags Section */}
          <div className="flex items-center space-x-4">
            {editing ? (
              <div className="flex items-center space-x-2 flex-1">
                <input
                  type="text"
                  value={editTags}
                  onChange={(e) => setEditTags(e.target.value)}
                  className="flex-1 px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter tags separated by commas"
                />
                <button
                  onClick={handleUpdateTags}
                  disabled={loading}
                  className="p-1 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/20 rounded transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-2 flex-wrap">
                <Tag className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                {bookmark.tags.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {bookmark.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 font-medium"
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
          
          {/* Date Section */}
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Calendar className="w-4 h-4 mr-2" />
              <span>Saved on {formatDate(bookmark.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            Are you sure you want to delete this bookmark?
          </p>
          <div className="flex space-x-3">
            <button
              onClick={handleDelete}
              disabled={loading}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-sm rounded-lg transition-colors"
            >
              {loading ? 'Deleting...' : 'Delete'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-300 text-sm rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};