#!/bin/bash

# Скрипт для деплоя AuRoom на VPS
# Использование: bash deploy.sh

set -e  # Остановка при ошибке

echo "===== AuRoom Deployment Script ====="
echo ""

# Цвета для вывода
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Функция для вывода информации
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Проверка, что скрипт запущен на сервере
if [ ! -f "/etc/os-release" ]; then
    error "This script should be run on a Linux server"
    exit 1
fi

# 1. Обновление системы
info "Updating system packages..."
apt-get update -y
apt-get upgrade -y

# 2. Установка зависимостей
info "Installing system dependencies..."
apt-get install -y python3 python3-pip python3-venv nginx postgresql postgresql-contrib redis-server git

# 3. Настройка PostgreSQL
info "Setting up PostgreSQL..."
# Пароль БД берём из переменной окружения или генерируем
DB_PASSWORD=${DB_PASSWORD:-$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 24)}
echo "Database password: $DB_PASSWORD (save this!)"

sudo -u postgres psql -c "CREATE DATABASE auroom_db;" 2>/dev/null || warning "Database already exists"
sudo -u postgres psql -c "CREATE USER auroom_user WITH PASSWORD '$DB_PASSWORD';" 2>/dev/null || warning "User already exists"
sudo -u postgres psql -c "ALTER ROLE auroom_user SET client_encoding TO 'utf8';"
sudo -u postgres psql -c "ALTER ROLE auroom_user SET default_transaction_isolation TO 'read committed';"
sudo -u postgres psql -c "ALTER ROLE auroom_user SET timezone TO 'Asia/Tashkent';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE auroom_db TO auroom_user;"

# 4. Создание директорий
info "Creating directories..."
mkdir -p /root/auroom
mkdir -p /var/www/auroom/static
mkdir -p /var/www/auroom/media
mkdir -p /var/log/auroom
mkdir -p /var/run/auroom

# 5. Проверка наличия проекта
if [ ! -d "/root/auroom/catalog" ]; then
    error "Project files not found in /root/auroom. Please upload the project first."
    exit 1
fi

cd /root/auroom

# 6. Создание виртуального окружения
info "Setting up Python virtual environment..."
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi

source venv/bin/activate

# 7. Установка Python пакетов
info "Installing Python packages..."
pip install --upgrade pip
pip install -r requirements.txt

# 8. Проверка .env файла
if [ ! -f ".env" ]; then
    warning ".env file not found. Creating from .env.production template..."
    cp .env.production .env

    # Генерация SECRET_KEY
    SECRET_KEY=$(python3 -c 'from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())')
    sed -i "s/your-secret-key-here-change-this-in-production/$SECRET_KEY/" .env
    sed -i "s/your-db-password-here/$DB_PASSWORD/" .env

    warning "Please review and update /root/auroom/.env file!"
fi

# 9. Django миграции
info "Running Django migrations..."
python manage.py migrate

# 10. Сборка статики
info "Collecting static files..."
python manage.py collectstatic --noinput

# 11. Загрузка базовых данных
info "Loading initial data..."
python manage.py load_jewelry_data || warning "Data already loaded or command failed"

# 12. Настройка Nginx
info "Configuring Nginx..."
cp nginx_auroom.conf /etc/nginx/sites-available/auroom
ln -sf /etc/nginx/sites-available/auroom /etc/nginx/sites-enabled/auroom

# Удаление дефолтного конфига
rm -f /etc/nginx/sites-enabled/default

# Проверка конфигурации Nginx
nginx -t

# 13. Настройка Systemd service
info "Configuring systemd service..."
# Исправление путей в service файле перед копированием
sed -i 's|/root/auroom/gunicorn_config.py|gunicorn_config.py|' auroom.service
cp auroom.service /etc/systemd/system/auroom.service

# Перезагрузка systemd
systemctl daemon-reload

# 14. Настройка логов
info "Setting up logging..."
touch /var/log/auroom/gunicorn-access.log
touch /var/log/auroom/gunicorn-error.log
chmod 755 /var/log/auroom/

# 15. Исправление gunicorn_config.py для работы без абсолютных путей
info "Updating gunicorn config..."
sed -i "s|pidfile = '/var/run/auroom/gunicorn.pid'|pidfile = None|" gunicorn_config.py
sed -i "s|accesslog = '/var/log/auroom/gunicorn-access.log'|accesslog = '-'|" gunicorn_config.py
sed -i "s|errorlog = '/var/log/auroom/gunicorn-error.log'|errorlog = '-'|" gunicorn_config.py

# 16. Запуск сервисов
info "Starting services..."
systemctl enable auroom
systemctl restart auroom
systemctl enable nginx
systemctl restart nginx
systemctl enable redis-server
systemctl restart redis-server

# 17. Проверка статуса
info "Checking services status..."
systemctl status auroom --no-pager || warning "Gunicorn service may have issues"
systemctl status nginx --no-pager || warning "Nginx service may have issues"

# 18. Настройка firewall (если установлен ufw)
if command -v ufw &> /dev/null; then
    info "Configuring firewall..."
    ufw allow 80/tcp
    ufw allow 22/tcp
    ufw --force enable
fi

echo ""
info "===== Deployment Complete! ====="
echo ""
info "Your application should now be running at:"
echo "  http://185.217.131.179"
echo "  http://vps6127.eskiz.uz"
echo ""
info "Useful commands:"
echo "  - View logs: journalctl -u auroom -f"
echo "  - Restart app: systemctl restart auroom"
echo "  - Restart nginx: systemctl restart nginx"
echo "  - Check status: systemctl status auroom"
echo ""
warning "Next steps:"
echo "  1. Generate test products: python manage.py generate_test_products --count 100000"
echo "  2. Review .env file and update if needed"
echo "  3. Create superuser: python manage.py createsuperuser"
echo ""
