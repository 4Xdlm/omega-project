/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * @omega/integration-nexus-dep — ROUTER INDEX
 * Version: 0.2.0
 * Standard: NASA-Grade L4
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// Registry
export {
  OperationRegistry,
  getDefaultRegistry,
  resetDefaultRegistry
} from "./registry.js";
export type {
  OperationHandler,
  HandlerContext,
  RegisteredHandler
} from "./registry.js";

// Dispatcher
export { Dispatcher, createDispatcher } from "./dispatcher.js";
export type { DispatcherOptions } from "./dispatcher.js";

// Router
export {
  NexusRouter,
  createRouter,
  createDefaultRouter
} from "./router.js";
export type {
  RouterOptions,
  DefaultRouterOptions,
  RouterAdapters,
  IRouterValidationAdapter,
  IRouterGenomeAdapter,
  IRouterDNAAdapter
} from "./router.js";
