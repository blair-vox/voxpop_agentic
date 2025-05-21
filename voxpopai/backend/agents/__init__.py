"""Agent package exports."""

from importlib import import_module

__all__ = [
    "persona_builder",
    "poststrat_adjuster",
    "data_augmentor",
    "survey_composer",
    "response_simulator",
    "sentiment_analyzer",
    "formatter",
    "persona_chat",
    "audit_logger",
]

# Lazily import modules when accessed via attribute (optional)


def __getattr__(name):
    if name in __all__:
        return import_module(f"{__name__}.{name}")
    raise AttributeError(name) 