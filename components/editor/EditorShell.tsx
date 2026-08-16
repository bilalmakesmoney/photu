"use client";

import {
  ChangeEvent,
  ReactNode,
  useRef,
  useState,
} from "react";

import EditorCanvas, {
  CropArea,
} from "./EditorCanvas";

import {
  applyRetroFilter,
  getDefaultFilterIntensity,
  FilterName,
} from "../filters/FilterEngine";

import {
  applyTabEffect,
  tabHasIntensity,
  tabIsStamp,
  type StampPosition,
} from "../filters/EffectsEngine";

import "./editor.css";

/* =========================================================
   TYPES
========================================================= */

type PhotoAction =
  | "quality"
  | "resolution"
  | "crop"
  | "flipHorizontal"
  | "flipVertical"
  | "rotate";

type ImageSize = {
  width: number;
  height: number;
};

/* =========================================================
   TABS
========================================================= */

const tabs = [
  "Photo Settings",
  "Filters",
  "LUTs",
  "Effects",
  "Bloom",
  "Presets",
  "Patterns",
  "Photo Shapes",
  "Retro Stamps",
  "Overlays",
  "Frames",
];

/* =========================================================
   PANEL CONTENT
========================================================= */

const panelContent: Record<
  string,
  {
    description: string;
    controls: string[];
  }
> = {
  "Photo Settings": {
    description:
      "Adjust your image properties.",
    controls: [
      "JPEG Quality",
      "JPEG Resolution",
      "Crop",
      "Flip Horizontal",
      "Flip Vertical",
      "Rotate 90°",
    ],
  },

  Filters: {
    description:
      "Give your photo a vintage look.",
    controls: [
      "Vintage",
      "Sepia",
      "Black & White",
      "Polaroid",
      "Faded",
      "Cyber",
    ],
  },

  LUTs: {
    description:
      "Apply cinematic color grades.",
    controls: [
      "Y2K",
      "VHS",
      "Kodak",
      "Fuji",
      "Cinema",
      "Dream",
    ],
  },

  Effects: {
    description:
      "Add analog and digital effects.",
    controls: [
      "Grain",
      "Noise",
      "Chromatic Aberration",
      "Glitch",
      "Pixel Sort",
      "VHS",
    ],
  },

  Bloom: {
    description:
      "Create glowing highlights.",
    controls: [
      "Bloom Intensity",
      "Glow",
      "Softness",
      "Highlights",
    ],
  },

  Presets: {
    description:
      "Quickly apply complete looks.",
    controls: [
      "Windows 95",
      "Y2K",
      "Cyber 2000",
      "Disposable Camera",
      "VHS Tape",
      "Dreamcore",
    ],
  },

  Patterns: {
    description:
      "Overlay retro patterns.",
    controls: [
      "Checkerboard",
      "Dots",
      "Grid",
      "Stars",
      "Noise",
      "Pixel Pattern",
    ],
  },

  "Photo Shapes": {
    description:
      "Change the shape of your photo.",
    controls: [
      "Circle",
      "Rounded",
      "Heart",
      "Star",
      "Diamond",
      "Polaroid",
    ],
  },

  "Retro Stamps": {
    description:
      "Decorate your image with retro stamps.",
    controls: [
      "CD",
      "Star",
      "Flower",
      "Heart",
      "Smile",
      "Y2K",
    ],
  },

  Overlays: {
    description:
      "Layer analog textures over your photo.",
    controls: [
      "Film Dust",
      "Light Leak",
      "Flash",
      "Scratches",
      "CRT",
      "VHS",
    ],
  },

  Frames: {
    description:
      "Finish your image with a frame.",
    controls: [
      "Film",
      "Polaroid",
      "Windows",
      "Y2K",
      "Disposable",
      "Classic",
    ],
  },
};

/* =========================================================
   FILTER CONFIG
========================================================= */

const filterOptions: {
  name: FilterName;
  title: string;
  icon: string;
}[] = [
  {
    name: "vintage",
    title: "Vintage",
    icon: "✦",
  },

  {
    name: "sepia",
    title: "Sepia",
    icon: "◈",
  },

  {
    name: "blackWhite",
    title: "Black & White",
    icon: "◐",
  },

  {
    name: "polaroid",
    title: "Polaroid",
    icon: "▣",
  },

  {
    name: "faded",
    title: "Faded",
    icon: "◇",
  },

  {
    name: "cyber",
    title: "Cyber",
    icon: "★",
  },
];

/* =========================================================
   EFFECT TAB CONFIG
========================================================= */

const effectTabConfigs: Record<
  string,
  { name: string; title: string; icon: string }[]
