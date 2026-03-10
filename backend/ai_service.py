import os
import json
import logging
from typing import List, Dict, Any
import anthropic

logger = logging.getLogger(__name__)

MODEL = "claude-haiku-4-5-20251001"
_client = None


def get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            raise ValueError("ANTHROPIC_API_KEY is not set")
        _client = anthropic.Anthropic(api_key=api_key)
    return _client


def summarize_article(title: str, snippet: str) -> Dict[str, Any]:
    """記事タイトルと冒頭テキストからAIで要約・タグを生成"""
    prompt = f"""以下の技術記事を分析してください。

タイトル: {title}

本文抜粋:
{snippet}

以下のJSON形式で回答してください（他のテキストは不要）:
{{
  "summary": "3行以内の日本語要約。技術的なポイントを簡潔に。",
  "tags": ["タグ1", "タグ2", "タグ3"]
}}

タグの候補: React, Vue, TypeScript, Python, Go, Rust, インフラ, AWS, Docker, Kubernetes, セキュリティ, AI/ML, データベース, API, フロントエンド, バックエンド, DevOps, パフォーマンス, テスト, 設計"""

    try:
        message = get_client().messages.create(
            model=MODEL,
            max_tokens=512,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text.strip()
        # JSONブロックがあれば抽出
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw)
        return {
            "summary": result.get("summary", ""),
            "tags": ",".join(result.get("tags", [])),
        }
    except Exception as e:
        logger.error(f"summarize_article failed for '{title}': {e}")
        return {"summary": "", "tags": ""}


def pick_top_articles(articles: List[Dict[str, Any]], preferred_tags: str = "") -> List[int]:
    """記事リストからおすすめ3本のインデックスを返す"""
    if not articles:
        return []

    articles_text = "\n".join(
        f"{i+1}. [{a['source']}] {a['title']}\n   要約: {a.get('summary', '')}\n   タグ: {a.get('tags', '')}"
        for i, a in enumerate(articles)
    )

    preferred_section = ""
    if preferred_tags:
        preferred_section = (
            f"\n【重要】ユーザーの好みトピック: {preferred_tags}\n"
            f"上記トピックに関連する記事が存在する場合、必ず1本以上選定に含めてください。\n"
        )

    prompt = f"""以下は今日収集した技術記事の一覧です。

{articles_text}
{preferred_section}
エンジニアにとって特に学びになる・重要性が高い記事を3本選び、その番号を回答してください。

JSON形式で回答してください（他のテキストは不要）:
{{"picks": [番号1, 番号2, 番号3]}}

選定基準（優先順）:
- 好みトピック（{preferred_tags or "指定なし"}）に関連する記事を優先
- 実用的・すぐに使える技術情報
- トレンドの技術トピック
- セキュリティや重要なアップデート情報"""

    try:
        message = get_client().messages.create(
            model=MODEL,
            max_tokens=128,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = message.content[0].text.strip()
        if "```" in raw:
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        result = json.loads(raw)
        picks = result.get("picks", [])
        # 1-indexed → 0-indexed, 範囲チェック
        return [p - 1 for p in picks if 1 <= p <= len(articles)][:3]
    except Exception as e:
        logger.error(f"pick_top_articles failed: {e}")
        # フォールバック: 先頭3件
        return list(range(min(3, len(articles))))
