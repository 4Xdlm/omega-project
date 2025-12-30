// Mock Store pour tests (sans dÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â©pendances React/Zustand)
import type { NodeIO } from './node_io';
import * as EmotionEngine from './emotion_engine';
import { loadProject } from './load';
import { saveProject } from './save';
import type { OmegaProject } from './types';

export class Store {
  private io: NodeIO;
  private projectRoot: string;
  public engine: typeof EmotionEngine;
  private project?: OmegaProject;
  
  constructor(io: NodeIO, projectRoot: string) {
    this.io = io;
    this.projectRoot = projectRoot;
    this.engine = EmotionEngine;
  }
  
  async load(): Promise<void> {
    // Appeler le vrai loadProject
    const result = await loadProject(this.io, this.projectRoot);
    this.project = result.project;
  }
  
  async save(): Promise<void> {
    // Appeler le vrai saveProject
    if (this.project) {
      await saveProject(this.io, this.projectRoot, this.project);
    }
  }
  
  getProject(): OmegaProject | undefined {
    return this.project;
  }
}
