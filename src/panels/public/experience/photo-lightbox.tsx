"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { SiteImage } from "@/modules/public-site/content/experiences";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";

/**
 * Shared dark photo viewer for the experience pages. Shows one photo at a time, with wrap-around
 * arrows, a counter and Left/Right keys when the set has more than one image.
 * The parent owns the index: null closes the dialog, a number opens that photo.
 */
export function PhotoLightbox({ images, index, onIndexChange, title }: {
  images: readonly SiteImage[];
  index: number | null;
  onIndexChange: (index: number | null) => void;
  title?: string;
}) {
  const open = index !== null && index >= 0 && index < images.length;
  const safeIndex = images.length ? Math.min(index ?? 0, images.length - 1) : 0;
  const shown = images[safeIndex];

  function focusStage(node: HTMLDivElement | null) {
    node?.focus();
  }

  function step(delta: number) {
    if (images.length < 2) return;
    onIndexChange((safeIndex + delta + images.length) % images.length);
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onIndexChange(null); }}>
      <DialogContent
        className="site-photo-lightbox"
        overlayClassName="site-photo-lightbox__overlay"
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            step(-1);
          }
          if (event.key === "ArrowRight") {
            event.preventDefault();
            step(1);
          }
        }}
      >
        {shown ? (
          <>
            <DialogHeader className="site-photo-lightbox__head">
              <div className="site-photo-lightbox__heading">
                <DialogTitle className="site-photo-lightbox__title">{title ?? shown.alt}</DialogTitle>
                <DialogDescription className="tw:sr-only">Enlarged photo</DialogDescription>
              </div>
              {images.length > 1 ? (
                <p className="site-photo-lightbox__count" aria-live="polite">{safeIndex + 1} / {images.length}</p>
              ) : null}
            </DialogHeader>
            <div ref={focusStage} tabIndex={-1} className="site-photo-lightbox__stage" aria-label="Photo viewer">
              <Image src={shown.src} alt="" fill sizes="10vw" aria-hidden="true" className="site-photo-lightbox__backdrop" />
              <Image
                src={shown.src}
                alt={shown.alt}
                fill
                sizes="(min-width: 1024px) 1000px, 100vw"
                className="site-photo__image site-photo__image--contain site-photo-lightbox__image"
              />
              {images.length > 1 ? (
                <>
                  <button type="button" className="site-photo-lightbox__nav site-photo-lightbox__nav--prev" aria-label="Previous picture" onClick={() => step(-1)}>
                    <ChevronLeft aria-hidden="true" />
                  </button>
                  <button type="button" className="site-photo-lightbox__nav site-photo-lightbox__nav--next" aria-label="Next picture" onClick={() => step(1)}>
                    <ChevronRight aria-hidden="true" />
                  </button>
                </>
              ) : null}
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
