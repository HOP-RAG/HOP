"use client";

import { useCallback, useMemo, useState } from "react";
import { useProjectsContext } from "@/providers/ProjectsContext";
import type { ProjectFile } from "@/providers/ProjectsContext";
import { UserFileStatus } from "@/app/app/projects/projectsService";
import { formatRelativeTime } from "@/app/app/components/projects/project_utils";
import Text from "@/refresh-components/texts/Text";
import InputTypeIn from "@/refresh-components/inputs/InputTypeIn";
import AttachmentButton from "@/refresh-components/buttons/AttachmentButton";
import SimpleLoader from "@/refresh-components/loaders/SimpleLoader";
import ScrollIndicatorDiv from "@/refresh-components/ScrollIndicatorDiv";
import TextSeparator from "@/refresh-components/TextSeparator";
import { Section } from "@/layouts/general-layouts";
import useFilter from "@/hooks/useFilter";
import { getFileExtension, isImageExtension } from "@/lib/utils";
import type { IconProps } from "@opal/types";
import {
  SvgFiles,
  SvgFileText,
  SvgImage,
  SvgTrash,
  SvgFolderOpen,
} from "@opal/icons";

function getIcon(
  file: ProjectFile,
  isProcessing: boolean
): React.FunctionComponent<IconProps> {
  if (isProcessing) return SimpleLoader;
  const ext = getFileExtension(file.name).toLowerCase();
  if (isImageExtension(ext)) return SvgImage;
  return SvgFileText;
}

function getDescription(file: ProjectFile): string {
  const s = String(file.status || "");
  const typeLabel = getFileExtension(file.name);
  if (s === UserFileStatus.PROCESSING) return "Processing...";
  if (s === UserFileStatus.INDEXING) return "Indexing...";
  if (s === UserFileStatus.UPLOADING) return "Uploading...";
  if (s === UserFileStatus.DELETING) return "Deleting...";
  if (s === UserFileStatus.COMPLETED) return typeLabel;
  return file.status ?? typeLabel;
}

interface DeleteConfirmState {
  file: ProjectFile;
  projectNames: string[];
  assistantNames: string[];
}

interface FileSectionProps {
  title: string;
  icon: React.FunctionComponent<IconProps>;
  files: ProjectFile[];
  onDelete: (file: ProjectFile) => void;
}

function FileSection({ title, icon: Icon, files, onDelete }: FileSectionProps) {
  if (files.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-1">
        <Icon className="h-4 w-4 stroke-text-03" />
        <Text as="p" secondaryAction text03>
          {title}
        </Text>
      </div>
      {files.map((file) => {
        const isProcessing =
          String(file.status) === UserFileStatus.PROCESSING ||
          String(file.status) === UserFileStatus.INDEXING ||
          String(file.status) === UserFileStatus.UPLOADING ||
          String(file.status) === UserFileStatus.DELETING;
        const isDeleting = String(file.status) === UserFileStatus.DELETING;

        return (
          <AttachmentButton
            key={file.id}
            icon={getIcon(file, isProcessing)}
            description={getDescription(file)}
            rightText={
              file.last_accessed_at
                ? formatRelativeTime(file.last_accessed_at)
                : ""
            }
            processing={isProcessing}
            actionIcon={SvgTrash}
            onAction={isDeleting ? undefined : () => onDelete(file)}
          >
            {file.name}
          </AttachmentButton>
        );
      })}
    </div>
  );
}

