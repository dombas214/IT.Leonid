ПОЛНЫЙ ПРОЕКТ САЙТА + TELEGRAM-ФОРМА

СТРУКТУРА ПРОЕКТА

  functions/
    api/
      telegram.js       Серверная функция Cloudflare Pages: POST /api/telegram

  volkov_site/
    index.html          Главная страница сайта со встроенной формой заявки
    images/             Все локальные изображения проекта (SVG)

КАК ЗАГРУЗИТЬ В GITHUB

1. Распакуйте архив.
2. Загрузите СОДЕРЖИМОЕ архива в корень подключённого GitHub-репозитория.
   Не помещайте весь проект в дополнительную вложенную папку.
3. После загрузки проверьте, что в корне репозитория одновременно видны
   папки functions и volkov_site.

НАСТРОЙКИ CLOUDFLARE PAGES

Framework preset:          None
Build command:              exit 0
Build output directory:     volkov_site
Root directory (advanced): оставить пустым (корень репозитория)

Важно: Pages Functions должны находиться в папке functions в корне проекта,
а не внутри volkov_site. Поэтому Build output directory — именно volkov_site.
Используйте подключение через GitHub. Загрузка через Direct Upload в панели
Cloudflare Pages не публикует Pages Functions.

ПЕРЕМЕННЫЕ CLOUDFLARE

Settings → Variables and Secrets → Production:

TELEGRAM_BOT_TOKEN   Type: Secret   Value: токен, выданный BotFather
TELEGRAM_CHAT_ID     Type: Text     Value: ID личного чата или группы

Не вставляйте токен в index.html и не добавляйте его в GitHub.
Не отправляйте токен в переписке или кому-либо ещё.
После добавления/изменения переменных запустите новый Production deployment.
Если проверяете Preview deployment, добавьте переменные также в Preview.

ПЕРЕД ТЕСТОМ

1. Откройте бота в Telegram и отправьте ему /start (для личного чата).
2. Отправьте тестовую заявку с опубликованного сайта.
3. Если отправка не удалась, сообщение формы покажет код/причину ошибки.
   Дополнительные сведения можно посмотреть в Cloudflare → Functions → Logs.

ФОРМА ОТПРАВЛЯЕТ НА СЕРВЕР ТОЛЬКО ИМЯ, КОНТАКТ, ТИП САЙТА И ОПИСАНИЕ.
Токен Telegram хранится только в серверном секрете Cloudflare.
