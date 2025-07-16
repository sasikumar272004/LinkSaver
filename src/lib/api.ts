import { supabase } from './supabase';
import { Bookmark, BookmarkInput } from '../types';

export class BookmarkAPI {
  static async createBookmark(input: BookmarkInput, userId: string): Promise<Bookmark> {
    try {
      // Extract metadata and generate summary
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
      // Try multiple approaches for metadata extraction
      return await this.extractMetadataWithMultipleServices(url);
    } catch (error) {
      console.error('Error extracting metadata, using fallback:', error);
      return this.getFallbackMetadata(url);
    }
  }

  private static async extractMetadataWithMultipleServices(url: string): Promise<{ title: string; favicon: string }> {
    const services = [
      // Try different metadata extraction services
      () => this.extractWithTextract(url),
      () => this.extractWithOpenGraph(url),
      () => this.extractWithCORSProxy(url)
    ];

    for (const service of services) {
      try {
        const result = await service();
        if (result.title && result.title.length > 3) {
          return result;
        }
      } catch (error) {
        console.log('Service failed, trying next:', error);
        continue;
      }
    }

    throw new Error('All metadata extraction services failed');
  }

  private static async extractWithTextract(url: string): Promise<{ title: string; favicon: string }> {
    const response = await fetch(`https://textract.pages.dev/api/extract?url=${encodeURIComponent(url)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Textract returned status ${response.status}`);
    }

    const data = await response.json();
    const domain = new URL(url).hostname;
    
    return {
      title: data.title || this.getFallbackMetadata(url).title,
      favicon: `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    };
  }

  private static async extractWithOpenGraph(url: string): Promise<{ title: string; favicon: string }> {
    const response = await fetch(`https://opengraph.io/api/1.1/site/${encodeURIComponent(url)}?app_id=demo`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`OpenGraph returned status ${response.status}`);
    }

    const data = await response.json();
    const domain = new URL(url).hostname;
    
    return {
      title: data.hybridGraph?.title || data.openGraph?.title || this.getFallbackMetadata(url).title,
      favicon: data.hybridGraph?.favicon || `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
    };
  }

  private static async extractWithCORSProxy(url: string): Promise<{ title: string; favicon: string }> {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);

    if (!response.ok) {
      throw new Error(`CORS proxy returned status ${response.status}`);
    }

    const data = await response.json();
    const html = data.contents;
    
    // Extract title from HTML
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : this.getFallbackMetadata(url).title;
    
    const domain = new URL(url).hostname;
    const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
    
    return { title, favicon };
  }

  private static getFallbackMetadata(url: string): { title: string; favicon: string } {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      const path = urlObj.pathname;
      
      // Create a readable title from the domain and path
      let title = domain;
      
      // Remove www. prefix
      if (title.startsWith('www.')) {
        title = title.substring(4);
      }
      
      // Capitalize domain name
      const domainParts = title.split('.');
      if (domainParts.length > 0) {
        title = domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1);
      }
      
      // Add path information if meaningful
      if (path && path !== '/' && path.length > 1) {
        const pathParts = path.split('/').filter(part => part);
        if (pathParts.length > 0) {
          const lastPart = pathParts[pathParts.length - 1]
            .replace(/[-_]/g, ' ')
            .replace(/\.[^.]*$/, '') // Remove file extension
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          if (lastPart.length > 0 && lastPart.length < 50) {
            title += ` - ${lastPart}`;
          }
        }
      }
      
      const favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
      
      return { title, favicon };
    } catch (error) {
      return {
        title: 'Saved Link',
        favicon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTQgN0gyMUwxNSAxMUwxNyAyMEwxMiAxNkw3IDIwTDkgMTFMMyA3SDEwTDEyIDJaIiBmaWxsPSIjOTQ5NWE3Ii8+Cjwvc3ZnPgo='
      };
    }
  }

  private static async generateSummary(url: string): Promise<string> {
    try {
      // Try multiple approaches for summary generation
      return await this.generateSummaryWithMultipleServices(url);
    } catch (error) {
      console.error('Error generating summary, using fallback:', error);
      return this.getFallbackSummary(url);
    }
  }

  private static async generateSummaryWithMultipleServices(url: string): Promise<string> {
    const services = [
      () => this.generateSummaryWithTextract(url),
      () => this.generateSummaryWithCORSProxy(url)
    ];

    for (const service of services) {
      try {
        const summary = await service();
        if (summary && summary.length > 50) {
          return summary;
        }
      } catch (error) {
        console.log('Summary service failed, trying next:', error);
        continue;
      }
    }

    throw new Error('All summary generation services failed');
  }

  private static async generateSummaryWithTextract(url: string): Promise<string> {
    const response = await fetch(`https://textract.pages.dev/api/extract?url=${encodeURIComponent(url)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Textract returned status ${response.status}`);
    }

