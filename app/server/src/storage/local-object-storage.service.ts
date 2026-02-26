import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import { isAbsolute, join, relative, resolve } from 'node:path';

@Injectable()
export class LocalObjectStorageService {
  private readonly rootDir = join(process.cwd(), 'storage', 'assets');

  async save(params: {
    bytes: Buffer;
    mime: string;
    ideaId: string;
  }): Promise<string> {
    const extension = this.toFileExtension(params.mime);
    const day = new Date().toISOString().slice(0, 10);
    const targetDir = join(this.rootDir, day, params.ideaId);
    await fs.mkdir(targetDir, { recursive: true });

    const fileName = `${randomUUID()}.${extension}`;
    const filePath = join(targetDir, fileName);
    await fs.writeFile(filePath, params.bytes);

    return `/storage/assets/${day}/${params.ideaId}/${fileName}`;
  }

  async removeByPublicUrl(publicUrl: string): Promise<boolean> {
    const normalizedUrl = publicUrl.split(/[?#]/)[0] ?? '';
    if (!normalizedUrl.startsWith('/storage/assets/')) {
      return false;
    }

    const relativePath = normalizedUrl.slice('/storage/assets/'.length);
    if (!relativePath || relativePath.includes('\0')) {
      return false;
    }

    let decodedPath: string;
    try {
      decodedPath = decodeURIComponent(relativePath);
    } catch {
      return false;
    }

    const normalizedRelativePath = decodedPath.replaceAll('\\', '/');
    const segments = normalizedRelativePath.split('/').filter(Boolean);
    if (
      !segments.length ||
      segments.some((segment) => segment === '.' || segment === '..')
    ) {
      return false;
    }

    const root = resolve(this.rootDir);
    const target = resolve(this.rootDir, ...segments);
    const rel = relative(root, target);

    if (
      !rel ||
      rel === '' ||
      rel.startsWith('..') ||
      isAbsolute(rel) ||
      rel.split('\\').includes('..')
    ) {
      return false;
    }

    try {
      await fs.unlink(target);
      return true;
    } catch {
      return false;
    }
  }

  private toFileExtension(mime: string): string {
    switch (mime) {
      case 'image/png':
        return 'png';
      case 'image/jpeg':
        return 'jpg';
      case 'image/webp':
        return 'webp';
      case 'image/svg+xml':
        return 'svg';
      case 'video/mp4':
        return 'mp4';
      default:
        return 'bin';
    }
  }
}