> = {
  LUTs: [
    { name: "y2k", title: "Y2K", icon: "✦" },
    { name: "vhs", title: "VHS", icon: "◈" },
    { name: "kodak", title: "Kodak", icon: "✧" },
    { name: "fuji", title: "Fuji", icon: "★" },
    { name: "cinema", title: "Cinema", icon: "◆" },
    { name: "dream", title: "Dream", icon: "◉" },
  ],
  Effects: [
    { name: "grain", title: "Grain", icon: "▤" },
    { name: "noise", title: "Noise", icon: "▥" },
    { name: "chromaticAberration", title: "Chromatic Aberration", icon: "◑" },
    { name: "glitch", title: "Glitch", icon: "▦" },
    { name: "pixelSort", title: "Pixel Sort", icon: "▧" },
    { name: "vhsEffect", title: "VHS", icon: "▨" },
  ],
  Bloom: [
    { name: "bloomIntensity", title: "Bloom Intensity", icon: "☀" },
    { name: "glow", title: "Glow", icon: "✧" },
    { name: "softness", title: "Softness", icon: "◌" },
    { name: "highlights", title: "Highlights", icon: "◈" },
  ],
  Presets: [
    { name: "windows95", title: "Windows 95", icon: "▣" },
    { name: "y2kPreset", title: "Y2K", icon: "✦" },
    { name: "cyber2000", title: "Cyber 2000", icon: "★" },
    { name: "disposableCamera", title: "Disposable Camera", icon: "◈" },
    { name: "vhsTape", title: "VHS Tape", icon: "▧" },
    { name: "dreamcore", title: "Dreamcore", icon: "◇" },
  ],
  Patterns: [
    { name: "checkerboard", title: "Checkerboard", icon: "▤" },
    { name: "dots", title: "Dots", icon: "◉" },
    { name: "grid", title: "Grid", icon: "▦" },
    { name: "stars", title: "Stars", icon: "★" },
    { name: "noisePattern", title: "Noise", icon: "▥" },
    { name: "pixelPattern", title: "Pixel Pattern", icon: "▧" },
  ],
  "Photo Shapes": [
    { name: "circle", title: "Circle", icon: "○" },
    { name: "rounded", title: "Rounded", icon: "▢" },
    { name: "heart", title: "Heart", icon: "♡" },
    { name: "shapeStar", title: "Star", icon: "☆" },
    { name: "diamond", title: "Diamond", icon: "◇" },
    { name: "polaroidShape", title: "Polaroid", icon: "▣" },
  ],
  "Retro Stamps": [
    { name: "cd", title: "CD", icon: "◎" },
    { name: "stampStar", title: "Star", icon: "★" },
    { name: "flower", title: "Flower", icon: "✿" },
    { name: "stampHeart", title: "Heart", icon: "♥" },
    { name: "smile", title: "Smile", icon: "☺" },
    { name: "y2kStamp", title: "Y2K", icon: "✦" },
  ],
  Overlays: [
    { name: "filmDust", title: "Film Dust", icon: "✦" },
    { name: "lightLeak", title: "Light Leak", icon: "☀" },
    { name: "flash", title: "Flash", icon: "⚡" },
    { name: "scratches", title: "Scratches", icon: "∥" },
    { name: "crt", title: "CRT", icon: "▤" },
    { name: "vhsOverlay", title: "VHS", icon: "▧" },
  ],
  Frames: [
    { name: "film", title: "Film", icon: "▣" },
    { name: "polaroidFrame", title: "Polaroid", icon: "▢" },
    { name: "windowsFrame", title: "Windows", icon: "❐" },
    { name: "y2kFrame", title: "Y2K", icon: "★" },
    { name: "disposableFrame", title: "Disposable", icon: "◈" },
    { name: "classicFrame", title: "Classic", icon: "◇" },
  ],
};

/* =========================================================
   MAIN
========================================================= */

