ПОЛНЫЙ ПРОЕКТ САЙТА С РАБОЧЕЙ TELEGRAM-ФОРМОЙ ДЛЯ CLOUDFLARE PAGES

СТРУКТУРА РЕПОЗИТОРИЯ

  functions/
    api/
      telegram.js       серверная функция POST /api/telegram и GET-проверка
  public/
    index.html          сайт и форма заявки
    images/             изображения сайта

КАК ЗАГРУЗИТЬ
1. Распакуйте ZIP.
2. Загрузите СОДЕРЖИМОЕ архива в корень GitHub-репозитория.
   Не создавайте дополнительную вложенную папку вокруг public и functions.
3. В корне GitHub должны одновременно находиться папки functions и public.
4. Используйте Cloudflare Pages, подключённый к этому GitHub-репозиторию.
   Direct Upload в панели Pages не публикует Pages Functions.

НАСТРОЙКИ CLOUDFLARE PAGES → BUILDS & DEPLOYMENTS
Framework preset: None
Build command: (оставить пустым — проект не требует сборки)
Build output directory: public
Root directory (advanced): оставить пустым (корень репозитория)
Production branch: main (если основная ветка репозитория называется main)

ПЕРЕМЕННЫЕ CLOUDFLARE PAGES → SETTINGS → VARIABLES AND SECRETS
Добавьте для Production:
TELEGRAM_BOT_TOKEN  Type: Secret  Value: токен от BotFather
TELEGRAM_CHAT_ID    Type: Text    Value: ID чата

Если тестируете Preview-деплой, добавьте обе переменные также для Preview.
После добавления или изменения переменных создайте НОВЫЙ деплой.
Не добавляйте токен в HTML, JavaScript на стороне браузера или GitHub.

ПРОВЕРКА ПОСЛЕ ДЕПЛОЯ
Откройте в браузере адрес вашего сайта с путём /api/telegram, например:
https://ВАШ-САЙТ.pages.dev/api/telegram

Должен появиться JSON примерно такого вида:
{"ok":true,"service":"telegram-form","tokenConfigured":true,"chatConfigured":true,"ready":true}

Если получаете 404 — функция не опубликована: проверьте GitHub-деплой, расположение functions в корне и то, что это Pages Git integration, а не Direct Upload.
Если tokenConfigured или chatConfigured равно false — секрет/переменная не привязаны к тому окружению, которое вы проверяете. Если tokenValid=false — сам токен недействителен. Если chatAccessible=false — новый бот не видит указанный чат или TELEGRAM_CHAT_ID указан неверно. Добавьте их в Production и сделайте новый деплой.

После успешной проверки GET откройте бота в Telegram и отправьте ему /start (для личного чата), затем заполните форму на сайте.
Диагностика GET теперь проверяет реальный токен через Telegram getMe и доступ к целевому чату через getChat. В ответе tokenValid должен быть true, а chatAccessible должен быть true. Если tokenValid=false — проверьте новый токен. Если chatAccessible=false — проверьте TELEGRAM_CHAT_ID: это ID личного чата/группы, а не ID бота; для личного чата откройте нового бота и отправьте /start. Если Telegram отклонит отправку заявки, форма покажет причину, а подробности появятся в Cloudflare → Workers & Pages → ваш Pages-проект → Functions → Logs.

ВАЖНО: этот проект никогда не содержит ваш токен. Токен остаётся только в Cloudflare Secret.
