# Deploy the static frontend to mintyfreshapps.com/sticky-notes/.
# Run `npm run deploy` first (or after) to (re)deploy the Cloudflare Worker
# board backend the frontend talks to.
deploy:
    rsync -avz --exclude '.git' --exclude node_modules --exclude .wrangler \
        --exclude worker --exclude wrangler.jsonc --exclude package.json \
        --exclude package-lock.json --exclude tsconfig.json --exclude justfile \
        . dreamhost:mintyfreshapps.com/sticky-notes/