export default function EditorShell() {
  /* =======================================================
     IMAGE STATE
  ======================================================= */

  /*
   * image = LAST COMMITTED IMAGE
   *
   * This should only change when the user clicks
   * Apply Setting.
   */
  const [image, setImage] =
    useState<string | null>(null);

  /*
   * previewImage = CURRENT VISUAL PREVIEW
   *
   * This can change freely without committing.
   */
  const [previewImage, setPreviewImage] =
    useState<string | null>(null);

  const previewImageRef =
    useRef<string | null>(null);

  const [originalImage, setOriginalImage] =
    useState<string | null>(null);

  const [imageSize, setImageSize] =
    useState<ImageSize>({
      width: 0,
      height: 0,
    });

  /* =======================================================
     UI STATE
  ======================================================= */

  const [activeTab, setActiveTab] =
    useState("Photo Settings");

  const [selectedAction, setSelectedAction] =
    useState<PhotoAction>(
      "quality"
    );

  const [zoom, setZoom] =
    useState(1);

  /* =======================================================
     PHOTO SETTINGS
  ======================================================= */

  const [jpegQuality, setJpegQuality] =
    useState(100);

  const [resolution, setResolution] =
    useState<ImageSize>({
      width: 0,
      height: 0,
    });

  /* =======================================================
     CROP
  ======================================================= */

  const [crop, setCrop] =
    useState<CropArea>({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });

  /* =======================================================
     FILTER STATE
  ======================================================= */

  /*
   * Selected filter is ONLY a selection.
   */
  const [selectedFilter, setSelectedFilter] =
    useState<FilterName | null>(
      null
    );

  /*
   * Filter intensity is ONLY preview state.
   */
  const [filterIntensity, setFilterIntensity] =
    useState(70);

  /*
   * This stores the currently generated
   * filtered preview.
   */
  const [filterPreview, setFilterPreview] =
    useState<string | null>(
      null
    );

  /*
   * Prevent multiple filter operations from
   * racing each other.
   */
  const filterRequestId =
    useRef(0);

  /* =======================================================
     GENERIC EFFECT STATE
  ======================================================= */

  const [activeEffect, setActiveEffect] =
    useState<string | null>(null);

  const [effectIntensity, setEffectIntensity] =
    useState(70);

  const [effectPreview, setEffectPreview] =
    useState<string | null>(null);

  const effectRequestId =
    useRef(0);

  const [stampPosition, setStampPosition] =
    useState<StampPosition>("bottomRight");

  const [stampSize, setStampSize] =
    useState(50);

  const currentPanel =
    panelContent[activeTab];

  /* =========================================================
     FILE PICKER
  ========================================================= */

  const openFilePicker = () => {
    document
      .getElementById(
        "image-upload-input"
      )
      ?.click();
  };

  /* =========================================================
     IMAGE UPLOAD
  ========================================================= */

  const handleImageUpload = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    const reader =
      new FileReader();

    reader.onload = () => {
      const result =
        reader.result;

      if (
        typeof result !==
        "string"
      ) {
        return;
      }

      const img =
        new Image();

      img.onload = () => {
        setImage(result);

        setPreviewImage(
          result
        );

        previewImageRef.current =
          result;

        setOriginalImage(
          result
        );

        const size = {
          width:
            img.naturalWidth,

          height:
            img.naturalHeight,
        };

        setImageSize(size);

        setResolution(
          size
        );

        setCrop({
          x: 0,
          y: 0,
          width:
            img.naturalWidth,
          height:
            img.naturalHeight,
        });

        setZoom(1);

        setSelectedAction(
          "quality"
        );

        /*
         * Reset filters on new image.
         */
        setSelectedFilter(
          null
        );

        setFilterPreview(
          null
        );

        setFilterIntensity(
          70
        );

        setActiveEffect(null);
        setEffectPreview(null);
        setEffectIntensity(70);
      };

      img.src = result;
    };

    reader.readAsDataURL(
      file
    );

    event.target.value = "";
  };

  /* =========================================================
     GET CURRENT WORKING IMAGE
  ========================================================= */

  /*
   * IMPORTANT:
   *
   * For new operations we use previewImage first.
   *
   * This means:
   *
   * Rotate → Flip → Filter
   *
   * will stack.
   */
  const getCurrentPreview =
    () =>
      previewImageRef.current ??
      previewImage ??
      image;

  /* =========================================================
     UPDATE PREVIEW
  ========================================================= */

  const updatePreview = (
    result: string,
    width: number,
    height: number
  ) => {
    previewImageRef.current =
      result;

    setPreviewImage(
      result
    );

    setImageSize({
      width,
      height,
    });

    setResolution({
      width,
      height,
    });

    setZoom(1);
  };

  /* =========================================================
     LOAD IMAGE
  ========================================================= */

  const loadImage = (
    source: string
  ): Promise<HTMLImageElement> => {
    return new Promise(
      (resolve, reject) => {
        const img =
          new Image();

        img.onload = () =>
          resolve(img);

        img.onerror = reject;

        img.src = source;
      }
    );
  };

  /* =========================================================
     CANVAS → JPEG
  ========================================================= */

  const canvasToDataURL = (
    canvas: HTMLCanvasElement
  ) => {
    return canvas.toDataURL(
      "image/jpeg",
      jpegQuality / 100
    );
  };

  /* =========================================================
     FLIP HORIZONTAL
  ========================================================= */

  const flipHorizontal =
    async () => {
      const source =
        getCurrentPreview();

      if (!source) return;

      const img =
        await loadImage(
          source
        );

      const canvas =
        document.createElement(
          "canvas"
        );

      canvas.width =
        img.naturalWidth;

      canvas.height =
        img.naturalHeight;

      const ctx =
        canvas.getContext(
          "2d"
        );

      if (!ctx) return;

      ctx.translate(
        canvas.width,
        0
      );

      ctx.scale(
        -1,
        1
      );

      ctx.drawImage(
        img,
        0,
        0
      );

      updatePreview(
        canvasToDataURL(
          canvas
        ),
        canvas.width,
        canvas.height
      );
    };

  /* =========================================================
     FLIP VERTICAL
  ========================================================= */

  const flipVertical =
    async () => {
      const source =
        getCurrentPreview();

      if (!source) return;

      const img =
        await loadImage(
          source
        );

      const canvas =
        document.createElement(
          "canvas"
        );

      canvas.width =
        img.naturalWidth;

      canvas.height =
        img.naturalHeight;

      const ctx =
        canvas.getContext(
          "2d"
        );

      if (!ctx) return;

      ctx.translate(
        0,
        canvas.height
      );

      ctx.scale(
        1,
        -1
      );

      ctx.drawImage(
        img,
        0,
        0
      );

      updatePreview(
        canvasToDataURL(
          canvas
        ),
        canvas.width,
        canvas.height
      );
    };

  /* =========================================================
     ROTATE 90°
  ========================================================= */

  const rotate90 =
    async () => {
      const source =
        getCurrentPreview();

      if (!source) return;

      const img =
        await loadImage(
          source
        );

      const canvas =
        document.createElement(
          "canvas"
        );

      canvas.width =
        img.naturalHeight;

      canvas.height =
        img.naturalWidth;

      const ctx =
        canvas.getContext(
          "2d"
        );

      if (!ctx) return;

      ctx.translate(
        canvas.width,
        0
      );

      ctx.rotate(
        Math.PI / 2
      );

      ctx.drawImage(
        img,
        0,
        0
      );

      updatePreview(
        canvasToDataURL(
          canvas
        ),
        canvas.width,
        canvas.height
      );
    };

  /* =========================================================
     RESIZE
  ========================================================= */

  const resizeImage =
    async () => {
      const source =
        getCurrentPreview();

      if (!source) return;

      if (
        resolution.width <= 0 ||
        resolution.height <= 0
      ) {
        return;
      }

      const img =
        await loadImage(
          source
        );

      const canvas =
        document.createElement(
          "canvas"
        );

      canvas.width =
        resolution.width;

      canvas.height =
        resolution.height;

      const ctx =
        canvas.getContext(
          "2d"
        );

      if (!ctx) return;

      ctx.drawImage(
        img,
        0,
        0,
        resolution.width,
        resolution.height
      );

      updatePreview(
        canvasToDataURL(
          canvas
        ),
        resolution.width,
        resolution.height
      );
    };

  /* =========================================================
     CROP
  ========================================================= */

  const cropImage =
    async () => {
      const source =
        getCurrentPreview();

      if (!source) return;

      const img =
        await loadImage(
          source
        );

      const x = Math.max(
        0,
        Math.min(
          Math.floor(crop.x),
          img.naturalWidth - 1
        )
      );

      const y = Math.max(
        0,
        Math.min(
          Math.floor(crop.y),
          img.naturalHeight - 1
        )
      );

      const width =
        Math.min(
          Math.max(
            1,
            Math.floor(
              crop.width
            )
          ),
          img.naturalWidth - x
        );

      const height =
        Math.min(
          Math.max(
            1,
            Math.floor(
              crop.height
            )
          ),
          img.naturalHeight - y
        );

      if (
        width <= 0 ||
        height <= 0
      ) {
        return;
      }

      const canvas =
        document.createElement(
          "canvas"
        );

      canvas.width =
        width;

      canvas.height =
        height;

      const ctx =
        canvas.getContext(
          "2d"
        );

      if (!ctx) return;

      ctx.drawImage(
        img,

        x,
        y,
        width,
        height,

        0,
        0,
        width,
        height
      );

      updatePreview(
        canvasToDataURL(
          canvas
        ),
        width,
        height
      );

      setCrop({
        x: 0,
        y: 0,
        width,
        height,
      });
    };

  /* =========================================================
     QUALITY PREVIEW
  ========================================================= */

  const previewQuality =
    async (
      quality: number
    ) => {
      const source =
        getCurrentPreview();

      if (!source) return;

      const img =
        await loadImage(
          source
        );

      const canvas =
        document.createElement(
          "canvas"
        );

      canvas.width =
        img.naturalWidth;

      canvas.height =
        img.naturalHeight;

      const ctx =
        canvas.getContext(
          "2d"
        );

      if (!ctx) return;

      ctx.drawImage(
        img,
        0,
        0
      );

      const result =
        canvas.toDataURL(
          "image/jpeg",
          quality / 100
        );

      previewImageRef.current =
        result;

      setPreviewImage(
        result
      );
    };

  /* =========================================================
     SELECT PHOTO ACTION
  ========================================================= */

  const selectPhotoAction =
    async (
      action: PhotoAction
    ) => {
      setSelectedAction(
        action
      );

      if (
        action ===
        "flipHorizontal"
      ) {
        await flipHorizontal();
      }

      if (
        action ===
        "flipVertical"
      ) {
        await flipVertical();
      }

      if (
        action ===
        "rotate"
      ) {
        await rotate90();
      }

      if (
        action === "crop"
      ) {
        const source =
          getCurrentPreview();

        if (!source) return;

        const img =
          await loadImage(
            source
          );

        setCrop({
          x: 0,
          y: 0,
          width:
            img.naturalWidth,
          height:
            img.naturalHeight,
        });
      }
    };

  /* =========================================================
     FILTER — SELECT
     
     THIS ONLY CREATES A PREVIEW.
     
     image is NOT modified.
  ========================================================= */

  const selectFilter =
    async (
      filter: FilterName
    ) => {
      const source =
        getCurrentPreview();

      if (!source) return;

      setSelectedFilter(
        filter
      );

      const defaultIntensity =
        getDefaultFilterIntensity(
          filter
        );

      setFilterIntensity(
        defaultIntensity
      );

      const requestId =
        ++filterRequestId.current;

      try {
        const result =
          await applyRetroFilter(
            source,
            filter,
            defaultIntensity
          );

        /*
         * Ignore old async results.
         */
        if (
          requestId !==
          filterRequestId.current
        ) {
          return;
        }

        setFilterPreview(
          result.image
        );

        /*
         * ONLY visual preview.
         *
         * Do NOT modify image.
         */
        previewImageRef.current =
          result.image;

        setPreviewImage(
          result.image
        );

        setImageSize({
          width:
            result.width,

          height:
            result.height,
        });
      } catch (error) {
        console.error(
          "Filter preview failed:",
          error
        );
      }
    };

  /* =========================================================
     FILTER — INTENSITY
     
     ONLY CHANGES PREVIEW.
  ========================================================= */

  const changeFilterIntensity =
    async (
      intensity: number
    ) => {
      setFilterIntensity(
        intensity
      );

      if (
        !selectedFilter
      ) {
        return;
      }

      /*
       * IMPORTANT:
       *
       * Use the image BEFORE the current
       * filter preview was generated.
       *
       * Otherwise changing 30 → 40 → 50
       * would stack the same filter repeatedly.
       */
      const source =
        image;

      if (!source) return;

      const requestId =
        ++filterRequestId.current;

      try {
        const result =
          await applyRetroFilter(
            source,
            selectedFilter,
            intensity
          );

        if (
          requestId !==
          filterRequestId.current
        ) {
          return;
        }

        setFilterPreview(
          result.image
        );

        previewImageRef.current =
          result.image;

        setPreviewImage(
          result.image
        );

        setImageSize({
          width:
            result.width,

          height:
            result.height,
        });
      } catch (error) {
        console.error(
          "Filter intensity preview failed:",
          error
        );
      }
    };

  /* =========================================================
     APPLY FILTER
     
     THIS IS THE ONLY PLACE WHERE THE FILTER
     BECOMES COMMITTED.
  ========================================================= */

  const applyFilter =
    () => {
      if (
        !filterPreview
      ) {
        return;
      }

      /*
       * NOW the filter becomes permanent.
       */
      setImage(
        filterPreview
      );

      setPreviewImage(
        filterPreview
      );

      previewImageRef.current =
        filterPreview;

      /*
       * Filter preview is no longer
       * considered temporary.
       */
      setFilterPreview(
        null
      );

      setSelectedFilter(
        null
      );

      /*
       * Reset the Photo Settings
       * selection so the UI doesn't
       * remain stuck on the old filter.
       */
      setActiveTab(
        "Filters"
      );
    };

  /* =========================================================
     CANCEL FILTER
     
     Revert ONLY the uncommitted filter.
  ========================================================= */

  const cancelFilter =
    () => {
      if (!image) return;

      /*
       * Invalidate pending filter renders.
       */
      filterRequestId.current++;

      setPreviewImage(
        image
      );

      previewImageRef.current =
        image;

      setFilterPreview(
        null
      );

      setSelectedFilter(
        null
      );

      setFilterIntensity(
        70
      );

      loadImage(image)
        .then((img) => {
          setImageSize({
            width:
              img.naturalWidth,

            height:
              img.naturalHeight,
          });

          setResolution({
            width:
              img.naturalWidth,

            height:
              img.naturalHeight,
          });
        });
    };

  /* =========================================================
     GENERIC EFFECT — SELECT
  ========================================================= */

  const selectGenericEffect = async (effectName: string) => {
    const source = getCurrentPreview();
    if (!source) return;

    setActiveEffect(effectName);
    const defaultInt = 70;
    setEffectIntensity(defaultInt);

    const requestId = ++effectRequestId.current;

    try {
      const result = await applyTabEffect(
        source, activeTab, effectName,
        tabHasIntensity(activeTab) ? defaultInt : 100,
        { stampPosition, stampSize }
      );
      if (requestId !== effectRequestId.current) return;

      setEffectPreview(result.image);
      previewImageRef.current = result.image;
      setPreviewImage(result.image);
      setImageSize({ width: result.width, height: result.height });
    } catch (error) {
      console.error("Effect preview failed:", error);
    }
  };

  /* =========================================================
     GENERIC EFFECT — INTENSITY
  ========================================================= */

  const changeGenericIntensity = async (intensity: number) => {
    setEffectIntensity(intensity);
    if (!activeEffect) return;

    const source = image;
    if (!source) return;

    const requestId = ++effectRequestId.current;

    try {
      const result = await applyTabEffect(
        source, activeTab, activeEffect, intensity,
        { stampPosition, stampSize }
      );
      if (requestId !== effectRequestId.current) return;

      setEffectPreview(result.image);
      previewImageRef.current = result.image;
      setPreviewImage(result.image);
      setImageSize({ width: result.width, height: result.height });
    } catch (error) {
      console.error("Effect intensity failed:", error);
    }
  };

  /* =========================================================
     GENERIC EFFECT — APPLY
  ========================================================= */

  const applyGenericEffect = () => {
    if (!effectPreview) return;

    setImage(effectPreview);
    setPreviewImage(effectPreview);
    previewImageRef.current = effectPreview;

    setEffectPreview(null);
    setActiveEffect(null);
    setEffectIntensity(70);
  };

  /* =========================================================
     GENERIC EFFECT — CANCEL
  ========================================================= */

  const cancelGenericEffect = () => {
    if (!image) return;

    effectRequestId.current++;
    setPreviewImage(image);
    previewImageRef.current = image;

    setEffectPreview(null);
    setActiveEffect(null);
    setEffectIntensity(70);

    loadImage(image).then((img) => {
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
      setResolution({ width: img.naturalWidth, height: img.naturalHeight });
    });
  };

  /* =========================================================
     STAMP — OPTION CHANGE
  ========================================================= */

  const changeStampOption = async (pos?: StampPosition, size?: number) => {
    const newPos = pos ?? stampPosition;
    const newSize = size ?? stampSize;
    if (pos) setStampPosition(newPos);
    if (size !== undefined) setStampSize(newSize);

    if (!activeEffect) return;
    const source = image;
    if (!source) return;

    const requestId = ++effectRequestId.current;

    try {
      const result = await applyTabEffect(
        source, "Retro Stamps", activeEffect, effectIntensity,
        { stampPosition: newPos, stampSize: newSize }
      );
      if (requestId !== effectRequestId.current) return;

      setEffectPreview(result.image);
      previewImageRef.current = result.image;
      setPreviewImage(result.image);
      setImageSize({ width: result.width, height: result.height });
    } catch (error) {
      console.error("Stamp option failed:", error);
    }
  };

  /* =========================================================
     COMMIT PREVIEW
  ========================================================= */

  const commitPreview =
    () => {
      const current =
        previewImageRef.current;

      if (!current) return;

      setImage(
        current
      );

      setPreviewImage(
        current
      );
    };

  /* =========================================================
     APPLY PHOTO SETTING
  ========================================================= */

  const applyPhotoSetting =
    async () => {
      if (
        !previewImage
      ) {
        return;
      }

      if (
        selectedAction ===
        "crop"
      ) {
        await cropImage();

        const cropped =
          previewImageRef.current;

        if (cropped) {
          setImage(
            cropped
          );

          setPreviewImage(
            cropped
          );
        }

        return;
      }

      /*
       * Flip / rotate / quality /
       * resize are already previewed.
       *
       * Apply Setting commits them.
       */
      commitPreview();
    };

  /* =========================================================
     RESET IMAGE
  ========================================================= */

  const resetImage =
    async () => {
      if (!originalImage)
        return;

      const img =
        await loadImage(
          originalImage
        );

      setImage(
        originalImage
      );

      setPreviewImage(
        originalImage
      );

      previewImageRef.current =
        originalImage;

      const size = {
        width:
          img.naturalWidth,

        height:
          img.naturalHeight,
      };

      setImageSize(size);

      setResolution(
        size
      );

      setCrop({
        x: 0,
        y: 0,
        width:
          img.naturalWidth,
        height:
          img.naturalHeight,
      });

      setJpegQuality(
        100
      );

      setZoom(1);

      setSelectedAction(
        "quality"
      );

      setSelectedFilter(
        null
      );

      setFilterPreview(
        null
      );

      setFilterIntensity(
        70
      );

      filterRequestId.current++;

      setActiveEffect(null);
      setEffectPreview(null);
      setEffectIntensity(70);
      effectRequestId.current++;
    };

  /* =========================================================
     CANCEL PHOTO PREVIEW
  ========================================================= */

  const cancelPreview =
    async () => {
      if (!image) return;

      /*
       * Invalidate filter requests.
       */
      filterRequestId.current++;

      previewImageRef.current =
        image;

      setPreviewImage(
        image
      );

      const img =
        await loadImage(
          image
        );

      setImageSize({
        width:
          img.naturalWidth,

        height:
          img.naturalHeight,
      });

      setResolution({
        width:
          img.naturalWidth,

        height:
          img.naturalHeight,
      });

      setCrop({
        x: 0,
        y: 0,
        width:
          img.naturalWidth,
        height:
          img.naturalHeight,
      });

      setZoom(1);

      setFilterPreview(
        null
      );

      setSelectedFilter(
        null
      );

      setActiveEffect(null);
      setEffectPreview(null);
      setEffectIntensity(70);
      effectRequestId.current++;
    };

  /* =========================================================
     ZOOM
  ========================================================= */

  const zoomIn = () => {
    setZoom(
      (current) =>
        Math.min(
          Number(
            (
              current +
              0.1
            ).toFixed(1)
          ),
          4
        )
    );
  };

  const zoomOut = () => {
    setZoom(
      (current) =>
        Math.max(
          Number(
            (
              current -
              0.1
            ).toFixed(1)
          ),
          0.1
        )
    );
  };

  const resetZoom = () => {
    setZoom(1);
  };

  /* =========================================================
     DOWNLOAD
  ========================================================= */

  const downloadImage =
    () => {
      const current =
        previewImageRef.current;

      if (!current) return;

      const link =
        document.createElement(
          "a"
        );

      link.href =
        current;

      link.download =
        "image95-edit.jpg";

      link.click();
    };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div className="retro-editor">

      {/* FILE INPUT */}

      <input
        id="image-upload-input"
        type="file"
        accept="
          image/png,
          image/jpeg,
          image/webp,
          image/bmp
        "
        onChange={
          handleImageUpload
        }
        style={{
          display: "none",
        }}
      />

      {/* =====================================================
          TOP BAR
      ===================================================== */}

      <div className="retro-topbar">

        <div className="top-links">

          <span>
            Home
          </span>

          <span>
            About
          </span>

          <span>
            Privacy Policy
          </span>

        </div>

        <div className="window-controls">

          <button>
            ?
          </button>

          <button>
            ×
          </button>

        </div>

      </div>

      {/* =====================================================
          TABS
      ===================================================== */}

      <div className="retro-tabs">

        {tabs.map(
          (tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(
                  tab
                );

                /*
                 * Do NOT automatically cancel a filter
                 * when changing tabs.
                 *
                 * The preview remains visible until
                 * Apply or Cancel.
                 */
              }}
              className={`retro-tab ${
                activeTab ===
                tab
                  ? "active"
                  : ""
              }`}
            >
              {tab}
            </button>
          )
        )}

      </div>

      {/* =====================================================
          MAIN
      ===================================================== */}

      <div className="retro-main">

        {/* ===================================================
            LEFT PANEL
        =================================================== */}

        <aside className="retro-panel left-panel">

          <PanelTitle>
            ★ ·¸¸. MENU .¸¸· ★
          </PanelTitle>

          <div className="left-actions">

            <button
              className="retro-button blue"
              onClick={
                openFilePicker
              }
            >
              Upload New Image
            </button>

            <button
              className="retro-button yellow"
              onClick={
                resetImage
              }
              disabled={
                !originalImage
              }
            >
              Reset Image
            </button>

            <button
              className="retro-button purple"
              onClick={
                downloadImage
              }
              disabled={
                !previewImage
              }
            >
              Download Image
            </button>

          </div>

          <div className="left-decoration">

            <div className="ad-box green">

              <strong>
                ▣ The app is now
              </strong>

              <strong>
                available on
              </strong>

              <strong>
                Google Play!
              </strong>

              <div className="star-text">
                ★ ·¸¸. Google
                <br />
                Play
              </div>

            </div>

            <div className="ad-box">

              <span>
                Enjoying
                image95.exe?
              </span>

              <strong>
                Support it with a
              </strong>

              <strong>
                coffee!
              </strong>

            </div>

          </div>

        </aside>

        {/* ===================================================
            CENTER WORKSPACE
        =================================================== */}

        <main className="retro-workspace">

          <div className="canvas-toolbar">

            <span>
              IMAGE EDITOR
            </span>

            <div className="canvas-info">

              <button
                className="zoom-button"
                onClick={
                  zoomOut
                }
              >
                −
              </button>

              <button
                className="zoom-value"
                onClick={
                  resetZoom
                }
              >
                {Math.round(
                  zoom * 100
                )}
                %
              </button>

              <button
                className="zoom-button"
                onClick={
                  zoomIn
                }
              >
                +
              </button>

              <span>
                RGB
              </span>

            </div>

          </div>

          <div className="canvas-area">

            <EditorCanvas
              image={
                previewImage
              }

              cropMode={
                selectedAction ===
                "crop"
              }

              crop={
                crop
              }

              onCropChange={
                setCrop
              }
            />

            {!image && (
              <button
                className="retro-button blue upload-button"
                onClick={
                  openFilePicker
                }
              >
                Upload Image
              </button>
            )}

          </div>

        </main>

        {/* ===================================================
            RIGHT PANEL
        =================================================== */}

        <aside className="retro-panel right-panel">

          <PanelTitle>
            ★ ·¸¸.{" "}
            {activeTab.toUpperCase()}
            {" "}¸¸· ★
          </PanelTitle>

          <div className="settings-placeholder">

            <div className="panel-description">
              {
                currentPanel.description
              }
            </div>

            {/* =================================================
                PHOTO SETTINGS
            ================================================= */}

            {activeTab ===
            "Photo Settings" ? (

              <PhotoSettings
                selectedAction={
                  selectedAction
                }

                selectAction={
                  selectPhotoAction
                }

                jpegQuality={
                  jpegQuality
                }

                setJpegQuality={
                  setJpegQuality
                }

                previewQuality={
                  previewQuality
                }

                resolution={
                  resolution
                }

                setResolution={
                  setResolution
                }

                crop={
                  crop
                }

                setCrop={
                  setCrop
                }

                applySetting={
                  applyPhotoSetting
                }

                previewSetting={
                  async () => {
                    await resizeImage();
                  }
                }

                cancelPreview={
                  cancelPreview
                }
              />

            ) : activeTab ===
              "Filters" ? (

              /* =================================================
                  FILTERS
              ================================================= */

              <FiltersPanel
                selectedFilter={
                  selectedFilter
                }

                filterIntensity={
                  filterIntensity
                }

                onSelectFilter={
                  selectFilter
                }

                onIntensityChange={
                  changeFilterIntensity
                }

                onApply={
                  applyFilter
                }

                onCancel={
                  cancelFilter
                }

                hasPreview={
                  !!filterPreview
                }
              />

            ) : (

              <GenericPanel
                controls={
                  currentPanel.controls
                }

                activeTab={
                  activeTab
                }
              />

            )}

          </div>

        </aside>

      </div>

      {/* =====================================================
          STATUS BAR
      ===================================================== */}

      <div className="retro-status">

        <span>
          image95.exe —{" "}
          {activeTab}
        </span>

        <span>
          Canvas:{" "}
          {imageSize.width >
          0
            ? `${imageSize.width} × ${imageSize.height} px`
            : "0 × 0 px"}

          &nbsp; | &nbsp;

          Zoom:{" "}
          {Math.round(
            zoom * 100
          )}
          %
        </span>

      </div>

    </div>
  );
}

