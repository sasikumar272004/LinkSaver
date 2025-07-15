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
      const domain = new URL(url).hostname;
      
      // Use a CORS proxy to fetch the page content
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      const data = await response.json();
      const html = data.contents;
      
      // Create a temporary DOM element to parse HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Extract title with multiple fallbacks
      let title = '';
      
      // Try Open Graph title
      const ogTitle = doc.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        title = ogTitle.getAttribute('content') || '';
      }
      
      // Try Twitter title
      if (!title) {
        const twitterTitle = doc.querySelector('meta[name="twitter:title"]');
        if (twitterTitle) {
          title = twitterTitle.getAttribute('content') || '';
        }
      }
      
      // Try regular title tag
      if (!title) {
        const titleTag = doc.querySelector('title');
        if (titleTag) {
          title = titleTag.textContent || '';
        }
      }
      
      // Try h1 tag
      if (!title) {
        const h1Tag = doc.querySelector('h1');
        if (h1Tag) {
          title = h1Tag.textContent || '';
        }
      }
      
      // Fallback to domain
      if (!title) {
        title = domain;
      }
      
      // Clean up title
      title = title.trim().substring(0, 200);
      
      // Extract favicon
      let favicon = '';
      
      // Try to find favicon link
      const faviconLink = doc.querySelector('link[rel*="icon"]');
      if (faviconLink) {
        const href = faviconLink.getAttribute('href');
        if (href) {
          // Handle relative URLs
          if (href.startsWith('//')) {
            favicon = `https:${href}`;
          } else if (href.startsWith('/')) {
            favicon = `${new URL(url).origin}${href}`;
          } else if (href.startsWith('http')) {
            favicon = href;
          } else {
            favicon = `${new URL(url).origin}/${href}`;
          }
        }
      }
      
      // Fallback to Google favicon service
      if (!favicon) {
        favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
      }
      
      return {
        title,
        favicon
      };
    } catch (error) {
      console.error('Error extracting metadata:', error);
      const domain = new URL(url).hostname;
      return {
        title: domain,
        favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
      };
    }
  }

  private static async generateSummary(url: string): Promise<string> {
    try {
      // Use a CORS proxy to fetch the page content
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status}`);
      }
      
      const data = await response.json();
      const html = data.contents;
      
      // Create a temporary DOM element to parse HTML
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      let summary = '';
      
      // Try Open Graph description
      const ogDescription = doc.querySelector('meta[property="og:description"]');
      if (ogDescription) {
        summary = ogDescription.getAttribute('content') || '';
      }
      
      // Try meta description
      if (!summary) {
        const metaDescription = doc.querySelector('meta[name="description"]');
        if (metaDescription) {
          summary = metaDescription.getAttribute('content') || '';
        }
      }
      
      // Try Twitter description
      if (!summary) {
        const twitterDescription = doc.querySelector('meta[name="twitter:description"]');
        if (twitterDescription) {
          summary = twitterDescription.getAttribute('content') || '';
        }
      }
      
      // Try to extract from first paragraph
      if (!summary) {
        const firstParagraph = doc.querySelector('p');
        if (firstParagraph && firstParagraph.textContent) {
          summary = firstParagraph.textContent.trim();
        }
      }
      
      // Clean up summary
      if (summary) {
        summary = summary.trim().substring(0, 500);
        return summary;
      }
      
      return 'No summary available for this link.';
    } catch (error) {
      console.error('Error generating summary:', error);
      return 'Summary could not be generated due to an error.';
    }
  }
}