    const data = await response.json();
    
    if (data.content && data.content.length > 50) {
      // Clean and truncate the content
      const cleanContent = data.content
        .replace(/\s+/g, ' ')
        .trim();
      
      return cleanContent.length > 300 
        ? cleanContent.substring(0, 300) + '...'
        : cleanContent;
    }

    throw new Error('No meaningful content extracted');
  }

  private static async generateSummaryWithCORSProxy(url: string): Promise<string> {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const response = await fetch(proxyUrl);

    if (!response.ok) {
      throw new Error(`CORS proxy returned status ${response.status}`);
    }

    const data = await response.json();
    const html = data.contents;
    
    // Extract meaningful text content from HTML
    const textContent = this.extractTextFromHTML(html);
    
    if (textContent.length > 50) {
      return textContent.length > 300 
        ? textContent.substring(0, 300) + '...'
        : textContent;
    }

    throw new Error('No meaningful content found');
  }

  private static extractTextFromHTML(html: string): string {
    // Remove script and style elements
    let cleanHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    cleanHtml = cleanHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Extract text from common content elements
    const contentSelectors = [
      /<article[^>]*>([\s\S]*?)<\/article>/gi,
      /<main[^>]*>([\s\S]*?)<\/main>/gi,
      /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/gi,
      /<p[^>]*>([\s\S]*?)<\/p>/gi
    ];
    
    let extractedText = '';
    
    for (const selector of contentSelectors) {
      const matches = cleanHtml.match(selector);
      if (matches) {
        extractedText = matches.join(' ');
        break;
      }
    }
    
    if (!extractedText) {
      // Fallback: extract all text content
      extractedText = cleanHtml;
    }
    
    // Remove HTML tags and clean up
    extractedText = extractedText
      .replace(/<[^>]*>/g, ' ')
      .replace(/&[^;]+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Get first meaningful sentences
    const sentences = extractedText.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const summary = sentences.slice(0, 3).join('. ').trim();
    
    return summary || extractedText.substring(0, 200);
  }

  private static getFallbackSummary(url: string): string {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;
      const path = urlObj.pathname;
      
      // Create a more detailed descriptive summary from URL structure
      let summary = `This is a saved link from ${domain.replace('www.', '')}. `;
      
      if (path && path !== '/') {
        const pathParts = path.split('/').filter(part => part);
        if (pathParts.length > 0) {
          const lastPart = pathParts[pathParts.length - 1]
            .replace(/[-_]/g, ' ')
            .replace(/\.[^.]*$/, '') // Remove file extension
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          
          if (lastPart.length > 0 && lastPart.length < 50) {
            summary += `The page appears to be about "${lastPart}". `;
          }
        }
      }
      
      // Add some context based on domain
      const domainContext = this.getDomainContext(domain);
      if (domainContext) {
        summary += `${domainContext}. `;
      }
      
      // Add more generic helpful text to make it longer
      summary += `You can click to visit this link and explore the content. This bookmark was saved to help you remember and organize important web resources for future reference.`;
      
      return summary;
    } catch (error) {
      return 'This is a saved link that you bookmarked for future reference. The content summary could not be generated automatically, but you can click the link to visit the page and explore its content. This bookmark will help you organize and remember important web resources.';
    }
  }

  private static getDomainContext(domain: string): string {
    const contexts: { [key: string]: string } = {
      'github.com': 'This is likely a code repository or software project',
      'stackoverflow.com': 'This is a programming question and answer',
      'medium.com': 'This is an article or blog post',
      'dev.to': 'This is a developer community article',
      'youtube.com': 'This is a video content',
      'twitter.com': 'This is a social media post',
      'linkedin.com': 'This is professional networking content',
      'reddit.com': 'This is a community discussion',
      'wikipedia.org': 'This is an encyclopedia article',
      'docs.google.com': 'This is a Google document',
      'notion.so': 'This is a Notion page or document'
    };
    
    for (const [key, context] of Object.entries(contexts)) {
      if (domain.includes(key)) {
        return context;
      }
    }
    
    return '';
  }
}