import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Store } from './index';
import { NodeIO } from './node_io';
import { createProject } from './create_project';
import path from 'path';
import fs from 'fs';

describe('Store Integration', () => {
    const TEST_DIR = path.join(__dirname, 'temp_store_test');
    const io = new NodeIO(TEST_DIR);

    beforeEach(async () => {
        if (fs.existsSync(TEST_DIR)) {
            fs.rmSync(TEST_DIR, { recursive: true, force: true });
        }
        fs.mkdirSync(TEST_DIR, { recursive: true });
        
        // CrÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©er un vrai projet pour les tests
        await createProject(io, TEST_DIR, {
            name: 'Test Project',
            author: 'Test'
        });
    });

    afterEach(() => {
        if (fs.existsSync(TEST_DIR)) {
            fs.rmSync(TEST_DIR, { recursive: true, force: true });
        }
    });

    it('should instantiate correctly with default config', () => {
        const store = new Store(io, TEST_DIR);
        expect(store).toBeDefined();
        expect(store.engine).toBeDefined();
    });

    it('should load state using the Load module', async () => {
        const store = new Store(io, TEST_DIR);
        
        // Charger le projet crÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©
        await store.load();
        
        // VÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©rifier que le projet a ÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©tÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â© chargÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©
        const project = store.getProject();
        expect(project).toBeDefined();
        expect(project?.meta?.name).toBe('Test Project');
    });

    it('should save state using the Save module', async () => {
        const store = new Store(io, TEST_DIR);
        
        // Charger puis sauvegarder
        await store.load();
        
        const project = store.getProject();
        if (project) {
            project.meta.description = 'Modified';
        }
        
        await store.save();
        
        // Recharger et vÃƒÆ’Ã†â€™Ãƒâ€ Ã¢â‚¬â„¢ÃƒÆ’Ã¢â‚¬Å¡Ãƒâ€šÃ‚Â©rifier
        const store2 = new Store(io, TEST_DIR);
        await store2.load();
        const reloaded = store2.getProject();
        expect(reloaded?.meta?.description).toBe('Modified');
    });

    it('should handle load errors gracefully', async () => {
        // Supprimer le fichier projet
        fs.rmSync(TEST_DIR, { recursive: true, force: true });
        fs.mkdirSync(TEST_DIR, { recursive: true });
        
        const store = new Store(io, TEST_DIR);
        
        // Doit rejeter
        await expect(store.load()).rejects.toThrow();
    });
});
