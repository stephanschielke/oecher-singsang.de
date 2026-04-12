#!/usr/bin/env node
/**
 * Extract WordPress posts to Markdown with YAML frontmatter
 * 
 * Usage: node scripts/extract-content.js
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const slugify = require('slugify');

// Configuration
const SOURCE_DIR = path.join(__dirname, '../oecher-singsang.de');
const POSTS_DIR = path.join(__dirname, '../src/posts');
const DATA_DIR = path.join(__dirname, '../src/_data');

// German-safe slugify options
const slugifyOptions = {
  lower: true,
  strict: true,
  locale: 'de',
  remove: /[*+~.()'"!:@]/g
};

// Umlaut replacements for slugify
function germanSlugify(text) {
  const replacements = {
    'ä': 'ae', 'ö': 'oe', 'ü': 'ue',
    'Ä': 'Ae', 'Ö': 'Oe', 'Ü': 'Ue',
    'ß': 'ss',
    // Handle HTML entities
    '&#8217;': '', // apostrophe
    '&#8211;': '-', // en-dash
    '&#8220;': '', '&#8221;': '', // quotes
    '&#8222;': '', // German quote
  };
  
  let result = text;
  for (const [from, to] of Object.entries(replacements)) {
    result = result.replace(new RegExp(from, 'g'), to);
  }
  
  // Use slugify with german locale
  return slugify(result, slugifyOptions);
}

// Find all post files (index.html?p=NNN.html, excluding replytocom)
function findPostFiles() {
  const files = fs.readdirSync(SOURCE_DIR);
  const postFiles = files
    .filter(f => f.startsWith('index.html?p=') && f.endsWith('.html'))
    .filter(f => !f.includes('replytocom'))
    .sort((a, b) => {
      const idA = parseInt(a.match(/p=(\d+)/)[1]);
      const idB = parseInt(b.match(/p=(\d+)/)[1]);
      return idA - idB;
    });
  
  console.log(`Found ${postFiles.length} post files`);
  return postFiles;
}

// Extract content from a single HTML file
function extractPost(filename) {
  const filepath = path.join(SOURCE_DIR, filename);
  const html = fs.readFileSync(filepath, 'utf8');
  const $ = cheerio.load(html);
  
  // Extract post ID from filename
  const postId = filename.match(/p=(\d+)/)[1];
  
  // Title
  const title = $('h1.entry-title').text().trim();
  if (!title) {
    console.warn(`  No title found in ${filename}`);
    return null;
  }
  
  // Date - from datetime attribute
  const timeEl = $('time.entry-date');
  const datetime = timeEl.attr('datetime') || '';
  const date = datetime.split('T')[0]; // Get YYYY-MM-DD
  
  // Author - from footer meta
  const author = $('footer.entry-meta .author a').text().trim() || 'Stephan Schielke';
  
  // Categories - from rel="category" links in footer
  const categories = [];
  $('footer.entry-meta a[rel="category"]').each((i, el) => {
    categories.push($(el).text().trim());
  });
  
  // Tags - from rel="tag" links in footer
  const tags = [];
  $('footer.entry-meta a[rel="tag"]').each((i, el) => {
    tags.push($(el).text().trim());
  });
  
  // Content - get inner HTML
  let content = $('.entry-content').html();
  if (!content) {
    console.warn(`  No content found in ${filename}`);
    return null;
  }
  
  // Clean up content
  content = cleanContent(content);
  
  // Comments
  const comments = extractComments($, postId);
  
  // Generate slug from title
  const slug = germanSlugify(title);
  
  return {
    postId,
    title,
    date,
    author,
    categories,
    tags,
    content,
    comments,
    slug,
    originalFile: filename
  };
}

// Clean up HTML content
function cleanContent(html) {
  // Remove the 2-click social buttons div and script
  html = html.replace(/<div class="twoclick_social_bookmarks[\s\S]*?<\/div><div class="twoclick-js">[\s\S]*?<\/div>/g, '');
  
  // Update image paths from wp-content/uploads to /assets/images/
  html = html.replace(/src=["'](?:\.\.\/)*wp-content\/uploads\//g, 'src="/assets/images/');
  html = html.replace(/href=["'](?:\.\.\/)*wp-content\/uploads\//g, 'href="/assets/images/');
  
  // Trim whitespace
  html = html.trim();
  
  return html;
}

// Extract comments from the page
function extractComments($, postId) {
  const comments = [];
  
  $('#comments article.comment').each((i, el) => {
    const $comment = $(el);
    const commentId = $comment.attr('id')?.replace('comment-', '') || '';
    
    // Author info
    const authorName = $comment.find('.comment-author cite .fn').text().trim();
    const authorUrl = $comment.find('.comment-author cite .fn a').attr('href') || '';
    
    // Date
    const dateEl = $comment.find('.comment-meta time');
    const datetime = dateEl.attr('datetime') || '';
    
    // Content
    const content = $comment.find('.comment-content').text().trim();
    
    if (content) {
      comments.push({
        id: commentId,
        postId,
        author: authorName,
        authorUrl,
        datetime,
        content
      });
    }
  });
  
  return comments;
}

// Generate YAML frontmatter
function generateFrontmatter(post) {
  let yaml = '---\n';
  
  // Title - escape quotes
  yaml += `title: "${post.title.replace(/"/g, '\\"')}"\n`;
  
  // Date
  yaml += `date: ${post.date}\n`;
  
  // Author
  yaml += `author: ${post.author}\n`;
  
  // Categories as array
  if (post.categories.length > 0) {
    yaml += 'categories:\n';
    post.categories.forEach(cat => {
      yaml += `  - ${cat}\n`;
    });
  }
  
  // Tags as array
  if (post.tags.length > 0) {
    yaml += 'tags:\n';
    post.tags.forEach(tag => {
      yaml += `  - ${tag}\n`;
    });
  }
  
  // Permalink
  yaml += `permalink: /posts/${post.slug}/\n`;
  
  // Layout
  yaml += 'layout: post\n';
  
  // Original post ID for reference
  yaml += `wp_id: ${post.postId}\n`;
  
  yaml += '---\n\n';
  
  return yaml;
}

// Write markdown file
function writeMarkdownFile(post) {
  const frontmatter = generateFrontmatter(post);
  const markdown = frontmatter + post.content;
  
  // Filename: date-slug.md
  const filename = `${post.date}-${post.slug}.md`;
  const filepath = path.join(POSTS_DIR, filename);
  
  fs.writeFileSync(filepath, markdown, 'utf8');
  console.log(`  Created: ${filename}`);
  
  return filename;
}

// Write comments to JSON
function writeComments(allComments) {
  if (allComments.length === 0) {
    console.log('No comments found');
    return;
  }
  
  const filepath = path.join(DATA_DIR, 'comments.json');
  fs.writeFileSync(filepath, JSON.stringify(allComments, null, 2), 'utf8');
  console.log(`\nCreated comments.json with ${allComments.length} comments`);
}

// Main execution
function main() {
  console.log('WordPress to Markdown Content Extractor\n');
  console.log(`Source: ${SOURCE_DIR}`);
  console.log(`Output: ${POSTS_DIR}\n`);
  
  // Ensure output directories exist
  if (!fs.existsSync(POSTS_DIR)) {
    fs.mkdirSync(POSTS_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  
  // Find all post files
  const postFiles = findPostFiles();
  
  // Extract and convert each post
  const allComments = [];
  let successCount = 0;
  let failCount = 0;
  
  for (const file of postFiles) {
    console.log(`Processing: ${file}`);
    
    try {
      const post = extractPost(file);
      
      if (post) {
        writeMarkdownFile(post);
        
        // Collect comments
        if (post.comments.length > 0) {
          allComments.push(...post.comments);
        }
        
        successCount++;
      } else {
        failCount++;
      }
    } catch (err) {
      console.error(`  Error: ${err.message}`);
      failCount++;
    }
  }
  
  // Write comments
  writeComments(allComments);
  
  // Summary
  console.log('\n=== Summary ===');
  console.log(`Processed: ${successCount} posts`);
  console.log(`Failed: ${failCount} posts`);
  console.log(`Comments: ${allComments.length}`);
}

main();
