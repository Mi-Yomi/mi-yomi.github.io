# Деплой на GitHub Pages

## Настройка (один раз)
1. Открой **Settings** → **Pages** в репозитории
2. **Build and deployment** → **Source**: Deploy from a branch
3. **Branch**: main, **Folder**: /docs
4. **Save**

## После изменений в коде
```bash
npm run build
git add docs
git commit -m "build: update"
git push
```
