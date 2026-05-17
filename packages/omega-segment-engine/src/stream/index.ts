// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA NEXUS — Module Index (DEPRECATED, architecture migrée hors omega-segment-engine)
// ═══════════════════════════════════════════════════════════════════════════════
//
// 2026-05-17 (FRONT 1 ESM Reliquat S9.2-D, commit post 0369a9dc):
//
// L'architecture NEXUS originelle (DEP/Protocol/Gateway) référencée par
// l'ancienne version de ce fichier (lignes 1-187, header "Version: 1.0.0 FROZEN")
// a été déplacée hors de omega-segment-engine. Les modules './dep', './protocol',
// './gateway' n'existent plus dans ce dossier (Glob confirme : seuls
// stream_segmenter.ts, carry_buffer.ts, utf8_stream.ts présents).
//
// Empirique : 39 erreurs TS2300/TS2834 résolues par ce stub (l'ancien fichier
// re-exportait des types/modules inexistants ET avait paths imports sans .js).
// Verif : src/index.ts racine du package N'IMPORTE PAS ce fichier.
//        grep "from.*stream/index" → 0 match dans tout le repo.
//
// Ce fichier reste comme stub historique. Options futures :
//   A. Refonte NEXUS dans ce package → recréer dep.ts/protocol.ts/gateway.ts
//      puis restaurer les exports.
//   B. Suppression définitive → `Remove-Item src/stream/index.ts`.
//
// NCR à drafter S10+ : NCR_STREAM_INDEX_ORPHAN_NEXUS_DEPRECATED.
//
// ═══════════════════════════════════════════════════════════════════════════════

export {};