/* =========================================================
   FILTERS PANEL
========================================================= */

function FiltersPanel({
  selectedFilter,
  filterIntensity,
  onSelectFilter,
  onIntensityChange,
  onApply,
  onCancel,
  hasPreview,
}: {
  selectedFilter:
    | FilterName
    | null;

  filterIntensity: number;

  onSelectFilter: (
    filter: FilterName
  ) => void;

  onIntensityChange: (
    intensity: number
  ) => void;

  onApply: () => void;

  onCancel: () => void;

  hasPreview: boolean;
}) {
  return (
    <>

      {/* FILTER GRID */}

      <div className="setting-grid">

        {filterOptions.map(
          (filter) => (

            <RetroTool
              key={
                filter.name
              }

              title={
                filter.title
              }

              icon={
                filter.icon
              }

              selected={
                selectedFilter ===
                filter.name
              }

              onClick={() =>
                onSelectFilter(
                  filter.name
                )
              }
            />

          )
        )}

      </div>

      {/* FILTER CONTROL */}

      {selectedFilter && (

        <div className="photo-control-box">

          <div className="control-heading">

            {filterOptions.find(
              (item) =>
                item.name ===
                selectedFilter
            )?.title}

          </div>

          <div className="quality-row">

            <input
              type="range"
              min="0"
              max="100"
              value={
                filterIntensity
              }

              onChange={(
                event
              ) =>
                onIntensityChange(
                  Number(
                    event
                      .target
                      .value
                  )
                )
              }
            />

            <span>
              {
                filterIntensity
              }
              %
            </span>

          </div>

          <div className="control-help">

            Live preview enabled.

            <br />

            Changing the
            intensity does not
            modify the original.

            <br />

            Click
            <strong>
              {" "}
              Apply Setting
            </strong>{" "}
            to finalize.

          </div>

        </div>

      )}

      {!selectedFilter && (

        <div className="photo-control-box">

          <div className="control-heading">
            Choose a Filter
          </div>

          <div className="control-help">

            Select a filter to
            preview it on your
            image.

            <br />

            Nothing is finalized
            until you click
            <strong>
              {" "}
              Apply Setting
            </strong>.

          </div>

        </div>

      )}

      {/* ACTION BUTTONS */}

      <div
        style={{
          display:
            "flex",

          gap:
            "6px",

          marginTop:
            "10px",
        }}
      >

        <button
          className="apply-button"
          onClick={
            onApply
          }

          disabled={
            !hasPreview
          }
        >
          Apply Setting
        </button>

        <button
          className="retro-button"
          onClick={
            onCancel
          }

          disabled={
            !hasPreview
          }
        >
          Cancel
        </button>

      </div>

    </>
  );
}

