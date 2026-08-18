# Work Process

## Overview

The project runs over three weeks, from the kick-off on 17.08.2026 to the final
presentation on 04.09.2026, with a team of four people working full time. Given
this short and fixed timeline, we adopted an agile, iteration-based approach
rather than a sequential one. Our goal is to have something working end to end
very early, then grow it incrementally, so that integration problems surface in
the first days rather than the last ones.

We kept the methodology lightweight. A full Scrum implementation would not be
meaningful at this scale, since there is no external product owner and no
long-term backlog to groom. We therefore borrowed the parts of it that help a
small co-located team: a single prioritised backlog, fixed-length iterations
with a clear goal, and a visible board that reflects the real state of the work
at any moment.

## Iteration structure

The calendar of the module divides the project into three iterations, each
ending on a date that already has a deadline or a milestone attached to it. We
aligned our sprints on those boundaries.

### Sprint 0: Foundations (18.08 to 21.08)

A short first sprint dedicated to putting the technical foundations in place.
Rather than treating this as an unstructured setup period, we planned it as a
full iteration with its own goal and its own deliverable: a walking skeleton of
the product.

Scope of the sprint:

- definition of the problem and of the solution, functional and non-functional
  requirements;
- mockups and landing page;
- technical choices and preliminary architecture;
- repository, issue tracker and board set up;
- deployment environment provisioned;
- CI/CD pipeline built and demonstrated on a trivial change.

The sprint is considered done when a commit pushed to the repository is
automatically built, verified and deployed to the target environment without any
manual step. This gives us a pipeline we can trust before any real feature is
written, and it corresponds to the week 1 deliverable presented on Monday 24.08.

### Sprint 1: Core features (24.08 to 28.08)

The first full development iteration, focused on the core value of the product,
meaning the features without which the solution does not answer the problem
statement. The scope is decided at the sprint planning on Monday morning,
immediately after the week 1 presentation, so that any feedback received from
the teaching staff can be taken into account in the plan.

The sprint ends on Friday with an internal review. We run the product as a user
would, check the items claimed as finished against their acceptance criteria,
and update the backlog accordingly.

### Sprint 2: Consolidation and delivery (31.08 to 03.09)

The final iteration covers secondary features, stabilisation and the delivery
itself. We reserve the last day and a half for work that is not feature
development: reproducible instructions to run the project locally, contribution
and deployment documentation, the optional presentation video, and the
preparation of the final presentation of 04.09.

This reserved time is a scheduling decision we made on purpose. Documentation
and the presentation are graded deliverables, and treating them as work items
inside the sprint, rather than as something done on the last evening, protects
them from being crowded out by feature work.

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
approved by two other members of the team before it can be merged, which means
every change is seen by a majority of the team. Reviews cover correctness,
readability and consistency with the rest of the code base, and comments are
resolved on the branch rather than in a follow-up commit on `main`. The
automated pipeline also runs on every pull request, so a branch that breaks the
build or the tests cannot be merged.

Once approved, the branch is merged into `main` and deleted. A merge into `main`
triggers the deployment pipeline, so the reviewed change reaches the running
environment without any further manual step.

## Work distribution

The team is made of four people and everyone contributes to the code. On top of
that, each member owns one area of the project. Owning an area does not mean
being the only one to work on it. It means being the person who takes the
decisions in that area, who reviews the changes touching it in priority, and who
is accountable for the corresponding part of the deliverables.

The areas we identified are the following:

- **Frontend**: user interface, client-side logic, mockups and landing page.
- **Backend**: API, business logic, integration with the storage services.
- **Database**: schema, migrations, spatial queries and data model.
- **DevOps and infrastructure**: CI/CD pipeline, containerisation, deployment
  environment, monitoring.
- **Documentation and project management**: report, contribution and deployment
  instructions, backlog upkeep, presentations.

Since the team has four members and the last two areas are lighter than the
others in terms of implementation work, they are combined with the ones that are
closest to them. The exact assignment of each person to each area is still being
adjusted as we discover the real weight of each part of the system, and it will
be fixed at the latest at the beginning of Sprint 1. During Sprint 0, work is
allocated according to what is needed to bring the walking skeleton up, without
regard to these areas.

## Coordination

The team works on site during the whole project, so most decisions are taken
directly, face to face, as questions arise. We formalise only what benefits from
being formal.

A short daily stand-up at the beginning of the day gives each member the
opportunity to state what was completed the day before, what is planned for the
day, and what is currently blocking them. This meeting also serves as our daily
check-in and situation report with the teaching staff, either on site or
remotely via Teams.

At the end of each sprint, a short retrospective allows the team to identify
what worked, what did not, and to agree on one or two concrete adjustments to
apply during the next iteration. Written communication, decisions and questions
addressed to the teaching staff go through the dedicated Teams channel.
