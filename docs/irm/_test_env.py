import sys
print("Python:", sys.version)
try:
    import pandas; print("pandas:", pandas.__version__)
except: print("pandas: NOT AVAILABLE")
try:
    import numpy; print("numpy:", numpy.__version__)
except: print("numpy: NOT AVAILABLE")
try:
    import json; print("json: OK")
except: print("json: NOT AVAILABLE")