/* =========================================================
   PHOTO SETTINGS
========================================================= */

function PhotoSettings({
  selectedAction,
  selectAction,

  jpegQuality,
  setJpegQuality,
  previewQuality,

  resolution,
  setResolution,

  crop,
  setCrop,

  applySetting,
  previewSetting,

  cancelPreview,
}: {
  selectedAction: PhotoAction;

  selectAction: (
    action: PhotoAction
  ) => void;

  jpegQuality: number;

  setJpegQuality: (
    value: number
  ) => void;

  previewQuality: (
    value: number
  ) => void;

  resolution: ImageSize;

  setResolution: (
    value: ImageSize
  ) => void;

  crop: CropArea;

  setCrop: (
    value: CropArea
  ) => void;

  applySetting: () => void;

  previewSetting: () => void;

  cancelPreview: () => void;
}) {

  const tools = [
    {
      title:
        "JPEG Quality",

      icon:
        "▰",

      action:
        "quality" as PhotoAction,
    },

    {
      title:
        "JPEG Resolution",

      icon:
        "▧",

      action:
        "resolution" as PhotoAction,
    },

    {
      title:
        "Crop",

      icon:
        "⌗",

      action:
        "crop" as PhotoAction,
    },

    {
      title:
        "Flip Horizontal",

      icon:
        "◫",

      action:
        "flipHorizontal" as PhotoAction,
    },

    {
      title:
        "Flip Vertical",

      icon:
        "◩",

      action:
        "flipVertical" as PhotoAction,
    },

    {
      title:
        "Rotate 90°",

      icon:
        "↻",

      action:
        "rotate" as PhotoAction,
    },
  ];

  return (
    <>

      <div className="setting-grid">

        {tools.map(
          (tool) => (

            <RetroTool
              key={
                tool.action
              }

              title={
                tool.title
              }

              icon={
                tool.icon
              }

              selected={
                selectedAction ===
                tool.action
              }

              onClick={() =>
                selectAction(
                  tool.action
                )
              }
            />

          )
        )}

      </div>

      {/* =====================================================
          QUALITY
      ===================================================== */}

      {selectedAction ===
        "quality" && (

        <div className="photo-control-box">

          <div className="control-heading">
            JPEG Quality
          </div>

          <div className="quality-row">

            <input
              type="range"
              min="1"
              max="100"
              value={
                jpegQuality
              }

              onChange={(
                event
              ) => {

                const value =
                  Number(
                    event
                      .target
                      .value
                  );

                setJpegQuality(
                  value
                );

                previewQuality(
                  value
                );

              }}
            />

            <span>
              {
                jpegQuality
              }
              %
            </span>

          </div>

          <div className="control-help">

            Drag to preview
            compression.

            <br />

            Apply Setting
            commits it.

          </div>

        </div>
      )}

      {/* =====================================================
          RESOLUTION
      ===================================================== */}

      {selectedAction ===
        "resolution" && (

        <div className="photo-control-box">

          <div className="control-heading">
            JPEG Resolution
          </div>

          <div className="dimension-row">

            <label>
              Width

              <input
                type="number"
                min="1"
                value={
                  resolution.width
                }

                onChange={(
                  event
                ) =>
                  setResolution({
                    ...resolution,

                    width:
                      Number(
                        event
                          .target
                          .value
                      ),
                  })
                }
              />

            </label>

            <span>
              ×
            </span>

            <label>
              Height

              <input
                type="number"
                min="1"
                value={
                  resolution.height
                }

                onChange={(
                  event
                ) =>
                  setResolution({
                    ...resolution,

                    height:
                      Number(
                        event
                          .target
                          .value
                      ),
                  })
                }
              />

            </label>

          </div>

          <button
            className="retro-button"
            onClick={
              previewSetting
            }
          >
            Preview Resize
          </button>

        </div>
      )}

      {/* =====================================================
          CROP
      ===================================================== */}

      {selectedAction ===
        "crop" && (

        <div className="photo-control-box">

          <div className="control-heading">
            Drag Crop
          </div>

          <div className="crop-help-box">

            <strong>
              ✦ DRAG TO CROP
            </strong>

            <p>
              Drag inside the
              white box to move
              it.
            </p>

            <p>
              Drag the corners
              or edges to resize.
            </p>

            <p>
              The image won't
              be changed until
              you click
              <strong>
                {" "}
                Apply Setting
              </strong>.
            </p>

          </div>

          <div className="crop-size-display">

            {Math.round(
              crop.width
            )}

            {" × "}

            {Math.round(
              crop.height
            )}

            {" px"}

          </div>

        </div>
      )}

      {/* =====================================================
          FLIP
      ===================================================== */}

      {(selectedAction ===
        "flipHorizontal" ||
        selectedAction ===
          "flipVertical") && (

        <div className="photo-control-box">

          <div className="control-heading">

            {selectedAction ===
            "flipHorizontal"
              ? "Flip Horizontal"
              : "Flip Vertical"}

          </div>

          <div className="control-help">

            Preview applied.

            <br />

            You can continue
            stacking operations.

            <br />

            Apply Setting
            commits the result.

          </div>

        </div>
      )}

      {/* =====================================================
          ROTATE
      ===================================================== */}

      {selectedAction ===
        "rotate" && (

        <div className="photo-control-box">

          <div className="control-heading">
            Rotate 90°
          </div>

          <div className="control-help">

            Preview applied.

            <br />

            You can continue
            stacking operations.

            <br />

            Apply Setting
            commits the result.

          </div>

        </div>
      )}

      {/* =====================================================
          ACTIONS
      ===================================================== */}

      <div
        style={{
          display:
            "flex",

          gap:
            "6px",

          marginTop:
            "10px",
        }}
      >

        <button
          className="apply-button"
          onClick={
            applySetting
          }
        >
          Apply Setting
        </button>

        <button
          className="retro-button"
          onClick={
            cancelPreview
          }
        >
          Cancel
        </button>

      </div>

    </>
  );
}

