"use client";

import { useMemo, useState } from "react";
import type { ProjectFile } from "@/app/app/projects/projectsService";
import { UserFileStatus } from "@/app/app/projects/projectsService";
import { cn, isImageFile } from "@/lib/utils";
import SimpleLoader from "@/refresh-components/loaders/SimpleLoader";
import Text from "@/refresh-components/texts/Text";
import { SvgFileText, SvgX } from "@opal/icons";
import { Interactive } from "@opal/core";
import { AttachmentItemLayout } from "@/layouts/general-layouts";
import Spacer from "@/refresh-components/Spacer";

interface RemovableProps {
  onRemove?: () => void;
  children: React.ReactNode;
}

function Removable({ onRemove, children }: RemovableProps) {
  if (!onRemove) {
    return <>{children}</>;
  }

  return (
    <div className="relative group">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        title="Remove"
        aria-label="Remove"
        className={cn(
          "absolute -left-2 -top-2 z-10 h-4 w-4",
          "flex items-center justify-center",
          "rounded-04 border border-border text-[11px]",
          "bg-background-neutral-inverted-01 text-text-inverted-05 shadow-sm",
          "opacity-0 group-hover:opacity-100 focus:opacity-100",
          "pointer-events-none group-hover:pointer-events-auto focus:pointer-events-auto",
          "transition-opacity duration-150 hover:opacity-90"
        )}
      >
        <SvgX className="h-3 w-3 stroke-text-inverted-03" />
      </button>
      {children}
    </div>
  );
}

interface ImageFileCardProps {
  file: ProjectFile;
  imageUrl: string | null;
  removeFile?: (fileId: string) => void;
  onFileClick?: (file: ProjectFile) => void;
  isProcessing?: boolean;
  isReadyForChat?: boolean;
  showBackgroundProcessing?: boolean;
  compact?: boolean;
}
function ImageFileCard({
  file,
  imageUrl,
  removeFile,
  onFileClick,
  isProcessing = false,
  isReadyForChat = false,
  showBackgroundProcessing = false,
  compact = false,
}: ImageFileCardProps) {
  const sizeClass = compact ? "h-11 w-11" : "h-20 w-20";
  const loaderSize = compact ? "h-5 w-5" : "h-8 w-8";
  const iconSize = compact ? "h-5 w-5" : "h-8 w-8";
  const [imgError, setImgError] = useState(false);

  const doneUploading = String(file.status) !== UserFileStatus.UPLOADING;

  return (
    <Removable
      onRemove={
        removeFile && doneUploading ? () => removeFile(file.id) : undefined
      }
    >
      <div
        className={cn(
          "relative",
          sizeClass,
          "rounded-08 border border-border-01",
          isProcessing && "bg-background-neutral-02",
          isReadyForChat &&
            showBackgroundProcessing &&
            "border-status-success-02 shadow-[inset_0_0_0_1px_var(--status-success-02)]",
          onFileClick && !isProcessing && "cursor-pointer hover:opacity-90"
        )}
        onClick={() => {
          if (onFileClick && !isProcessing) {
            onFileClick(file);
          }
        }}
      >
        {!doneUploading || !imageUrl ? (
          <div className="h-full w-full flex items-center justify-center">
            <SimpleLoader className={loaderSize} />
          </div>
        ) : imgError ? (
          <div className="h-full w-full flex items-center justify-center">
            <SvgFileText className={iconSize} />
          </div>
        ) : (
          <img
            src={imageUrl}
            alt={file.name}
            className="h-full w-full object-cover rounded-08"
            onError={() => setImgError(true)}
          />
        )}
        {isReadyForChat && (
          <div className="absolute left-1 bottom-1 rounded-full bg-background-neutral-inverted-01/90 px-1.5 py-0.5">
            <Text as="span" secondaryBody className="text-text-inverted-05">
              {showBackgroundProcessing ? "Chat ready" : "Ready"}
            </Text>
          </div>
        )}
      </div>
    </Removable>
  );
}

export interface FileCardProps {
  file: ProjectFile;
  removeFile?: (fileId: string) => void;
  hideProcessingState?: boolean;
  onFileClick?: (file: ProjectFile) => void;
  compactImages?: boolean;
}
export function FileCard({
  file,
  removeFile,
  hideProcessingState = false,
  onFileClick,
  compactImages = false,
}: FileCardProps) {
  const isImage = useMemo(() => {
    return isImageFile(file.name);
  }, [file.name]);

  const imageUrl = useMemo(() => {
    if (isImage && file.file_id) {
      return `/api/chat/file/${file.file_id}`;
    }
    return null;
  }, [isImage, file.file_id]);

  const isUploading = String(file.status) === UserFileStatus.UPLOADING;
  const isFailed = String(file.status) === UserFileStatus.FAILED;
  // PROCESSING = backend post-upload work; INDEXING = slower RAG vector indexing.
  // When hideProcessingState is true, the file still fits in prompt context so it
  // is already usable in chat while the background work continues.
  const isExtracting = String(file.status) === UserFileStatus.PROCESSING;
  const isVectorIndexing = String(file.status) === UserFileStatus.INDEXING;
  const isReadyForChat = !isUploading && !isFailed && !file.temp_id;
  const showBackgroundProcessing =
    hideProcessingState && (isExtracting || isVectorIndexing);
  const isProcessing =
    isUploading ||
    ((!hideProcessingState || !isReadyForChat) &&
      (isExtracting || isVectorIndexing));

  const doneUploading = !isUploading;

  const statusText = useMemo(() => {
    if (isUploading) {
      return "Uploading...";
    }
    if (isFailed) {
      return "Upload failed";
    }
    if (showBackgroundProcessing) {
      return isVectorIndexing
        ? "Ready for chat • Indexing for search..."
        : "Ready for chat • Finishing setup...";
    }
    if (isProcessing) {
      return isVectorIndexing ? "Indexing for search..." : "Preparing for chat...";
    }
    if (isReadyForChat) {
      return "Ready for chat";
    }
    return "Queued";
  }, [
    isUploading,
    isFailed,
    showBackgroundProcessing,
    isVectorIndexing,
    isProcessing,
    isReadyForChat,
  ]);

  // For images, always show the larger preview layout (even while processing)
  if (isImage) {
    return (
      <ImageFileCard
        file={file}
        imageUrl={imageUrl}
        removeFile={removeFile}
        onFileClick={onFileClick}
        isProcessing={isProcessing}
        isReadyForChat={isReadyForChat}
        showBackgroundProcessing={showBackgroundProcessing}
        compact={compactImages}
      />
    );
  }

  return (
    <Removable
      onRemove={
        removeFile && doneUploading ? () => removeFile(file.id) : undefined
      }
    >
      <div className={cn(
          "min-w-0 max-w-[12rem] rounded-08",
          showBackgroundProcessing && "border border-status-success-02 bg-status-success-00",
          isFailed && "border border-status-error-02"
        )}>
        <Interactive.Container
          border
          heightVariant="fit"
        >
          <div className="[&_.opal-content-md-body]:min-w-0 [&_.opal-content-md-title]:break-all">
            <AttachmentItemLayout
              icon={isProcessing ? SimpleLoader : SvgFileText}
              title={file.name}
              description={statusText}
            />
          </div>
          <Spacer horizontal rem={0.5} />
        </Interactive.Container>
      </div>
    </Removable>
  );
}

// Skeleton loading component for file cards
export function FileCardSkeleton() {
  return (
    <div className="min-w-[120px] max-w-[240px] h-11 rounded-08 bg-background-tint-02 animate-pulse" />
  );
}
