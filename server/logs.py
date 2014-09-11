import logging.config
import os.path


def init_logging():
    config = {
        'version': 1,
        'disable_existing_loggers': False,
        'formatters': {
            'normal': {
                'format': '%(asctime)s [%(process)d] [%(levelname)s] %(name)s: %(message)s',
            }
        },
        'filters': {},
        'handlers': {
            'console': {
                'level': 'INFO',
                'class': 'logging.StreamHandler',
                'formatter': 'normal',
            },
            'file': {
                'level': 'INFO',
                'class': 'logging.FileHandler',
                'filename': os.path.join(os.path.dirname(__file__), 'minefield.log'),
                'formatter': 'normal',
            },
        },
        'loggers': {
            '': {
                'level': 'DEBUG',
                'handlers': ['console', 'file'],
            },
        },
    }
    sentry_dsn = os.environ.get('SENTRY_DSN')
    if sentry_dsn:
        config['handlers']['sentry'] = {
            'level': 'ERROR',
            'class': 'raven.handlers.logging.SentryHandler',
            'dsn': sentry_dsn,
        }
        config['loggers']['']['handlers'].append('sentry')
    logging.config.dictConfig(config)
