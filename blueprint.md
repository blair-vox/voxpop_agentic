# VoxPopAI – Synthetic Focus Group MVP Blueprint

## 🧭 Overview

This blueprint defines the complete structure for building a web-based application that simulates synthetic focus groups made of AI-generated personas derived from real Australian Census and electoral data. Users will be able to:

* Generate personas grounded in ABS demographics
* Post-stratify/rake to match official marginals
* Run surveys and collect simulated persona responses
* Receive rich narrative summaries with sentiment analysis
* Interact with individual personas for qualitative insights

All backed by structured AI agents and deployed via AWS, with a modular, scalable architecture.

---

## 🔍 Features (MVP Scope)

### Core

* User registration/login (Cognito)
* Area-based persona creation (SA2/SA3/LGA)
* Custom or template-based survey builder
* Focus group simulator with chain-of-thought response
* Downloadable report (PDF/CSV)

### Built-in Enhancements

1. **Post-stratification weighting** to match ABS marginals
2. **Preset survey templates** for common civic topics
3. **Explainability flags** (rationale with each answer)
4. **PII-free telemetry logging** to Snowflake or Redshift
5. **Large-scale focus group distribution analysis**
6. **Interactive persona-level chat interface**

---

## 🧱 Architecture

### High-Level Components

```
User ⇄ React UI (Next.js) ⇄ FastAPI Gateway ⇄ Step Functions ⇄ Agents ⇄ Data (S3, DynamoDB, OpenSearch)
```

### Key Modules

* **Frontend**: React (shadcn/ui), Next.js 14
* **Backend**: FastAPI + LangChain agents
* **LLMs**: OpenAI GPT-4o, 3.5-Turbo-16k
* **Workflow Engine**: AWS Step Functions
* **Data Storage**: S3 (JSON/parquet), DynamoDB (metadata), OpenSearch (semantic clustering)
* **Auth**: AWS Cognito
* **PDF Generation**: WeasyPrint in Lambda layer
* **Analytics**: EventBridge → Lambda → Redshift/Snowflake

---

## 👥 Agents

| Agent              | Role                                             | Input                     | Output                            |
| ------------------ | ------------------------------------------------ | ------------------------- | --------------------------------- |
| Persona-Builder    | Generates n synthetic residents based on filters | Demographic filters       | Persona list                      |
| PostStrat-Adjuster | Weights/rakes personas to match ABS marginals    | Persona list              | Weighted list or regenerated list |
| Data-Augmentor     | Adds local issues to each persona                | Persona list              | Enriched personas                 |
| Survey-Composer    | Builds or reformats surveys                      | User input or template ID | Survey JSON                       |
| Response-Simulator | Persona answers survey questions with reasons    | Persona + survey          | Responses with rationale          |
| Sentiment-Analyzer | Scores each response                             | Responses                 | Sentiment JSON                    |
| Formatter          | Assembles PDF report with clustering             | All outputs               | Markdown + CSV                    |
| Persona-Chat       | Chat agent for deep-dive with one persona        | Persona + history         | Text response                     |
| Audit-Logger       | Records logs to DynamoDB/Redshift                | All agent events          | Acknowledgment                    |

---

## ⚙️ Workflow

1. **User signs in**
2. **User configures persona criteria** (mandatory + optional filters)
3. **Personas are built, raked, and enriched**
4. **Survey is created or chosen from preset templates**
5. **Each persona answers** with rationale and sentiment
6. **Report is generated**: executive summary, clusters, raw data
7. **User downloads report** or chats with a specific persona

---

## 📁 Folder Structure

```text
voxpopai/
├── README.md
├── data/
│   └── surveys/templates.yaml
├── backend/
│   ├── app.py
│   ├── routers/
│   │   └── personas.py, surveys.py, runs.py
│   ├── agents/
│   │   ├── persona_builder.py
│   │   ├── poststrat_adjuster.py
│   │   ├── data_augmentor.py
│   │   ├── survey_composer.py
│   │   ├── response_simulator.py
│   │   ├── sentiment_analyzer.py
│   │   ├── formatter.py
│   │   └── persona_chat.py
│   ├── utils/
│   │   └── raker.py
│   ├── orchestrator/state_machine.asl.json
│   └── tests/
├── frontend/
│   ├── next.config.mjs
│   └── src/pages/
│       └── index.tsx, login.tsx, run/[id].tsx
├── infra/
│   └── telemetry/redshift_logger.tf
└── scripts/load_abs.py
```

---

## 🪜 Build Steps (Estimated: \~35 days @ 5 hrs/day)

### Phase 1 – Setup (3 days)

* Git + CI/CD + Pre-commit hooks
* AWS CDK/Terraform stack
* Local dev + Secrets setup

### Phase 2 – Data & Backend (8 days)

* ABS/AEC data ETL → S3
* FastAPI with CRUD + Cognito auth
* Persona-Builder + PostStrat + Raker
* DynamoDB + S3 run tracker

### Phase 3 – Agents (7 days)

* Implement all agents with test data
* LangChain + Step Fn wiring
* Prompt templating + fallback handling

### Phase 4 – Frontend (8 days)

* Auth + routing
* Persona form UI
* Survey builder (custom & template)
* Report viewer + download + chat pane

### Phase 5 – QA & Launch (5 days)

* Unit + E2E tests
* PDF formatting polish
* Load testing
* Redshift logging pipeline
* Final security/IAM sweep

---

