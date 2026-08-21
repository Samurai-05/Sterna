# ADR-001 — Frontend Platform

## Status

Accepted

## Context

Sterna must target the web and mobile devices with a largely shared codebase. The interface must remain suitable for an interactive application while still being able to access certain native capabilities such as geolocation, the camera, and permissions.

The project seeks a balance between code sharing, iteration speed, web experience quality, and access to mobile platforms. A fully native mobile solution would maximize control, but would substantially increase development and maintenance costs.

## Decision

The selected frontend platform consists of:

- React for the interface and component model;
- TypeScript for static typing;
- Vite for web development and builds;
- PWA as an installable web target;
- Capacitor to package the web application for mobile and access native capabilities.

### Rationale and trade-offs

React provides a component model suited to a rich, interactive interface. Its ecosystem is mature, particularly for web interfaces and mapping. In return, complementary building blocks — navigation, data management, forms, and native integration — must be selected and maintained separately.

TypeScript makes the contracts between components, geographic data, and backend calls more explicit. It reduces certain errors as the project evolves, at the cost of additional configuration and type maintenance.

Vite offers a fast development startup and a simple build pipeline for React and TypeScript. However, the project must configure aspects such as the service worker, deployment, and Capacitor integration itself.

The PWA provides an installable web target and shares the same codebase between desktop and mobile. A PWA alone does not guarantee consistent access to native features or mobile distribution equivalent to that of a store app.

Capacitor keeps the web interface and logic in a mobile application and provides a bridge to native APIs. The trade-off is rendering in a WebView, along with maintaining plugins, Android/iOS configurations, and tests on real devices.

## Alternatives considered

| Approach | Advantages | Disadvantages |
|---|---|---|
| PWA only | Simple codebase and deployment; immediate access from the web | More limited or inconsistent access to native features; less complete mobile distribution |
| Expo / React Native | More native-like mobile experience; well-integrated mobile access | Less sharing with the web target; adaptations required for web rendering and mapping |
| Native Android/iOS development | Maximum platform control and performance | Two implementations to maintain; higher cost; limited code sharing |

## Consequences

### Positive

- an interface and logic shared primarily between web and mobile;
- an iteration speed suited to a student project;
- an installable web target through the PWA;
- access to the required mobile capabilities without rewriting the interface natively.

### Negative

- performance and access to native APIs are less direct than with native development;
- mobile platform plugins and configurations must be maintained;
- the frontend stack must integrate several building blocks rather than a single mobile framework;
- this decision must be revisited if mapping performance or store requirements become incompatible with a WebView.
