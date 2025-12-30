import { useState, useEffect } from "react";
import { 
  EmotionEngine, 
  EmotionState, 
  EmotionType, 
  EMOTION_PRESETS,
  EMOTION_CONTAMINATIONS 
} from "../lib/emotion_engine";

const EMOTION_COLORS: Record<string, string> = {
  joy: "#FFD700", sadness: "#4169E1", anger: "#DC143C", fear: "#800080",
  surprise: "#FF69B4", disgust: "#228B22", trust: "#20B2AA", anticipation: "#FF8C00",
  love: "#FF1493", pride: "#DAA520", guilt: "#8B4513", shame: "#708090",
  hope: "#98FB98", despair: "#2F4F4F"
};

const EMOTION_LABELS: Record<string, string> = {
  joy: "JOY", sadness: "SAD", anger: "ANGER", fear: "FEAR",
  surprise: "WOW", disgust: "YUCK", trust: "TRUST", anticipation: "HYPE",
  love: "LOVE", pride: "PRIDE", guilt: "GUILT", shame: "SHAME",
  hope: "HOPE", despair: "DESPAIR"
};

interface Props { onBack: () => void; }

function EmotionSimulator({ onBack }: Props) {
  const [emotion, setEmotion] = useState<EmotionState>(EmotionEngine.presets.standard_anger());
  const [isRunning, setIsRunning] = useState(false);
  const [history, setHistory] = useState<{time: number, intensity: number}[]>([]);
  const [highIntensityDuration, setHighIntensityDuration] = useState(0);

  // Decay automatique
  useEffect(() => {
    if (!isRunning) return;
    
    const interval = setInterval(() => {
      setEmotion(prev => {
        const updated = EmotionEngine.decay(prev, 100);
        setHistory(h => [...h.slice(-50), { time: Date.now(), intensity: updated.intensity }]);
        
        // Track high intensity duration
        if (updated.intensity >= 0.7) {
          setHighIntensityDuration(d => d + 100);
        } else {
          setHighIntensityDuration(0);
        }
        
        return updated;
      });
    }, 100);
    
    return () => clearInterval(interval);
  }, [isRunning]);

  // Check contamination
  useEffect(() => {
    if (highIntensityDuration >= 30000 && emotion.intensity >= 0.7) {
      const contaminated = EmotionEngine.checkContamination(emotion, highIntensityDuration);
      if (contaminated) {
        setEmotion(contaminated);
        setHighIntensityDuration(0);
        alert(`CONTAMINATION: ${emotion.type} -> ${contaminated.type}`);
      }
    }
  }, [highIntensityDuration, emotion]);

  const handleStimulate = (amount: number) => {
    setEmotion(prev => EmotionEngine.stimulate(prev, amount));
  };

  const handlePreset = (preset: keyof typeof EMOTION_PRESETS) => {
    setEmotion(EMOTION_PRESETS[preset]());
    setHistory([]);
    setHighIntensityDuration(0);
  };

  const handleChangeType = (type: EmotionType) => {
    setEmotion(prev => ({ ...prev, type, last_update: Date.now() }));
  };

  const handleChangeMass = (mass: number) => {
    setEmotion(prev => ({ ...prev, mass, last_update: Date.now() }));
  };

  const contamination = EMOTION_CONTAMINATIONS[emotion.type];

  return (
    <div className="emotion-simulator">
      <div className="simulator-header">
        <button className="btn btn-secondary" onClick={onBack}>Retour</button>
        <h2>Simulateur Emotion Engine</h2>
        <button 
          className={`btn ${isRunning ? "btn-danger" : "btn-success"}`}
          onClick={() => setIsRunning(!isRunning)}
        >
          {isRunning ? "STOP" : "START"} Decay
        </button>
      </div>

      <div className="simulator-grid">
        {/* Panneau gauche: Controles */}
        <div className="simulator-controls">
          <h3>Presets</h3>
          <div className="preset-buttons">
            <button onClick={() => handlePreset("fleeting_joy")}>Joie fugace</button>
            <button onClick={() => handlePreset("standard_anger")}>Colere standard</button>
            <button onClick={() => handlePreset("deep_grief")}>Deuil profond</button>
            <button onClick={() => handlePreset("trauma_fear")}>Trauma</button>
            <button onClick={() => handlePreset("profound_love")}>Amour profond</button>
          </div>

          <h3>Type</h3>
          <select 
            value={emotion.type} 
            onChange={(e) => handleChangeType(e.target.value as EmotionType)}
            className="type-select"
          >
            {Object.keys(EMOTION_COLORS).map(t => (
              <option key={t} value={t}>{EMOTION_LABELS[t]} ({t})</option>
            ))}
          </select>

          <h3>Masse: {emotion.mass.toFixed(1)}</h3>
          <input 
            type="range" min="0.1" max="10" step="0.1" 
            value={emotion.mass}
            onChange={(e) => handleChangeMass(parseFloat(e.target.value))}
          />
          <p className="hint">Plus massive = plus lente a changer</p>

          <h3>Stimulus</h3>
          <div className="stimulus-buttons">
            <button onClick={() => handleStimulate(0.1)}>+10%</button>
            <button onClick={() => handleStimulate(0.25)}>+25%</button>
            <button onClick={() => handleStimulate(0.5)}>+50%</button>
            <button onClick={() => handleStimulate(-0.2)}>-20%</button>
          </div>
        </div>

        {/* Panneau droit: Visualisation */}
        <div className="simulator-display">
          <div 
            className="emotion-orb"
            style={{
              backgroundColor: EMOTION_COLORS[emotion.type],
              transform: `scale(${0.5 + emotion.intensity * 0.5})`,
              opacity: 0.3 + emotion.intensity * 0.7
            }}
          >
            <span className="orb-label">{EMOTION_LABELS[emotion.type]}</span>
            <span className="orb-intensity">{(emotion.intensity * 100).toFixed(0)}%</span>
          </div>

          <div className="emotion-stats">
            <div className="stat-row">
              <span>Intensite:</span>
              <div className="stat-bar">
                <div 
                  className="stat-fill" 
                  style={{ 
                    width: `${emotion.intensity * 100}%`,
                    backgroundColor: EMOTION_COLORS[emotion.type]
                  }} 
                />
              </div>
              <span>{(emotion.intensity * 100).toFixed(1)}%</span>
            </div>
            <div className="stat-row">
              <span>Masse:</span>
              <span>{emotion.mass.toFixed(2)}</span>
            </div>
            <div className="stat-row">
              <span>Inertie:</span>
              <span>{(emotion.inertia * 100).toFixed(0)}%</span>
            </div>
            <div className="stat-row">
              <span>Decay:</span>
              <span>{emotion.decay_rate.toFixed(3)}/s</span>
            </div>
            <div className="stat-row">
              <span>Baseline:</span>
              <span>{(emotion.baseline * 100).toFixed(0)}%</span>
            </div>
          </div>

          {emotion.intensity >= 0.7 && (
            <div className="contamination-warning">
              <span>INTENSITE HAUTE depuis {(highIntensityDuration / 1000).toFixed(0)}s</span>
              <span>Contamination vers: {contamination}</span>
              <div className="contamination-progress">
                <div 
                  className="contamination-fill"
                  style={{ width: `${Math.min(100, (highIntensityDuration / 30000) * 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="history-graph">
            <h4>Historique intensite</h4>
            <div className="graph-container">
              {history.map((h, i) => (
                <div 
                  key={i}
                  className="graph-bar"
                  style={{ 
                    height: `${h.intensity * 100}%`,
                    backgroundColor: EMOTION_COLORS[emotion.type]
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="formulas">
        <h3>Formules OMEGA</h3>
        <code>DECAY: E = baseline + (intensity - baseline) x e^(-decay_rate x time / mass)</code>
        <code>STIMULUS: E = intensity + stimulus x (1 - inertia)</code>
      </div>
    </div>
  );
}

export default EmotionSimulator;

