# Prediction Report — Out-of-Sample Validation

## Summary

| Split | Train | Test | Overall MAE | Threshold | Verdict |
|-------|------:|-----:|------------:|----------:|---------|
| split_1_random | 24,336 | 6,084 | 0.057911 | 0.05 | **FAIL** |
| split_2_author | 20,660 | 9,760 | 0.053458 | 0.08 | **PASS** |
| split_3_language | 19,660 | 3,560 | 0.062169 | 0.1 | **PASS** |
| split_4_period | 7,900 | 3,380 | 0.058864 | 0.1 | **PASS** |

## Per-Category Detail

### split_1_random

| Category | MAE | R² |
|----------|----:|---:|
| MUSICALITE | 0.234199 | 0.230966 |
| COMPLEXITE | 0.003828 | 0.463917 |
| SENSORIEL | 0.005838 | 0.053317 |
| LEXICAL | 0.006947 | 0.502622 |
| INTERIORITE | 0.009934 | 0.478816 |
| TENSION | 0.086719 | 0.300684 |

### split_2_author

| Category | MAE | R² |
|----------|----:|---:|
| MUSICALITE | 0.207456 | 0.478200 |
| COMPLEXITE | 0.003646 | 0.500312 |
| SENSORIEL | 0.005714 | 0.123681 |
| LEXICAL | 0.007398 | 0.497727 |
| INTERIORITE | 0.010482 | 0.468668 |
| TENSION | 0.086050 | 0.322743 |

### split_3_language

| Category | MAE | R² |
|----------|----:|---:|
| MUSICALITE | 0.228246 | 0.284430 |
| COMPLEXITE | 0.004090 | 0.526754 |
| SENSORIEL | 0.006261 | 0.203734 |
| LEXICAL | 0.007223 | 0.403901 |
| INTERIORITE | 0.013183 | -1.447863 |
| TENSION | 0.114012 | 0.328688 |

### split_4_period

| Category | MAE | R² |
|----------|----:|---:|
| MUSICALITE | 0.240480 | 0.265125 |
| COMPLEXITE | 0.003871 | 0.408480 |
| SENSORIEL | 0.005264 | 0.091484 |
| LEXICAL | 0.007485 | 0.508034 |
| INTERIORITE | 0.010487 | 0.521791 |
| TENSION | 0.085597 | 0.337319 |
