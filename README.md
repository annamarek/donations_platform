# Crypto Donation Tracker

Мини-проект: сайт для отслеживания крипто-донатов в реальном времени.

Технологии:
- Ganache (локальный блокчейн)
- MetaMask (кошелек и подпись транзакций)
- Remix (компиляция и деплой смарт-контракта)
- Ethers.js (взаимодействие фронтенда с контрактом)
- Node.js + Express (API)
- MSSQL (хранение донатов)

## 1) Запуск Ganache

1. Открой Ganache и создай Workspace (или Quickstart).
2. Проверь RPC:
   - `RPC Server`: `http://127.0.0.1:7545`
   - `Chain ID`: обычно `1337` (иногда `5777`, смотри в Ganache UI)
3. Скопируй private key одного тестового аккаунта.

## 2) Подключение сети в MetaMask

1. MetaMask -> Add network (manual):
   - Network Name: `Ganache Local`
   - RPC URL: `http://127.0.0.1:7545`
   - Chain ID: из Ganache (`1337` или `5777`)
   - Currency symbol: `ETH`
2. Импортируй аккаунт по private key из Ganache.

## 3) Деплой контракта через Remix

1. Открой Remix IDE.
2. Создай файл и вставь контракт из `contracts/DonationTracker.sol`.
3. Вкладка **Solidity Compiler** -> версия `0.8.20+` -> Compile.
4. Вкладка **Deploy & Run Transactions**:
   - Environment: `Injected Provider - MetaMask`
   - Выбери нужный аккаунт/сеть Ganache.
5. Нажми Deploy и подтверди транзакцию в MetaMask.
6. Скопируй адрес задеплоенного контракта.

## 4) Подключение фронтенда к контракту

1. Открой файл `frontend/app.js`.
2. Замени:
   - `PASTE_DEPLOYED_CONTRACT_ADDRESS_HERE`
   на реальный адрес контракта из Remix.

ABI уже добавлен в проект.

## 5) Запуск сайта

В папке `frontend` подними локальный сервер (любой):

PowerShell:

```powershell
cd C:\Users\Admin\Desktop\final_crypto\frontend
python -m http.server 5500
```

После этого открой:

`http://127.0.0.1:5500`

Или запуск в один клик из корня проекта:

- двойной клик по `start_frontend.bat`
- сервер поднимется в отдельном окне
- сайт `http://127.0.0.1:5500/` откроется автоматически

## 6) Сохранение донатов в MSSQL

1. Создай базу, например `CryptoDonations`.
2. Выполни SQL-скрипт `backend/schema.sql` в своей базе.
3. В корне проекта создай `.env` на основе `.env.example` и заполни данные подключения к MSSQL.
4. Запусти API:

```powershell
cd C:\Users\Admin\Desktop\final_crypto
npm run start:api
```

или двойным кликом по `start_backend.bat`.

По умолчанию API доступен на `http://127.0.0.1:3001`.
Фронтенд после успешной on-chain транзакции автоматически делает POST в API и сохраняет запись в таблицу `Donations`.

### Если видишь `Login failed for user ...`

Частые причины:

- В `.env` неправильно указан инстанс SQL Server. Для Express удобнее так:
  - `DB_HOST=localhost`
  - `DB_INSTANCE=SQLEXPRESS`
- Ты подключаешься в SSMS через **Windows Authentication**, а в `.env` указан **SQL login**, которого нет или ему не выдан доступ к базе.
- SQL Server не в режиме **Mixed Mode** (SQL + Windows), поэтому SQL логины не работают.

Если хочешь как в SSMS (Windows Authentication), поставь в `.env`:

- `DB_AUTH=windows`
- удали/очисти `DB_USER` и `DB_PASSWORD`

Для Windows Authentication используется драйвер `msnodesqlv8` (он уже добавлен в зависимости). Если Windows попросит/потребует ODBC драйвер, установи **Microsoft ODBC Driver for SQL Server**.

## 7) Админ-страница (данные из MSSQL)

После запуска frontend и backend открой:

- `http://127.0.0.1:5500/admin.html`

На странице будет таблица последних донатов из базы:
- дата
- кошелек
- сумма
- tx hash
- сообщение

## Как работает realtime

- При донате контракт эмитит событие `Donated`.
- Фронтенд подписывается на это событие и сразу добавляет новый донат в список.
- Общая сумма донатов (`totalDonated`) обновляется автоматически.

## Структура

- `contracts/DonationTracker.sol` — смарт-контракт.
- `frontend/index.html` — интерфейс.
- `frontend/styles.css` — стили.
- `frontend/app.js` — логика подключения MetaMask, live-обновлений и отправки донатов в API.
- `frontend/admin.html` — админ-страница с таблицей донатов из MSSQL.
- `frontend/admin.js` — загрузка данных из API (`GET /api/donations`).
- `backend/server.js` — API для записи донатов в MSSQL.
- `backend/schema.sql` — таблица `Donations`.
# donations_platform
