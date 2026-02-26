import { Injectable } from '@nestjs/common';
import { GeneratedImage, ImageProvider } from './image-provider.interface';

@Injectable()
export class MockImageProvider implements ImageProvider {
  readonly name = 'mock-image-provider';

  generate(params: {
    prompt: string;
    ideaId: string;
  }): Promise<GeneratedImage> {
    const width = 1080;
    const height = 1920;
    const safePrompt = this.escapeXml(params.prompt).slice(0, 220);
    const safeIdeaId = this.escapeXml(params.ideaId);

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#082f49"/>
      <stop offset="100%" stop-color="#164e63"/>
    </linearGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <rect x="68" y="140" width="944" height="1640" rx="36" fill="#ffffff" fill-opacity="0.08" stroke="#67e8f9" stroke-opacity="0.4"/>
  <text x="110" y="260" fill="#a5f3fc" font-family="Arial, sans-serif" font-size="36" font-weight="700">Creator Flow Studio</text>
  <text x="110" y="330" fill="#e0f2fe" font-family="Arial, sans-serif" font-size="30">Idea: ${safeIdeaId}</text>
  <foreignObject x="110" y="390" width="860" height="1300">
    <div xmlns="http://www.w3.org/1999/xhtml" style="color:#f0f9ff;font-family:Arial,sans-serif;font-size:34px;line-height:1.35;white-space:pre-wrap;">
      ${safePrompt}
    </div>
  </foreignObject>
</svg>`;

    return Promise.resolve({
      bytes: Buffer.from(svg, 'utf8'),
      mime: 'image/svg+xml',
      width,
      height,
    });
  }

  private escapeXml(value: string): string {
    return value
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&apos;');
  }
}
