#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
OMEGA Phase 14 — ORACLE Worker v2 (Stub)
═══════════════════════════════════════════════════════════════════════════════

Deterministic EmotionStateV2 generator for testing.
Returns structured emotion analysis without real LLM calls.

Usage: python oracle_worker_v2.py
Communication: NDJSON JSON-RPC 2.0 over stdin/stdout

@module py_worker/oracle_worker_v2
@version 3.14.0
"""

import sys
import json
import hashlib

EMOTION_V2_VERSION = "2.0.0"

# Deterministic emotion mappings based on text patterns
EMOTION_PATTERNS = {
    "fear": ["scared", "afraid", "terrified", "fear", "horror", "dread", "panic"],
    "anger": ["angry", "furious", "rage", "mad", "hate", "annoyed"],
    "sadness": ["sad", "depressed", "grief", "sorrow", "melancholy", "cry"],
    "joy": ["happy", "joy", "delighted", "excited", "wonderful", "love"],
    "surprise": ["surprised", "shocked", "amazed", "unexpected", "sudden"],
    "disgust": ["disgusted", "gross", "revolting", "sick", "repulsed"],
    "trust": ["trust", "believe", "faith", "confident", "rely"],
    "anticipation": ["waiting", "expect", "hope", "looking forward", "anticipate"],
    "love": ["love", "adore", "cherish", "romantic", "passion"],
    "shame": ["shame", "embarrassed", "humiliated", "mortified"],
    "guilt": ["guilt", "regret", "sorry", "remorse", "fault"],
    "envy": ["envy", "jealous", "covet", "resentful"],
    "pride": ["proud", "pride", "accomplished", "achievement"],
    "relief": ["relief", "relieved", "phew", "finally", "at last"],
}

FAMILY_MAP = {
    "joy": "joy_family",
    "love": "joy_family",
    "pride": "joy_family",
    "relief": "joy_family",
    "trust": "trust_family",
    "fear": "fear_family",
    "shame": "fear_family",
    "guilt": "fear_family",
    "surprise": "surprise_family",
    "anticipation": "surprise_family",
    "sadness": "sadness_family",
    "envy": "sadness_family",
    "disgust": "disgust_family",
    "anger": "anger_family",
}

POLARITY_MAP = {
    "joy": 1, "love": 1, "pride": 1, "relief": 1, "trust": 1,
    "surprise": 0, "anticipation": 0,
    "fear": -1, "anger": -1, "sadness": -1, "disgust": -1,
    "shame": -1, "guilt": -1, "envy": -1,
}


def send_response(response_id, result=None, error=None):
    """Send JSON-RPC response."""
    response = {"jsonrpc": "2.0", "id": response_id}
    if error:
        response["error"] = error
    else:
        response["result"] = result
    sys.stdout.write(json.dumps(response) + "\n")
    sys.stdout.flush()


def detect_emotions(text: str) -> list:
    """Detect emotions from text patterns (deterministic)."""
    text_lower = text.lower()
    detected = []
    
    for emotion, patterns in EMOTION_PATTERNS.items():
        count = sum(1 for p in patterns if p in text_lower)
        if count > 0:
            weight = min(1.0, count * 0.2 + 0.3)
            detected.append({
                "label": emotion,
                "family": FAMILY_MAP[emotion],
                "weight": round(weight, 2),
                "polarity": POLARITY_MAP[emotion],
            })
    
    # Default if nothing detected
    if not detected:
        detected.append({
            "label": "anticipation",
            "family": "surprise_family",
            "weight": 0.5,
            "polarity": 0,
        })
    
    # Sort by weight DESC
    detected.sort(key=lambda x: -x["weight"])
    
    return detected[:5]  # Max 5 emotions


def calculate_ambiguity(weights: list) -> float:
    """Calculate ambiguity from weights (deterministic)."""
    if len(weights) < 2:
        return 0.0
    
    sorted_w = sorted(weights, reverse=True)
    delta = sorted_w[0] - sorted_w[1]
    ambiguity = 1 - min(1, delta / 0.4)
    return round(max(0, min(1, ambiguity)), 2)


def calculate_valence_arousal(emotions: list) -> tuple:
    """Calculate aggregate valence and arousal."""
    if not emotions:
        return 0.0, 0.5
    
    total_weight = sum(e["weight"] for e in emotions)
    if total_weight == 0:
        return 0.0, 0.5
    
    valence = sum(e["polarity"] * e["weight"] for e in emotions) / total_weight
    arousal = min(1.0, total_weight * 0.5 + 0.3)
    
    return round(valence, 2), round(arousal, 2)


def analyze_emotion_v2(params: dict) -> dict:
    """Generate EmotionStateV2 from text."""
    trace_id = params.get("trace_id", "unknown")
    text = params.get("user_prompt", "")
    provider_id = params.get("provider_id", "oracle-stub-v2")
    
    # Detect emotions
    emotions = detect_emotions(text)
    weights = [e["weight"] for e in emotions]
    
    # Calculate metrics
    ambiguity = calculate_ambiguity(weights)
    valence, arousal = calculate_valence_arousal(emotions)
    dominant = emotions[0]["label"] if emotions else "anticipation"
    
    # Build EmotionStateV2
    result = {
        "schema_version": EMOTION_V2_VERSION,
        "trace_id": trace_id,
        "created_at_ms": 1000,  # Deterministic for testing
        "signals": [
            {
                "channel": "semantic",
                "valence": valence,
                "arousal": arousal,
                "confidence": 0.8,
            },
            {
                "channel": "lexical",
                "valence": valence * 0.9,
                "arousal": arousal * 0.95,
                "confidence": 0.7,
            },
        ],
        "appraisal": {
            "emotions": emotions,
            "dominant": dominant,
            "ambiguity": ambiguity,
            "valence_aggregate": valence,
            "arousal_aggregate": arousal,
        },
        "dynamics": {
            "inertia": 0.5,
            "volatility": 0.3,
            "trend": "stable",
            "rupture": False,
        },
        "narrative_role": {
            "function": "tension" if valence < 0 else "setup",
            "scope": "scene",
            "intentionality": "conscious",
            "weight": 0.7,
        },
        "legacy_plutchik": {
            "primary": dominant if dominant in ["joy", "trust", "fear", "surprise", 
                                                  "sadness", "disgust", "anger", "anticipation"] 
                       else "anticipation",
            "intensity": emotions[0]["weight"] if emotions else 0.5,
        },
        "model": {
            "provider_id": provider_id,
            "model_name": "oracle-stub-v2",
            "latency_ms": 15,
        },
        "rationale": f"Detected {len(emotions)} emotion(s). Dominant: {dominant} "
                     f"(weight={emotions[0]['weight'] if emotions else 0.5}). "
                     f"Valence={valence}, Arousal={arousal}.",
        "input_hash": hashlib.sha256(text.encode()).hexdigest()[:16].upper(),
        "cached": False,
        "calibrated": False,
    }
    
    return result


def main():
    """Main loop: read JSON-RPC requests, process, respond."""
    # Signal ready
    sys.stdout.write("READY\n")
    sys.stdout.flush()
    
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        
        try:
            request = json.loads(line)
        except json.JSONDecodeError as e:
            send_response(None, error={
                "code": -32700,
                "message": "Parse error",
                "data": str(e),
            })
            continue
        
        request_id = request.get("id")
        method = request.get("method")
        params = request.get("params", {})
        
        if method == "oracle_analyze":
            try:
                result = analyze_emotion_v2(params)
                # Return as JSON string (bridge expects string response)
                send_response(request_id, json.dumps(result))
            except Exception as e:
                send_response(request_id, error={
                    "code": -32000,
                    "message": "Analysis failed",
                    "data": str(e),
                })
        
        elif method == "ping":
            send_response(request_id, "pong")
        
        elif method == "shutdown":
            send_response(request_id, "ok")
            break
        
        else:
            send_response(request_id, error={
                "code": -32601,
                "message": "Method not found",
                "data": method,
            })


if __name__ == "__main__":
    main()
