#!/usr/bin/env python3
"""
Bootstrap GitHub project-management resources for milk-delivery-poc.

Idempotent: safe to run more than once. It only CREATES missing resources and
never deletes or overwrites existing ones (labels and milestones that already
exist are left unchanged; issues with the same title are not duplicated).

Requires: GitHub CLI (`gh`) authenticated with `repo` and `project` scopes.
    gh auth login --scopes repo,project

Usage:
    python scripts/bootstrap_github.py OWNER/REPO [--project-number N] [--skip-project] [--skip-protection]

    --project-number N   use your existing GitHub Project number N (from its URL,
                         e.g. github.com/users/OWNER/projects/5 -> 5)
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ISSUE_DIR = ROOT / "docs" / "github-issues"

LABELS = [
    ("epic", "3E1F8C", "Large body of work spanning several issues"),
    ("feature", "1D76DB", "New user-facing capability"),
    ("backend", "0E8A16", "FastAPI / Python backend"),
    ("frontend", "5319E7", "React / TypeScript frontend"),
    ("database", "006B75", "PostgreSQL, SQLAlchemy, Alembic"),
    ("devops", "F9D0C4", "Docker, CI/CD, GCP, GitHub configuration"),
    ("testing", "FBCA04", "Automated or manual testing"),
    ("documentation", "0075CA", "Documentation changes"),
    ("architecture", "C5DEF5", "Architecture and design decisions"),
    ("bug", "D73A4A", "Something isn't working"),
    ("security", "B60205", "Security-related work"),
    ("good-first-issue", "7057FF", "Suitable for a first contribution"),
    ("blocked", "000000", "Waiting on something else"),
]

MILESTONES = [
    ("M0 – Project Foundation", "Repository, documentation, architecture, API contract, ERD, GitHub board, labels, Git and AI-assistant standards. No application code."),
    ("M1 – Backend Foundation", "FastAPI scaffold, settings, DB session, SQLAlchemy models, Alembic migration, seed data, health and product endpoints, first tests."),
    ("M2 – Frontend Foundation", "Vite + React + TS scaffold, Tailwind + shadcn/ui, design tokens, routing, all 7 screens with mock JSON, cart state. Ends with design approval."),
    ("M3 – Order Management", "Order APIs with server-side totals and transactions, order history, admin order list and status updates, frontend-backend integration."),
    ("M4 – Testing and Quality", "Backend unit/API/DB tests, frontend tests, linting, coverage gate, smoke checklist, accessibility check."),
    ("M5 – Docker and CI", "Dockerfiles, full Docker Compose stack, GitHub Actions CI, required status checks."),
    ("M6 – GCP Deployment", "Artifact Registry, Cloud SQL, Secret Manager, Cloud Run, Workload Identity Federation, approved deploys, Cloud Logging."),
    ("M7 – Final Demonstration", "End-to-end demo, documentation review, retrospective, learning reflections, future backlog."),
]

BOARD_STATUSES = ["Backlog", "Ready", "In Progress", "In Review", "Testing", "Done"]


def gh(*args: str, input_json: dict | None = None, check: bool = True) -> subprocess.CompletedProcess:
    cmd = ["gh", *args]
    if input_json is not None:
        cmd += ["--input", "-"]
    return subprocess.run(
        cmd,
        input=json.dumps(input_json) if input_json is not None else None,
        capture_output=True,
        text=True,
        check=check,
    )


def api(method: str, path: str, body: dict | None = None, check: bool = True):
    r = gh("api", "-X", method, path, "-H", "Accept: application/vnd.github+json", input_json=body, check=check)
    return json.loads(r.stdout) if r.stdout.strip() else None


def paginate(path: str) -> list:
    r = gh("api", "--paginate", path)
    out: list = []
    for chunk in re.split(r"(?<=\])\s*(?=\[)", r.stdout.strip()):
        if chunk:
            out.extend(json.loads(chunk))
    return out


def ensure_labels(repo: str) -> None:
    existing = {l["name"] for l in paginate(f"repos/{repo}/labels?per_page=100")}
    for name, color, desc in LABELS:
        if name in existing:
            print(f"  label exists   {name}")
            continue
        api("POST", f"repos/{repo}/labels", {"name": name, "color": color, "description": desc})
        print(f"  label created  {name}")


def ensure_milestones(repo: str) -> dict[str, int]:
    existing = {m["title"]: m["number"] for m in paginate(f"repos/{repo}/milestones?state=all&per_page=100")}
    for title, desc in MILESTONES:
        if title in existing:
            print(f"  milestone exists   {title} (#{existing[title]})")
            continue
        m = api("POST", f"repos/{repo}/milestones", {"title": title, "description": desc})
        existing[title] = m["number"]
        print(f"  milestone created  {title} (#{m['number']})")
    return existing


def parse_spec(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    meta_match = re.match(r"<!-- issue-meta\n(.*?)\n-->\n", text, re.S)
    if not meta_match:
        raise ValueError(f"{path.name}: missing issue-meta block")
    meta = dict(line.split(": ", 1) for line in meta_match.group(1).splitlines())
    body = text[meta_match.end():]
    body = re.sub(r"^# .*\n+", "", body, count=1)  # title is the issue title
    body += f"\n\n---\n_Source: `docs/github-issues/{path.name}`_\n"
    return {
        "title": meta["title"].strip(),
        "labels": [l.strip() for l in meta["labels"].split(",")],
        "milestone": meta["milestone"].strip(),
        "body": body,
    }


def ensure_issues(repo: str, milestones: dict[str, int]) -> list[dict]:
    existing = {i["title"]: i for i in paginate(f"repos/{repo}/issues?state=all&per_page=100") if "pull_request" not in i}
    created = []
    for spec_path in sorted(ISSUE_DIR.glob("[0-9][0-9][0-9]-*.md")):
        spec = parse_spec(spec_path)
        if spec["title"] in existing:
            i = existing[spec["title"]]
            print(f"  issue exists   #{i['number']} {spec['title']}")
        else:
            i = api("POST", f"repos/{repo}/issues", {
                "title": spec["title"],
                "body": spec["body"],
                "labels": spec["labels"],
                "milestone": milestones[spec["milestone"]],
            })
            print(f"  issue created  #{i['number']} {spec['title']}")
            time.sleep(1.5)  # stay well under GitHub's content-creation rate limit
        created.append({"number": i["number"], "title": spec["title"], "url": i["html_url"], "node_id": i["node_id"], "spec": spec_path.name})
    return created


def ensure_branch(repo: str, branch: str, from_branch: str = "main") -> None:
    r = gh("api", f"repos/{repo}/branches/{branch}", check=False)
    if r.returncode == 0:
        print(f"  branch exists   {branch}")
        return
    sha = api("GET", f"repos/{repo}/git/ref/heads/{from_branch}")["object"]["sha"]
    api("POST", f"repos/{repo}/git/refs", {"ref": f"refs/heads/{branch}", "sha": sha})
    print(f"  branch created  {branch} from {from_branch}")


def protect(repo: str, branch: str) -> str:
    body = {
        "required_status_checks": None,  # added in M5 once CI exists
        "enforce_admins": False,          # admins can fix mistakes in emergencies
        "required_pull_request_reviews": {
            "required_approving_review_count": 1,
            "dismiss_stale_reviews": True,
            "require_code_owner_reviews": False,
        },
        "restrictions": None,
        "allow_force_pushes": False,
        "allow_deletions": False,
        "required_conversation_resolution": True,
    }
    r = gh("api", "-X", "PUT", f"repos/{repo}/branches/{branch}/protection",
           "-H", "Accept: application/vnd.github+json", input_json=body, check=False)
    if r.returncode == 0:
        return "enabled"
    return "FAILED: " + (r.stdout or r.stderr).strip().replace("\n", " ")[:300]


def ensure_project(owner: str, repo: str, issues: list[dict], number: str | None = None) -> str:
    """Projects v2 need the GraphQL API (via `gh project`).
    With `number`, the existing project with that number is used instead of creating one."""
    title = "Milk Delivery POC"
    r = gh("project", "list", "--owner", owner, "--format", "json", "--limit", "100", check=False)
    if r.returncode != 0:
        return "FAILED: " + r.stderr.strip()[:300]
    projects = json.loads(r.stdout).get("projects", [])
    if number:
        proj = next((p for p in projects if str(p["number"]) == number), None)
        if not proj:
            return f"FAILED: project #{number} not found for {owner}"
    else:
        proj = next((p for p in projects if p["title"] == title), None)
    if not proj:
        proj = json.loads(gh("project", "create", "--owner", owner, "--title", title, "--format", "json").stdout)
        print(f"  project created  {proj['url']}")
    else:
        print(f"  project exists   {proj['url']}")
    num = str(proj["number"])
    gh("project", "link", num, "--owner", owner, "--repo", repo, check=False)

    # Replace default Status options with our six statuses (only if they differ).
    fields = json.loads(gh("project", "field-list", num, "--owner", owner, "--format", "json").stdout)["fields"]
    status = next(f for f in fields if f["name"] == "Status")
    current = [o["name"] for o in status.get("options", [])]
    if current != BOARD_STATUSES:
        opts = ",".join(
            '{name:"%s",color:%s,description:""}' % (s, c)
            for s, c in zip(BOARD_STATUSES, ["GRAY", "BLUE", "YELLOW", "ORANGE", "PURPLE", "GREEN"])
        )
        q = 'mutation{updateProjectV2Field(input:{fieldId:"%s",singleSelectOptions:[%s]}){projectV2Field{... on ProjectV2SingleSelectField{id}}}}' % (status["id"], opts)
        r = gh("api", "graphql", "-f", f"query={q}", check=False)
        if r.returncode == 0:
            print(f"  status options set {BOARD_STATUSES}")
        else:
            print("  WARNING: could not set Status options automatically; set them in the project UI:", BOARD_STATUSES)
            print("  ", (r.stderr or r.stdout).strip()[:300])

    for i in issues:
        gh("project", "item-add", num, "--owner", owner, "--url", i["url"], check=False)
    print(f"  {len(issues)} issues added to project")
    return proj["url"]


def main() -> None:
    if len(sys.argv) < 2 or "/" not in sys.argv[1]:
        print(__doc__)
        sys.exit(1)
    repo = sys.argv[1]
    owner = repo.split("/")[0]
    skip_project = "--skip-project" in sys.argv
    skip_protection = "--skip-protection" in sys.argv

    print("Labels:");      ensure_labels(repo)
    print("Milestones:");  ms = ensure_milestones(repo)
    print("Issues:");      issues = ensure_issues(repo, ms)
    print("Branches:");    ensure_branch(repo, "develop")
    # develop is the default branch so new PRs target it automatically.
    api("PATCH", f"repos/{repo}", {"default_branch": "develop", "delete_branch_on_merge": True, "allow_squash_merge": True})
    print("  default branch set to develop; auto-delete merged branches enabled")

    protection = {}
    if not skip_protection:
        print("Branch protection:")
        for b in ("main", "develop"):
            protection[b] = protect(repo, b)
            print(f"  {b}: {protection[b]}")

    project_url = "skipped"
    if not skip_project:
        print("Project board:")
        num = sys.argv[sys.argv.index("--project-number") + 1] if "--project-number" in sys.argv else None
        project_url = ensure_project(owner, repo, issues, num)

    summary = {"repo": repo, "issues": issues, "protection": protection, "project": project_url}
    out = ROOT / "scripts" / "bootstrap-result.json"
    out.write_text(json.dumps(summary, indent=2))
    print(f"\nSummary written to {out.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
