import logging
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger

logger = logging.getLogger(__name__)


def scheduled_fetch():
    """毎朝7時に実行: RSS取得 + AI処理"""
    logger.info("Scheduled fetch started")
    try:
        from routers.articles import _fetch_and_process
        result = _fetch_and_process()
        logger.info(f"Scheduled fetch completed: {result}")
    except Exception as e:
        logger.error(f"Scheduled fetch failed: {e}")


def start_scheduler():
    scheduler = BackgroundScheduler(timezone="Asia/Tokyo")
    scheduler.add_job(
        scheduled_fetch,
        trigger=CronTrigger(hour=7, minute=0),
        id="daily_fetch",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Scheduler started: daily fetch at 07:00 JST")
    return scheduler
