import React, { useState } from 'react';
import { Plus, Link, Tag, X, Sparkles, Zap } from 'lucide-react';
import { BookmarkAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

interface BookmarkFormProps {
  onBookmarkCreated: () => void;
}

export const BookmarkForm: React.FC<BookmarkFormProps> = ({ onBookmarkCreated }) => {
  const [url, setUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !url.trim()) return;

    setLoading(true);
    setError('');

    try {
      await BookmarkAPI.createBookmark({ url: url.trim(), tags }, user.id);
      setUrl('');
      setTags([]);
      onBookmarkCreated();
    } catch (err: any) {
      setError(err.message || 'Failed to save bookmark');
    } finally {
      setLoading(false);
    }
  };

  const addTag = () => {
    const trimmedTag = tagInput.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="relative mb-12">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 rounded-3xl blur-xl"></div>
      
      <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700/50 p-8 hover:shadow-3xl transition-all duration-500">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 dark:from-white dark:via-blue-200 dark:to-purple-200 bg-clip-text text-transparent mb-2">
              Add New Bookmark
            </h2>
            <p className="text-gray-600 dark:text-gray-400 flex items-center">
              <Sparkles className="w-4 h-4 mr-2 text-blue-500" />
              AI-powered summaries and smart organization
            </p>
          </div>
          <div className="hidden sm:block">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-75 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-2xl">
                <Zap className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="group">
            <label htmlFor="url" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Website URL
            </label>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="relative flex items-center">
                <div className="absolute left-4 z-10">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                    <Link className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
                <input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full pl-16 pr-6 py-4 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-300 text-lg"
                  placeholder="https://example.com"
                  required
                />
              </div>
            </div>
          </div>

          <div className="group">
            <label htmlFor="tags" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Tags (Optional)
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Add tags to organize and find your bookmarks easily</p>
            
            <div className="flex space-x-3 mb-4">
              <div className="relative flex-1">
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex items-center">
                  <div className="absolute left-4 z-10">
                    <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-xl">
                      <Tag className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                  </div>
                  <input
                    id="tags"
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    className="w-full pl-16 pr-6 py-4 bg-white/80 dark:bg-gray-700/80 backdrop-blur-sm border-2 border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-4 focus:ring-green-500/20 focus:border-green-500 dark:focus:border-green-400 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-all duration-300"
                    placeholder="e.g., work, learning, tutorial..."
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={addTag}
                className="px-6 py-4 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white rounded-2xl font-medium transition-all duration-300 hover:scale-105 hover:shadow-lg"
              >
                Add
              </button>
            </div>
            
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-3 animate-fade-in">
                {tags.map((tag, index) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-4 py-2 rounded-full text-sm bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 text-blue-800 dark:text-blue-200 font-medium border border-blue-200 dark:border-blue-700 animate-scale-in hover:scale-105 transition-transform duration-200"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-2 p-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full transition-colors duration-200"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="animate-shake">
              <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-2xl">
                <p className="text-red-700 dark:text-red-400 font-medium">{error}</p>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !url.trim()}
            className="group relative w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 disabled:from-gray-400 disabled:via-gray-500 disabled:to-gray-600 text-white py-4 px-8 rounded-2xl font-semibold text-lg transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl disabled:hover:scale-100 disabled:hover:shadow-none overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="relative flex items-center justify-center">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent mr-3"></div>
                  <span>Creating Magic...</span>
                </>
              ) : (
                <>
                  <Plus className="w-6 h-6 mr-3 group-hover:rotate-90 transition-transform duration-300" />
                  <span>Save Bookmark</span>
                </>
              )}
            </div>
          </button>
        </form>
      </div>
    </div>
  );
};