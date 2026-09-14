# Deploy everything: the Cloudflare Worker board backend, then the static
# frontend to mintyfreshapps.com/sticky-notes/.
deploy: deploy-worker deploy-static

# Deploy the Cloudflare Worker board backend.
deploy-worker:
    npm run deploy

# Deploy the static frontend to mintyfreshapps.com/sticky-notes/.
deploy-static:
    rsync -avz --exclude '.git' --exclude node_modules --exclude .wrangler \
        --exclude worker --exclude wrangler.jsonc --exclude package.json \
        --exclude package-lock.json --exclude tsconfig.json --exclude justfile \
        . dreamhost:mintyfreshapps.com/sticky-notes/
