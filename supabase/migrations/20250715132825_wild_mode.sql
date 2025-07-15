/*
  # Create bookmarks table for Link Saver app

  1. New Tables
    - `bookmarks`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `url` (text, the original link)
      - `title` (text, extracted page title)
      - `favicon` (text, favicon URL)
      - `summary` (text, AI-generated summary)
      - `tags` (text array, user-defined tags)
      - `position` (integer, for drag-and-drop ordering)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `bookmarks` table
    - Add policy for authenticated users to manage their own bookmarks
    - Users can only access bookmarks they created

  3. Indexes
    - Add index on user_id for faster queries
    - Add index on position for ordering
    - Add index on created_at for chronological sorting
*/

CREATE TABLE IF NOT EXISTS bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url text NOT NULL,
  title text NOT NULL DEFAULT '',
  favicon text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  tags text[] DEFAULT '{}',
  position integer NOT NULL DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_position ON bookmarks(user_id, position);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON bookmarks(user_id, created_at DESC);

-- RLS Policies
CREATE POLICY "Users can view their own bookmarks"
  ON bookmarks
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bookmarks"
  ON bookmarks
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own bookmarks"
  ON bookmarks
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own bookmarks"
  ON bookmarks
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);