export type GeneratedImage = {
  bytes: Buffer;
  mime: string;
  width: number;
  height: number;
};

export interface ImageProvider {
  readonly name: string;
  generate(params: { prompt: string; ideaId: string }): Promise<GeneratedImage>;
}

export const IMAGE_PROVIDER_TOKEN = 'IMAGE_PROVIDER_TOKEN';
