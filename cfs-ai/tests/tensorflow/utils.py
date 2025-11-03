import importlib

_tf = None
_has_tf = None

_np = None
_has_np = None

def get_tf():
    global _tf, _has_tf
    if _tf is not None or _has_tf is not None:
        return _tf

    try:
        _tf = importlib.import_module("tensorflow")
        _has_tf = True
    except ImportError:
        _tf = None
        _has_tf = False
    return _tf

def has_tf() -> bool:
    if _has_tf is None:
        get_tf()
    return _has_tf


def get_np():
    global _np, _has_np
    if _np is not None or _has_np is not None:
        return _np

    try:
        _np = importlib.import_module("numpy")
        _has_np = True
    except ImportError:
        _np = None
        _has_np = False
    return _np

def has_np() -> bool:
    if _has_np is None:
        get_np()
    return _has_np