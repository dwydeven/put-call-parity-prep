# Dependency maintenance

Security review: 2026-11-08. Node 22 remains the build runtime. Vite 8.1.6 and
Vitest 4.1.12 address development-server and mock-server advisories. The lockfile
also refreshes the specifically affected transitive packages. Workbox's scoped
glob override uses 14.0.4; its used `globSync` API is preserved and the offline
artifact verification passes with the new version.

The final npm audit has no high or moderate findings. Four low findings remain
in the build dependency chain rooted at deepmerge 4.3.1
([upstream advisory](https://github.com/advisories/GHSA-gcqx-w48m-w2h4)); no patched
release is currently published. These are build tools and are not included in
the React application runtime. Build only trusted repository configuration;
revisit the upstream patch rather than force-downgrading the PWA toolchain.

The system npm 10 installer crashed on this graph; a pinned npm 11.6.2 completed
the repair. The checked-in lockfile still works with the project's npm ci path.
PRs now run tests/build/offline verification without publishing Pages. The
existing push-to-master pipeline continues to publish the verified static build.

Validation: 21 tests, production build, and `npm run verify:build` pass.
