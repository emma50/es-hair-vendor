// Empty shim for the `server-only` package under vitest.
// Next.js uses `server-only` as a build-time guard that throws if a
// module ends up in the client bundle. Tests run in a Node/server
// environment so the guard is meaningless — this file gives the import
// resolver something to point at without changing source modules.
export {};
