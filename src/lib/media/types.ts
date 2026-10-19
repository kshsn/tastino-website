// Types shared by server and client components. Keep free of server-only imports (sharp, fs).

/** Public URLs of a processed image: the original plus AVIF/WebP renditions keyed by width in px. */
export interface ImageDerivatives {
  original: string;
  avif: Record<string, string>;
  webp: Record<string, string>;
}

/** What a <Picture> needs to render one image in one language. */
export interface PictureData {
  width: number;
  height: number;
  derivatives: ImageDerivatives;
  alt: string;
}
