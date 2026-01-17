# OMEGA CLI RUNBOOK — Chapter 10/11
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
npm run omega:build
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

## Ergonomic CLI Usage (RECOMMENDED)

From the project root, use the `npm run omega` command:

```powershell
cd C:\Users\elric\omega-project

# Analyze French text
npm run omega -- analyze "nexus/user_imputs/test.txt" --lang fr

# Analyze English text
npm run omega -- analyze "path/to/file.txt" --lang en

# Output as Markdown
npm run omega -- analyze "path/to/file.txt" --lang fr --output md

# Output both JSON and MD, save to files
npm run omega -- analyze "path/to/file.txt" --lang fr --output both --save "output_name"

# Get help
npm run omega -- --help
npm run omega -- analyze --help
```

---

## Language Support

OMEGA CLI supports multiple languages for emotion detection:

| Language | Flag | Keywords Config |
|----------|------|-----------------|
| English  | `--lang en` | gateway/cli-runner/src/cli/lang/en.ts |
| French   | `--lang fr` | gateway/cli-runner/src/cli/lang/fr.ts |

Default: English (`en`)

French keywords include accent normalization (é→e, è→e, etc.) for robust matching.

---

## Analyze a Text File (Advanced)

### Direct Node Execution

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
npm run omega -- analyze "path\to\your\file.txt" --verbose
```

### Save to File

```powershell
npm run omega -- analyze "path\to\your\file.txt" --output both --save "my_analysis"
# Creates: my_analysis.json and my_analysis.md
```

---

## Example: Analyze the French Novel

```powershell
cd C:\Users\elric\omega-project

# French analysis with Markdown output
npm run omega -- analyze "nexus/user_imputs/test.txt" --lang fr --output md

# French analysis, save both formats
npm run omega -- analyze "nexus/user_imputs/test.txt" --lang fr --output both --save "roman_analysis_fr"
```

Expected output (French novel):
- **Words**: 83,121
- **Keywords detected**: 1,844
- **Dominant emotion**: trust (94.7%)
- **Overall intensity**: 27.7%

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
