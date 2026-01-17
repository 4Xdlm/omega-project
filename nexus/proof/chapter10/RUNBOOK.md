# OMEGA CLI RUNBOOK — Chapter 10
**Date**: 2026-01-17
**Standard**: NASA-Grade L4 / DO-178C aligned

---

## Prerequisites

- Node.js v18.0.0+
- npm v8.0.0+

---

## Installation

```powershell
# Clone repository (if not already done)
git clone https://github.com/4Xdlm/omega-project.git
cd omega-project

# Install dependencies
npm install

# Build CLI
cd gateway/cli-runner
npm run build
```

---

## Run Tests

```powershell
# From project root
cd C:\Users\elric\omega-project
npm test
```

Expected: 1389+ tests pass

---

## Analyze a Text File

### Basic JSON Output

```powershell
cd C:\Users\elric\omega-project\gateway\cli-runner
node dist/cli/runner.js analyze "path\to\your\file.txt" --output json
```

### Markdown Output

```powershell
node dist/cli/runner.js analyze "path\to\your\file.txt" --output md
```

### Verbose Mode

```powershell
node dist/cli/runner.js analyze "path\to\your\file.txt" --verbose
```

### Save to File

```powershell
node dist/cli/runner.js analyze "path\to\your\file.txt" --output json > analysis.json
node dist/cli/runner.js analyze "path\to\your\file.txt" --output md > analysis.md
```

---

## Example: Analyze the Novel

```powershell
# Analyze "Résidence Riviera" novel
cd C:\Users\elric\omega-project\gateway\cli-runner

# JSON output
node dist/cli/runner.js analyze "C:\Users\elric\omega-project\nexus\user_imputs\test.txt" --output json

# Markdown output
node dist/cli/runner.js analyze "C:\Users\elric\omega-project\nexus\user_imputs\test.txt" --output md
```

---

## Output Format

### JSON Output Structure

```json
{
  "input": {
    "path": "...",
    "absolutePath": "...",
    "bytes": 512758,
    "sha256": "..."
  },
  "analysis": {
    "summary": {
      "wordCount": 83121,
      "sentenceCount": 12472,
      "dominantEmotion": "surprise",
      "overallIntensity": 0
    },
    "emotions": [
      { "emotion": "joy", "intensity": 0, "confidence": 0.045 },
      ...
    ],
    "excerpt": "..."
  },
  "metadata": {
    "timestamp": "...",
    "seed": 42,
    "version": "3.16.0"
  },
  "errors": []
}
```

### Markdown Output

Contains:
- File metadata (path, size, SHA256)
- Statistics (word count, sentence count, dominant emotion)
- Emotion breakdown table
- Text excerpt

---

## CLI Help

```powershell
node dist/cli/runner.js --help
node dist/cli/runner.js analyze --help
```

---

## Troubleshooting

### "Command not found"

Ensure you're in the `gateway/cli-runner` directory and have built the CLI:

```powershell
cd gateway/cli-runner
npm run build
```

### "File not found"

Use absolute paths or verify the file exists:

```powershell
Get-Item "C:\path\to\file.txt"
```

---

**Version**: 3.16.0
**Prepared by**: Claude Code (IA Principal)
