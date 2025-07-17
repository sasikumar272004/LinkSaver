import React, { useState, useEffect, useRef } from 'react';
import { Plus, Link, Tag, X, Sparkles, Zap } from 'lucide-react';
import { BookmarkAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { gsap } from 'gsap';
import toast from 'react-hot-toast';

interface BookmarkFormProps {
  onBookmarkCreated: () => void;
}

export const BookmarkForm: React.FC<BookmarkFormProps> = ({ onBookmarkCreated }) => {
  const [url, setUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [popularTags, setPopularTags] = useState<{ tag: string; count: number }[]>([]);
  const { user } = useAuth();
  
  const formRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (formRef.current) {
      gsap.fromTo(formRef.current,
        { y: 30, opacity: 0, scale: 0.98 },
        { y: 0, opacity: 1, scale: 1, duration: 0.8, ease: "back.out(1.7)", delay: 0.2 }
      );
    }
    
    // Focus on URL input
    if (inputRef.current) {
      inputRef.current.focus();
    }
    
    // Load popular tags
    loadPopularTags();
  }, []);

  const loadPopularTags = async () => {
    if (!user) return;
    
    try {
      const tags = await BookmarkAPI.getPopularTags(user.id, 10);
      setPopularTags(tags);
    } catch (error) {
      console.error('Failed to load popular tags:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !url.trim()) return;

    setLoading(true);
    const loadingToast = toast.loading('Saving bookmark...');

    try {
      await BookmarkAPI.createBookmark({ url: url.trim(), tags }, user.id);
      setUrl('');
      setTags([]);
      setTagInput('');
      onBookmarkCreated();
      toast.success('Bookmark saved successfully!', { id: loadingToast });
      
      // Animate form reset
      if (formRef.current) {
        gsap.to(formRef.current, {
          scale: 1.02,
          duration: 0.1,
          yoyo: true,
          repeat: 1,
          ease: "power2.inOut"
        });
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to save bookmark', { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  const addTag = (tagToAdd?: string) => {
    const tag = tagToAdd || tagInput.trim();
    if (tag && !tags.includes(tag) && tags.length < 15) {
      setTags([...tags, tag]);
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
    } else if (e.key === 'Backspace' && !tagInput && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  const suggestedTags = popularTags
    .filter(popularTag => !tags.includes(popularTag.tag))
    .slice(0, 5);

  return (
    <div ref={formRef} className="mb-12">
      <div className="surface-elevated rounded-2xl p-8 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-green-500/10 to-blue-500/10 rounded-full blur-2xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center space-x-4 mb-8">
            <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
              <Plus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gradient">
                Add New Bookmark
              </h2>
              <p className="text-gray-600 dark:text-gray-400 flex items-center space-x-2">
                <Sparkles className="w-4 h-4" />
                <span>Automatically extracts titles and generates AI summaries</span>
              </p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="url" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Website URL
              </label>
              <div className="relative">
                <Link className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  ref={inputRef}
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="input-lg pl-12 pr-4 h-14 text-lg"
                  placeholder="https://example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="tags" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Tags (Optional)
              </label>
              
              {/* Tag Input */}
              <div className="flex space-x-3 mb-4">
                <div className="relative flex-1">
                  <Tag className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="tags"
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    className="input-lg pl-12 pr-4"
                    placeholder="Add a tag..."
                    maxLength={30}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => addTag()}
                  disabled={!tagInput.trim() || tags.length >= 15}
                  className="btn-secondary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add
                </button>
              </div>
              
              {/* Current Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-700"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-2 p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              
              {/* Suggested Tags */}
              {suggestedTags.length > 0 && (
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 flex items-center space-x-1">
                    <Zap className="w-4 h-4" />
                    <span>Popular tags:</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {suggestedTags.map((popularTag) => (
                      <button
                        key={popularTag.tag}
                        type="button"
                        onClick={() => addTag(popularTag.tag)}
                        className="inline-flex items-center px-3 py-1 rounded-lg text-sm bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        {popularTag.tag}
                        <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                          ({popularTag.count})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !url.trim()}
              className="btn-primary w-full py-4 text-lg font-semibold group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="loading-spinner w-5 h-5 mr-3"></div>
                  <span>Saving bookmark...</span>
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <Plus className="w-5 h-5 mr-3 group-hover:rotate-90 transition-transform duration-200" />
                  <span>Save Bookmark</span>
                </div>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};