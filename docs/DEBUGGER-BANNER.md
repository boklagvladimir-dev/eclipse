# Уведомление Chrome об отладке

Эта инструкция относится к Eclipse 0.8.3 и более ранним версиям. В Eclipse 0.8.4 разрешение на отладку удалено, поэтому этому расширению параметр запуска больше не нужен.

Плашка «Eclipse начал отладку этого браузера» относится к интерфейсу Chrome.
Расширение не может скрыть её своим CSS или настройками страницы.

Chromium поддерживает параметр запуска:

```text
--silent-debugger-extension-api
```

## Windows / Chrome

1. Сохраните работу и полностью закройте Chrome, включая фоновые процессы.
2. Откройте свойства ярлыка Chrome.
3. В поле «Объект» сохраните существующий путь и все параметры. Добавьте в самый конец через пробел `--silent-debugger-extension-api`. Если других параметров нет, получится:

   ```text
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --silent-debugger-extension-api
   ```

   Если в ярлыке уже указан `--source-shortcut-location=start-menu`, оставьте его. Например:

   Было:

   ```text
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --source-shortcut-location=start-menu
   ```

   Должно стать:

   ```text
   "C:\Program Files\Google\Chrome\Application\chrome.exe" --source-shortcut-location=start-menu --silent-debugger-extension-api
   ```

   Сохраните свой фактический путь к chrome.exe, если он отличается. Параметр добавляется вне кавычек.
4. Запускайте браузер этим ярлыком. На странице `chrome://version` проверьте,
   что параметр присутствует в поле командной строки.

Чтобы вернуть уведомление, удалите параметр и полностью перезапустите Chrome.
Параметр отключает предупреждения для всех расширений с Debugger API в этом
процессе браузера. Не используйте его с расширениями, которым не доверяете.

В других Chromium-браузерах поддержка зависит от конкретной сборки.
Открытие окна поверх уже запущенного браузера обычно не меняет его параметры.

Основание: исходный код Chromium, `ExtensionDevToolsClientHost::Attach()`:
https://chromium.googlesource.com/chromium/src/+/refs/heads/main/chrome/browser/extensions/api/debugger/debugger_api.cc
