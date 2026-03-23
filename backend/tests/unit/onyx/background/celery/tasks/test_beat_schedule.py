import importlib

from onyx.background.celery.tasks import beat_schedule


def test_cloud_beat_multiplier_default_reads_env(
    monkeypatch,
) -> None:
    monkeypatch.setenv("CLOUD_BEAT_MULTIPLIER_DEFAULT", "1.0")

    try:
        reloaded_module = importlib.reload(beat_schedule)
        assert reloaded_module.CLOUD_BEAT_MULTIPLIER_DEFAULT == 1.0
    finally:
        monkeypatch.delenv("CLOUD_BEAT_MULTIPLIER_DEFAULT", raising=False)
        importlib.reload(beat_schedule)


def test_cloud_beat_multiplier_default_falls_back_on_invalid_env(
    monkeypatch,
) -> None:
    monkeypatch.setenv("CLOUD_BEAT_MULTIPLIER_DEFAULT", "not-a-float")

    try:
        reloaded_module = importlib.reload(beat_schedule)
        assert reloaded_module.CLOUD_BEAT_MULTIPLIER_DEFAULT == 8.0
    finally:
        monkeypatch.delenv("CLOUD_BEAT_MULTIPLIER_DEFAULT", raising=False)
        importlib.reload(beat_schedule)
