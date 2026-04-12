# Öcher Singsang

*Texte und Lieder auf Öcher Platt*

A cultural heritage website preserving **Öcher Platt** (Aachen dialect) through traditional songs, lyrics, and translations.

## About

Diese Webseite stellt den Versuch dar, die Aachener Mundart in das digitale Zeitalter zu führen.

- Traditional songs and lyrics in Öcher Platt dialect
- German translations alongside original texts
- Audio recordings of traditional performances
- Educational resources for dialect preservation

## Tech Stack

- **[Eleventy (11ty)](https://www.11ty.dev/)** - Static site generator
- **Nunjucks** - Templating
- **nginx** - Static file serving (via Docker)

## Development

```bash
# Install dependencies
npm install

# Development server with hot reload
npm run dev

# Production build
npm run build
```

## Build

```bash
# Build Docker image
docker build -t oecher-singsang .

# Run locally
docker run -p 8080:80 oecher-singsang
```

## Project Structure

```
src/
├── _data/           # Global data files (site config, posts, comments)
├── _includes/       # Layouts and partials (Nunjucks)
│   ├── layouts/     # Base templates
│   └── partials/    # Reusable components
├── assets/          # CSS, images, fonts
├── posts/           # Blog posts in Markdown
└── *.njk            # Page templates
```

## Design System

See [.impeccable.md](.impeccable.md) for design tokens and guidelines.

## Quality

- **Lighthouse scores**: Accessibility 100, Best Practices 100, SEO 100
- WCAG 2.5.5 compliant touch targets
- Responsive design (mobile, tablet, desktop)

## License

Content: [CC BY-NC-SA 3.0 DE](http://creativecommons.org/licenses/by-nc-sa/3.0/de/)

## Links

- **Live site**: https://oecher-singsang.de
- **Alternative**: https://öcher-singsang.de (umlaut domain)
