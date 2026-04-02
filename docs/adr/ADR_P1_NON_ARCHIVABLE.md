# ADR: Fichiers évalués pour archivage — P1
Date: 2026-04-02

## prompt-assembler-v2.ts — NON ARCHIVABLE
Raison : Toujours importé par engine.ts:40, index.ts:94, scribe-orchestrator.ts:39
Fonction utilisée : buildSovereignPrompt (pipeline V2, pas encore migré vers V4 partout)
Action future : Migrer engine.ts et scribe-orchestrator vers prompt-assembler-v4
Prérequis : Vérifier que V4 expose la même interface que buildSovereignPrompt

## polish/ (musical-engine, anti-cliche-sweep, signature-enforcement) — NON ARCHIVABLE
Raison : Utilisés par sovereign-pipeline.ts (OFFLINE benchmark)
Fonctions : applyMusicalPolishOffline, sweepClichesOffline, enforceSignatureOffline
Note : Dans engine.ts (LIVE), les imports sont commentés (NO-OP prouvé Sprint 2)
       Mais dans sovereign-pipeline.ts (OFFLINE), ils sont ACTIFS
Action future : Décider si le pipeline OFFLINE doit aussi les désactiver

## compat/version-guard.ts — NON ARCHIVABLE
Raison : Re-exporté depuis index.ts:219 (API publique du package)
Fonction : assertVersion2

## compat/brief-compat-guard.ts — NON ARCHIVABLE (DOUTE P0)
Raison : Importé par test ssot/sprint4-invariants.test.ts:14
Fonctions : checkBriefSchemaVersion, BRIEF_COMPAT_WINDOW

## ollama-provider.ts — ARCHIVÉ (P1-02)
Raison : 0 imports actifs dans src/. BLOC7 a rejeté le pipeline hybride.
Déplacé vers : src/runtime/archive/ollama-provider.ts
