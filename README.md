# sv

## Developing

Once you've created a project and installed dependencies with `yarn install`, start a development server:

```sh
yarn dev
```

Then open http://localhost:5176/ in your browser.

## To deploy to production

- git push to main branch to deploy the production frontend via Cloudflare Pages
  - you can see progress at https://dash.cloudflare.com/956fdd788b6b954978e6810d2bdbc365/pages/view/aetheria-ai
- `yarn deploy:convex` to deploy the production backend via Convex
