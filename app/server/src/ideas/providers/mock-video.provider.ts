import { Injectable } from '@nestjs/common';
import { GeneratedVideo, VideoProvider } from './video-provider.interface';

@Injectable()
export class MockVideoProvider implements VideoProvider {
  readonly name = 'mock-video-provider';
  private static readonly SAMPLE_VIDEO_URL =
    'https://samplelib.com/lib/preview/mp4/sample-5s.mp4';

  async generate(_: { prompt: string; ideaId: string }): Promise<GeneratedVideo> {
    return {
      url: MockVideoProvider.SAMPLE_VIDEO_URL,
      mime: 'video/mp4',
      width: 1080,
      height: 1920,
      duration: 5,
    };
  }
}
