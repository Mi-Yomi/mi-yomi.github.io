# Деплой на GitHub Pages

## Проблема
Сайт не работал, потому что GitHub Pages отдавал исходники (main.jsx) вместо собранного приложения. Браузер не понимает JSX и получал неправильный MIME type.

## Решение
Добавлен GitHub Actions workflow, который:
1. Собирает проект (`npm run build`)
2. Деплоит папку `dist` на GitHub Pages

## Настройка
1. Открой **Settings** → **Pages** в репозитории
2. В разделе **Build and deployment** выбери **Source: GitHub Actions**
3. Запушь изменения — workflow запустится автоматически

После первого успешного деплоя сайт будет доступен на https://mi-yomi.github.io