/* =========================================================
   GENERIC PANEL
========================================================= */

function GenericPanel({
  controls,
  activeTab,
}: {
  controls: string[];
  activeTab: string;
}) {

  const icons = [
    "✦",
    "◈",
    "✧",
    "★",
    "◆",
    "◉",
  ];

  return (
    <>

      <div className="retro-category">
        {activeTab}
      </div>

      <div className="generic-grid">

        {controls.map(
          (
            control,
            index
          ) => (

            <RetroTool
              key={
                control
              }

              title={
                control
              }

              icon={
                icons[
                  index %
                  icons.length
                ]
              }

            />

          )
        )}

      </div>

      <div className="intensity-section">

        <div className="setting-label">
          Intensity
        </div>

        <input
          type="range"
          min="0"
          max="100"
          defaultValue="70"
        />

      </div>

      <button className="apply-button">
        Apply Effect
      </button>

    </>
  );
}

/* =========================================================
   RETRO TOOL
========================================================= */

function RetroTool({
  title,
  icon,
  selected = false,
  onClick,
}: {
  title: string;
  icon: string;
  selected?: boolean;
  onClick?: () => void;
}) {

  return (
    <div className="retro-tool">

      <div className="retro-tool-label">
        {title}
      </div>

      <button
        type="button"
        className={`tool-icon ${
          selected
            ? "selected"
            : ""
        }`}
        onClick={
          onClick
        }
      >
        {icon}
      </button>

    </div>
  );
}

/* =========================================================
   PANEL TITLE
========================================================= */

function PanelTitle({
  children,
}: {
  children: ReactNode;
}) {

  return (
    <div className="panel-title">
      {children}
    </div>
  );
}