#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
OMEGA Phase 14 — LLM Worker Stub
═══════════════════════════════════════════════════════════════════════════════

NASA-grade Python worker for IPC testing.
- JSON-RPC 2.0 over NDJSON (stdout)
- Logs on stderr only
- Handshake with protocol version
- Heartbeat support

@module llm_worker_stub
@version 3.14.0
"""

import sys
import json
import time
import uuid

# Protocol version must match TypeScript side
PROTOCOL_VERSION = "1.0.0"
WORKER_ID = str(uuid.uuid4())[:8]

def log(msg: str) -> None:
    """Write log to stderr (non-protocol)"""
    sys.stderr.write(f"[worker:{WORKER_ID}] {msg}\n")
    sys.stderr.flush()

def send(obj: dict) -> None:
    """Send JSON-RPC response (NDJSON)"""
    sys.stdout.write(json.dumps(obj) + "\n")
    sys.stdout.flush()

def send_result(req_id: int, result) -> None:
    """Send success response"""
    send({"jsonrpc": "2.0", "id": req_id, "result": result})

def send_error(req_id: int, code: int, message: str, data=None) -> None:
    """Send error response"""
    error = {"code": code, "message": message}
    if data is not None:
        error["data"] = data
    send({"jsonrpc": "2.0", "id": req_id, "error": error})

def handshake() -> None:
    """Send READY handshake with protocol version"""
    handshake_msg = {
        "type": "READY",
        "protocol_version": PROTOCOL_VERSION,
        "worker_id": WORKER_ID,
        "capabilities": ["echo", "sleep", "ping", "compute"]
    }
    sys.stdout.write(json.dumps(handshake_msg) + "\n")
    sys.stdout.flush()
    log(f"Handshake sent: v{PROTOCOL_VERSION}")

def handle_ping(req_id: int, params: dict) -> None:
    """Handle ping request"""
    send_result(req_id, {"pong": True, "timestamp": time.time()})

def handle_heartbeat(req_id: int, params: dict) -> None:
    """Handle heartbeat request"""
    send_result(req_id, {"alive": True, "uptime_ms": int(time.time() * 1000)})

def handle_echo(req_id: int, params: dict) -> None:
    """Echo back params"""
    send_result(req_id, params)

def handle_sleep(req_id: int, params: dict) -> None:
    """Sleep for specified ms"""
    ms = int(params.get("ms", 0))
    time.sleep(ms / 1000.0)
    send_result(req_id, {"slept_ms": ms})

def handle_compute(req_id: int, params: dict) -> None:
    """Simulate compute operation"""
    op = params.get("op", "add")
    a = params.get("a", 0)
    b = params.get("b", 0)
    
    if op == "add":
        result = a + b
    elif op == "multiply":
        result = a * b
    elif op == "divide":
        if b == 0:
            send_error(req_id, -32602, "Division by zero")
            return
        result = a / b
    else:
        send_error(req_id, -32602, f"Unknown operation: {op}")
        return
    
    send_result(req_id, {"result": result, "op": op})

def handle_error_test(req_id: int, params: dict) -> None:
    """Intentionally return an error (for testing)"""
    code = int(params.get("code", -32000))
    message = params.get("message", "Test error")
    data = params.get("data")
    send_error(req_id, code, message, data)

def handle_crash_test(req_id: int, params: dict) -> None:
    """Intentionally crash (for testing)"""
    log("CRASH TEST - exiting!")
    sys.exit(1)

# Method registry
METHODS = {
    "ping": handle_ping,
    "__heartbeat__": handle_heartbeat,
    "echo": handle_echo,
    "sleep": handle_sleep,
    "compute": handle_compute,
    "error_test": handle_error_test,
    "crash_test": handle_crash_test,
}

def process_request(line: str) -> None:
    """Process a single JSON-RPC request"""
    try:
        req = json.loads(line)
    except json.JSONDecodeError as e:
        log(f"JSON parse error: {e}")
        # Can't send error without valid id
        return
    
    # Validate JSON-RPC
    if req.get("jsonrpc") != "2.0":
        log(f"Invalid jsonrpc version: {req.get('jsonrpc')}")
        return
    
    req_id = req.get("id")
    if not isinstance(req_id, int) or req_id < 1:
        log(f"Invalid request id: {req_id}")
        return
    
    method = req.get("method")
    if not isinstance(method, str):
        send_error(req_id, -32600, "Method must be string")
        return
    
    params = req.get("params", {})
    if params is None:
        params = {}
    
    # Route to handler
    handler = METHODS.get(method)
    if handler is None:
        send_error(req_id, -32601, f"Method not found: {method}", method)
        return
    
    try:
        handler(req_id, params)
    except Exception as e:
        log(f"Handler error: {e}")
        send_error(req_id, -32603, f"Internal error: {str(e)}")

def main() -> None:
    """Main loop"""
    log("Starting worker...")
    
    # Send handshake
    handshake()
    
    # Process requests from stdin
    for line in sys.stdin:
        line = line.strip()
        if not line:
            continue
        
        process_request(line)
    
    log("Worker exiting (stdin closed)")

if __name__ == "__main__":
    main()
