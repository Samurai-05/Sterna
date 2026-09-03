# ADR-007 - Deployment Architecture

## Status

Accepted

## Context

Sterna must be deployed in a reproducible environment for development, integration, demonstration, and grading.

The application consists of several infrastructure components:

- the frontend web target of the shared application;
- the Node.js API;
- PostgreSQL + PostGIS;
- MinIO.

The project is developed by a small team over three weeks and is deployed on a VM provided by the school.

A distributed orchestration platform would introduce unnecessary operational complexity for the expected load and project duration.

## Decision

Sterna's server-side infrastructure will be deployed on a **single VM provided by the school**.

The services will run as **Docker containers orchestrated with Docker Compose**.

**Nginx** will act as the external entry point for the application.

Its responsibilities include:

- terminating HTTPS/TLS connections;
- serving the built frontend application;
- routing API requests to the Node.js API container;
- preventing internal infrastructure services from being directly exposed to the public network.

The API, PostgreSQL + PostGIS, and MinIO communicate through the internal Docker Compose network.

The Android target contains the same frontend packaged through Capacitor and reaches the Node.js API through Nginx over HTTPS.

```text
                     Internet
                    /        \
                   /          \
          Web browser       Capacitor Android
           (PWA target)    (packaged frontend)
                 | HTTPS          | HTTPS API
                 \                /
                  \              /
                       Nginx
                    /         \
          Frontend web target  /api/*
                                |
                                v
                           Node.js API
                           /          \
                          v            v
              PostgreSQL + PostGIS   MinIO

                Docker Compose — School VM
```

PostgreSQL + PostGIS and MinIO are not directly exposed to the Internet.

### Rationale and trade-offs

Docker provides a reproducible environment across developer machines and the deployment VM.

Docker Compose is sufficient to define and run the complete Sterna stack without introducing the complexity of a full orchestration system.

Using the same container-based architecture in development and deployment reduces environment-specific differences.

Nginx provides a single public entry point and centralizes HTTPS configuration and request routing.

This architecture is intentionally optimized for simplicity rather than high availability or horizontal scaling.

## Alternatives considered

| Approach | Advantages | Disadvantages |
|---|---|---|
| Kubernetes | Advanced orchestration, scaling and self-healing | Significant operational overhead with no practical benefit at the current scale |
| Deploy services directly on the VM | Fewer container concepts | Less reproducible environment and more difficult dependency management |
| Separate VMs for each service | Better infrastructure isolation | Unnecessary complexity and resource usage |
| Fully managed cloud deployment | Managed availability and scaling | Additional cost, external dependency and more infrastructure configuration |

## Consequences

### Positive

- reproducible deployment;
- simple `docker compose` workflow;
- development and production environments remain similar;
- services are isolated through containers;
- only Nginx needs to be publicly exposed;
- infrastructure remains understandable and manageable for the project team.

### Negative

- the VM is a single point of failure;
- horizontal scaling is not provided;
- storage capacity is limited by the VM;
- persistent Docker volumes must be managed carefully;
- availability depends on the school infrastructure.

## Implementation status

The production Compose stack implements this decision with six services:

- `web`, which combines the built frontend and Nginx;
- `api`, PostgreSQL/PostGIS, and MinIO on the internal network;
- `minio-init`, which creates the configured private bucket;
- `certbot`, which renews the Let's Encrypt certificate shared with Nginx.

GitHub Actions publishes versioned web and API images to GHCR. A self-hosted
runner on the same VM pulls them, applies database migrations before the API
starts, launches the stack, and verifies both dependency health and access
through Nginx. Deployment therefore requires no inbound SSH copy step.

## Operational considerations

Persistent volumes must be configured for:

- PostgreSQL + PostGIS;
- MinIO.

Configuration must be provided through environment variables rather than hard-coded addresses or credentials.

Particular attention must be given to:

- available disk space;
- persistence after container or VM restarts;
- TLS configuration;
- secrets and environment variables;
- backup of PostgreSQL + PostGIS and MinIO data.

## Future evolution

If Sterna grows beyond the capabilities of a single VM, the architecture may evolve toward:

- managed PostgreSQL service with PostGIS support;
- managed S3-compatible object storage;
- multiple application instances;
- container orchestration or managed deployment platforms;
- separate environments for development, staging, and production.
