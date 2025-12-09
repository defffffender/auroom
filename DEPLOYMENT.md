# Инструкция по деплою AuRoom на VPS

## Данные сервера

- **IP**: 185.217.131.179
- **Домен**: vps6127.eskiz.uz
- **SSH Порт**: 22
- **SSH Логин**: root
- **SSH Пароль**: MR8Q8kEwH2ScWk8b

## Шаг 1: Подключение к серверу

```bash
ssh root@185.217.131.179
```

Пароль: `MR8Q8kEwH2ScWk8b`

## Шаг 2: Очистка старых проектов (если есть)

```bash
# Останавливаем старые сервисы
systemctl stop gunicorn 2>/dev/null || true
systemctl stop nginx 2>/dev/null || true
systemctl disable gunicorn 2>/dev/null || true

# Удаляем старые файлы (будьте осторожны!)
rm -rf /root/old_project_name
rm -f /etc/systemd/system/gunicorn.service
rm -f /etc/nginx/sites-enabled/default
```

## Шаг 3: Загрузка проекта на сервер

### Вариант А: Через Git (рекомендуется)

```bash
cd /root
git clone <your-repository-url> auroom
cd auroom
```

### Вариант Б: Через SCP с локальной машины

На вашем локальном компьютере (Windows):

```bash
# Установите Git Bash или используйте PowerShell
# Архивируем проект (исключая venv, .git, и т.д.)
tar -czf auroom.tar.gz --exclude='venv' --exclude='.git' --exclude='__pycache__' --exclude='*.pyc' --exclude='db.sqlite3' --exclude='media/*' .

# Копируем на сервер
scp auroom.tar.gz root@185.217.131.179:/root/

# Подключаемся к серверу
ssh root@185.217.131.179

# Распаковываем
cd /root
tar -xzf auroom.tar.gz -C auroom
rm auroom.tar.gz
```

## Шаг 4: Запуск скрипта деплоя

```bash
cd /root/auroom
bash deploy.sh
```

Скрипт автоматически:
- Установит все необходимые пакеты
- Настроит PostgreSQL
- Создаст виртуальное окружение Python
- Установит зависимости
- Выполнит миграции Django
- Соберет статические файлы
- Настроит Nginx и Gunicorn
- Запустит сервисы

## Шаг 5: Проверка работы

Откройте в браузере:
- http://185.217.131.179
- http://vps6127.eskiz.uz

Должна загрузиться главная страница каталога.

## Шаг 6: Создание суперпользователя

```bash
cd /root/auroom
source venv/bin/activate
python manage.py createsuperuser
```

Админ панель: http://185.217.131.179/admin

## Шаг 7: Генерация тестовых данных (100,000 товаров)

```bash
cd /root/auroom
source venv/bin/activate

# Загрузка базовых справочников (если еще не загружены)
python manage.py load_jewelry_data

# Генерация 100,000 товаров
python manage.py generate_test_products --count 100000 --batch-size 1000
```

Процесс займет 10-30 минут в зависимости от производительности сервера.

## Полезные команды

### Просмотр логов

```bash
# Логи Gunicorn (приложение Django)
journalctl -u auroom -f

# Логи Nginx
tail -f /var/log/nginx/auroom-access.log
tail -f /var/log/nginx/auroom-error.log
```

### Перезапуск сервисов

```bash
# Перезапуск Django приложения
systemctl restart auroom

# Перезапуск Nginx
systemctl restart nginx

# Проверка статуса
systemctl status auroom
systemctl status nginx
```

### Django команды

```bash
cd /root/auroom
source venv/bin/activate

# Миграции
python manage.py migrate

# Сборка статики
python manage.py collectstatic --noinput

# Создание суперпользователя
python manage.py createsuperuser

# Загрузка базовых данных
python manage.py load_jewelry_data

# Генерация тестовых товаров
python manage.py generate_test_products --count 100000
```

### Обновление кода

```bash
cd /root/auroom

# Если используете Git
git pull origin main

# Активируем виртуальное окружение
source venv/bin/activate

# Обновляем зависимости
pip install -r requirements.txt

# Применяем миграции
python manage.py migrate

# Собираем статику
python manage.py collectstatic --noinput

# Перезапускаем приложение
systemctl restart auroom
```

## Нагрузочное тестирование

### Проверка производительности каталога

```bash
# Установка Apache Bench (ab)
apt-get install apache2-utils -y

# Тест: 1000 запросов, 10 одновременно
ab -n 1000 -c 10 http://185.217.131.179/

# Тест с фильтрами
ab -n 500 -c 10 "http://185.217.131.179/?category=kolca&material=1"

# Тест страницы товара
ab -n 500 -c 10 http://185.217.131.179/product/1/
```

### Мониторинг производительности

```bash
# Мониторинг CPU и RAM в реальном времени
htop

# Проверка использования диска
df -h

# Проверка времени выполнения запросов в PostgreSQL
sudo -u postgres psql auroom_db
SELECT pid, now() - query_start as duration, query FROM pg_stat_activity WHERE state = 'active';
```

## Решение проблем

### Приложение не запускается

```bash
# Проверка логов
journalctl -u auroom -n 50

# Проверка конфигурации
cd /root/auroom
source venv/bin/activate
python manage.py check
```

### Nginx возвращает 502

```bash
# Проверка, что Gunicorn запущен
systemctl status auroom

# Проверка портов
netstat -tulpn | grep 8000

# Перезапуск сервисов
systemctl restart auroom
systemctl restart nginx
```

### Проблемы с базой данных

```bash
# Проверка подключения к PostgreSQL
sudo -u postgres psql auroom_db

# Пересоздание миграций (только в крайнем случае!)
cd /root/auroom
source venv/bin/activate
python manage.py migrate
```

### Медленная работа

1. Убедитесь, что применены все миграции (включая индексы):
```bash
python manage.py migrate
```

2. Проверьте, что Redis запущен:
```bash
systemctl status redis-server
```

3. Включите кэширование в .env:
```bash
nano /root/auroom/.env
# Добавьте/проверьте:
REDIS_HOST=localhost
```

4. Перезапустите приложение:
```bash
systemctl restart auroom
```

## Бэкап базы данных

```bash
# Создание бэкапа
sudo -u postgres pg_dump auroom_db > /root/backup_$(date +%Y%m%d_%H%M%S).sql

# Восстановление из бэкапа
sudo -u postgres psql auroom_db < /root/backup_20231215_120000.sql
```

## Мониторинг метрик

### Количество товаров в БД

```bash
cd /root/auroom
source venv/bin/activate
python manage.py shell
```

В Python shell:
```python
from catalog.models import Product
print(f"Всего товаров: {Product.objects.count()}")
print(f"Активных товаров: {Product.objects.filter(is_active=True).count()}")
```

## Безопасность

После настройки рекомендуется:

1. Изменить пароли в `.env`:
```bash
nano /root/auroom/.env
```

2. Настроить файрвол:
```bash
ufw allow 22
ufw allow 80
ufw allow 443
ufw enable
```

3. Настроить автоматическое обновление:
```bash
apt-get install unattended-upgrades -y
dpkg-reconfigure -plow unattended-upgrades
```

## Контакты и поддержка

Если возникли проблемы:
1. Проверьте логи: `journalctl -u auroom -f`
2. Проверьте настройки в `/root/auroom/.env`
3. Убедитесь, что все сервисы запущены: `systemctl status auroom nginx postgresql redis-server`
