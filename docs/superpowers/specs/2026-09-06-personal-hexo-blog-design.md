# Apple-Inspired Personal Hexo Blog Design

## Purpose

Convert the unfinished default Hexo site into a Chinese personal blog for mixed technical notes, learning records, and essays. The site will use an original, Apple-inspired visual system: restrained typography, generous whitespace, clear hierarchy, subtle depth, and accessible light and dark modes. It will not reuse Apple branding, artwork, or copy.

The author will publish primarily from local Markdown files, while retaining a complete browser-based administrative interface for writing, editing, managing media, and publishing from any device.

## Confirmed Decisions

- Site name: `小聪的记录`.
- Author: `小聪`.
- Content types: technical notes, learning records, and essays in one chronological blog.
- Homepage direction: featured narrative layout. A lead card highlights the latest or pinned article before the chronological article stream.
- Hosting: GitHub Pages, published through GitHub Actions.
- Repository: `xiaocong612/xiaocong.github.io`, with `main` containing source rather than generated site files.
- Browser administration: Decap CMS using the GitHub backend and a Cloudflare Worker for GitHub OAuth.
- Existing remote contents may be replaced during the initial source push.

## Site Architecture

### Source and deployment

The repository will contain the Hexo project, content, custom theme, CMS configuration, Cloudflare Worker source, and GitHub Actions workflow. Generated `public/` files remain ignored and are never pushed as the source of truth.

The current `hexo-deployer-git` pattern is intentionally removed from the publishing path. Its existing configuration attempts to deploy generated files into the same repository branch that will hold source files. That would overwrite source files and prevents a CMS from editing posts safely.

GitHub Actions will run on pushes to `main`, manual dispatches, and an hourly schedule. It will install dependencies, validate the site, generate Hexo output, and publish the generated artifact with the official GitHub Pages deployment action. Future-dated posts use Hexo's normal date handling and become visible on the next scheduled build after their publication time.

The workflow uses only the scoped `GITHUB_TOKEN` permissions required to read repository contents and publish Pages. A failed workflow leaves the previously deployed site unchanged.

### Custom theme

An in-repository `apple-journal` theme replaces the default Landscape theme. It owns all templates and styles so package updates cannot overwrite visual changes.

The theme provides:

- A compact top navigation with the site name, 首页, 归档, 关于, and a search control.
- A featured homepage section with an original editorial cover image and the most recent pinned post, falling back to the newest post when none are pinned.
- A chronological article stream whose category labels distinguish 技术, 学习, and 随笔 with restrained accent colors.
- Article pages with a readable single-column measure, metadata, tags, cover image, mobile table of contents, code blocks, adjacent-post navigation, and share/copy-link affordances.
- Archive and category pages generated from post metadata, plus an editable about page.
- Local static search, built with a generated index and executed in the visitor's browser without analytics or tracking.
- Responsive layouts for phone, tablet, and desktop, plus light and dark variants driven by the device preference.

No Apple logos, product images, proprietary fonts, or copied layouts will be used. The initial featured image will be an original editorial bitmap asset suitable for a personal journal.

### Content model

Posts remain ordinary Markdown files in `source/_posts`. Each post uses this front matter:

```yaml
title: Article title
description: Short summary for the homepage and sharing metadata
date: 2026-09-06 14:00:00
categories:
  - 技术
tags:
  - Hexo
cover: /images/uploads/article-cover.jpg
pinned: false
draft: false
```

`categories` accepts 技术, 学习, or 随笔. Tags are free-form. `description`, `cover`, and `pinned` are optional, while title, date, category, and body are required. The default Hexo English welcome post is removed and replaced by one Chinese welcome/template post.

Images live below `source/images/uploads`. This makes them editable locally, selectable from the CMS, versioned in Git, and available under stable public paths.

## Publishing Workflows

### Local-first workflow

The author may edit posts using Obsidian, Typora, VS Code, or another Markdown editor. Project commands will be exposed through `package.json`:

- `npm run post -- "标题"` creates a Chinese post template with the standard front matter.
- `npm run preview` starts a local browser preview.
- `npm run check` validates configuration and generates the static site without publishing.
- `npm run publish -- "发布说明"` checks the site, commits changed source files with the supplied message, and pushes `main` for GitHub Actions to deploy.

The publishing helper stops before committing when validation fails. Git authentication remains the operating system's existing Git credential or SSH configuration; credentials are never placed in scripts or repository files.

### Browser CMS workflow

`/admin/` hosts Decap CMS. After signing in through GitHub, the author can:

- Create, edit, delete, preview, and publish posts.
- Set title, description, date, category, tags, cover, pinned state, draft state, and Markdown body using form fields.
- Upload and select images from the repository media library.
- Edit the about page.
- Edit site-level information such as the subtitle and optional social links.

Decap commits the same Markdown and image files used by the local workflow. Its collections include posts, the about page, and a site settings data file. This ensures both workflows have identical content ownership and Git history.

### OAuth boundary

Decap's GitHub backend requires a browser login callback. A Cloudflare Worker handles that OAuth exchange at a dedicated worker URL. The public CMS configuration stores only the GitHub OAuth client ID and the worker's public URL. The GitHub OAuth client secret is stored exclusively as an encrypted Cloudflare Worker secret.

The Worker accepts only the configured site origin and returns the authorization result to the CMS popup. It does not store content, visitor data, credentials, or analytics. The OAuth application is configured with the exact Worker callback URL and access is restricted to the author's GitHub account and blog repository.

## Failure Handling and Security

- Invalid YAML, missing required post metadata, and broken rendering fail `npm run check` before any local commit or push.
- A GitHub Actions build failure leaves the deployed Pages revision in place and exposes its log in the Actions tab.
- CMS authentication errors, expired sessions, and network interruptions show an actionable error and do not silently publish partial content. Browser-draft recovery is enabled where Decap supports it.
- The custom Worker supplies explicit origin checks, callback validation, and no secret-bearing browser responses.
- Git history is the recovery mechanism for post, media, template, and configuration changes.
- `.superpowers/`, generated HTML, build data, dependencies, and deployment working directories remain outside version control.

## Verification Plan

Before the initial push, verify:

- Hexo configuration parses and `npm run check` successfully generates the complete site.
- Generated output contains the homepage, a post page, archives, categories, about page, local search assets, and CMS entry point.
- The default sample content no longer appears.
- Required post front matter is accepted, and intentionally malformed front matter causes validation to fail.
- The CMS YAML configuration maps each visible form field to the expected Markdown or settings path.
- Desktop and mobile browser screenshots show readable text, stable navigation, no overlapping content, and functioning light/dark presentation.
- The GitHub Actions workflow syntax, Pages permissions, and deployment artifact path are correct.

After the first remote push, verify the deployed public URL, one local-origin post publication, one CMS-origin draft or publication, and the GitHub OAuth login callback.

## Account Setup Required During Launch

The author will sign in to GitHub to authorize source pushing and Pages settings, create the GitHub OAuth application, and sign in to Cloudflare to deploy the Worker and set its secrets. The implementation can prepare every file, command, callback value, and configuration field before these account-bound actions. No credentials will be requested or written to the workspace.
