# Profiling Guide — OMEGA

**Version**: 1.0.0
**Standard**: NASA-Grade L4
**Last Updated**: 2026-01-20

---

## Overview

This guide covers CPU and memory profiling for OMEGA performance analysis.

---

## CPU Profiling

### Quick Start

```bash
# Run profiling (generates .cpuprofile)
bash scripts/profile.sh

# Analyze results
npx tsx scripts/analyze-profile.ts profiling-results/cpu-profile-*.cpuprofile
```

### Manual Profiling

```bash
# Profile with Node.js built-in profiler
node --cpu-prof --cpu-prof-dir=profiling-results \
  --import tsx \
  nexus/bench/run-all.ts profiling-results/bench.json
```

### Analyze with Chrome DevTools

1. Open Chrome browser
2. Navigate to `chrome://inspect`
3. Click "Open dedicated DevTools for Node"
4. Go to "Profiler" tab
5. Click "Load" button
6. Select `profiling-results/cpu-profile-*.cpuprofile`

### Interpret Results

**Flame Graph**:
- Width = time spent in function
- Height = call stack depth
- Color = function category

**Key Metrics**:
- **Self Time**: Time spent in function itself (excluding callees)
- **Total Time**: Time in function + all callees

**Bottleneck Indicators**:
- Functions with >15% self time
- Unexpected hot spots
- Deep call stacks with high total time

---

## Memory Profiling

### Heap Snapshots

```bash
# Run with inspector
node --inspect --import tsx nexus/bench/run-all.ts
```

Then in Chrome DevTools:
1. Open `chrome://inspect`
2. Click "inspect" on your Node process
3. Go to "Memory" tab
4. Click "Take heap snapshot"

### Compare Snapshots

1. Take snapshot before operation
2. Run operation
3. Take snapshot after operation
4. Select "Comparison" view
5. Look for objects that grew significantly

### Memory Leak Detection

Indicators of leaks:
- Retained size growing over time
- Objects not being garbage collected
- Unexpected object counts

---

## Profiling Workflow

### Phase B.2 Standard Process

1. **Run Profiling**
   ```bash
   bash scripts/profile.sh
   ```

2. **Analyze Results**
   ```bash
   npx tsx scripts/analyze-profile.ts profiling-results/cpu-profile-*.cpuprofile
   ```

3. **Document Findings**
   Create/update `profiling-results/FINDINGS.md`

4. **Decision Gate**
   - If bottleneck >15%: Continue to Phase B.4
   - If no bottleneck: Skip B.4 → Phase C.1

---

## Findings Template

Copy to `profiling-results/FINDINGS.md`:

```markdown
# Profiling Findings — v5.4.x

**Date**: YYYY-MM-DD
**Profile**: cpu-profile-TIMESTAMP.cpuprofile

## CPU Profile Analysis

### Top Functions by Self Time

| Function | Self Time % | Status |
|----------|-------------|--------|
| (fill in from analyzer output) | | |

### Bottlenecks Identified

*None identified > 15% threshold*

OR

*[Function X] consumes XX% CPU → Optimization candidate*

## Memory Profile

### Heap Usage

- Baseline: X MB
- Peak: Y MB
- Leaks: None detected / [describe if found]

## Recommendations

- [ ] (List any recommended optimizations)

## Conclusion

**Phase B.4 Required**: YES / NO

If YES, describe optimization targets.
If NO, proceed to Phase C.1.
```

---

## Performance Targets

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Single function self time | <10% | >15% |
| GC pause time | <50ms | >100ms |
| Heap growth per operation | <1MB | >10MB |
| Memory leaks | None | Any |

---

## Tools Reference

### Built-in Node.js

```bash
# CPU profiling
node --cpu-prof script.js

# Heap profiling
node --heap-prof script.js

# V8 profiling
node --prof script.js
```

### Chrome DevTools

- Profiler: CPU analysis
- Memory: Heap snapshots
- Performance: Timeline view

### Third-Party

- `clinic.js`: Automated profiling
- `0x`: Flame graph generation
- `heapdump`: Programmatic heap dumps

---

## Best Practices

1. **Profile in Production-like Environment**
   - Same Node.js version
   - Similar data sizes
   - Warm up before measuring

2. **Multiple Runs**
   - Profile multiple times
   - Look for consistent patterns
   - Ignore one-off spikes

3. **Focused Profiling**
   - Profile specific operations
   - Isolate hot paths
   - Compare before/after

4. **Document Everything**
   - Save all profiles
   - Record environment details
   - Note any anomalies

---

## Troubleshooting

### Profile File Too Large

```bash
# Increase sampling interval
node --cpu-prof --cpu-prof-interval=100 script.js
```

### No Profile Generated

Check:
- Node.js version (v12+)
- Write permissions to output directory
- Script completed without crash

### Memory Issues During Profiling

```bash
# Increase heap size
node --max-old-space-size=4096 --cpu-prof script.js
```

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-20 | Phase B Industrial | Initial profiling guide |
