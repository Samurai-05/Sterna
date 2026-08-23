# ADR-007 - Deployment Architecture

## Status

Accepted

## Context

Sterna must be deployed in a reproducible environment for development, integration, demonstration, and grading.

The application consists of several infrastructure components:

- the frontend web application;
- the Node.js API;
- PostgreSQL with PostGIS;
- MinIO.

The project is developed by a small team over three weeks and is deployed on a VM provided by the school.

A distributed orchestration platform would introduce unnecessary operational complexity for the expected load and project duration.

## Decision

Sterna's server-side infrastructure will be deployed on a **single VM provided by the school**.

The services will run as **Docker containers orchestrated with Docker Compose**.

The database container will run **PostgreSQL with PostGIS enabled**.

**Nginx** will act as the external entry point for the application.

Its responsibilities include:

- terminating HTTPS/TLS connections;
- serving the built frontend application;
- routing API requests to the Node.js API container;
- preventing internal infrastructure services from being directly exposed to the public network.

The API, PostgreSQL/PostGIS, and MinIO communicate through the internal Docker Compose network.

```text
                     Internet
                         |
                       HTTPS
                         |
                       Nginx
                    /         \
                   /           \
          Frontend bundle     /api/*
                                |
                                v
                           Node.js API
                           /          \
                          v            v
                 PostgreSQL/PostGIS   MinIO

                Docker Compose — School VM
```

PostgreSQL/PostGIS and MinIO are not directly exposed to the Internet.

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
- PostGIS is available consistently in every environment;
- services are isolated through containers;
- only Nginx needs to be publicly exposed;
- infrastructure remains understandable and manageable for the project team.

### Negative

- the VM is a single point of failure;
- horizontal scaling is not provided;
- storage capacity is limited by the VM;
- persistent Docker volumes must be managed carefully;
- availability depends on the school infrastructure.

## Operational considerations

Persistent volumes must be configured for:

- PostgreSQL/PostGIS;
- MinIO.

Configuration must be provided through environment variables rather than hard-coded addresses or credentials.

Particular attention must be given to:

- available disk space;
- persistence after container or VM restarts;
- TLS configuration;
- secrets and environment variables;

## Future evolution

If Sterna grows beyond the capabilities of a single VM, the architecture may evolve toward managed cloud services, such as:

- managed PostgreSQL with PostGIS support;
- managed S3-compatible object storage;
- multiple application instances;
- container orchestration or managed deployment platforms;
- separate environments for development, staging, and production.

