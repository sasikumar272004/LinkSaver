import React, { useEffect, useRef } from 'react';
import { Filter, X, Tag, Sparkles } from 'lucide-react';
import { gsap } from 'gsap';

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
  const filterRef = useRef<HTMLDivElement>(null);
  const tagsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (filterRef.current && tagsRef.current) {
      const tl = gsap.timeline();
      
      tl.fromTo(filterRef.current,
        { y: -20, opacity: 0, scale: 0.98 },
        { y: 0, opacity: 1, scale: 1, duration: 0.4, ease: "back.out(1.7)" }
      );
      
      tl.fromTo(tagsRef.current.children,
        { y: 10, opacity: 0, scale: 0.9 },
        { 
          y: 0, 
          opacity: 1, 
          scale: 1,
          duration: 0.3, 
          stagger: 0.02, 
          ease: "power2.out" 
        },
        "-=0.2"
      );
    }
  }, []);

  if (availableTags.length === 0) return null;

  return (
    <div ref={filterRef} className="surface-elevated rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-xl">
            <Filter className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gradient flex items-center space-x-2">
              <span>Filter by Tags</span>
              <Sparkles className="w-4 h-4 text-blue-500" />
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedTags.length > 0 
                ? `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} selected`
                : 'Select tags to filter your bookmarks'
              }
            </p>
          </div>
        </div>
        
        {selectedTags.length > 0 && (
          <button
            onClick={onClearFilters}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200"
          >
            <X className="w-4 h-4" />
            <span>Clear All</span>
          </button>
        )}
      </div>

      <div ref={tagsRef} className="flex flex-wrap gap-2">
        {availableTags.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => onTagToggle(tag)}
              className={`inline-flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 group ${
                isSelected
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md hover:shadow-lg transform hover:scale-105'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 hover:scale-105'
              }`}
            >
              <Tag className={`w-3 h-3 mr-2 ${isSelected ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`} />
              {tag}
              {isSelected && (
                <X className="w-3 h-3 ml-2 text-white group-hover:rotate-90 transition-transform duration-200" />
              )}
            </button>
          );
        })}
      </div>
      
      {availableTags.length > 20 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {Math.min(20, availableTags.length)} of {availableTags.length} tags
          </p>
        </div>
      )}
    </div>
  );
};