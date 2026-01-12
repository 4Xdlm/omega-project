/**
 * OMEGA NEXUS - Observatory Tests
 * 
 * Phase 24
 * 
 * Tests for the observatory monitoring system.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  OmegaModule,
  HealthStatus,
  AlertSeverity,
  ALL_MODULES,
} from '../../src/core/types.js';
import {
  Observatory,
  createObservatory,
  getGlobalObservatory,
  generateObservatoryReport,
  ObservatoryEvent,
} from '../../src/observatory/observatory.js';

describe('Observatory', () => {
  let observatory: Observatory;

  beforeEach(() => {
    observatory = createObservatory();
  });

  describe('Initialization', () => {
    it('should initialize with all modules in UNKNOWN state', () => {
      for (const module of ALL_MODULES) {
        expect(observatory.getModuleHealth(module)).toBe(HealthStatus.UNKNOWN);
      }
    });

    it('should start with no alerts', () => {
      expect(observatory.getActiveAlerts()).toHaveLength(0);
    });

    it('should start with overall UNKNOWN health', () => {
      const snapshot = observatory.getSnapshot();
      expect(snapshot.overallHealth).toBe(HealthStatus.UNKNOWN);
    });
  });

  describe('recordMetric', () => {
    it('should record a metric', () => {
      observatory.recordMetric('p99_latency', OmegaModule.NEXUS, 50, 'ms');
      
      const metric = observatory.getMetric(OmegaModule.NEXUS, 'p99_latency');
      expect(metric).toBeDefined();
      expect(metric!.value).toBe(50);
      expect(metric!.unit).toBe('ms');
    });

    it('should update module health based on metric', () => {
      observatory.recordMetric('p99_latency', OmegaModule.NEXUS, 50, 'ms');
      expect(observatory.getModuleHealth(OmegaModule.NEXUS)).toBe(HealthStatus.HEALTHY);
    });

    it('should set DEGRADED status for warning threshold', () => {
      // p99_latency warning threshold is 100ms
      observatory.recordMetric('p99_latency', OmegaModule.NEXUS, 150, 'ms');
      expect(observatory.getModuleHealth(OmegaModule.NEXUS)).toBe(HealthStatus.DEGRADED);
    });

    it('should set CRITICAL status for critical threshold', () => {
      // p99_latency critical threshold is 200ms
      observatory.recordMetric('p99_latency', OmegaModule.NEXUS, 250, 'ms');
      expect(observatory.getModuleHealth(OmegaModule.NEXUS)).toBe(HealthStatus.CRITICAL);
    });

    it('should raise alert for CRITICAL metrics', () => {
      observatory.recordMetric('p99_latency', OmegaModule.NEXUS, 250, 'ms');
      
      const alerts = observatory.getModuleAlerts(OmegaModule.NEXUS);
      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(a => a.severity === AlertSeverity.CRITICAL)).toBe(true);
    });
  });

  describe('raiseAlert', () => {
    it('should create an alert', () => {
      const alert = observatory.raiseAlert(
        OmegaModule.NEXUS,
        AlertSeverity.WARNING,
        'Test alert',
        { key: 'value' }
      );

      expect(alert.id).toBeDefined();
      expect(alert.module).toBe(OmegaModule.NEXUS);
      expect(alert.severity).toBe(AlertSeverity.WARNING);
      expect(alert.message).toBe('Test alert');
      expect(alert.acknowledged).toBe(false);
    });

    it('should update module health on CRITICAL alert', () => {
      observatory.raiseAlert(
        OmegaModule.CHAOS,
        AlertSeverity.CRITICAL,
        'Critical issue'
      );

      expect(observatory.getModuleHealth(OmegaModule.CHAOS)).toBe(HealthStatus.CRITICAL);
    });

    it('should store alerts', () => {
      observatory.raiseAlert(OmegaModule.NEXUS, AlertSeverity.WARNING, 'Alert 1');
      observatory.raiseAlert(OmegaModule.NEXUS, AlertSeverity.WARNING, 'Alert 2');
      
      expect(observatory.getActiveAlerts().length).toBe(2);
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge an alert', () => {
      const alert = observatory.raiseAlert(
        OmegaModule.NEXUS,
        AlertSeverity.WARNING,
        'Test alert'
      );
      
      const result = observatory.acknowledgeAlert(alert.id);
      
      expect(result).toBe(true);
      expect(observatory.getActiveAlerts().length).toBe(0);
    });

    it('should return false for unknown alert', () => {
      const result = observatory.acknowledgeAlert('UNKNOWN_ID');
      expect(result).toBe(false);
    });
  });

  describe('clearOldAlerts', () => {
    it('should remove old alerts', () => {
      observatory.raiseAlert(OmegaModule.NEXUS, AlertSeverity.INFO, 'Old alert');
      
      // Clear with 0ms age (should clear all)
      const cleared = observatory.clearOldAlerts(0);
      
      expect(cleared).toBe(1);
      expect(observatory.getActiveAlerts().length).toBe(0);
    });
  });

  describe('getSnapshot', () => {
    it('should return complete snapshot', () => {
      observatory.recordMetric('p99_latency', OmegaModule.NEXUS, 50, 'ms');
      observatory.raiseAlert(OmegaModule.CHAOS, AlertSeverity.WARNING, 'Test');
      
      const snapshot = observatory.getSnapshot();
      
      expect(snapshot.modules).toBeInstanceOf(Map);
      expect(snapshot.metrics.length).toBeGreaterThan(0);
      expect(snapshot.alerts.length).toBeGreaterThan(0);
      expect(snapshot.timestamp).toBeDefined();
    });

    it('should compute overall health', () => {
      observatory.setModuleHealth(OmegaModule.NEXUS, HealthStatus.HEALTHY);
      observatory.setModuleHealth(OmegaModule.CHAOS, HealthStatus.HEALTHY);
      
      let snapshot = observatory.getSnapshot();
      expect(snapshot.overallHealth).toBe(HealthStatus.UNKNOWN); // Others still unknown
      
      // Set all to healthy
      for (const module of ALL_MODULES) {
        observatory.setModuleHealth(module, HealthStatus.HEALTHY);
      }
      
      snapshot = observatory.getSnapshot();
      expect(snapshot.overallHealth).toBe(HealthStatus.HEALTHY);
    });

    it('should return CRITICAL if any module is CRITICAL', () => {
      for (const module of ALL_MODULES) {
        observatory.setModuleHealth(module, HealthStatus.HEALTHY);
      }
      observatory.setModuleHealth(OmegaModule.NEXUS, HealthStatus.CRITICAL);
      
      const snapshot = observatory.getSnapshot();
      expect(snapshot.overallHealth).toBe(HealthStatus.CRITICAL);
    });

    it('should return DEGRADED if any module is DEGRADED (and none CRITICAL)', () => {
      for (const module of ALL_MODULES) {
        observatory.setModuleHealth(module, HealthStatus.HEALTHY);
      }
      observatory.setModuleHealth(OmegaModule.CHAOS, HealthStatus.DEGRADED);
      
      const snapshot = observatory.getSnapshot();
      expect(snapshot.overallHealth).toBe(HealthStatus.DEGRADED);
    });
  });

  describe('subscribe', () => {
    it('should receive metric events', () => {
      const events: ObservatoryEvent[] = [];
      observatory.subscribe(e => events.push(e));
      
      observatory.recordMetric('p99_latency', OmegaModule.NEXUS, 50, 'ms');
      
      expect(events.some(e => e.type === 'metric')).toBe(true);
    });

    it('should receive alert events', () => {
      const events: ObservatoryEvent[] = [];
      observatory.subscribe(e => events.push(e));
      
      observatory.raiseAlert(OmegaModule.NEXUS, AlertSeverity.WARNING, 'Test');
      
      expect(events.some(e => e.type === 'alert')).toBe(true);
    });

    it('should receive health change events', () => {
      const events: ObservatoryEvent[] = [];
      observatory.subscribe(e => events.push(e));
      
      observatory.setModuleHealth(OmegaModule.NEXUS, HealthStatus.HEALTHY);
      
      expect(events.some(e => e.type === 'health_change')).toBe(true);
    });

    it('should allow unsubscribe', () => {
      const events: ObservatoryEvent[] = [];
      const unsubscribe = observatory.subscribe(e => events.push(e));
      
      unsubscribe();
      observatory.recordMetric('p99_latency', OmegaModule.NEXUS, 50, 'ms');
      
      expect(events.length).toBe(0);
    });
  });

  describe('reset', () => {
    it('should clear all state', () => {
      observatory.recordMetric('p99_latency', OmegaModule.NEXUS, 50, 'ms');
      observatory.raiseAlert(OmegaModule.CHAOS, AlertSeverity.WARNING, 'Test');
      observatory.setModuleHealth(OmegaModule.NEXUS, HealthStatus.HEALTHY);
      
      observatory.reset();
      
      expect(observatory.getActiveAlerts().length).toBe(0);
      expect(observatory.getModuleHealth(OmegaModule.NEXUS)).toBe(HealthStatus.UNKNOWN);
    });
  });
});

describe('generateObservatoryReport', () => {
  it('should generate readable report', () => {
    const observatory = createObservatory();
    observatory.recordMetric('p99_latency', OmegaModule.NEXUS, 50, 'ms');
    observatory.setModuleHealth(OmegaModule.NEXUS, HealthStatus.HEALTHY);
    
    const report = generateObservatoryReport(observatory);
    
    expect(report).toContain('OMEGA NEXUS');
    expect(report).toContain('OBSERVATORY REPORT');
    expect(report).toContain('OVERALL HEALTH');
    expect(report).toContain('MODULE HEALTH');
    expect(report).toContain('KEY METRICS');
  });

  it('should include active alerts', () => {
    const observatory = createObservatory();
    observatory.raiseAlert(OmegaModule.NEXUS, AlertSeverity.WARNING, 'Test alert message');
    
    const report = generateObservatoryReport(observatory);
    
    expect(report).toContain('ACTIVE ALERTS');
    expect(report).toContain('Test alert message');
  });
});

describe('getGlobalObservatory', () => {
  it('should return singleton instance', () => {
    const obs1 = getGlobalObservatory();
    const obs2 = getGlobalObservatory();
    
    expect(obs1).toBe(obs2);
  });
});

describe('INV-NEXUS-03: Observatory Accuracy', () => {
  it('should accurately reflect recorded metrics', () => {
    const observatory = createObservatory();
    
    observatory.recordMetric('requests_per_second', OmegaModule.NEXUS, 1500, 'rps');
    
    const metric = observatory.getMetric(OmegaModule.NEXUS, 'requests_per_second');
    
    // observed(metric) = actual(metric)
    expect(metric!.value).toBe(1500);
    expect(metric!.unit).toBe('rps');
  });

  it('should accurately reflect module health', () => {
    const observatory = createObservatory();
    
    // Healthy metric
    observatory.recordMetric('p99_latency', OmegaModule.NEXUS, 50, 'ms');
    expect(observatory.getModuleHealth(OmegaModule.NEXUS)).toBe(HealthStatus.HEALTHY);
    
    // Critical metric
    observatory.recordMetric('p99_latency', OmegaModule.NEXUS, 300, 'ms');
    expect(observatory.getModuleHealth(OmegaModule.NEXUS)).toBe(HealthStatus.CRITICAL);
  });
});
