"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import type {
  CSSProperties,
  MouseEvent as ReactMouseEvent,
} from "react";

export type CropArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type CropHandle =
  | "move"
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w";

type EditorCanvasProps = {
  image: string | null;

  cropMode?: boolean;

  crop?: CropArea;

  onCropChange?: (
    crop: CropArea
  ) => void;

  zoom?: number;
};

type DisplaySize = {
  width: number;
  height: number;
};

export default function EditorCanvas({
  image,
  cropMode = false,
  crop,
  onCropChange,
  zoom = 1,
}: EditorCanvasProps) {
  const containerRef =
    useRef<HTMLDivElement>(null);

  const imageRef =
    useRef<HTMLImageElement>(null);

  const [displaySize, setDisplaySize] =
    useState<DisplaySize>({
      width: 0,
      height: 0,
    });

  const [containerSize, setContainerSize] =
    useState<DisplaySize>({
      width: 0,
      height: 0,
    });

  const [dragging, setDragging] =
    useState(false);

  const [activeHandle, setActiveHandle] =
    useState<CropHandle | null>(null);

  const dragData =
    useRef<{
      startX: number;
      startY: number;
      crop: CropArea;
    } | null>(null);

  /* =========================================================
     MEASURE CONTAINER
  ========================================================= */

  const updateSize = useCallback(() => {
    const container =
      containerRef.current;

    const imageElement =
      imageRef.current;

    if (!container || !imageElement) {
      return;
    }

    const containerRect =
      container.getBoundingClientRect();

    const naturalWidth =
      imageElement.naturalWidth;

    const naturalHeight =
      imageElement.naturalHeight;

    if (
      !naturalWidth ||
      !naturalHeight
    ) {
      return;
    }

    const availableWidth =
      Math.max(
        1,
        containerRect.width - 24
      );

    const availableHeight =
      Math.max(
        1,
        containerRect.height - 24
      );

    /*
     * FIT THE IMAGE INSIDE THE WORKSPACE.
     *
     * This is the important fix.
     *
     * Example:
     * 1080 × 1920 image
     * inside a 1080 × 760 workspace
     *
     * The image will automatically become
     * approximately 427 × 760.
     */

    const fitScale =
      Math.min(
        availableWidth /
          naturalWidth,

        availableHeight /
          naturalHeight
      );

    const safeScale =
      Math.max(
        0.01,
        fitScale
      );

    const finalScale =
      safeScale * zoom;

    setContainerSize({
      width:
        containerRect.width,

      height:
        containerRect.height,
    });

    setDisplaySize({
      width:
        naturalWidth *
        finalScale,

      height:
        naturalHeight *
        finalScale,
    });
  }, [zoom]);

  /* =========================================================
     IMAGE LOAD
  ========================================================= */

  const handleImageLoad = () => {
    requestAnimationFrame(
      updateSize
    );
  };

  /* =========================================================
     OBSERVE WORKSPACE SIZE
  ========================================================= */

  useEffect(() => {
    updateSize();

    const observer =
      new ResizeObserver(() => {
        updateSize();
      });

    if (
      containerRef.current
    ) {
      observer.observe(
        containerRef.current
      );
    }

    window.addEventListener(
      "resize",
      updateSize
    );

    return () => {
      observer.disconnect();

      window.removeEventListener(
        "resize",
        updateSize
      );
    };
  }, [
    image,
    zoom,
    updateSize,
  ]);

  /* =========================================================
     START DRAG
  ========================================================= */

  const startCropDrag = (
    event: ReactMouseEvent,
    handle: CropHandle
  ) => {
    if (
      !cropMode ||
      !crop ||
      !onCropChange ||
      !imageRef.current
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    setDragging(true);
    setActiveHandle(handle);

    dragData.current = {
      startX:
        event.clientX,

      startY:
        event.clientY,

      crop: {
        ...crop,
      },
    };
  };

  /* =========================================================
     HANDLE CROP DRAGGING
  ========================================================= */

  useEffect(() => {
    if (
      !dragging ||
      !activeHandle ||
      !crop ||
      !onCropChange ||
      !imageRef.current ||
      !dragData.current
    ) {
      return;
    }

    const naturalWidth =
      imageRef.current.naturalWidth;

    const naturalHeight =
      imageRef.current.naturalHeight;

    if (
      displaySize.width <= 0 ||
      displaySize.height <= 0
    ) {
      return;
    }

    const scaleX =
      naturalWidth /
      displaySize.width;

    const scaleY =
      naturalHeight /
      displaySize.height;

    const handleMouseMove = (
      event: MouseEvent
    ) => {
      if (!dragData.current) {
        return;
      }

      const original =
        dragData.current.crop;

      const dx =
        (
          event.clientX -
          dragData.current.startX
        ) * scaleX;

      const dy =
        (
          event.clientY -
          dragData.current.startY
        ) * scaleY;

      const MIN_SIZE = 40;

      let next: CropArea = {
        ...original,
      };

      /* =====================================================
         MOVE
      ===================================================== */

      if (
        activeHandle ===
        "move"
      ) {
        next.x =
          original.x + dx;

        next.y =
          original.y + dy;

        next.x =
          Math.max(
            0,
            Math.min(
              next.x,
              naturalWidth -
                original.width
            )
          );

        next.y =
          Math.max(
            0,
            Math.min(
              next.y,
              naturalHeight -
                original.height
            )
          );
      }

      /* =====================================================
         NORTHWEST
      ===================================================== */

      else if (
        activeHandle ===
        "nw"
      ) {
        const newX =
          Math.max(
            0,
            Math.min(
              original.x + dx,
              original.x +
                original.width -
                MIN_SIZE
            )
          );

        const newY =
          Math.max(
            0,
            Math.min(
              original.y + dy,
              original.y +
                original.height -
                MIN_SIZE
            )
          );

        next.x = newX;
        next.y = newY;

        next.width =
          original.x +
          original.width -
          newX;

        next.height =
          original.y +
          original.height -
          newY;
      }

      /* =====================================================
         NORTH
      ===================================================== */

      else if (
        activeHandle ===
        "n"
      ) {
        const newY =
          Math.max(
            0,
            Math.min(
              original.y + dy,
              original.y +
                original.height -
                MIN_SIZE
            )
          );

        next.y = newY;

        next.height =
          original.y +
          original.height -
          newY;
      }

      /* =====================================================
         NORTHEAST
      ===================================================== */

      else if (
        activeHandle ===
        "ne"
      ) {
        const newY =
          Math.max(
            0,
            Math.min(
              original.y + dy,
              original.y +
                original.height -
                MIN_SIZE
            )
          );

        next.y = newY;

        next.height =
          original.y +
          original.height -
          newY;

        next.width =
          Math.max(
            MIN_SIZE,
            Math.min(
              original.width +
                dx,
              naturalWidth -
                original.x
            )
          );
      }

      /* =====================================================
         EAST
      ===================================================== */

      else if (
        activeHandle ===
        "e"
      ) {
        next.width =
          Math.max(
            MIN_SIZE,
            Math.min(
              original.width +
                dx,
              naturalWidth -
                original.x
            )
          );
      }

      /* =====================================================
         SOUTHEAST
      ===================================================== */

      else if (
        activeHandle ===
        "se"
      ) {
        next.width =
          Math.max(
            MIN_SIZE,
            Math.min(
              original.width +
                dx,
              naturalWidth -
                original.x
            )
          );

        next.height =
          Math.max(
            MIN_SIZE,
            Math.min(
              original.height +
                dy,
              naturalHeight -
                original.y
            )
          );
      }

      /* =====================================================
         SOUTH
      ===================================================== */

      else if (
        activeHandle ===
        "s"
      ) {
        next.height =
          Math.max(
            MIN_SIZE,
            Math.min(
              original.height +
                dy,
              naturalHeight -
                original.y
            )
          );
      }

      /* =====================================================
         SOUTHWEST
      ===================================================== */

      else if (
        activeHandle ===
        "sw"
      ) {
        const newX =
          Math.max(
            0,
            Math.min(
              original.x + dx,
              original.x +
                original.width -
                MIN_SIZE
            )
          );

        next.x = newX;

        next.width =
          original.x +
          original.width -
          newX;

        next.height =
          Math.max(
            MIN_SIZE,
            Math.min(
              original.height +
                dy,
              naturalHeight -
                original.y
            )
          );
      }

      /* =====================================================
         WEST
      ===================================================== */

      else if (
        activeHandle ===
        "w"
      ) {
        const newX =
          Math.max(
            0,
            Math.min(
              original.x + dx,
              original.x +
                original.width -
                MIN_SIZE
            )
          );

        next.x = newX;

        next.width =
          original.x +
          original.width -
          newX;
      }

      onCropChange(next);
    };

    const handleMouseUp = () => {
      setDragging(false);
      setActiveHandle(null);
      dragData.current = null;
    };

    window.addEventListener(
      "mousemove",
      handleMouseMove
    );

    window.addEventListener(
      "mouseup",
      handleMouseUp
    );

    return () => {
      window.removeEventListener(
        "mousemove",
        handleMouseMove
      );

      window.removeEventListener(
        "mouseup",
        handleMouseUp
      );
    };
  }, [
    dragging,
    activeHandle,
    crop,
    onCropChange,
    displaySize,
  ]);

  /* =========================================================
     NO IMAGE
  ========================================================= */

  if (!image) {
    return (
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#c0c0c0",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            fontFamily:
              "MS Sans Serif, Arial, sans-serif",
            fontSize: 13,
            color: "#444",
          }}
        >
          No image loaded
        </div>
      </div>
    );
  }

  /* =========================================================
     CROP DISPLAY COORDINATES
  ========================================================= */

  const getDisplayedCrop = () => {
    if (
      !crop ||
      displaySize.width <= 0 ||
      displaySize.height <= 0 ||
      !imageRef.current
    ) {
      return null;
    }

    const naturalWidth =
      imageRef.current.naturalWidth;

    const naturalHeight =
      imageRef.current.naturalHeight;

    return {
      left:
        (crop.x /
          naturalWidth) *
        displaySize.width,

      top:
        (crop.y /
          naturalHeight) *
        displaySize.height,

      width:
        (crop.width /
          naturalWidth) *
        displaySize.width,

      height:
        (crop.height /
          naturalHeight) *
        displaySize.height,
    };
  };

  const displayedCrop =
    getDisplayedCrop();

  /* =========================================================
     IMAGE POSITION
  ========================================================= */

  const left =
    Math.max(
      0,
      (containerSize.width -
        displaySize.width) /
        2
    );

  const top =
    Math.max(
      0,
      (containerSize.height -
        displaySize.height) /
        2
    );

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: "block",
        overflow: "hidden",
        background: "#c0c0c0",
      }}
    >
      {/* =====================================================
          PHOTO STAGE

          The stage has EXACTLY the same size as the
          displayed image.

          Therefore the crop overlay can NEVER appear
          outside the photo.
      ===================================================== */}

      <div
        style={{
          position: "absolute",

          width:
            displaySize.width,

          height:
            displaySize.height,

          left,

          top,

          lineHeight: 0,

          overflow: "hidden",

          flexShrink: 0,
        }}
      >
        {/* ===================================================
            ACTUAL PHOTO
        =================================================== */}

        <img
          ref={imageRef}
          src={image}
          alt="Image being edited"
          onLoad={handleImageLoad}
          draggable={false}
          style={{
            display: "block",

            width:
              displaySize.width,

            height:
              displaySize.height,

            maxWidth: "none",

            maxHeight: "none",

            objectFit: "fill",

            userSelect: "none",

            pointerEvents: "none",
          }}
        />

        {/* ===================================================
            CROP OVERLAY

            Everything here is clipped to the image stage.
        =================================================== */}

        {cropMode &&
          crop &&
          displayedCrop && (
            <div
              style={{
                position:
                  "absolute",

                inset: 0,

                overflow: "hidden",

                zIndex: 20,

                pointerEvents:
                  "none",
              }}
            >
              {/* TOP */}

              <div
                style={{
                  position:
                    "absolute",

                  left: 0,

                  right: 0,

                  top: 0,

                  height:
                    displayedCrop.top,

                  background:
                    "rgba(0,0,0,0.58)",
                }}
              />

              {/* LEFT */}

              <div
                style={{
                  position:
                    "absolute",

                  left: 0,

                  top:
                    displayedCrop.top,

                  width:
                    displayedCrop.left,

                  height:
                    displayedCrop.height,

                  background:
                    "rgba(0,0,0,0.58)",
                }}
              />

              {/* RIGHT */}

              <div
                style={{
                  position:
                    "absolute",

                  right: 0,

                  top:
                    displayedCrop.top,

                  width:
                    Math.max(
                      0,
                      displaySize.width -
                        displayedCrop.left -
                        displayedCrop.width
                    ),

                  height:
                    displayedCrop.height,

                  background:
                    "rgba(0,0,0,0.58)",
                }}
              />

              {/* BOTTOM */}

              <div
                style={{
                  position:
                    "absolute",

                  left: 0,

                  right: 0,

                  bottom: 0,

                  height:
                    Math.max(
                      0,
                      displaySize.height -
                        displayedCrop.top -
                        displayedCrop.height
                    ),

                  background:
                    "rgba(0,0,0,0.58)",
                }}
              />

              {/* =================================================
                  CROP BOX
              ================================================= */}

              <div
                onMouseDown={(event) =>
                  startCropDrag(
                    event,
                    "move"
                  )
                }
                style={{
                  position:
                    "absolute",

                  left:
                    displayedCrop.left,

                  top:
                    displayedCrop.top,

                  width:
                    displayedCrop.width,

                  height:
                    displayedCrop.height,

                  border:
                    "1px solid white",

                  boxSizing:
                    "border-box",

                  cursor:
                    dragging
                      ? "grabbing"
                      : "grab",

                  pointerEvents:
                    "auto",

                  boxShadow:
                    "0 0 0 1px rgba(0,0,0,0.8)",
                }}
              >
                {/* =================================================
                    RULE OF THIRDS
                ================================================= */}

                <div
                  style={{
                    position:
                      "absolute",

                    left:
                      "33.333%",

                    top: 0,

                    bottom: 0,

                    width: 1,

                    background:
                      "rgba(255,255,255,0.4)",

                    pointerEvents:
                      "none",
                  }}
                />

                <div
                  style={{
                    position:
                      "absolute",

                    left:
                      "66.666%",

                    top: 0,

                    bottom: 0,

                    width: 1,

                    background:
                      "rgba(255,255,255,0.4)",

                    pointerEvents:
                      "none",
                  }}
                />

                <div
                  style={{
                    position:
                      "absolute",

                    top:
                      "33.333%",

                    left: 0,

                    right: 0,

                    height: 1,

                    background:
                      "rgba(255,255,255,0.4)",

                    pointerEvents:
                      "none",
                  }}
                />

                <div
                  style={{
                    position:
                      "absolute",

                    top:
                      "66.666%",

                    left: 0,

                    right: 0,

                    height: 1,

                    background:
                      "rgba(255,255,255,0.4)",

                    pointerEvents:
                      "none",
                  }}
                />

                {/* =================================================
                    HANDLES
                ================================================= */}

                <CropHandle
                  position="nw"
                  cursor="nwse-resize"
                  onMouseDown={
                    startCropDrag
                  }
                />

                <CropHandle
                  position="n"
                  cursor="ns-resize"
                  onMouseDown={
                    startCropDrag
                  }
                />

                <CropHandle
                  position="ne"
                  cursor="nesw-resize"
                  onMouseDown={
                    startCropDrag
                  }
                />

                <CropHandle
                  position="e"
                  cursor="ew-resize"
                  onMouseDown={
                    startCropDrag
                  }
                />

                <CropHandle
                  position="se"
                  cursor="nwse-resize"
                  onMouseDown={
                    startCropDrag
                  }
                />

                <CropHandle
                  position="s"
                  cursor="ns-resize"
                  onMouseDown={
                    startCropDrag
                  }
                />

                <CropHandle
                  position="sw"
                  cursor="nesw-resize"
                  onMouseDown={
                    startCropDrag
                  }
                />

                <CropHandle
                  position="w"
                  cursor="ew-resize"
                  onMouseDown={
                    startCropDrag
                  }
                />
              </div>
            </div>
          )}
      </div>
    </div>
  );
}

