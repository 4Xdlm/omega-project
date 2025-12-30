import { describe, it, expect } from 'vitest';
import { createOmega, Store, NodeIO } from './index';
import path from 'path';

describe('Public API Entry Point', () => {
    it('should export createOmega factory', () => {
        expect(typeof createOmega).toBe('function');
    });

    it('should create a valid Store instance via factory', () => {
        const store = createOmega(path.join(__dirname, 'tmp_api_test'));
        expect(store).toBeInstanceOf(Store);
        // VÃƒÂ©rifie que le store est bien configurÃƒÂ©
        expect(store.engine).toBeDefined();
    });

    it('should export core classes', () => {
        expect(Store).toBeDefined();
        expect(NodeIO).toBeDefined();
    });
});
