# GitHub Issue Specifications

Markdown copies of every GitHub issue. Each file has the same content as its GitHub issue (the `issue-meta` comment at the top holds title, labels and milestone and is not part of the issue body). When an issue changes on GitHub, update its file in the same PR (or vice versa).

Issue IDs like `M3-04` are used for prerequisites so they stay valid regardless of GitHub issue numbers. M0 issues predate this convention and are referenced by number (#1–#8).

Milestone summaries: [milestones.md](milestones.md).

## M0 – Project Foundation (8)

| Spec | Title | Labels |
|---|---|---|
| [001](001-create-repository-and-structure.md) | [M0] Create project repository and initialize monorepo structure | documentation, architecture, devops, good-first-issue |
| [002](002-project-overview-documentation.md) | [M0] Prepare project overview, scope and requirements documentation | documentation, good-first-issue |
| [003](003-high-level-architecture-documentation.md) | [M0] Prepare high-level and low-level architecture documentation | documentation, architecture |
| [004](004-initial-database-erd.md) | [M0] Prepare initial database ERD and reference schema | documentation, database, architecture |
| [005](005-api-contract-documentation.md) | [M0] Prepare REST API contract documentation (v1) | documentation, backend, architecture |
| [006](006-github-project-board-and-labels.md) | [M0] Configure GitHub Project board, milestones and labels | devops, documentation |
| [007](007-git-branching-and-pr-standards.md) | [M0] Define Git branching strategy and pull request standards | devops, documentation, security |
| [008](008-codex-contribution-guidelines.md) | [M0] Prepare Codex / AI assistant contribution guidelines (AGENTS.md) | documentation, good-first-issue |

## M1 – Backend Foundation (11)

| Spec | Title | Labels |
|---|---|---|
| [101](101-scaffold-the-fastapi-backend-project.md) | [M1-01] Scaffold the FastAPI backend project | backend, good-first-issue |
| [102](102-configure-application-settings-and-environment-variables.md) | [M1-02] Configure application settings and environment variables | backend, security |
| [103](103-set-up-structured-logging-and-request-id-middleware.md) | [M1-03] Set up structured logging and request ID middleware | backend |
| [104](104-configure-sqlalchemy-engine-session-and-database-dependency.md) | [M1-04] Configure SQLAlchemy engine, session and database dependency | backend, database |
| [105](105-create-sqlalchemy-models-for-customers-products-orders-and-o.md) | [M1-05] Create SQLAlchemy models for customers, products, orders and order items | backend, database |
| [106](106-configure-alembic-and-create-the-initial-database-migration.md) | [M1-06] Configure Alembic and create the initial database migration | backend, database |
| [107](107-seed-the-initial-product-catalogue.md) | [M1-07] Seed the initial product catalogue | backend, database, good-first-issue |
| [108](108-implement-the-standard-error-response-format-and-exception-h.md) | [M1-08] Implement the standard error response format and exception handlers | backend |
| [109](109-implement-get-api-v1-health-with-a-database-check.md) | [M1-09] Implement GET /api/v1/health with a database check | backend, good-first-issue |
| [110](110-implement-product-list-and-product-details-endpoints.md) | [M1-10] Implement product list and product details endpoints | backend |
| [111](111-set-up-pytest-with-a-test-database-and-ci-ready-fixtures.md) | [M1-11] Set up pytest with a test database and CI-ready fixtures | backend, testing |

## M2 – Frontend Foundation (14)

| Spec | Title | Labels |
|---|---|---|
| [201](201-scaffold-the-react-vite-typescript-frontend.md) | [M2-01] Scaffold the React + Vite + TypeScript frontend | frontend, good-first-issue |
| [202](202-configure-tailwind-css-shadcn-ui-and-the-manrope-design-toke.md) | [M2-02] Configure Tailwind CSS, shadcn/ui and the Manrope design tokens | frontend |
| [203](203-define-typescript-types-and-mock-json-data-from-the-api-cont.md) | [M2-03] Define TypeScript types and mock JSON data from the API contract | frontend |
| [204](204-set-up-routing-with-customer-and-admin-layouts.md) | [M2-04] Set up routing with customer and admin layouts | frontend |
| [205](205-build-the-productcard-component-and-customer-home-page.md) | [M2-05] Build the ProductCard component and customer home page | frontend |
| [206](206-build-the-product-details-page-with-a-quantity-selector.md) | [M2-06] Build the product details page with a quantity selector | frontend |
| [207](207-implement-cart-state-with-localstorage-persistence.md) | [M2-07] Implement cart state with localStorage persistence | frontend |
| [208](208-build-the-shopping-cart-page.md) | [M2-08] Build the shopping cart page | frontend |
| [209](209-build-the-checkout-and-order-confirmation-pages-mock-submit.md) | [M2-09] Build the checkout and order confirmation pages (mock submit) | frontend |
| [210](210-build-the-customer-order-history-page.md) | [M2-10] Build the customer order history page | frontend |
| [211](211-build-the-admin-dashboard-page.md) | [M2-11] Build the admin dashboard page | frontend |
| [212](212-build-the-admin-order-management-and-products-pages.md) | [M2-12] Build the admin order management and products pages | frontend |
| [213](213-add-loading-empty-and-error-states-to-every-screen.md) | [M2-13] Add loading, empty and error states to every screen | frontend |
| [214](214-design-review-and-approval-of-all-m2-screens.md) | [M2-14] Design review and approval of all M2 screens | frontend, documentation |

## M3 – Order Management (12)

| Spec | Title | Labels |
|---|---|---|
| [301](301-define-order-request-and-response-schemas-with-validation.md) | [M3-01] Define order request and response schemas with validation | backend |
| [302](302-implement-customer-and-order-repositories.md) | [M3-02] Implement customer and order repositories | backend, database |
| [303](303-implement-order-creation-service-with-database-price-totals-.md) | [M3-03] Implement order creation service with database-price totals in one transaction | backend, database |
| [304](304-implement-post-api-v1-orders.md) | [M3-04] Implement POST /api/v1/orders | backend |
| [305](305-implement-order-details-and-customer-order-history-endpoints.md) | [M3-05] Implement order details and customer order history endpoints | backend |
| [306](306-implement-order-status-transition-rules.md) | [M3-06] Implement order status transition rules | backend |
| [307](307-implement-admin-order-list-and-status-update-endpoints.md) | [M3-07] Implement admin order list and status update endpoints | backend |
| [308](308-configure-cors-and-build-the-frontend-api-client.md) | [M3-08] Configure CORS and build the frontend API client | backend, frontend, security |
| [309](309-connect-product-pages-to-the-real-api.md) | [M3-09] Connect product pages to the real API | frontend |
| [310](310-connect-checkout-confirmation-and-order-history-to-the-real-.md) | [M3-10] Connect checkout, confirmation and order history to the real API | frontend |
| [311](311-connect-admin-dashboard-and-order-management-to-the-real-api.md) | [M3-11] Connect admin dashboard and order management to the real API | frontend |
| [312](312-end-to-end-walkthrough-of-the-customer-and-admin-flows.md) | [M3-12] End-to-end walkthrough of the customer and admin flows | testing, documentation |

## M4 – Testing and Quality (10)

| Spec | Title | Labels |
|---|---|---|
| [401](401-complete-backend-unit-tests-for-business-rules.md) | [M4-01] Complete backend unit tests for business rules | backend, testing |
| [402](402-complete-backend-api-tests-for-every-documented-response.md) | [M4-02] Complete backend API tests for every documented response | backend, testing |
| [403](403-add-database-constraint-and-migration-tests.md) | [M4-03] Add database constraint and migration tests | backend, database, testing |
| [404](404-configure-vitest-and-react-testing-library.md) | [M4-04] Configure Vitest and React Testing Library | frontend, testing |
| [405](405-write-frontend-tests-for-cart-logic-and-key-components.md) | [M4-05] Write frontend tests for cart logic and key components | frontend, testing |
| [406](406-configure-ruff-linting-and-formatting-for-the-backend.md) | [M4-06] Configure Ruff linting and formatting for the backend | backend, testing |
| [407](407-configure-eslint-prettier-and-type-checking-for-the-frontend.md) | [M4-07] Configure ESLint, Prettier and type checking for the frontend | frontend, testing |
| [408](408-measure-and-enforce-backend-test-coverage.md) | [M4-08] Measure and enforce backend test coverage | backend, testing |
| [409](409-create-the-manual-smoke-test-checklist.md) | [M4-09] Create the manual smoke test checklist | testing, documentation |
| [410](410-run-accessibility-and-lighthouse-review.md) | [M4-10] Run accessibility and Lighthouse review | frontend, testing |

## M5 – Docker and CI (8)

| Spec | Title | Labels |
|---|---|---|
| [501](501-create-the-backend-dockerfile.md) | [M5-01] Create the backend Dockerfile | devops, backend |
| [502](502-create-the-frontend-dockerfile-with-nginx.md) | [M5-02] Create the frontend Dockerfile with nginx | devops, frontend |
| [503](503-complete-the-docker-compose-stack.md) | [M5-03] Complete the Docker Compose stack | devops |
| [504](504-document-configuration-with-env-example-files.md) | [M5-04] Document configuration with .env.example files | devops, documentation, security |
| [505](505-create-the-backend-ci-workflow-in-github-actions.md) | [M5-05] Create the backend CI workflow in GitHub Actions | devops, backend, testing |
| [506](506-add-frontend-and-docker-build-jobs-to-ci.md) | [M5-06] Add frontend and Docker build jobs to CI | devops, frontend, testing |
| [507](507-enable-required-status-checks-on-main-and-develop.md) | [M5-07] Enable required status checks on main and develop | devops, security |
| [508](508-tag-the-first-release-after-docker-and-ci.md) | [M5-08] Tag the first release after Docker and CI | devops, documentation |

## M6 – GCP Deployment (11)

| Spec | Title | Labels |
|---|---|---|
| [601](601-create-the-gcp-project-budget-alert-and-enable-required-apis.md) | [M6-01] Create the GCP project, budget alert and enable required APIs | devops |
| [602](602-create-the-artifact-registry-repository.md) | [M6-02] Create the Artifact Registry repository | devops |
| [603](603-provision-cloud-sql-for-postgresql.md) | [M6-03] Provision Cloud SQL for PostgreSQL | devops, database |
| [604](604-store-database-credentials-in-secret-manager.md) | [M6-04] Store database credentials in Secret Manager | devops, security |
| [605](605-create-service-accounts-with-least-privilege-iam.md) | [M6-05] Create service accounts with least-privilege IAM | devops, security |
| [606](606-configure-workload-identity-federation-for-github-actions.md) | [M6-06] Configure Workload Identity Federation for GitHub Actions | devops, security |
| [607](607-deploy-the-backend-to-cloud-run-and-run-migrations.md) | [M6-07] Deploy the backend to Cloud Run and run migrations | devops, backend |
| [608](608-deploy-the-frontend-to-cloud-run.md) | [M6-08] Deploy the frontend to Cloud Run | devops, frontend |
| [609](609-automate-deployment-with-a-github-actions-workflow-and-produ.md) | [M6-09] Automate deployment with a GitHub Actions workflow and production approval | devops, security |
| [610](610-configure-cloud-logging-error-alerting-and-basic-monitoring.md) | [M6-10] Configure Cloud Logging, error alerting and basic monitoring | devops |
| [611](611-production-smoke-test-and-rollback-drill.md) | [M6-11] Production smoke test and rollback drill | devops, testing |

## M7 – Final Demonstration (8)

| Spec | Title | Labels |
|---|---|---|
| [701](701-prepare-the-demo-script-and-demo-data.md) | [M7-01] Prepare the demo script and demo data | documentation |
| [702](702-final-documentation-review-and-update.md) | [M7-02] Final documentation review and update | documentation |
| [703](703-record-a-demo-walkthrough-video.md) | [M7-03] Record a demo walkthrough video | documentation |
| [704](704-run-the-live-final-demonstration.md) | [M7-04] Run the live final demonstration | documentation |
| [705](705-hold-the-project-retrospective.md) | [M7-05] Hold the project retrospective | documentation |
| [706](706-write-individual-learning-reflections.md) | [M7-06] Write individual learning reflections | documentation, good-first-issue |
| [707](707-create-the-future-feature-backlog.md) | [M7-07] Create the future feature backlog | epic, documentation |
| [708](708-decide-and-execute-the-gcp-clean-up-or-continuation-plan.md) | [M7-08] Decide and execute the GCP clean-up or continuation plan | devops |
