"""
Custom logging handlers based on logging module.
"""
import logging
import logging.handlers
import os
import errno


def mk_log_folder_handler(folder, filename, logging_class, **kwargs):
    """Creates a folder for a logfile if it doesn't exists"""
    try:
        os.makedirs(folder)
    except OSError as e:
        if e.errno == errno.EEXIST and os.path.isdir(folder):
            pass
        else:
            raise
    if logging_class.startswith('logging.'):
        handler = eval(logging_class)
    else:
        raise ValueError('Invalid logging handler')
    return handler(filename, **kwargs)
