import React, { useState, useEffect, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { BookmarkCard } from './BookmarkCard';
import { TagFilter } from './TagFilter';
import { Bookmark } from '../types';
import { BookmarkAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Search, Grid, List, SortAsc, SortDesc, Filter } from 'lucide-react';
import { gsap } from 'gsap';

interface BookmarkListProps {
  bookmarks: Bookmark[];
  onBookmarkDeleted: (id: string) => void;
  onBookmarkUpdated: () => void;
  onBookmarksReordered: (bookmarks: Bookmark[]) => void;
}

export const BookmarkList: React.FC<BookmarkListProps> = ({
  bookmarks,
  onBookmarkDeleted,
  onBookmarkUpdated,
  onBookmarksReordered
}) => {
  const [filteredBookmarks, setFilteredBookmarks] = useState<Bookmark[]>(bookmarks);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);
  const { user } = useAuth();
  
  const controlsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (controlsRef.current) {
      gsap.fromTo(controlsRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: "power2.out", delay: 0.8 }
      );
    }
  }, []);

  useEffect(() => {
    // Extract all unique tags
    const allTags = new Set<string>();
    bookmarks.forEach(bookmark => {
      bookmark.tags.forEach(tag => allTags.add(tag));
    });
    setAvailableTags(Array.from(allTags).sort());

    // Filter bookmarks
    let filtered = bookmarks;

    if (selectedTags.length > 0) {
      filtered = filtered.filter(bookmark =>
        selectedTags.some(tag => bookmark.tags.includes(tag))
      );
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(bookmark =>
        bookmark.title.toLowerCase().includes(query) ||
        bookmark.summary.toLowerCase().includes(query) ||
        bookmark.url.toLowerCase().includes(query) ||
        bookmark.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Sort bookmarks
    filtered.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    setFilteredBookmarks(filtered);
  }, [bookmarks, selectedTags, searchQuery, sortOrder]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleClearFilters = () => {
    setSelectedTags([]);
    setSearchQuery('');
  };

  const handleDragEnd = async (result: any) => {
    if (!result.destination || !user) return;

    const items = Array.from(filteredBookmarks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setFilteredBookmarks(items);
    onBookmarksReordered(items);

    try {
      await BookmarkAPI.updateBookmarkPositions(items);
    } catch (error) {
      console.error('Error updating bookmark positions:', error);
      setFilteredBookmarks(filteredBookmarks);
    }
  };

  if (bookmarks.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="glass-effect rounded-2xl p-12 max-w-md mx-auto card-shadow">
          <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-xl font-semibold gradient-text mb-3">
            No bookmarks yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Start building your personal link library by adding your first bookmark above.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Search and Controls */}
      <div ref={controlsRef} className="glass-effect rounded-2xl p-6 card-shadow">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Bar */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl input-focus text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                placeholder="Search bookmarks..."
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-3 rounded-xl transition-all duration-200 focus-ring ${
                showFilters || selectedTags.length > 0
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'button-secondary'
              }`}
            >
              <Filter className="w-4 h-4" />
            </button>

            <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  viewMode === 'grid'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className="p-3 button-secondary rounded-xl focus-ring"
            >
              {sortOrder === 'desc' ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Results Info */}
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>
            {filteredBookmarks.length} of {bookmarks.length} bookmarks
          </span>
          {(selectedTags.length > 0 || searchQuery) && (
            <button
              onClick={handleClearFilters}
              className="text-red-600 dark:text-red-400 hover:underline focus-ring"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Tag Filter */}
      {showFilters && (
        <TagFilter
          availableTags={availableTags}
          selectedTags={selectedTags}
          onTagToggle={handleTagToggle}
          onClearFilters={handleClearFilters}
        />
      )}

      {/* Bookmarks */}
      {filteredBookmarks.length === 0 ? (
        <div className="text-center py-16">
          <div className="glass-effect rounded-2xl p-12 max-w-md mx-auto card-shadow">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold gradient-text mb-3">
              No results found
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Try adjusting your search terms or filters.
            </p>
          </div>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="bookmarks">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`grid gap-6 ${
                  viewMode === 'grid' 
                    ? 'md:grid-cols-2 xl:grid-cols-3' 
                    : 'grid-cols-1 max-w-4xl mx-auto'
                }`}
              >
                {filteredBookmarks.map((bookmark, index) => (
                  <Draggable key={bookmark.id} draggableId={bookmark.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`transition-all duration-200 ${
                          snapshot.isDragging 
                            ? 'rotate-2 scale-105 shadow-2xl z-50' 
                            : ''
                        }`}
                        style={provided.draggableProps.style}
                      >
                        <BookmarkCard
                          bookmark={bookmark}
                          onDelete={onBookmarkDeleted}
                          onUpdate={onBookmarkUpdated}
                          index={index}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
    </div>
  );
};