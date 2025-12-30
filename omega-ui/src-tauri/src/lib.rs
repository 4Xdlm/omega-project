// ═══════════════════════════════════════════════════════════════════════════════
// OMEGA Modules — Sprint A Pipeline IA
// ═══════════════════════════════════════════════════════════════════════════════
pub mod error;
pub mod ai;
pub mod pipeline;
pub mod modules;
mod lexicon_fr_gold;

// ???????????????????????????????????????????????????????????????????????????
// OMEGA UI v0.7.2 ? Keyword Counts
// ???????????????????????????????????????????????????????????????????????????

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::time::Instant;
use chrono::{Utc, Local};
use std::collections::HashMap;
use sha2::{Sha256, Digest};
use regex::Regex;

// ?????????????????????????????????????????????????????????????????????????????
// TYPES v0.7.2
// ?????????????????????????????????????????????????????????????????????????????

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SegmentationOptions {
    pub mode: String,
    pub fixed_words: Option<usize>,
    pub min_segment_words: Option<usize>,
    pub max_segments: Option<usize>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AnalyzeOptions {
    pub language: Option<String>,
    pub normalize: Option<bool>,
    pub segmentation: Option<SegmentationOptions>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AnalyzeInput {
    pub text: String,
    pub source: Option<String>,
    pub options: Option<AnalyzeOptions>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct KeywordCount {
    pub word: String,
    pub count: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct EmotionStat {
    pub emotion: String,
    pub intensity: f64,
    pub occurrences: usize,
    pub keywords: Vec<String>,
    pub keyword_counts: Vec<KeywordCount>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SegmentResult {
    pub id: String,
    pub index: usize,
    pub title: String,
    pub word_start: usize,
    pub word_end: usize,
    pub word_count: usize,
    pub char_start: usize,
    pub char_end: usize,
    pub duration_ms: u64,
    pub total_emotion_hits: usize,
    pub emotions: Vec<EmotionStat>,
    pub dominant_emotion: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SegmentationInfo {
    pub mode: String,
    pub fixed_words: usize,
    pub min_segment_words: usize,
    pub segments_count: usize,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AnalyzeResult {
    pub timestamp: String,
    pub duration_ms: u64,
    pub source: String,
    pub word_count: usize,
    pub char_count: usize,
    pub line_count: usize,
    pub total_emotion_hits: usize,
    pub emotions: Vec<EmotionStat>,
    pub dominant_emotion: Option<String>,
    pub version: String,
    pub segmentation: Option<SegmentationInfo>,
    pub segments: Option<Vec<SegmentResult>>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct InputMeta {
    pub source: String,
    pub sha256: String,
    pub word_count: usize,
    pub char_count: usize,
    pub timestamp: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HistoryItem {
    pub id: String,
    pub timestamp: String,
    pub source: String,
    pub dominant_emotion: Option<String>,
    pub duration_ms: u64,
    pub word_count: usize,
    pub total_emotion_hits: usize,
    pub path: String,
    pub segments_count: Option<usize>,
    pub segmentation_mode: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct HistoryIndex {
    pub schema: String,
    pub items: Vec<HistoryItem>,
}

// ?????????????????????????????????????????????????????????????????????????????
// EMOTION KEYWORDS (sans "mad")
// ?????????????????????????????????????????????????????????????????????????????

fn get_emotion_keywords() -> HashMap<&'static str, Vec<&'static str>> {
    let mut map = HashMap::new();
    map.insert("joy", vec!["heureux", "joie", "bonheur", "content", "ravi", "sourire", "rire", "happy", "joy", "glad", "adore", "super", "genial", "excellent", "parfait", "magnifique", "merveilleux", "bravo", "victoire", "gagne", "fete", "celebrer", "plaisir", "rejoui", "enthousiaste", "enchante"]);
    map.insert("sadness", vec!["triste", "tristesse", "pleurer", "larmes", "chagrin", "melancolie", "deprime", "sad", "unhappy", "malheureux", "desole", "peine", "douleur", "perdu", "seul", "abandonne", "sombre", "desespere", "accable", "abattu", "morose"]);
    map.insert("anger", vec!["colere", "furieux", "enerve", "rage", "agace", "irrite", "angry", "furious", "deteste", "haine", "hair", "insupportable", "marre", "suffit", "revolte", "indigne", "exaspere", "fulmine", "enrage"]);
    map.insert("fear", vec!["peur", "effraye", "terrifie", "anxieux", "inquiet", "panique", "afraid", "scared", "terrified", "crainte", "angoisse", "trembler", "danger", "menace", "horrifie", "effroi", "redoute", "apprehension", "frayeur"]);
    map.insert("surprise", vec!["surpris", "etonne", "choque", "stupefait", "incroyable", "surprised", "amazed", "inattendu", "soudain", "imprevu", "sidere", "abasourdi", "ebahi", "interdit"]);
    map.insert("disgust", vec!["degout", "ecoeure", "repugnant", "horrible", "disgusted", "affreux", "immonde", "abject", "ignoble", "repulsif", "nauseabond", "revoltant"]);
    map.insert("trust", vec!["confiance", "foi", "fidele", "loyal", "fiable", "trust", "faith", "croire", "certain", "promesse", "parole", "honnete", "sincere", "serein", "assure"]);
    map.insert("anticipation", vec!["attente", "espoir", "excite", "impatient", "excited", "eager", "hate", "vivement", "bientot", "demain", "futur", "projet", "reve", "ambition", "perspective", "prevoit"]);
    map.insert("love", vec!["amour", "aimer", "adorer", "cheri", "tendresse", "passion", "coeur", "love", "beloved", "affection", "romantique", "embrasser", "calin", "cher", "attachement", "devouement"]);
    map.insert("pride", vec!["fierte", "fier", "orgueilleux", "accompli", "reussi", "proud", "dignite", "honneur", "gloire", "triomphe", "merite", "satisfaction"]);
    map
}

fn get_output_dir() -> PathBuf {
    std::env::current_dir()
        .unwrap_or_else(|_| PathBuf::from("."))
        .join("omega-ui-output")
}

fn compute_sha256(text: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(text.as_bytes());
    format!("{:x}", hasher.finalize())
}

// ?????????????????????????????????????????????????????????????????????????????
// ANALYZE SEGMENT ? avec keyword_counts
// ?????????????????????????????????????????????????????????????????????????????

fn analyze_segment(text: &str, normalize: bool) -> (Vec<EmotionStat>, usize) {
    let lower_text = text.to_lowercase();
    let keywords_map = get_emotion_keywords();
    let mut raw_emotions: Vec<(String, Vec<String>, usize, Vec<KeywordCount>)> = Vec::new();
    let mut total_hits: usize = 0;
    
    for (emotion, keywords) in keywords_map.iter() {
        let mut found_keywords: Vec<String> = Vec::new();
        let mut keyword_counts: Vec<KeywordCount> = Vec::new();
        let mut count: usize = 0;
        
        for keyword in keywords {
            let keyword_count = lower_text.matches(keyword).count();
            if keyword_count > 0 {
                found_keywords.push(keyword.to_string());
                keyword_counts.push(KeywordCount {
                    word: keyword.to_string(),
                    count: keyword_count,
                });
                count += keyword_count;
            }
        }
        
        // Trier par count decroissant
        keyword_counts.sort_by(|a, b| b.count.cmp(&a.count));
        
        if count > 0 {
            total_hits += count;
            raw_emotions.push((emotion.to_string(), found_keywords, count, keyword_counts));
        }
    }
    
    let mut emotions: Vec<EmotionStat> = Vec::new();
    
    if total_hits > 0 {
        for (emotion, keywords, count, keyword_counts) in raw_emotions {
            let intensity = if normalize {
                count as f64 / total_hits as f64
            } else {
                (count as f64 / 5.0).min(1.0)
            };
            
            emotions.push(EmotionStat {
                emotion,
                intensity: (intensity * 1000.0).round() / 1000.0,
                occurrences: count,
                keywords,
                keyword_counts,
            });
        }
    }
    
    emotions.sort_by(|a, b| b.intensity.partial_cmp(&a.intensity).unwrap());
    (emotions, total_hits)
}

// ?????????????????????????????????????????????????????????????????????????????
// SEGMENTATION
// ?????????????????????????????????????????????????????????????????????????????

struct RawSegment {
    title: String,
    text: String,
    char_start: usize,
    char_end: usize,
    word_start: usize,
    word_end: usize,
}

fn detect_chapters(text: &str, min_words: usize) -> Vec<RawSegment> {
    let chapter_regex = Regex::new(r"(?mi)^[\s]*(CHAPITRE|Chapitre|CHAPTER|Chapter|PROLOGUE|Prologue|EPILOGUE|Epilogue)\s*[\d\w]*[^\n]*").unwrap();
    let md_title_regex = Regex::new(r"(?m)^#{1,3}\s+[^\n]+").unwrap();
    
    let mut title_positions: Vec<(usize, String)> = Vec::new();
    
    for cap in chapter_regex.find_iter(text) {
        title_positions.push((cap.start(), cap.as_str().trim().to_string()));
    }
    
    for cap in md_title_regex.find_iter(text) {
        title_positions.push((cap.start(), cap.as_str().trim().to_string()));
    }
    
    title_positions.sort_by_key(|m| m.0);
    title_positions.dedup_by_key(|m| m.0);
    
    if title_positions.len() < 2 {
        return Vec::new();
    }
    
    let mut segments: Vec<RawSegment> = Vec::new();
    
    if title_positions[0].0 > 0 {
        let pre_text = &text[..title_positions[0].0];
        let pre_words = pre_text.split_whitespace().count();
        if pre_words >= min_words {
            segments.push(RawSegment {
                title: "Introduction".to_string(),
                text: pre_text.to_string(),
                char_start: 0,
                char_end: title_positions[0].0,
                word_start: 0,
                word_end: pre_words,
            });
        }
    }
    
    for i in 0..title_positions.len() {
        let start_pos = title_positions[i].0;
        let title = title_positions[i].1.clone();
        
        let end_pos = if i + 1 < title_positions.len() {
            title_positions[i + 1].0
        } else {
            text.len()
        };
        
        let segment_text = &text[start_pos..end_pos];
        let segment_word_count = segment_text.split_whitespace().count();
        
        if segment_word_count < min_words {
            continue;
        }
        
        let word_start = text[..start_pos].split_whitespace().count();
        
        segments.push(RawSegment {
            title,
            text: segment_text.to_string(),
            char_start: start_pos,
            char_end: end_pos,
            word_start,
            word_end: word_start + segment_word_count,
        });
    }
    
    let mut merged_segments: Vec<RawSegment> = Vec::new();
    let mut pending: Option<RawSegment> = None;
    
    for seg in segments {
        if let Some(mut prev) = pending.take() {
            prev.text.push_str(&seg.text);
            prev.char_end = seg.char_end;
            prev.word_end = seg.word_end;
            merged_segments.push(prev);
        } else if seg.word_end - seg.word_start < min_words {
            pending = Some(seg);
        } else {
            merged_segments.push(seg);
        }
    }
    
    if let Some(last_pending) = pending {
        if let Some(last_seg) = merged_segments.last_mut() {
            last_seg.text.push_str(&last_pending.text);
            last_seg.char_end = last_pending.char_end;
            last_seg.word_end = last_pending.word_end;
        } else {
            merged_segments.push(last_pending);
        }
    }
    
    merged_segments
}

fn segment_fixed_words(text: &str, block_size: usize, min_words: usize, max_segments: usize) -> Vec<RawSegment> {
    let words: Vec<&str> = text.split_whitespace().collect();
    let total_words = words.len();
    
    if total_words == 0 {
        return Vec::new();
    }
    
    let mut actual_block_size = block_size;
    let estimated_segments = (total_words as f64 / actual_block_size as f64).ceil() as usize;
    
    if estimated_segments > max_segments {
        actual_block_size = (total_words as f64 / max_segments as f64).ceil() as usize;
    }
    
    let mut segments: Vec<RawSegment> = Vec::new();
    let mut word_index = 0;
    let mut char_index = 0;
    let mut seg_num = 1;
    
    while word_index < total_words {
        let end_word = (word_index + actual_block_size).min(total_words);
        let remaining = total_words - end_word;
        
        let final_end = if remaining > 0 && remaining < min_words {
            total_words
        } else {
            end_word
        };
        
        let segment_words: Vec<&str> = words[word_index..final_end].to_vec();
        let segment_text = segment_words.join(" ");
        let segment_len = segment_text.len();
        
        segments.push(RawSegment {
            title: format!("Segment {}", seg_num),
            text: segment_text,
            char_start: char_index,
            char_end: char_index + segment_len,
            word_start: word_index,
            word_end: final_end,
        });
        
        char_index += segment_len + 1;
        word_index = final_end;
        seg_num += 1;
        
        if final_end == total_words {
            break;
        }
    }
    
    segments
}

// ?????????????????????????????????????????????????????????????????????????????
// CORE ANALYZE
// ?????????????????????????????????????????????????????????????????????????????

fn analyze_internal(text: &str, source: &str, options: &AnalyzeOptions) -> AnalyzeResult {
    let start = Instant::now();
    let timestamp = Utc::now().to_rfc3339();
    let normalize = options.normalize.unwrap_or(true);
    
    let words: Vec<&str> = text.split_whitespace().collect();
    let word_count = words.len();
    let char_count = text.chars().count();
    let line_count = text.lines().count().max(1);
    
    let (emotions, total_hits) = analyze_segment(text, normalize);
    let dominant = emotions.first().map(|e| e.emotion.clone());
    
    let seg_opts = options.segmentation.as_ref();
    let mode = seg_opts.map(|s| s.mode.as_str()).unwrap_or("none");
    let fixed_words = seg_opts.and_then(|s| s.fixed_words).unwrap_or(1000);
    let min_segment_words = seg_opts.and_then(|s| s.min_segment_words).unwrap_or(250);
    let max_segments = seg_opts.and_then(|s| s.max_segments).unwrap_or(300);
    
    let (segmentation_info, segments) = if mode == "none" {
        (None, None)
    } else {
        let raw_segments = if mode == "chapters" {
            let chapters = detect_chapters(text, min_segment_words);
            if chapters.len() < 2 {
                segment_fixed_words(text, fixed_words, min_segment_words, max_segments)
            } else {
                chapters
            }
        } else {
            segment_fixed_words(text, fixed_words, min_segment_words, max_segments)
        };
        
        let mut segment_results: Vec<SegmentResult> = Vec::new();
        let mut final_index = 0;
        
        for seg in raw_segments.iter() {
            let seg_start = Instant::now();
            let (seg_emotions, seg_hits) = analyze_segment(&seg.text, normalize);
            
            if seg_hits == 0 {
                continue;
            }
            
            final_index += 1;
            let seg_dominant = seg_emotions.first().map(|e| e.emotion.clone());
            
            segment_results.push(SegmentResult {
                id: format!("seg_{:04}", final_index),
                index: final_index,
                title: seg.title.clone(),
                word_start: seg.word_start,
                word_end: seg.word_end,
                word_count: seg.word_end - seg.word_start,
                char_start: seg.char_start,
                char_end: seg.char_end,
                duration_ms: seg_start.elapsed().as_millis() as u64,
                total_emotion_hits: seg_hits,
                emotions: seg_emotions,
                dominant_emotion: seg_dominant,
            });
        }
        
        let actual_mode = if mode == "chapters" && segment_results.first().map(|s| s.title.starts_with("Segment")).unwrap_or(false) {
            "fixed_words".to_string()
        } else {
            mode.to_string()
        };
        
        let info = SegmentationInfo {
            mode: actual_mode,
            fixed_words,
            min_segment_words,
            segments_count: segment_results.len(),
        };
        
        (Some(info), Some(segment_results))
    };
    
    AnalyzeResult {
        timestamp,
        duration_ms: start.elapsed().as_millis() as u64,
        source: source.to_string(),
        word_count,
        char_count,
        line_count,
        total_emotion_hits: total_hits,
        emotions,
        dominant_emotion: dominant,
        version: "0.7.2".to_string(),
        segmentation: segmentation_info,
        segments,
    }
}

// ?????????????????????????????????????????????????????????????????????????????
// HISTORY
// ?????????????????????????????????????????????????????????????????????????????

fn load_history() -> HistoryIndex {
    let history_path = get_output_dir().join("history_index.json");
    
    if history_path.exists() {
        if let Ok(content) = fs::read_to_string(&history_path) {
            if let Ok(index) = serde_json::from_str::<HistoryIndex>(&content) {
                return index;
            }
        }
        let backup = get_output_dir().join("history_index.recovered.json");
        let _ = fs::copy(&history_path, backup);
    }
    
    HistoryIndex {
        schema: "OMEGA_UI_HISTORY_V1".to_string(),
        items: Vec::new(),
    }
}

fn save_history(history: &HistoryIndex) -> Result<(), String> {
    let history_path = get_output_dir().join("history_index.json");
    let json = serde_json::to_string_pretty(history)
        .map_err(|e| format!("Serialize error: {}", e))?;
    fs::write(&history_path, json)
        .map_err(|e| format!("Write error: {}", e))?;
    Ok(())
}

fn add_to_history(result: &AnalyzeResult, run_id: &str, run_path: &str) -> Result<(), String> {
    let mut history = load_history();
    
    let item = HistoryItem {
        id: run_id.to_string(),
        timestamp: result.timestamp.clone(),
        source: result.source.clone(),
        dominant_emotion: result.dominant_emotion.clone(),
        duration_ms: result.duration_ms,
        word_count: result.word_count,
        total_emotion_hits: result.total_emotion_hits,
        path: run_path.to_string(),
        segments_count: result.segmentation.as_ref().map(|s| s.segments_count),
        segmentation_mode: result.segmentation.as_ref().map(|s| s.mode.clone()),
    };
    
    history.items.insert(0, item);
    
    if history.items.len() > 200 {
        history.items.truncate(200);
    }
    
    save_history(&history)
}

// ?????????????????????????????????????????????????????????????????????????????
// SUMMARY
// ?????????????????????????????????????????????????????????????????????????????

fn generate_summary(result: &AnalyzeResult) -> String {
    let mut summary = format!(
        "OMEGA Emotion Analysis Summary\n==============================\nSource: {}\nWords: {}\nTotal Emotion Markers: {}\n\nEmotion Profile:\n",
        result.source, result.word_count, result.total_emotion_hits
    );
    
    for e in &result.emotions {
        summary.push_str(&format!("  {} - {:.1}% ({} hits)\n", e.emotion, e.intensity * 100.0, e.occurrences));
        // Ajouter top 3 keywords
        for kc in e.keyword_counts.iter().take(3) {
            summary.push_str(&format!("    - \"{}\" x{}\n", kc.word, kc.count));
        }
    }
    
    if let Some(ref seg_info) = result.segmentation {
        summary.push_str(&format!("\nSegmentation: {} ({} segments)\n", seg_info.mode, seg_info.segments_count));
        
        if let Some(ref segments) = result.segments {
            let emotions_to_check = ["fear", "sadness", "anger", "joy"];
            
            for emotion in emotions_to_check {
                let mut sorted: Vec<_> = segments.iter()
                    .filter(|s| s.dominant_emotion.as_deref() == Some(emotion))
                    .collect();
                sorted.sort_by(|a, b| b.total_emotion_hits.cmp(&a.total_emotion_hits));
                
                if !sorted.is_empty() {
                    summary.push_str(&format!("\nTop {} segments:\n", emotion));
                    for seg in sorted.iter().take(3) {
                        let dom_intensity = seg.emotions.first().map(|e| e.intensity * 100.0).unwrap_or(0.0);
                        summary.push_str(&format!("  {} ({}) - {} {:.1}% ({} hits, {} words)\n", 
                            seg.id, seg.title.chars().take(30).collect::<String>(), 
                            emotion, dom_intensity, seg.total_emotion_hits, seg.word_count));
                    }
                }
            }
        }
    }
    
    summary
}

// ?????????????????????????????????????????????????????????????????????????????
// TAURI COMMANDS
// ?????????????????????????????????????????????????????????????????????????????

#[tauri::command]
fn analyze_text(input: AnalyzeInput) -> Result<AnalyzeResult, String> {
    let source = input.source.unwrap_or_else(|| "direct_input".to_string());
    let options = input.options.unwrap_or_else(|| AnalyzeOptions {
        language: Some("fr".to_string()),
        normalize: Some(true),
        segmentation: None,
    });
    
    let result = analyze_internal(&input.text, &source, &options);
    
    let run_id = Local::now().format("%Y-%m-%d_%H-%M-%S").to_string();
    let run_dir = get_output_dir().join(&run_id);
    fs::create_dir_all(&run_dir).ok();
    
    let result_path = run_dir.join("result.json");
    if let Ok(json) = serde_json::to_string_pretty(&result) {
        let _ = fs::write(&result_path, &json);
    }
    
    let meta = InputMeta {
        source: source.clone(),
        sha256: compute_sha256(&input.text),
        word_count: result.word_count,
        char_count: result.char_count,
        timestamp: result.timestamp.clone(),
    };
    let meta_path = run_dir.join("input.meta.json");
    if let Ok(json) = serde_json::to_string_pretty(&meta) {
        let _ = fs::write(&meta_path, &json);
    }
    
    let log_content = format!(
        "OMEGA UI Run Log\n================\nTimestamp: {}\nSource: {}\nWords: {}\nChars: {}\nEmotion Hits: {}\nDominant: {:?}\nDuration: {}ms\nVersion: {}\nSegments: {:?}\n",
        result.timestamp, source, result.word_count, result.char_count,
        result.total_emotion_hits, result.dominant_emotion, result.duration_ms, result.version,
        result.segmentation.as_ref().map(|s| s.segments_count)
    );
    let log_path = run_dir.join("run.log");
    let _ = fs::write(&log_path, log_content);
    
    let summary = generate_summary(&result);
    let summary_path = run_dir.join("summary.txt");
    let _ = fs::write(&summary_path, summary);
    
    let relative_path = format!("omega-ui-output/{}/result.json", run_id);
    let _ = add_to_history(&result, &run_id, &relative_path);
    
    Ok(result)
}

#[tauri::command]
fn analyze_file(file_path: String, segmentation_mode: Option<String>, fixed_words: Option<usize>) -> Result<AnalyzeResult, String> {
    let path = PathBuf::from(&file_path);
    
    if !path.exists() {
        return Err(format!("File not found: {}", file_path));
    }
    
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Read error: {}", e))?;
    
    let seg_opts = segmentation_mode.map(|mode| SegmentationOptions {
        mode,
        fixed_words,
        min_segment_words: Some(250),
        max_segments: Some(300),
    });
    
    let input = AnalyzeInput {
        text: content,
        source: Some(file_path),
        options: Some(AnalyzeOptions {
            language: Some("fr".to_string()),
            normalize: Some(true),
            segmentation: seg_opts,
        }),
    };
    
    analyze_text(input)
}

#[tauri::command]
fn read_file(file_path: String) -> Result<String, String> {
    fs::read_to_string(&file_path)
        .map_err(|e| format!("Read error: {}", e))
}

#[tauri::command]
fn get_history() -> Result<HistoryIndex, String> {
    Ok(load_history())
}

#[tauri::command]
fn load_run(run_id: String) -> Result<AnalyzeResult, String> {
    let result_path = get_output_dir().join(&run_id).join("result.json");
    
    if !result_path.exists() {
        return Err(format!("Run not found: {}", run_id));
    }
    
    let content = fs::read_to_string(&result_path)
        .map_err(|e| format!("Read error: {}", e))?;
    
    serde_json::from_str(&content)
        .map_err(|e| format!("Parse error: {}", e))
}

#[tauri::command]
fn open_output_folder() -> Result<(), String> {
    let output_dir = get_output_dir();
    fs::create_dir_all(&output_dir).ok();

    #[cfg(target_os = "windows")]
    std::process::Command::new("explorer")
        .arg(&output_dir)
        .spawn()
        .ok();

    Ok(())
}

#[tauri::command]
fn open_run_folder(run_id: String) -> Result<(), String> {
    let run_dir = get_output_dir().join(&run_id);
    
    if !run_dir.exists() {
        return Err(format!("Run folder not found: {}", run_id));
    }

    #[cfg(target_os = "windows")]
    std::process::Command::new("explorer")
        .arg(&run_dir)
        .spawn()
        .ok();

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            analyze_text,
            analyze_file,
            read_file,
            get_history,
            load_run,
            open_output_folder,
            open_run_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}






#[cfg(test)]
mod aerospace_tests;
