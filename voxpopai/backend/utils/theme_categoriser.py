"""
Collapse persona narratives into canonical civic themes.

• Step 1 — normalise text with alias replacements
• Step 2 — zero-shot classify into the fixed list of categories
• Optional Step 3 — unsupervised clustering if you need discovery

Dependencies:
    pip install pandas tqdm pyyaml transformers sentence-transformers scikit-learn matplotlib seaborn
"""

from __future__ import annotations

import re
from pathlib import Path
from typing import List

import yaml
import pandas as pd
from tqdm import tqdm
from functools import lru_cache

# ───────────────────────────────────────────
#  Config helpers
# ───────────────────────────────────────────
CONFIG_PATH = (
    Path(__file__).resolve().parent.parent.parent  # -> voxpopai/
    / "configs"
    / "config.yaml"
)


def _read_config():
    cfg = yaml.safe_load(CONFIG_PATH.read_text())
    return cfg["categories"], cfg.get("aliases", {})


CATEGORIES, ALIAS_MAP = _read_config()


# ───────────────────────────────────────────
#  Alias normalisation
# ───────────────────────────────────────────

def normalise_aliases(text: str) -> str:
    """Lower-case & replace any alias phrases with canonical wording."""
    t = text.lower()
    for k, v in ALIAS_MAP.items():
        t = re.sub(rf"\b{k}\b", v.lower(), t)
    return t


# ───────────────────────────────────────────
#  Zero-shot classification (preferred)
# ───────────────────────────────────────────

# ---------------------------------------------------------------------------
#  Global HF pipeline (cached)
# ---------------------------------------------------------------------------


@lru_cache(maxsize=1)
def _get_pipeline():
    """Return a cached zero-shot classification pipeline using a lighter model."""
    from transformers import pipeline

    return pipeline(
        "zero-shot-classification",
        model="valhalla/distilbart-mnli-12-6",
        device_map="auto",
    )


def classify_themes_zero_shot(
    df: pd.DataFrame,
    text_col: str = "narrative_response",
    model_name: str = "facebook/bart-large-mnli",
) -> pd.DataFrame:
    """Adds a `theme_category` column using a zero-shot NLI model."""

    classifier = _get_pipeline()

    def _classify(text: str) -> str:
        text_clean = normalise_aliases(text)
        res = classifier(text_clean, CATEGORIES, multi_label=False)
        return res["labels"][0]

    tqdm.pandas(desc="Theme classification")
    df_out = df.copy()
    df_out["theme_category"] = df_out[text_col].progress_apply(_classify)
    return df_out


# ───────────────────────────────────────────
#  Unsupervised clustering (optional)
# ───────────────────────────────────────────

def cluster_themes(
    df: pd.DataFrame,
    text_col: str = "narrative_response",
    n_clusters: int = 8,
    model_name: str = "sentence-transformers/all-mpnet-base-v2",
) -> pd.DataFrame:
    """Embed each text & run K-Means; result column `theme_cluster`."""

    from sentence_transformers import SentenceTransformer
    from sklearn.cluster import KMeans

    model = SentenceTransformer(model_name)
    embeds = model.encode(df[text_col].astype(str).tolist(), show_progress_bar=True)
    km = KMeans(n_clusters=n_clusters, random_state=42, n_init="auto")
    labels = km.fit_predict(embeds)

    df_out = df.copy()
    df_out["theme_cluster"] = labels
    return df_out


# ───────────────────────────────────────────
#  Quick plotting helper
# ───────────────────────────────────────────

def plot_theme_distribution(
    df: pd.DataFrame,
    col: str = "theme_category",
    top_k: int = 10,
    title: str | None = None,
    ax=None,
):
    """Draw a simple bar chart of theme counts."""

    import matplotlib.pyplot as plt
    import seaborn as sns

    counts = (
        df[col]
        .value_counts()
        .head(top_k)
        .reset_index()
        .rename(columns={col: "count", "index": col})
    )
    if ax is None:
        _, ax = plt.subplots(figsize=(8, 4))

    sns.barplot(data=counts, x=col, y="count", ax=ax)
    if title:
        ax.set_title(title)
    plt.xticks(rotation=45, ha="right")
    plt.tight_layout()
    return ax


# ───────────────────────────────────────────
#  Convenience function for theme counts only
# ───────────────────────────────────────────

def get_theme_counts(texts: List[str]) -> List[dict]:
    """Return list of {theme, count} dicts using zero-shot classifier."""

    df = pd.DataFrame({"narrative_response": texts})
    df = classify_themes_zero_shot(df)
    counts = (
        df["theme_category"].value_counts().reset_index().rename(
            columns={"index": "theme", "theme_category": "count"}
        )
    )
    return counts.to_dict(orient="records")


# ───────────────────────────────────────────
#  Lightweight keyword-based fallback
# ───────────────────────────────────────────

def derive_theme_simple(text: str) -> str | None:
    """Return first canonical category whose keyword appears in text."""
    t = normalise_aliases(text)
    for cat in CATEGORIES:
        phrase = cat.lower().replace("_", " ")
        if phrase in t:
            return cat
    return None


# ---------------------------------------------------------------------------
#  Multi-label helper (returns list[str])
# ---------------------------------------------------------------------------

def classify_multi(texts: list[str], top_k: int = 2, thresh: float = 0.3) -> list[list[str]]:
    """Return up to `top_k` labels per text above confidence `thresh`."""

    clf = _get_pipeline()

    outputs = clf(texts, CATEGORIES, multi_label=True, batch_size=8)
    all_labels: list[list[str]] = []
    for res in outputs:
        labels = [l for l, s in zip(res["labels"], res["scores"]) if s >= thresh][:top_k]
        all_labels.append(labels or ["Uncategorised"])
    return all_labels 