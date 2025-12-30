import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createProject } from './create_project';
import * as fs from 'fs';
import * as path from 'path';

describe('Project Creation Tool', () => {
    const TEST_DIR = path.join(__dirname, 'temp_create_test');
    
    beforeEach(() => {
        if (fs.existsSync(TEST_DIR)) {
            fs.rmSync(TEST_DIR, { recursive: true, force: true });
        }
    });

    afterEach(() => {
        if (fs.existsSync(TEST_DIR)) {
            fs.rmSync(TEST_DIR, { recursive: true, force: true });
        }
    });

    it('should create directory and default project file', async () => {
        await createProject(TEST_DIR);

        expect(fs.existsSync(TEST_DIR)).toBe(true);
        expect(fs.existsSync(path.join(TEST_DIR, 'omega.json'))).toBe(true);
    });

    it('should throw if file already exists', async () => {
        // Premier appel : crÃƒÆ’Ã‚Â©ation
        await createProject(TEST_DIR);
        
        // DeuxiÃƒÆ’Ã‚Â¨me appel : doit ÃƒÆ’Ã‚Â©chouer
        await expect(createProject(TEST_DIR)).rejects.toThrow("Project already exists");
    });
});
