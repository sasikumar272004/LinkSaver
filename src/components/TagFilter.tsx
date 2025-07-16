import React from 'react';
import { Filter, X, Tag, Sparkles } from 'lucide-react';

interface TagFilterProps {
  availableTags: string[];
  selectedTags: string[];
  onTagToggle: (tag: string) => void;
  onClearFilters: () => void;
}

export const TagFilter: React.FC<TagFilterProps> = ({
  availableTags,
  selectedTags,
  onTagToggle,
  onClearFilters
}) => {
  if (availableTags.length === 0) return null;

  return (
    <div className="relative">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-green-600/10 rounded-3xl blur-xl"></div>
      
      <div className="relative bg-white/90 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 dark:border-gray-700/50 p-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 rounded-2xl blur opacity-75 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-purple-500 to-blue-500 p-3 rounded-2xl">
                <Filter className="w-6 h-6 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 via-purple-800 to-blue-800 dark:from-white dark:via-purple-200 dark:to-blue-200 bg-clip-text text-transparent">
                Filter by Tags
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center mt-1">
                <Sparkles className="w-4 h-4 mr-1" />
                {selectedTags.length > 0 ? `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} selected` : 'Select tags to filter your bookmarks'}
              </p>
            </div>
          </div>
          
          {selectedTags.length > 0 && (
            <button
              onClick={onClearFilters}
              className="group px-4 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 rounded-xl font-medium transition-all duration-200 hover:scale-105 flex items-center space-x-2"
            >
              <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-200" />
              <span>Clear All</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-3">
          {availableTags.map((tag, index) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => onTagToggle(tag)}
                className={`group relative inline-flex items-center px-6 py-3 rounded-2xl text-sm font-medium transition-all duration-300 hover:scale-105 animate-scale-in ${
                  isSelected
                    ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg hover:shadow-xl'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-200 dark:border-gray-600'
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {!isSelected && (
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                )}
                <div className="relative flex items-center space-x-2">
                  <Tag className="w-4 h-4" />
                  <span>{tag}</span>
                  {isSelected && (
                    <X className="w-4 h-4 ml-1 group-hover:rotate-90 transition-transform duration-200" />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {selectedTags.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Active filters:</span>
              <div className="flex flex-wrap gap-2">
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};