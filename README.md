# Deltek Intake Form

Static Eleventy site for Deltek intake requests. The deployed form posts to Netlify Forms under the form name `deltek-intake`.

## Local Development

```bash
npm install
npm run start
```

## Netlify Deployment

1. Push this folder to a GitHub repository.
2. In Netlify, create a new site from that repository.
3. Use build command `npm run build`.
4. Use publish directory `_site`.
5. After the first deploy, submissions appear in Netlify under Forms > `deltek-intake`.

The in-page queue stores a local copy in the submitter's browser. The shared processing queue is Netlify Forms.
# Projects

