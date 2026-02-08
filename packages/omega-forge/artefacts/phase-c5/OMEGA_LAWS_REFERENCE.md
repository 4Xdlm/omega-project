# OMEGA V4.4 — Laws Reference (Compact)

## State Space

Omega(t) = (X(t), Y(t), Z(t))
- X = Valence [-10, +10], X0 = 0 (neutral)
- Y = Intensity [0, 100]
- Z = Persistence [0, C] where C = saturation capacity

Internal space: R14 (Plutchik-extended)
{joy, trust, fear, surprise, sadness, disgust, anger, anticipation, love, submission, awe, disapproval, remorse, contempt}

## Law 1 — Emotional Inertia

|F| > M x R

- F = narrative force (from beat/event)
- M = inertia mass of dominant emotion
- R = resistance (proportional to state change magnitude)
- If F <= M x R: transition is FORCED (violation)

## Law 2 — Simple Dissipation

I(t) = I0 x e^(-lambda x t)

- Simple case: M=1, kappa=1, E0=0, zeta>=1
- Intensity decays exponentially when no stimulus

## Law 3 — Emotional Feasibility

F >= threshold(from, to)

- threshold = proportional to delta_X + delta_Y
- If force < threshold: dissonant/forced emotion
- Each transition must be justified by narrative event

## Law 4 — Organic Decay (V4.4 Core)

I(t) = E0 + (I0 - E0) x e^(-lambda_eff x t) x cos(omega x t + phi)

- lambda_eff = lambda_base x (1 - mu x Z(t)/C)
- mu = fatigue coefficient (hysteresis)
- omega = natural frequency (underdamped oscillation)
- phi = initial phase

Regimes:
- zeta < 1: Underdamped (oscillations, emotional rechutes)
- zeta = 1: Critical (optimal return to rest)
- zeta > 1: Overdamped (slow return, no oscillation)

Burnout: Z -> C causes lambda_eff -> 0 (dissipation blocked)

## Law 5 — Flux Conservation

Delta_Phi_Total = Phi_Trans + Phi_Stock(Delta) + Phi_Diss

- Phi_transferred: energy moved across transitions
- Phi_stored: energy stored as persistence (Z)
- Phi_dissipated: energy lost to natural decay
- Balance error should be approximately 0

## Law 6 — Affective Synthesis

A + B -> C if Phi_A + Phi_B > Threshold_Sigma

- M_Sigma = sqrt(M1^2 + M2^2) + beta
- Two emotions can fuse into a third if combined flux exceeds threshold
- beta = synthesis bonus parameter

## Canonical Table Parameters

| Parameter | Symbol | Range | Description |
|-----------|--------|-------|-------------|
| Mass | M | (0, 10] | Inertia/resistance to change |
| Decay | lambda | (0, 1] | Dissipation rate |
| Speed | kappa | (0, 2] | Onset speed |
| Rest | E0 | [0, 4] | Equilibrium state |
| Damping | zeta | (0, 2] | Oscillation control |
| Fatigue | mu | [0, 0.4] | Hysteresis coefficient |

## Distances

- cosineSimilarity14D: <a,b> / (||a|| x ||b||)
- euclideanDistance14D: sqrt(sum((a[i]-b[i])^2))
- vadDistance: sqrt((v1-v2)^2 + (a1-a2)^2 + (d1-d2)^2)
- valence: sum(polarity[i] x e[i])
- dominant: argmax(e[i])