export default function MyFilesPage() {
  const { allRecentFiles, deleteUserFile, refreshRecentFiles, projects } =
    useProjectsContext();

  const [deleteConfirm, setDeleteConfirm] =
    useState<DeleteConfirmState | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Split files into project files and conversation-only files
  const { projectFiles, conversationFiles } = useMemo(() => {
    const projectFiles: ProjectFile[] = [];
    const conversationFiles: ProjectFile[] = [];

    for (const file of allRecentFiles) {
      if (file.project_id != null) {
        projectFiles.push(file);
      } else {
        conversationFiles.push(file);
      }
    }

    return { projectFiles, conversationFiles };
  }, [allRecentFiles]);

  const { query, setQuery, filtered: filteredAll } = useFilter(
    allRecentFiles,
    (file) => file.name
  );

  // When searching, show flat filtered list; otherwise show grouped
  const isSearching = query.trim().length > 0;

  const filteredProjectFiles = useMemo(
    () => (isSearching ? [] : projectFiles),
    [isSearching, projectFiles]
  );
  const filteredConversationFiles = useMemo(
    () => (isSearching ? [] : conversationFiles),
    [isSearching, conversationFiles]
  );

  const handleDeleteRequest = useCallback(
    async (file: ProjectFile) => {
      setIsDeleting(true);
      try {
        const result = await deleteUserFile(file.id);
        if (result.has_associations) {
          setDeleteConfirm({
            file,
            projectNames: result.project_names,
            assistantNames: result.assistant_names,
          });
        } else {
          await refreshRecentFiles();
        }
      } catch {
        // Error handled by context
      } finally {
        setIsDeleting(false);
      }
    },
    [deleteUserFile, refreshRecentFiles]
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      await deleteUserFile(deleteConfirm.file.id);
      await refreshRecentFiles();
      setDeleteConfirm(null);
    } catch {
      // Error handled by context
    } finally {
      setIsDeleting(false);
    }
  }, [deleteConfirm, deleteUserFile, refreshRecentFiles]);

  const getProjectName = useCallback(
    (projectId: number) => {
      return projects.find((p) => p.id === projectId)?.name ?? "Unknown Project";
    },
    [projects]
  );

  const isEmpty = allRecentFiles.length === 0;

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      <div className="flex flex-col gap-6 w-full max-w-[var(--app-page-main-content-width)] mx-auto p-4 pt-14 pb-6 h-full overflow-hidden">
        {/* Header */}
        <div className="flex flex-col gap-1 text-text-04">
          <SvgFiles className="h-8 w-8 text-text-04" />
          <Text as="p" headingH2 className="font-heading-h2">
            My Files
          </Text>
          <Text as="p" text02 secondaryBody>
            All files you&apos;ve uploaded — in projects and in conversations.
          </Text>
        </div>

        {/* Search bar */}
        {!isEmpty && (
          <div className="max-w-xs">
            <InputTypeIn
              placeholder="Search files..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              leftSearchIcon
              autoComplete="off"
              onFocus={(e) => e.target.select()}
            />
          </div>
        )}

        {/* File list */}
        {isEmpty ? (
          <Section alignItems="center" justifyContent="center" className="flex-1">
            <div className="flex flex-col items-center gap-2 text-center">
              <SvgFiles className="h-10 w-10 stroke-text-02" />
              <Text as="p" headingH3 text03>
                No files yet
              </Text>
              <Text as="p" secondaryBody text02>
                Files you upload in conversations or projects will appear here.
              </Text>
            </div>
          </Section>
        ) : isSearching ? (
          <ScrollIndicatorDiv className="flex flex-col gap-2 flex-1">
            {filteredAll.length === 0 ? (
              <Text text03>No files match &quot;{query}&quot;</Text>
            ) : (
              <>
                {filteredAll.map((file) => {
                  const isProc =
                    String(file.status) === UserFileStatus.PROCESSING ||
                    String(file.status) === UserFileStatus.INDEXING ||
                    String(file.status) === UserFileStatus.UPLOADING ||
                    String(file.status) === UserFileStatus.DELETING;
                  return (
                    <AttachmentButton
                      key={file.id}
                      icon={getIcon(file, isProc)}
                      description={getDescription(file)}
                      rightText={
                        file.last_accessed_at
                          ? formatRelativeTime(file.last_accessed_at)
                          : ""
                      }
                      processing={isProc}
                      actionIcon={SvgTrash}
                      onAction={
                        isProc ? undefined : () => handleDeleteRequest(file)
                      }
                    >
                      {file.name}
                    </AttachmentButton>
                  );
                })}
                <TextSeparator
                  count={filteredAll.length}
                  text={filteredAll.length === 1 ? "File" : "Files"}
                />
              </>
            )}
          </ScrollIndicatorDiv>
        ) : (
          <ScrollIndicatorDiv className="flex flex-col gap-6 flex-1">
            <FileSection
              title="Project Files"
              icon={SvgFolderOpen}
              files={filteredProjectFiles}
              onDelete={handleDeleteRequest}
            />
            <FileSection
              title="Conversation Files"
              icon={SvgFiles}
              files={filteredConversationFiles}
              onDelete={handleDeleteRequest}
            />
            <TextSeparator
              count={allRecentFiles.length}
              text={allRecentFiles.length === 1 ? "File" : "Files"}
            />
          </ScrollIndicatorDiv>
        )}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-mask-03 backdrop-blur-03">
          <div className="bg-background-neutral-01 border border-border-01 rounded-12 p-6 flex flex-col gap-4 max-w-sm w-full mx-4 shadow-lg">
            <div className="flex flex-col gap-1">
              <Text as="p" headingH3>
                Delete file?
              </Text>
              <Text as="p" secondaryBody text02>
                &quot;{deleteConfirm.file.name}&quot; is currently used in:
              </Text>
            </div>

            {deleteConfirm.projectNames.length > 0 && (
              <div className="flex flex-col gap-1">
                <Text as="p" secondaryAction text03>
                  Projects
                </Text>
                {deleteConfirm.projectNames.map((name) => (
                  <Text key={name} as="p" secondaryBody text02>
                    • {name}
                  </Text>
                ))}
              </div>
            )}

            {deleteConfirm.assistantNames.length > 0 && (
              <div className="flex flex-col gap-1">
                <Text as="p" secondaryAction text03>
                  Assistants
                </Text>
                {deleteConfirm.assistantNames.map((name) => (
                  <Text key={name} as="p" secondaryBody text02>
                    • {name}
                  </Text>
                ))}
              </div>
            )}

            <Text as="p" secondaryBody text02>
              Deleting this file will remove it from all of the above. This
              cannot be undone.
            </Text>

            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 rounded-08 border border-border-01 bg-background-neutral-01 text-text-02 font-secondary-action hover:bg-background-tint-02 transition-colors"
                onClick={() => setDeleteConfirm(null)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-08 bg-action-danger-05 text-text-inverted-01 font-secondary-action hover:bg-action-danger-04 transition-colors disabled:opacity-50"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete anyway"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
