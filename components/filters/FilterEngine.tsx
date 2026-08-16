import {
  filters,
  FabricImage,
} from "fabric";

export type FilterName =
  | "vintage"
  | "sepia"
  | "blackWhite"
  | "polaroid"
  | "faded"
  | "cyber";

export type FilterResult = {
  image: string;
  width: number;
  height: number;
};

function loadImage(
  source: string
): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(img);
    img.onerror = reject;

    img.src = source;
  });
}

/**
 * Creates the Fabric filter chain for a selected
 * retro filter.
 *
 * Intensity is 0-100.
 */
function createFilters(
  name: FilterName,
  intensity: number
) {
  const amount = intensity / 100;

  switch (name) {
    /*
     * ============================================
     * VINTAGE
     * ============================================
     */

    case "vintage":
      return [
        new filters.Sepia({
          alpha: 0.35 * amount,
        }),

        new filters.Contrast({
          contrast: -0.12 * amount,
        }),

        new filters.Saturation({
          saturation: -0.18 * amount,
        }),

        new filters.Brightness({
          brightness: 0.04 * amount,
        }),
      ];

    /*
     * ============================================
     * SEPIA
     * ============================================
     */

    case "sepia":
      return [
        new filters.Sepia({
          alpha: amount,
        }),
      ];

    /*
     * ============================================
     * BLACK & WHITE
     * ============================================
     */

    case "blackWhite":
      return [
        new filters.Grayscale(),
      ];

    /*
     * ============================================
     * POLAROID
     * ============================================
     */

    case "polaroid":
      return [
        new filters.Saturation({
          saturation:
            0.18 * amount,
        }),

        new filters.Contrast({
          contrast:
            0.12 * amount,
        }),

        new filters.Brightness({
          brightness:
            0.08 * amount,
        }),

        new filters.Gamma({
          gamma: [
            1 -
              0.08 * amount,

            1 -
              0.04 * amount,

            1 +
              0.02 * amount,
          ],
        }),
      ];

    /*
     * ============================================
     * FADED
     * ============================================
     */

    case "faded":
      return [
        new filters.Contrast({
          contrast:
            -0.25 * amount,
        }),

        new filters.Saturation({
          saturation:
            -0.3 * amount,
        }),

        new filters.Brightness({
          brightness:
            0.12 * amount,
        }),
      ];

    /*
     * ============================================
     * CYBER / Y2K
     * ============================================
     */

    case "cyber":
      return [
        new filters.Saturation({
          saturation:
            0.45 * amount,
        }),

        new filters.Contrast({
          contrast:
            0.2 * amount,
        }),

        new filters.Brightness({
          brightness:
            0.04 * amount,
        }),

        new filters.Gamma({
          gamma: [
            0.92,
            0.98,
            1.08 +
              0.08 * amount,
          ],
        }),
      ];

    default:
      return [];
  }
}

/**
 * Apply a retro filter to an image.
 *
 * This function DOES NOT modify the original
 * image string.
 *
 * It returns a new data URL.
 */
export async function applyRetroFilter(
  source: string,
  filterName: FilterName,
  intensity: number
): Promise<FilterResult> {
  const htmlImage =
    await loadImage(source);

  const fabricImage =
    new FabricImage(htmlImage);

  const filterList =
    createFilters(
      filterName,
      intensity
    );

  fabricImage.filters =
    filterList;

  await fabricImage.applyFilters();

  /*
   * Fabric's filtered element is now
   * rendered into a temporary canvas.
   */

  const filteredElement =
    fabricImage.getElement();

  const canvas =
    document.createElement(
      "canvas"
    );

  canvas.width =
    htmlImage.naturalWidth;

  canvas.height =
    htmlImage.naturalHeight;

  const ctx =
    canvas.getContext("2d");

  if (!ctx) {
    throw new Error(
      "Could not create canvas context."
    );
  }

  ctx.drawImage(
    filteredElement,
    0,
    0,
    canvas.width,
    canvas.height
  );

  return {
    image:
      canvas.toDataURL(
        "image/jpeg",
        0.95
      ),

    width:
      canvas.width,

    height:
      canvas.height,
  };
}

/**
 * Returns the default intensity
 * for a filter.
 */
export function getDefaultFilterIntensity(
  filter: FilterName
): number {
  switch (filter) {
    case "vintage":
      return 70;

    case "sepia":
      return 75;

    case "blackWhite":
      return 100;

    case "polaroid":
      return 65;

    case "faded":
      return 60;

    case "cyber":
      return 80;

    default:
      return 70;
  }
}