
# VoxPopAI – Primary Theme Pipeline Troubleshooting & Fix Guide

This document collates **all fixes and code snippets** discussed for improving the
“Primary Theme” classification pipeline.

---

## 1  Root‑Cause Summary

| Step | Issue Found |
|------|-------------|
| 1. Narrative extraction | “SURVEY:” section still leaked key words (“Transport”) → single‑theme bias |
| 2. Zero‑shot classifier | `facebook/bart-large-mnli` heavy; silent fallback to keyword matcher when OOM |
| 3. Single‑label output | Real answers often span multiple policy domains |
| 4. Alias list too short | Phrases like “traffic”, “cycleway” not caught |
| 5. Latency & RAM | ~2 GB memory, cold‑start delay |

---

## 2  Quick‑Win Fixes (PoC‑ready)

1. **Stricter narrative strip**  
   ```python
   body = re.split(r"(?i)^\s*SURVEY:", text)[0]
   ```

2. **Inject Key Concerns** into classification text  
   ```python
   text_for_clf = f"{narrative}\nKey concerns: {', '.join(key_concerns)}"
   ```

3. **Multi‑label NLI** (keep top‑2 ≥ 0.30)  
   ```python
   res = classifier(t, CATEGORIES, multi_label=True)
   labels = [l for l,s in zip(res["labels"],res["scores"]) if s>=0.30][:2]
   ```

4. **Swap to `valhalla/distilbart-mnli-12-6`**  
   ~420 MB vs 1 GB, same API.

5. **Cache HF pipeline** at module scope to avoid reload.

6. **Expand `aliases:` YAML**  
   ```yaml
   aliases:
     parking: Transport
     traffic: Transport
     cycleway: Transport
     rent: Housing_Affordability
   ```

---

## 3  Code Snippet – Multi‑label Classifier Helper

```python
from transformers import pipeline
from voxpopai.backend.utils.theme_categoriser import CATEGORIES, normalise_aliases

_classifier = pipeline(
    "zero-shot-classification",
    model="valhalla/distilbart-mnli-12-6",
    device_map="auto"
)

def classify_multi(texts, top_k=2, thresh=0.30):
    out = []
    for res in _classifier(texts, CATEGORIES, multi_label=True, batch_size=8):
        labs = [l for l,s in zip(res["labels"],res["scores"]) if s>=thresh][:top_k]
        out.append(labs or ["Uncategorised"])
    return out
```

---

## 4  Longer‑Term Upgrades (MVP)

| Need | Recommendation |
|------|----------------|
| Faster inference | ONNX‑quantised mnli model (~2× faster CPU) |
| Better recall | Fine‑tune small model (Phi‑3) on ~200 labelled responses |
| Accuracy metric | Log “classifier_confidence” and review weekly |
| Theme hierarchy | Allow sub‑themes (e.g. Transport > Cycling) using embeddings + HDBSCAN |

---

## 5  Integration Checklist

- [ ] Replace single‑label call with `classify_multi` in `routers/personas.py`
- [ ] Update frontend to display `themes: List[str]`
- [ ] Add error banner when `theme=="ERROR_MODEL_LOAD"`
- [ ] Update YAML alias list periodically

---

**End of file – ready to import into project docs or task board.**
