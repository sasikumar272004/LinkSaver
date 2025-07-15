export interface User {
  id: string;
  email: string;
}

export interface Bookmark {
  id: string;
  user_id: string;
  url: string;
  title: string;
  favicon: string;
  summary: string;
  tags: string[];
  position: number;
  created_at: string;
}

export interface BookmarkInput {
  url: string;
  tags?: string[];
}

export interface AuthError {
  message: string;
}