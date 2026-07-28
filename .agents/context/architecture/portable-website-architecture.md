# [DEPRECATED] Portable Website Architecture Specification

> [!WARNING]
> **DEPRECATION NOTICE**: This document represents an earlier historical draft focused on a multi-site, multi-tenant monorepo model. It has been superseded as the canonical architecture specification.
> 
> The authoritative, single-website Markdown content architecture specification for this platform is:
> 
> 👉 **[`docs/architecture/markdown-content-website-architecture.md`](markdown-content-website-architecture.md)**
> 
> For empirical implementation evidence mapping the target architecture to source code within `tsolomon89/websites-monorepo`, please refer to:
> 
> 👉 **[`docs/architecture/current-repository-mapping.md`](current-repository-mapping.md)**

---

## Historical Context

This archived document originally detailed a multi-brand monorepo topology consisting of multiple Next.js applications (`sites/*`), per-site development ports (`3000-3006`), and tenant configuration registries (`TENANTS`). 

Under the unified platform architecture defined in [`markdown-content-website-architecture.md`](markdown-content-website-architecture.md), all content-driven properties are unified into a **Single Content-Driven Website Platform** featuring a primary surface (`www.example.com`) alongside configurable content-oriented subdomain surfaces (`blog.example.com`, `library.example.com`).

Please refer exclusively to [`markdown-content-website-architecture.md`](markdown-content-website-architecture.md) for all implementation, routing, content loading, page model, and template composition contracts.
