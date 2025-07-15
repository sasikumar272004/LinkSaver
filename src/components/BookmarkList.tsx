import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { BookmarkCard } from './BookmarkCard';
import { TagFilter } from './TagFilter';
import { Bookmark } from '../types';
import { BookmarkAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

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
  const { user } = useAuth();

  useEffect(() => {
    // Extract all unique tags
    const allTags = new Set<string>();
    bookmarks.forEach(bookmark => {
      bookmark.tags.forEach(tag => allTags.add(tag));
    });
    setAvailableTags(Array.from(allTags).sort());

    // Filter bookmarks based on selected tags
    if (selectedTags.length === 0) {
      setFilteredBookmarks(bookmarks);
    } else {
      const filtered = bookmarks.filter(bookmark =>
        selectedTags.some(tag => bookmark.tags.includes(tag))
      );
      setFilteredBookmarks(filtered);
    }
  }, [bookmarks, selectedTags]);

  const handleTagToggle = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const handleClearFilters = () => {
    setSelectedTags([]);
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
      // Revert on error
      setFilteredBookmarks(filteredBookmarks);
    }
  };

  if (bookmarks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 dark:text-gray-400">
          <p className="text-xl mb-2">No bookmarks yet</p>
          <p>Add your first bookmark above to get started!</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <TagFilter
        availableTags={availableTags}
        selectedTags={selectedTags}
        onTagToggle={handleTagToggle}
        onClearFilters={handleClearFilters}
      />

      {filteredBookmarks.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No bookmarks found with the selected tags.
          </p>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="bookmarks">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
              >
                {filteredBookmarks.map((bookmark, index) => (
                  <Draggable key={bookmark.id} draggableId={bookmark.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`transform transition-transform ${
                          snapshot.isDragging ? 'rotate-2 scale-105' : ''
                        }`}
                      >
                        <BookmarkCard
                          bookmark={bookmark}
                          onDelete={onBookmarkDeleted}
                          onUpdate={onBookmarkUpdated}
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