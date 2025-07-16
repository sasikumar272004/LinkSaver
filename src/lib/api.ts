import { supabase } from './supabase';
import { Bookmark, BookmarkInput } from '../types';

export class BookmarkAPI {
  static async createBookmark(input: BookmarkInput, userId: string): Promise<Bookmark> {
    try {
      // First, extract metadata and generate summary
      const metadata = await this.extractMetadata(input.url);
      const summary = await this.generateSummary(input.url);
      
      // Get current max position for user
      const { data: maxPosData } = await supabase
        .from('bookmarks')
        .select('position')
        .eq('user_id', userId)
        .order('position', { ascending: false })
        .limit(1);
      
      const newPosition = maxPosData?.[0]?.position ? maxPosData[0].position + 1 : 1;
      
      const bookmarkData = {
        user_id: userId,
        url: input.url,
        title: metadata.title,
        favicon: metadata.favicon,
        summary: summary,
        tags: input.tags || [],
        position: newPosition,
        created_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('bookmarks')
        .insert([bookmarkData])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating bookmark:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null 
          ? JSON.stringify(error)
          : 'Unknown error occurred while creating bookmark';
      throw new Error(errorMessage);
    }
  }

  static async getBookmarks(userId: string): Promise<Bookmark[]> {
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('*')
        .eq('user_id', userId)
        .order('position', { ascending: true });
      
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null 
          ? JSON.stringify(error)
          : 'Unknown error occurred while fetching bookmarks';
      throw new Error(errorMessage);
    }
  }

  static async deleteBookmark(id: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('bookmarks')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting bookmark:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null 
          ? JSON.stringify(error)
          : 'Unknown error occurred while deleting bookmark';
      throw new Error(errorMessage);
    }
  }

  static async updateBookmarkPositions(bookmarks: Bookmark[]): Promise<void> {
    try {
      const updates = bookmarks.map((bookmark, index) => ({
        id: bookmark.id,
        position: index + 1
      }));

      const { error } = await supabase
        .from('bookmarks')
        .upsert(updates);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error updating bookmark positions:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null 
          ? JSON.stringify(error)
          : 'Unknown error occurred while updating bookmark positions';
      throw new Error(errorMessage);
    }
  }

  static async updateBookmarkTags(id: string, tags: string[], userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('bookmarks')
        .update({ tags })
        .eq('id', id)
        .eq('user_id', userId);
      
      if (error) throw error;
    } catch (error) {
      console.error('Error updating bookmark tags:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : typeof error === 'object' && error !== null 
          ? JSON.stringify(error)
          : 'Unknown error occurred while updating bookmark tags';
      throw new Error(errorMessage);
    }
  }

  private static async extractMetadata(url: string): Promise<{ title: string; favicon: string }> {
    try {
      return await this.extractMetadataWithJina(url);
    } catch (error) {
      console.error('Error extracting metadata with Jina, using fallback:', error);
      return this.getFallbackMetadata(url);
    }
  }

  private static async extractMetadataWithJina(url: string): Promise<{ title: string; favicon: string }> {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain',
        'User-Agent': 'Mozilla/5.0 (compatible; LinkSaver/1.0)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Jina AI returned status ${response.status}`);
    }
    
    const content = await response.text();
    
    // Extract title from the first line or first meaningful content
    const lines = content.split('\n').filter(line => line.trim());
    let title = '';
    
    // Look for title-like content in the first few lines
    for (const line of lines.slice(0, 5)) {
      const trimmed = line.trim();
      if (trimmed.length > 10 && trimmed.length < 200 && !trimmed.includes('http')) {
        title = trimmed;
        break;
      }
    }
    
    if (!title) {
      title = this.getFallbackMetadata(url).title;
    }
    
    const domain = new URL(url).hostname;
    const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    
    return { title, favicon };
  }

  private static getFallbackMetadata(url: string): { title: string; favicon: string } {
    try {
      const domain = new URL(url).hostname;
      
      // Create a more readable title from the domain
      let title = domain;
      
      // Remove www. prefix
      if (title.startsWith('www.')) {
        title = title.substring(4);
      }
      
      // Capitalize first letter and replace dots with spaces for readability
      const parts = title.split('.');
      if (parts.length > 1) {
        title = parts[0].charAt(0).toUpperCase() + parts[0].slice(1);
      }
      
      const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
      
      return {
        title: domain,
        favicon
      };
    } catch (error) {
      return {
        title: 'Saved Link',
        favicon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTQgN0gyMUwxNSAxMUwxNyAyMEwxMiAxNkw3IDIwTDkgMTFMMyA3SDEwTDEyIDJaIiBmaWxsPSIjOTQ5NWE3Ii8+Cjwvc3ZnPgo='
      };
    }
  }

  private static async generateSummary(url: string): Promise<string> {
    try {
      return await this.generateSummaryWithJina(url);
    } catch (error) {
      console.error('Error generating summary with Jina, using fallback:', error);
      return this.getFallbackSummary(url);
    }
  }

  private static async generateSummaryWithJina(url: string): Promise<string> {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const response = await fetch(jinaUrl, {
      headers: {
        'Accept': 'text/plain',
        'User-Agent': 'Mozilla/5.0 (compatible; LinkSaver/1.0)'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Jina AI returned status ${response.status}`);
    }
    
    const content = await response.text();
    
    if (!content || content.length < 50) {
      throw new Error('No meaningful content extracted');
    }
    
    // Clean and process the content
    const lines = content.split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 20 && !line.startsWith('http'))
      .slice(0, 10); // Take first 10 meaningful lines
    
    if (lines.length === 0) {
      throw new Error('No meaningful content found');
    }
    
    // Join lines and create summary
    const summary = lines.join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Return first 300 characters as summary
    return summary.length > 300 
      ? summary.substring(0, 300) + '...'
      : summary;
  }

  private static getFallbackSummary(url: string): string {
    try {
      const domain = new URL(url).hostname;
      const path = new URL(url).pathname;
      
      // Create a basic summary from URL structure
      let summary = `Content from ${domain}`;
      
      if (path && path !== '/') {
        const pathParts = path.split('/').filter(part => part);
        if (pathParts.length > 0) {
          const lastPart = pathParts[pathParts.length - 1]
            .replace(/[-_]/g, ' ')
            .replace(/\.[^.]*$/, ''); // Remove file extension
          summary += ` - ${lastPart}`;
        }
      }
      
      return summary;
    } catch (error) {
      return 'Link saved successfully. Summary could not be generated.';
    }
  }
}