/**
 * OMEGA Profiles Tests — NASA-Grade L4
 * Tests for THE_SKEPTIC and reader profiles
 */
import { describe, it, expect } from "vitest";
import { PROFILE_SKEPTIC, READER_PROFILES } from "../src/profiles";

describe("THE_SKEPTIC Profile", () => {
  
  // INV-SKEP-01: Profile must exist and be complete
  it("should have all required fields", () => {
    expect(PROFILE_SKEPTIC.id).toBe("THE_SKEPTIC");
    expect(PROFILE_SKEPTIC.name).toBeDefined();
    expect(PROFILE_SKEPTIC.description).toBeDefined();
    expect(PROFILE_SKEPTIC.sensitivities).toBeDefined();
    expect(PROFILE_SKEPTIC.attributes).toBeDefined();
    expect(PROFILE_SKEPTIC.triggers).toBeDefined();
    expect(PROFILE_SKEPTIC.systemPrompt).toBeDefined();
    expect(PROFILE_SKEPTIC.feedbackStyle).toBeDefined();
  });

  // INV-SKEP-02: Consistency must be maximum (1.0)
  it("should have maximum consistency sensitivity", () => {
    expect(PROFILE_SKEPTIC.sensitivities.consistency).toBe(1.0);
  });

  // INV-SKEP-03: Causality tracking must be perfect (1.0)
  it("should have perfect causality tracking", () => {
    expect(PROFILE_SKEPTIC.attributes.causalityTracking).toBe(1.0);
  });

  // INV-SKEP-04: Must detect Deus Ex Machina
  it("should have DEUS_EX_MACHINA in triggers", () => {
    expect(PROFILE_SKEPTIC.triggers).toContain("DEUS_EX_MACHINA");
  });

  // All required triggers present
  it("should have all critical triggers", () => {
    const requiredTriggers = [
      "DEUS_EX_MACHINA",
      "CHARACTER_STUPIDITY",
      "PHYSICS_VIOLATION",
      "TIMELINE_ERROR",
      "PLOT_ARMOR"
    ];
    requiredTriggers.forEach(trigger => {
      expect(PROFILE_SKEPTIC.triggers).toContain(trigger);
    });
  });

  // Suspension of disbelief must be very low
  it("should have minimal suspension of disbelief", () => {
    expect(PROFILE_SKEPTIC.attributes.suspensionOfDisbelief).toBeLessThan(0.2);
  });

});

describe("READER_PROFILES Registry", () => {
  
  it("should export THE_SKEPTIC in registry", () => {
    expect(READER_PROFILES.THE_SKEPTIC).toBeDefined();
    expect(READER_PROFILES.THE_SKEPTIC.id).toBe("THE_SKEPTIC");
  });

});
