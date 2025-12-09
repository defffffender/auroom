# Gunicorn configuration file
import multiprocessing

# Server socket
bind = "0.0.0.0:8000"
backlog = 2048

# Worker processes
# Оптимизировано для высокой нагрузки (до 1000 одновременных пользователей)
# Увеличиваем воркеры до 4 (каждый ~60MB RAM)
workers = 4
worker_class = 'sync'
worker_connections = 1000
timeout = 120
keepalive = 5

# Preload app для экономии памяти (общий код между воркерами)
preload_app = True

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
