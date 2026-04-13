const GERMAN_MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember"
];

module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/robots.txt");
  eleventyConfig.addPassthroughCopy("src/.well-known");
  
  eleventyConfig.addFilter("head", (arr, n) => {
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, n);
  });

  // Seeded shuffle - same result for entire day
  eleventyConfig.addFilter("seededShuffle", (arr, n) => {
    if (!Array.isArray(arr) || arr.length === 0) return [];
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    
    // Simple seeded random (mulberry32)
    const seededRandom = (s) => {
      return () => {
        s |= 0; s = s + 0x6D2B79F5 | 0;
        let t = Math.imul(s ^ s >>> 15, 1 | s);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
      };
    };
    
    const random = seededRandom(seed);
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return n ? shuffled.slice(0, n) : shuffled;
  });

  eleventyConfig.addFilter("slugify", (str) => {
    if (!str) return "";
    return str.toString().toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
      .replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/--+/g, '-').trim();
  });

  eleventyConfig.addFilter("date", (dateObj, format) => {
    const d = new Date(dateObj);
    if (format === '%Y-%m-%dT%H:%M:%S%z') {
      // Return full ISO with timezone
      return d.toISOString().replace('Z', '+00:00');
    }
    if (format === '%Y-%m-%dT%H:%M:%S') {
      return d.toISOString().slice(0, 19);
    }
    if (format === '%Y/%m') {
      return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    }
    return d.toISOString();
  });

  eleventyConfig.addFilter("isoDateTime", (dateObj) => {
    // Preserve original timezone if available, otherwise use ISO
    if (typeof dateObj === 'string' && dateObj.includes('+')) {
      return dateObj;
    }
    const d = new Date(dateObj);
    return d.toISOString();
  });
  
  eleventyConfig.addFilter("germanDate", (dateObj) => {
    const d = new Date(dateObj);
    return `${d.getDate()}. ${GERMAN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  });

  eleventyConfig.addFilter("germanMonthYear", (dateObj) => {
    const d = new Date(dateObj);
    return `${GERMAN_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
  });

  eleventyConfig.addFilter("excerpt", (content) => {
    if (!content) return "";
    const stripped = content.replace(/<[^>]*>/g, "");
    return stripped.substring(0, 200) + (stripped.length > 200 ? "..." : "");
  });

  eleventyConfig.addFilter("nl2br", (str) => {
    if (!str) return "";
    return str.replace(/\n/g, "<br>");
  });

  eleventyConfig.addFilter("filterByPostId", (comments, postId) => {
    if (!comments || !postId) return [];
    const pid = String(postId);
    return comments.filter(c => c.postId === pid);
  });

  eleventyConfig.addCollection("posts", (collection) => {
    return collection.getFilteredByGlob("src/posts/*.md")
      .sort((a, b) => b.date - a.date);
  });

  eleventyConfig.addCollection("categories", (collection) => {
    const cats = new Map();
    for (const post of collection.getFilteredByGlob("src/posts/*.md")) {
      for (const cat of (post.data.categories || [])) {
        if (!cats.has(cat)) cats.set(cat, []);
        cats.get(cat).push(post);
      }
    }
    return Array.from(cats.entries()).map(([name, posts]) => ({
      name,
      posts: posts.sort((a, b) => b.date - a.date)
    }));
  });

  eleventyConfig.addCollection("tagList", (collection) => {
    const tags = new Set();
    for (const post of collection.getFilteredByGlob("src/posts/*.md")) {
      for (const tag of (post.data.tags || [])) {
        tags.add(tag);
      }
    }
    return Array.from(tags).sort();
  });

  eleventyConfig.addCollection("postsByMonth", (collection) => {
    const posts = collection.getFilteredByGlob("src/posts/*.md")
      .sort((a, b) => b.date - a.date);
    
    const months = new Map();
    for (const post of posts) {
      const d = new Date(post.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!months.has(key)) {
        months.set(key, {
          date: new Date(d.getFullYear(), d.getMonth(), 1),
          posts: []
        });
      }
      months.get(key).posts.push(post);
    }
    
    return Array.from(months.values());
  });

  eleventyConfig.addWatchTarget("src/assets/");

  return {
    dir: {
      input: "src",
      output: "_site",
      includes: "_includes",
      data: "_data"
    },
    templateFormats: ["njk", "md", "html"],
    htmlTemplateEngine: "njk",
    markdownTemplateEngine: "njk"
  };
};
