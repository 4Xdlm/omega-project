/**
 * OMEGA Runner — Configuration
 * Phase D.1 — Runner config management
 */

import { createDefaultConfig } from '@omega/genesis-planner';
import { createDefaultSConfig } from '@omega/scribe-engine';
import { createDefaultEConfig } from '@omega/style-emergence-engine';
import { createDefaultC4Config } from '@omega/creation-pipeline';
import { createDefaultF5Config, DEFAULT_CANONICAL_TABLE } from '@omega/omega-forge';

import type { GConfig } from '@omega/genesis-planner';
import type { SConfig } from '@omega/scribe-engine';
import type { EConfig } from '@omega/style-emergence-engine';
import type { C4Config } from '@omega/creation-pipeline';
import type { F5Config, CanonicalEmotionTable } from '@omega/omega-forge';

export interface RunnerConfigs {
  readonly gConfig: GConfig;
  readonly sConfig: SConfig;
  readonly eConfig: EConfig;
  readonly c4Config: C4Config;
  readonly f5Config: F5Config;
  readonly canonicalTable: CanonicalEmotionTable;
}

/** Create default configurations for all pipeline stages */
export function createDefaultRunnerConfigs(): RunnerConfigs {
  return {
    gConfig: createDefaultConfig(),
    sConfig: createDefaultSConfig(),
    eConfig: createDefaultEConfig(),
    c4Config: createDefaultC4Config(),
    f5Config: createDefaultF5Config(),
    canonicalTable: DEFAULT_CANONICAL_TABLE,
  };
}
