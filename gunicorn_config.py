# Gunicorn configuration file
import multiprocessing

# Server socket
bind = "0.0.0.0:8000"
backlog = 2048

# Worker processes
# Оптимизировано для VPS с ограниченной памятью (< 1GB RAM)
# Используем 2 воркера вместо формулы cpu_count() * 2 + 1
workers = 2
worker_class = 'sync'
worker_connections = 1000
timeout = 120
keepalive = 5

# Ограничение памяти для воркеров
max_requests = 1000  # Перезапуск воркера после 1000 запросов (предотвращает утечки памяти)
max_requests_jitter = 50  # Случайный разброс для предотвращения одновременного рестарта

# Logging
accesslog = '/var/log/auroom/gunicorn-access.log'
errorlog = '/var/log/auroom/gunicorn-error.log'
loglevel = 'info'
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s"'

# Process naming
proc_name = 'auroom'

# Server mechanics
daemon = False
pidfile = '/var/run/auroom/gunicorn.pid'
user = None
group = None
tmp_upload_dir = None

# SSL (если нужно)
# keyfile = None
# certfile = None
