import * as fs from 'fs';
import * as path from 'path';
import { OmegaIO, validateRelativePath } from './io';
import { CanonError, CanonErrorCode } from './errors';

export class NodeIO implements OmegaIO {
    constructor() {}
    
    private resolvePath(root: string, relativePath: string): string {
        validateRelativePath(relativePath);
        return path.resolve(root, relativePath);
    }

    async readFile(root: string, relativePath: string): Promise<string> {
        try { 
            const fullPath = this.resolvePath(root, relativePath);
            return await fs.promises.readFile(fullPath, 'utf-8'); 
        } catch (e: any) { 
            if (e.code === 'ENOENT') {
                throw new CanonError(
                    CanonErrorCode.FILE_NOT_FOUND,
                    `File not found: ${relativePath}`,
                    { path: relativePath }
                );
            }
            throw new CanonError(
                CanonErrorCode.READ_FAILED,
                `Failed to read file: ${e.message}`,
                { path: relativePath, originalError: e }
            );
        }
    }

    async writeFile(root: string, relativePath: string, content: string): Promise<void> {
        const fullPath = this.resolvePath(root, relativePath);
        await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.promises.writeFile(fullPath, content, 'utf-8');
    }

    async exists(root: string, relativePath: string): Promise<boolean> {
        try {
            const fullPath = this.resolvePath(root, relativePath);
            await fs.promises.access(fullPath);
            return true;
        } catch {
            return false;
        }
    }

    async readDir(root: string, relativePath: string): Promise<string[]> {
        const fullPath = this.resolvePath(root, relativePath);
        return fs.promises.readdir(fullPath);
    }

    async mkdir(root: string, relativePath: string, recursive: boolean = true): Promise<void> {
        const fullPath = this.resolvePath(root, relativePath);
        await fs.promises.mkdir(fullPath, { recursive });
    }

    async rename(root: string, oldPath: string, newPath: string): Promise<void> {
        const oldFull = this.resolvePath(root, oldPath);
        const newFull = this.resolvePath(root, newPath);
        await fs.promises.mkdir(path.dirname(newFull), { recursive: true });
        await fs.promises.rename(oldFull, newFull);
    }

    async delete(root: string, relativePath: string): Promise<void> { 
        try { 
            const fullPath = this.resolvePath(root, relativePath);
            const stats = await fs.promises.stat(fullPath);
            if (stats.isDirectory()) {
                await fs.promises.rm(fullPath, { recursive: true, force: true });
            } else {
                await fs.promises.unlink(fullPath);
            }
        } catch(e) {
            // Ignore errors
        }
    }

    // Alias pour delete (compatibilitÃƒÆ’Ã‚Â© tests)
    async remove(root: string, relativePath: string): Promise<void> {
        return this.delete(root, relativePath);
    }

    // MÃƒÆ’Ã‚Â©thode move pour compatibilitÃƒÆ’Ã‚Â©
    async move(oldPath: string, newPath: string): Promise<void> {
        await fs.promises.rename(oldPath, newPath);
    }

    join(...paths: string[]): string { return path.join(...paths); }
    dirname(p: string): string { return path.dirname(p); }
    basename(p: string): string { return path.basename(p); }
}

// Factory function pour compatibility
export function createNodeIO(): NodeIO {
    return new NodeIO();
}
