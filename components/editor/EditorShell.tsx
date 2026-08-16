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
   MAIN
========================================================= */

export default function EditorShell() {
  /* =======================================================
     IMAGE STATE

     image = LAST COMMITTED IMAGE

     previewImage = CURRENT PREVIEW

     This lets the user stack:
       Rotate
       → Flip
       → Rotate
       → Crop

     without previous operations disappearing.
  ======================================================= */

  const [image, setImage] =
    useState<string | null>(null);

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
     UI
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
        const size = {
          width:
            img.naturalWidth,

          height:
            img.naturalHeight,
        };

        setImage(result);

        setPreviewImage(
          result
        );

        previewImageRef.current =
          result;

        setOriginalImage(
          result
        );

        setImageSize(size);

        setResolution(size);

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
      };

      img.src = result;
    };

    reader.readAsDataURL(
      file
    );

    event.target.value = "";
  };

  /* =========================================================
     GET CURRENT PREVIEW
  ========================================================= */

  const getCurrentPreview =
    () =>
      previewImageRef.current ??
      image;

  /* =========================================================
     LOAD IMAGE
  ========================================================= */

  const loadImage = (
    source: string
  ): Promise<HTMLImageElement> => {
    return new Promise(
      (
        resolve,
        reject
      ) => {
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

     Crop is ONLY finalized when Apply Setting is clicked.

     The crop rectangle itself is just state until then.
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

      const imageWidth =
        img.naturalWidth;

      const imageHeight =
        img.naturalHeight;

      const x = Math.max(
        0,
        Math.min(
          Math.round(crop.x),
          imageWidth - 1
        )
      );

      const y = Math.max(
        0,
        Math.min(
          Math.round(crop.y),
          imageHeight - 1
        )
      );

      const width =
        Math.max(
          1,
          Math.min(
            Math.round(crop.width),
            imageWidth - x
          )
        );

      const height =
        Math.max(
          1,
          Math.min(
            Math.round(crop.height),
            imageHeight - y
          )
        );

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

      const result =
        canvasToDataURL(
          canvas
        );

      /*
       * IMPORTANT:
       *
       * Update preview first.
       *
       * This means crop is applied to
       * the PREVIEW but not committed
       * until Apply Setting.
       */

      updatePreview(
        result,
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
        action ===
        "crop"
      ) {
        const source =
          getCurrentPreview();

        if (!source) return;

        const img =
          await loadImage(
            source
          );

        /*
         * Start with the ENTIRE
         * currently visible image.
         */

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
      const source =
        getCurrentPreview();

      if (!source) return;

      /*
       * CROP
       *
       * First create cropped preview.
       * Then commit that exact result.
       */

      if (
        selectedAction ===
        "crop"
      ) {
        await cropImage();

        const cropped =
          previewImageRef.current;

        if (!cropped) return;

        setImage(
          cropped
        );

        setPreviewImage(
          cropped
        );

        return;
      }

      /*
       * EVERYTHING ELSE
       *
       * The operation has already
       * been previewed.
       *
       * Apply Setting simply commits it.
       */

      commitPreview();
    };

  /* =========================================================
     RESET
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

      setResolution(size);

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
    };

  /* =========================================================
     CANCEL

     Go back to LAST COMMITTED IMAGE.
  ========================================================= */

  const cancelPreview =
    async () => {
      if (!image) return;

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
              onClick={() =>
                setActiveTab(
                  tab
                )
              }
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

          {/* =================================================
              IMPORTANT:
              This must have a real size.
          ================================================= */}

          <div
            className="canvas-area"
            style={{
              position:
                "relative",

              width:
                "100%",

              height:
                "100%",

              minHeight:
                0,

              overflow:
                "hidden",
            }}
          >

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

              zoom={
                zoom
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

                applySetting={
                  applyPhotoSetting
                }

                previewSetting={
                  resizeImage
                }

                cancelPreview={
                  cancelPreview
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
                    event.target
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
              }%
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
                        event.target
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
                        event.target
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
              The image will
              only be changed
              when you click
              <strong>
                {" "}
                Apply Setting
              </strong>.
            </p>

          </div>

          <div className="crop-size-display">
            {Math.round(
              crop.width
            )}{" "}
            ×{" "}
            {Math.round(
              crop.height
            )} px
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
          ACTION BUTTONS
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