/* =========================================================
   CROP HANDLE
========================================================= */

function CropHandle({
  position,
  cursor,
  onMouseDown,
}: {
  position:
    | "nw"
    | "n"
    | "ne"
    | "e"
    | "se"
    | "s"
    | "sw"
    | "w";

  cursor: string;

  onMouseDown: (
    event: ReactMouseEvent,
    handle: CropHandle
  ) => void;
}) {
  const positionStyles: Record<
    string,
    CSSProperties
  > = {
    nw: {
      left: -5,
      top: -5,
    },

    n: {
      left: "50%",
      top: -5,
      marginLeft: -5,
    },

    ne: {
      right: -5,
      top: -5,
    },

    e: {
      right: -5,
      top: "50%",
      marginTop: -5,
    },

    se: {
      right: -5,
      bottom: -5,
    },

    s: {
      left: "50%",
      bottom: -5,
      marginLeft: -5,
    },

    sw: {
      left: -5,
      bottom: -5,
    },

    w: {
      left: -5,
      top: "50%",
      marginTop: -5,
    },
  };

  return (
    <div
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();

        onMouseDown(
          event,
          position
        );
      }}
      style={{
        position: "absolute",

        width: 10,

        height: 10,

        background: "#fff",

        border:
          "1px solid #222",

        boxSizing:
          "border-box",

        cursor,

        zIndex: 30,

        pointerEvents:
          "auto",

        ...positionStyles[
          position
        ],
      }}
    />
  );
}