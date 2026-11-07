# 01 – Project Overview

## What are we building?

A small web application for a **local dairy business**:

- **Customers** browse milk products, choose quantities, add them to a cart, place an order, see a confirmation and view previous orders.
- **An administrator** sees a dashboard, views all orders and their details, updates order status and views the product list.

## Why are we building it?

This project has two goals, in this order:

1. **Learning.** Give every participant hands-on experience of the full software development lifecycle: requirements, architecture, coding, testing, code review, CI/CD, cloud deployment and monitoring, using AI coding assistants responsibly.
2. **A working proof of concept (POC).** A small, functional app that a dairy owner could understand and try.

It is deliberately **not** a full commercial milk-delivery marketplace.

## Business scenario

A neighbourhood dairy currently takes orders by phone. Orders get lost, totals are calculated by hand and the owner cannot easily see what needs to be delivered today. An online ordering page with a simple admin view solves the core problem.

## Users

| User | Goal |
|---|---|
| Customer | Order milk quickly and check past orders |
| Administrator (dairy owner/staff) | See incoming orders and track them to delivery |

## Product catalogue (initial)

| Product | Size | Price (₹) |
|---|---|---|
| Cow Milk | 500 ml | 30 |
| Cow Milk | 1 Litre | 60 |
| Buffalo Milk | 500 ml | 35 |
| Buffalo Milk | 1 Litre | 70 |

## Technology summary

React + Vite + TypeScript + Tailwind + shadcn/ui on the frontend, FastAPI + SQLAlchemy + Alembic on the backend, PostgreSQL for data, Docker and GitHub Actions for delivery, and GCP Cloud Run + Cloud SQL for hosting. Details: [`04-architecture/high-level-design.md`](04-architecture/high-level-design.md).

## Learning outcomes

By the end of M7 each participant should be able to:

- Read an issue and turn it into a plan.
- Explain how a browser request travels through React → FastAPI → PostgreSQL and back.
- Design a REST endpoint and a normalized table.
- Use Git branches, pull requests and code review.
- Use an AI assistant to speed up work **and** explain what it produced.
- Write automated tests and understand CI.
- Containerize an app and deploy it to Cloud Run.
- Read production logs.

## Milestones

| ID | Milestone | Outcome |
|---|---|---|
| M0 | Project Foundation | Repo, docs, standards, board, M0 issues |
| M1 | Backend Foundation | FastAPI skeleton, config, DB connection, models, migrations, seed, health and product APIs |
| M2 | Frontend Foundation | Vite app, design system, all 7 screens using mock JSON |
| M3 | Order Management | Order APIs, admin APIs, real frontend ↔ backend integration |
| M4 | Testing and Quality | Backend/API tests, frontend tests, linting, coverage |
| M5 | Docker and CI | Dockerfiles, Compose stack, GitHub Actions CI |
| M6 | GCP Deployment | Artifact Registry, Cloud SQL, Cloud Run, Secret Manager, Cloud Logging |
| M7 | Final Demonstration | End-to-end demo, retrospective, learning reflection |

## How we work

**Understand → Research → Plan → Implement → Test → Pull Request → Code Review → Merge.** See [`../CONTRIBUTING.md`](../CONTRIBUTING.md).

## Glossary

| Term | Meaning |
|---|---|
| POC | Proof of concept – the smallest build that proves the idea works |
| REST API | HTTP endpoints that exchange JSON |
| ORM | Object-Relational Mapper (SQLAlchemy) – Python classes that map to tables |
| Migration | A versioned script that changes the database schema (Alembic) |
| CI | Continuous Integration – automatic tests on every PR |
| Modular monolith | One deployable app, internally split into clear modules |
