# Work Process

## Overview

The project was organised over three weeks, from the kick-off on 17.08.2026 to
the final presentation on 04.09.2026, with a team of four people working full
time. Given this short and fixed timeline, we adopted an agile, iteration-based
approach rather than a sequential one. Our goal was to have something working
end to end very early, then grow it incrementally, so that integration problems
surfaced in the first days rather than the last ones.

We kept the methodology lightweight. A full Scrum implementation would not be
meaningful at this scale, since there is no external product owner and no
long-term backlog to groom. We therefore borrowed the parts of it that help a
small co-located team: a single prioritised backlog, fixed-length iterations
with a clear goal, and a visible board that reflects the real state of the work
at any moment.

## Iteration structure

The calendar of the module divided the project into three iterations, each
ending on a date that already had a deadline or milestone attached to it. We
aligned our sprints with those boundaries.

### Sprint 0: Foundations (18.08 to 21.08)

A short first sprint was dedicated to putting the technical foundations in
place. Rather than treating this as an unstructured setup period, we planned it
as a full iteration with its own goal and deliverable: a walking skeleton of
the product.

The sprint included:

- definition of the problem and of the solution, functional and non-functional
  requirements;
- mockups and landing page;
- technical choices and preliminary architecture;
- repository, issue tracker and board set up;
- deployment environment provisioned;
- CI/CD pipeline built and demonstrated on a trivial change.

The sprint was considered done when a commit pushed to the repository was
automatically built, verified and deployed to the target environment without a
manual deployment step. This established a pipeline the team could trust before
the main features were written and formed part of the week 1 deliverable
presented on Monday 24.08.

### Sprint 1: Core features (24.08 to 28.08)

The first full development iteration focused on the core value of the product:
the features without which the solution would not answer the problem statement.
Its scope was selected during the Monday sprint planning immediately after the
week 1 presentation, allowing feedback from the teaching staff to be included.

The sprint ended on Friday with an internal review. We ran the product as a
user would, checked completed items against their acceptance criteria, and
updated the backlog accordingly.

### Sprint 2: Consolidation and delivery (31.08 to 03.09)

The final iteration focused on secondary features, user-experience improvements,
stabilisation, and delivery. The last day and a half were reserved for work
outside feature development: reproducible local setup instructions,
contribution and deployment documentation, final project documentation and preparation for the final presentation on 04.09.

This reserved time was a deliberate scheduling decision. Documentation and the
presentation are graded deliverables, and treating them as work items inside
the sprint protected them from being crowded out by feature work.

## Quality and delivery automation

The initial Sprint 0 pipeline evolved with the application. GitHub Actions now
validates pull requests and pushes to `main` through three parallel jobs:

- the **frontend** job installs dependencies, lints, runs the Vitest suite,
  builds the PWA, and validates the production web image;
- the **API** job lints, runs the Jest suite, builds the NestJS application,
  and validates its production image;
- the **Android** job builds the Android-specific web assets, synchronises the
  Capacitor project, and assembles a debug APK.

After a merge to `main`, the deployment workflow builds and publishes the web
and API images to GitHub Container Registry. A self-hosted runner on the target
VM pulls those images, applies pending database migrations, starts the Docker
Compose stack, and verifies the API health and public Nginx routes. A separate
workflow creates a signed APK and GitHub Release for version tags matching
`v*`.

## Backlog and board

All work is tracked in a single backlog managed with GitHub Projects, using a
Kanban board that anyone in the team, or outside it, can consult to see the
current state of the project.

Items are written from the point of view of the person using the product, with
explicit acceptance criteria that make it unambiguous when an item is finished.
Each item carries a priority, so that if an iteration runs short we drop the
least valuable items rather than delivering everything half-finished.

At the beginning of each sprint, the team selects from the backlog the items
that constitute the sprint scope. During the sprint, items move across the board
as they progress, and no item is considered finished until the corresponding
pull request has been reviewed and merged.

## Git workflow

The source code is hosted on GitHub and every change goes through the same path,
which keeps the history readable and makes it possible to trace any line of code
back to the item that motivated it.

The `main` branch always reflects the state that is deployed. It is protected,
so nobody pushes to it directly. Every unit of work starts from an issue on the
board, and each issue gets its own branch, created from `main` and named after
the issue it implements.

When the work on a branch is ready, its author opens a pull request describing
what was done and referencing the issue it closes. The pull request must be
approved by at least one other member of the team before it can be merged. Reviews cover correctness,
readability and consistency with the rest of the code base, and comments are
resolved on the branch rather than in a follow-up commit on `main`. The
automated pipeline also runs on every pull request, so a branch that breaks the
build or the tests cannot be merged.

Once approved, the branch is merged into `main` and deleted. A merge into `main`
triggers the deployment pipeline, so the reviewed change reaches the running
environment without any further manual step.

## Work distribution

The team was made up of four people and everyone contributed to the code. Each
member nevertheless had a primary area of responsibility, providing a clear
point of contact for decisions and reviews without making that area exclusive.

The primary distribution was:

- **Samuel Dos Santos — DevOps and infrastructure**: CI/CD, containerisation,
  deployment environment, and operational integration;
- **Victor Giordani — Frontend**: user interface, client-side logic, and the
  shared web/Android experience;
- **Abram Zweifel — Backend**: API, business logic, authentication, and storage
  integration;
- **Romain Durussel — Database**: schema, migrations, spatial queries, and data
  modelling.

These roles described ownership, not fixed boundaries. Team members regularly
worked outside their primary area, reviewed one another's changes, and helped
where the current sprint needed it. Documentation, backlog maintenance,
testing, and presentation preparation were shared responsibilities.

## Coordination

The team collaborated both on site and remotely through video calls. Most
day-to-day decisions were therefore taken through direct discussion as
questions arose. We formalised the elements that benefited from a durable
record, notably requirements, architecture decisions, issues, pull requests,
and deployment documentation.

A short daily stand-up at the beginning of the day gave each member the
opportunity to state what had been completed, what was planned next, and what
was blocking progress. This meeting also served as the daily check-in with the
teaching staff, either on site or remotely through Teams.

At the end of each sprint, a short retrospective allowed the team to identify
what worked, what did not, and one or two concrete adjustments for the next
iteration. Written communication, decisions, and questions addressed to the
teaching staff went through the dedicated Teams channel.
