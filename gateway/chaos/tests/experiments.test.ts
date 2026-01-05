/**
 * OMEGA CHAOS_HARNESS — Experiment Tests
 * Phase 16.4
 * 
 * INV-CHA-04: Experiments isolated
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChaosHarness, FaultType, ExperimentState } from '../src/chaos/index.js';

describe('CHAOS_HARNESS Experiments (INV-CHA-04)', () => {
  let chaos: ChaosHarness;

  beforeEach(() => {
    chaos = new ChaosHarness({ enabled: true });
  });

  describe('startExperiment()', () => {
    it('creates and starts an experiment', () => {
      const id = chaos.startExperiment({
        name: 'Test Experiment',
        faults: [{ type: FaultType.LATENCY, probability: 0.5 }],
      });
      
      expect(id).toBeDefined();
      expect(id).toMatch(/^EXP-/);
      
      const experiment = chaos.getExperiment(id);
      expect(experiment?.state).toBe(ExperimentState.RUNNING);
    });

    it('registers all faults from definition', () => {
      const id = chaos.startExperiment({
        name: 'Multi-fault',
        faults: [
          { type: FaultType.LATENCY },
          { type: FaultType.ERROR },
          { type: FaultType.NULL_RESPONSE },
        ],
      });
      
      const experiment = chaos.getExperiment(id);
      expect(experiment?.faultIds.length).toBe(3);
    });

    it('sets startedAt timestamp', () => {
      const before = new Date().toISOString();
      const id = chaos.startExperiment({
        name: 'Timed',
        faults: [{ type: FaultType.LATENCY }],
      });
      const after = new Date().toISOString();
      
      const experiment = chaos.getExperiment(id);
      expect(experiment?.startedAt).toBeDefined();
      expect(experiment?.startedAt! >= before).toBe(true);
      expect(experiment?.startedAt! <= after).toBe(true);
    });

    it('stores experiment definition', () => {
      const definition = {
        name: 'Full Definition',
        description: 'Test description',
        faults: [{ type: FaultType.ERROR }],
        tags: ['test', 'experiment'],
      };
      
      const id = chaos.startExperiment(definition);
      const experiment = chaos.getExperiment(id);
      
      expect(experiment?.definition.name).toBe('Full Definition');
      expect(experiment?.definition.description).toBe('Test description');
      expect(experiment?.definition.tags).toEqual(['test', 'experiment']);
    });
  });

  describe('stopExperiment()', () => {
    it('stops a running experiment', () => {
      const id = chaos.startExperiment({
        name: 'To Stop',
        faults: [{ type: FaultType.LATENCY }],
      });
      
      const result = chaos.stopExperiment(id);
      expect(result).toBe(true);
      
      const experiment = chaos.getExperiment(id);
      expect(experiment?.state).toBe(ExperimentState.COMPLETED);
    });

    it('sets endedAt timestamp', () => {
      const id = chaos.startExperiment({
        name: 'Timed',
        faults: [{ type: FaultType.LATENCY }],
      });
      
      chaos.stopExperiment(id);
      
      const experiment = chaos.getExperiment(id);
      expect(experiment?.endedAt).toBeDefined();
    });

    it('unregisters all faults', () => {
      const id = chaos.startExperiment({
        name: 'Cleanup',
        faults: [{ type: FaultType.ERROR }, { type: FaultType.LATENCY }],
      });
      
      const experiment = chaos.getExperiment(id);
      const faultIds = experiment?.faultIds ?? [];
      
      chaos.stopExperiment(id);
      
      for (const faultId of faultIds) {
        expect(chaos.getFault(faultId)).toBeUndefined();
      }
    });

    it('returns false for nonexistent experiment', () => {
      const result = chaos.stopExperiment('nonexistent');
      expect(result).toBe(false);
    });

    it('returns false for already stopped experiment', () => {
      const id = chaos.startExperiment({
        name: 'Already Stopped',
        faults: [{ type: FaultType.ERROR }],
      });
      
      chaos.stopExperiment(id);
      const result = chaos.stopExperiment(id);
      expect(result).toBe(false);
    });
  });

  describe('pauseExperiment()', () => {
    it('pauses a running experiment', () => {
      const id = chaos.startExperiment({
        name: 'To Pause',
        faults: [{ type: FaultType.LATENCY }],
      });
      
      const result = chaos.pauseExperiment(id);
      expect(result).toBe(true);
      
      const experiment = chaos.getExperiment(id);
      expect(experiment?.state).toBe(ExperimentState.PAUSED);
    });

    it('deactivates faults when paused', () => {
      const id = chaos.startExperiment({
        name: 'Pause Faults',
        faults: [{ type: FaultType.ERROR }],
      });
      
      const faultId = chaos.getExperiment(id)?.faultIds[0];
      expect(chaos.getFault(faultId!)?.active).toBe(true);
      
      chaos.pauseExperiment(id);
      expect(chaos.getFault(faultId!)?.active).toBe(false);
    });

    it('returns false for non-running experiment', () => {
      const id = chaos.startExperiment({
        name: 'Test',
        faults: [{ type: FaultType.LATENCY }],
      });
      
      chaos.stopExperiment(id);
      const result = chaos.pauseExperiment(id);
      expect(result).toBe(false);
    });
  });

  describe('resumeExperiment()', () => {
    it('resumes a paused experiment', () => {
      const id = chaos.startExperiment({
        name: 'To Resume',
        faults: [{ type: FaultType.ERROR }],
      });
      
      chaos.pauseExperiment(id);
      const result = chaos.resumeExperiment(id);
      expect(result).toBe(true);
      
      const experiment = chaos.getExperiment(id);
      expect(experiment?.state).toBe(ExperimentState.RUNNING);
    });

    it('reactivates faults when resumed', () => {
      const id = chaos.startExperiment({
        name: 'Resume Faults',
        faults: [{ type: FaultType.LATENCY }],
      });
      
      const faultId = chaos.getExperiment(id)?.faultIds[0];
      chaos.pauseExperiment(id);
      expect(chaos.getFault(faultId!)?.active).toBe(false);
      
      chaos.resumeExperiment(id);
      expect(chaos.getFault(faultId!)?.active).toBe(true);
    });

    it('returns false for non-paused experiment', () => {
      const id = chaos.startExperiment({
        name: 'Not Paused',
        faults: [{ type: FaultType.ERROR }],
      });
      
      const result = chaos.resumeExperiment(id);
      expect(result).toBe(false);
    });
  });

  describe('getActiveExperiments()', () => {
    it('returns running and paused experiments', () => {
      const id1 = chaos.startExperiment({
        name: 'Running',
        faults: [{ type: FaultType.LATENCY }],
      });
      
      const id2 = chaos.startExperiment({
        name: 'Paused',
        faults: [{ type: FaultType.ERROR }],
      });
      chaos.pauseExperiment(id2);
      
      const id3 = chaos.startExperiment({
        name: 'Stopped',
        faults: [{ type: FaultType.NULL_RESPONSE }],
      });
      chaos.stopExperiment(id3);
      
      const active = chaos.getActiveExperiments();
      expect(active.length).toBe(2);
    });
  });

  describe('experiment isolation (INV-CHA-04)', () => {
    it('experiments have independent faults', () => {
      const id1 = chaos.startExperiment({
        name: 'Experiment 1',
        faults: [{ type: FaultType.LATENCY }],
      });
      
      const id2 = chaos.startExperiment({
        name: 'Experiment 2',
        faults: [{ type: FaultType.ERROR }],
      });
      
      const exp1 = chaos.getExperiment(id1);
      const exp2 = chaos.getExperiment(id2);
      
      expect(exp1?.faultIds).not.toEqual(exp2?.faultIds);
    });

    it('stopping one experiment does not affect others', () => {
      const id1 = chaos.startExperiment({
        name: 'Experiment 1',
        faults: [{ type: FaultType.LATENCY }],
      });
      
      const id2 = chaos.startExperiment({
        name: 'Experiment 2',
        faults: [{ type: FaultType.ERROR }],
      });
      
      chaos.stopExperiment(id1);
      
      expect(chaos.getExperiment(id1)?.state).toBe(ExperimentState.COMPLETED);
      expect(chaos.getExperiment(id2)?.state).toBe(ExperimentState.RUNNING);
    });
  });
});
