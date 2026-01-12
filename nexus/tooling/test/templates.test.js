/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * OMEGA NEXUS — TEMPLATES MODULE TESTS
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  ENTITY_TEMPLATES,
  EVENT_TEMPLATES,
  LINK_TEMPLATES,
  getEntityTemplate,
  getEventTemplate,
  getLinkTemplate,
  listEntityTemplates,
  listEventTemplates,
  listLinkTemplates,
  createFromTemplate
} from '../scripts/templates.js';

console.log('Templates tests loaded');

describe('Templates Module', () => {

  describe('ENTITY_TEMPLATES', () => {
    
    it('should have DECISION template', () => {
      assert.ok(ENTITY_TEMPLATES.DECISION);
      assert.strictEqual(ENTITY_TEMPLATES.DECISION.type, 'DECISION');
    });
    
    it('should have MODULE template', () => {
      assert.ok(ENTITY_TEMPLATES.MODULE);
      assert.strictEqual(ENTITY_TEMPLATES.MODULE.type, 'MODULE');
    });
    
    it('should have BUG template', () => {
      assert.ok(ENTITY_TEMPLATES.BUG);
      assert.strictEqual(ENTITY_TEMPLATES.BUG.type, 'BUG');
    });
    
    it('should have FEATURE template', () => {
      assert.ok(ENTITY_TEMPLATES.FEATURE);
      assert.strictEqual(ENTITY_TEMPLATES.FEATURE.type, 'FEATURE');
    });
    
    it('should have all required templates', () => {
      const required = ['DECISION', 'MODULE', 'BUG', 'FEATURE', 'CONCEPT', 'TEST', 'MILESTONE', 'INCIDENT'];
      for (const type of required) {
        assert.ok(ENTITY_TEMPLATES[type], `Missing template: ${type}`);
      }
    });
    
    it('should have lifecycle in all templates', () => {
      for (const [name, template] of Object.entries(ENTITY_TEMPLATES)) {
        assert.ok(template.lifecycle, `${name} missing lifecycle`);
      }
    });
    
  });

  describe('EVENT_TEMPLATES', () => {
    
    it('should have CREATED template', () => {
      assert.ok(EVENT_TEMPLATES.CREATED);
      assert.strictEqual(EVENT_TEMPLATES.CREATED.type, 'CREATED');
    });
    
    it('should have UPDATED template', () => {
      assert.ok(EVENT_TEMPLATES.UPDATED);
      assert.strictEqual(EVENT_TEMPLATES.UPDATED.type, 'UPDATED');
    });
    
    it('should have PROMOTED template', () => {
      assert.ok(EVENT_TEMPLATES.PROMOTED);
    });
    
    it('should have all required event templates', () => {
      const required = ['CREATED', 'UPDATED', 'PROMOTED', 'REVIEWED', 'TESTED', 'SEALED', 'DEPRECATED', 'ABANDONED'];
      for (const type of required) {
        assert.ok(EVENT_TEMPLATES[type], `Missing event template: ${type}`);
      }
    });
    
  });

  describe('LINK_TEMPLATES', () => {
    
    it('should have DEPENDS_ON template', () => {
      assert.ok(LINK_TEMPLATES.DEPENDS_ON);
      assert.strictEqual(LINK_TEMPLATES.DEPENDS_ON.type, 'DEPENDS_ON');
    });
    
    it('should have SUPERSEDES template', () => {
      assert.ok(LINK_TEMPLATES.SUPERSEDES);
    });
    
    it('should have strength in all templates', () => {
      for (const [name, template] of Object.entries(LINK_TEMPLATES)) {
        assert.ok(template.strength, `${name} missing strength`);
      }
    });
    
    it('should have all required link templates', () => {
      const required = ['DEPENDS_ON', 'SUPERSEDES', 'IMPLEMENTS', 'TESTS', 'RELATES_TO', 'BLOCKS', 'LESSON_FROM', 'EVIDENCE_FOR', 'DERIVED_FROM'];
      for (const type of required) {
        assert.ok(LINK_TEMPLATES[type], `Missing link template: ${type}`);
      }
    });
    
  });

  describe('getEntityTemplate()', () => {
    
    it('should return template for valid type', () => {
      const template = getEntityTemplate('DECISION');
      assert.ok(template);
      assert.strictEqual(template.type, 'DECISION');
    });
    
    it('should return null for invalid type', () => {
      const template = getEntityTemplate('INVALID');
      assert.strictEqual(template, null);
    });
    
  });

  describe('getEventTemplate()', () => {
    
    it('should return template for valid type', () => {
      const template = getEventTemplate('CREATED');
      assert.ok(template);
      assert.strictEqual(template.type, 'CREATED');
    });
    
    it('should return null for invalid type', () => {
      const template = getEventTemplate('INVALID');
      assert.strictEqual(template, null);
    });
    
  });

  describe('getLinkTemplate()', () => {
    
    it('should return template for valid type', () => {
      const template = getLinkTemplate('DEPENDS_ON');
      assert.ok(template);
      assert.strictEqual(template.type, 'DEPENDS_ON');
    });
    
    it('should return null for invalid type', () => {
      const template = getLinkTemplate('INVALID');
      assert.strictEqual(template, null);
    });
    
  });

  describe('listEntityTemplates()', () => {
    
    it('should return array of template names', () => {
      const list = listEntityTemplates();
      assert.ok(Array.isArray(list));
      assert.ok(list.length >= 8);
    });
    
    it('should include DECISION', () => {
      const list = listEntityTemplates();
      assert.ok(list.includes('DECISION'));
    });
    
  });

  describe('listEventTemplates()', () => {
    
    it('should return array of template names', () => {
      const list = listEventTemplates();
      assert.ok(Array.isArray(list));
      assert.ok(list.length >= 8);
    });
    
  });

  describe('listLinkTemplates()', () => {
    
    it('should return array of template names', () => {
      const list = listLinkTemplates();
      assert.ok(Array.isArray(list));
      assert.ok(list.length >= 9);
    });
    
  });

  describe('createFromTemplate()', () => {
    
    it('should create entity from template', () => {
      const entity = createFromTemplate('DECISION', { title: 'Test Decision' });
      
      assert.strictEqual(entity.type, 'DECISION');
      assert.strictEqual(entity.lifecycle, 'ACTIVE');
      assert.strictEqual(entity.title, 'Test Decision');
    });
    
    it('should allow lifecycle override', () => {
      const entity = createFromTemplate('MODULE', { lifecycle: 'CERTIFIED' });
      
      assert.strictEqual(entity.lifecycle, 'CERTIFIED');
    });
    
    it('should include template fields', () => {
      const entity = createFromTemplate('BUG');
      
      assert.ok('severity' in entity);
      assert.ok('reproduction' in entity);
    });
    
    it('should throw for invalid template', () => {
      assert.throws(() => {
        createFromTemplate('INVALID');
      }, /Unknown entity template/);
    });
    
  });

});
