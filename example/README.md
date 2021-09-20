
# usage

```sh
docker-compose up -d
docker-compose exec app bash

# .env create
echo CSRF_KEY=<Something 32 digit number> >.env

deno run --allow-read --allow-net --allow-env app.ts
# => localhost:8080
```