export type GeneratedVideo = {
  url: string;
  mime: string;
  width: number;
  height: number;
  duration: number;
};

export interface VideoProvider {
  readonly name: string;
  generate(params: { prompt: string; ideaId: string }): Promise<GeneratedVideo>;
}

export const VIDEO_PROVIDER_TOKEN = 'VIDEO_PROVIDER_TOKEN';
