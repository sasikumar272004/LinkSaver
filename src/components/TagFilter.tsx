import React, { useEffect, useRef } from 'react';
import { Filter, X, Tag } from 'lucide-react';
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

  useEffect(() => {
    if (filterRef.current) {
      gsap.fromTo(filterRef.current,
        { y: -20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.4, ease: "power2.out" }
      );
    }
  }, []);

  if (availableTags.length === 0) return null;

  return (
    <div ref={filterRef} className="glass-effect rounded-2xl p-6 card-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-xl">
            <Filter className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <h3 className="font-semibold gradient-text">Filter by Tags</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {selectedTags.length > 0 
                ? `${selectedTags.length} tag${selectedTags.length > 1 ? 's' : ''} selected`
                : 'Select tags to filter bookmarks'
              }
            </p>
          </div>
        </div>
        
        {selectedTags.length > 0 && (
          <button
            onClick={onClearFilters}
            className="flex items-center space-x-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors focus-ring"
          >
            <X className="w-4 h-4" />
            <span>Clear</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {availableTags.map((tag) => {
          const isSelected = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              onClick={() => onTagToggle(tag)}
              className={`inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 focus-ring ${
                isSelected
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Tag className="w-3 h-3 mr-2" />
              {tag}
              {isSelected && <X className="w-3 h-3 ml-2" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};