"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import type { Entry } from "@/types/database";

export default function EntryDetailPage(): JSX.Element {
  const router = useRouter();
  const params = useParams();
  const entryId = params.id as string;

  const [entry, setEntry] = useState<Entry | null>(null);
  const [referencedEntries, setReferencedEntries] = useState<Array<Entry & { similarity?: number }>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedTranscription, setEditedTranscription] = useState<string>("");
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    if (entryId) {
      fetchEntry();
    }
  }, [entryId]);

  const fetchEntry = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/entries/${entryId}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Entry not found");
        }
        throw new Error("Failed to fetch entry");
      }

      const data = await response.json();
      setEntry(data.entry);
      setReferencedEntries(data.referencedEntries || []);
      setEditedTranscription(data.entry.transcription);
    } catch (err) {
      console.error("Error fetching entry:", err);
      setError(err instanceof Error ? err.message : "Failed to load entry");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!entry || !editedTranscription.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/entries/${entryId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transcription: editedTranscription }),
      });

      if (!response.ok) {
        throw new Error("Failed to update entry");
      }

      const data = await response.json();
      setEntry(data.entry);
      setIsEditing(false);
    } catch (err) {
      console.error("Error updating entry:", err);
      setError(err instanceof Error ? err.message : "Failed to update entry");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!entry || !confirm("Are you sure you want to delete this entry? This action cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/entries/${entryId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete entry");
      }

      router.push("/dashboard/entries");
    } catch (err) {
      console.error("Error deleting entry:", err);
      setError(err instanceof Error ? err.message : "Failed to delete entry");
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <main className="flex min-h-screen flex-col p-8">
        <div className="z-10 max-w-4xl w-full mx-auto">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading entry...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !entry) {
    return (
      <main className="flex min-h-screen flex-col p-8">
        <div className="z-10 max-w-4xl w-full mx-auto">
          <Link
            href="/dashboard/entries"
            className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block"
          >
            ← Back to Entries
          </Link>
          <div className="p-4 bg-destructive/10 text-destructive rounded-md">
            {error || "Entry not found"}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col p-8">
      <div className="z-10 max-w-4xl w-full mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/dashboard/entries"
            className="text-sm text-muted-foreground hover:text-foreground mb-4 inline-block"
          >
            ← Back to Entries
          </Link>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">Journal Entry</h1>
              <p className="text-muted-foreground">
                {new Date(entry.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="flex gap-2">
              {!isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="px-4 py-2 border border-destructive text-destructive rounded-md hover:bg-destructive/10 transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setEditedTranscription(entry.transcription);
                    }}
                    disabled={isSaving}
                    className="px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Transcription */}
        <div className="mb-8 p-6 border border-border rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Transcription</h2>
          {isEditing ? (
            <textarea
              value={editedTranscription}
              onChange={(e) => setEditedTranscription(e.target.value)}
              className="w-full min-h-[200px] px-4 py-3 border border-border rounded-md bg-background resize-y"
            />
          ) : (
            <p className="text-muted-foreground whitespace-pre-wrap">
              {entry.transcription}
            </p>
          )}
        </div>

        {/* AI Analysis */}
        {entry.ai_response && (
          <div className="mb-8 p-6 border border-border rounded-lg">
            <h2 className="text-lg font-semibold mb-4">AI Response</h2>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {entry.ai_response}
            </p>
          </div>
        )}

        {/* Metadata */}
        <div className="mb-8 p-6 border border-border rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Analysis</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {entry.detected_tone && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Tone</p>
                <p className="font-medium capitalize">{entry.detected_tone}</p>
              </div>
            )}
            {entry.sentiment_score !== null && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Sentiment Score
                </p>
                <p className="font-medium">
                  {(entry.sentiment_score * 100).toFixed(1)}%
                </p>
              </div>
            )}
            {entry.energy_score !== null && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Energy Score
                </p>
                <p className="font-medium">
                  {(entry.energy_score * 100).toFixed(1)}%
                </p>
              </div>
            )}
            {entry.ai_mode && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">AI Mode</p>
                <p className="font-medium capitalize">{entry.ai_mode}</p>
              </div>
            )}
          </div>

          {entry.emotion_tags && entry.emotion_tags.length > 0 && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">Emotion Tags</p>
              <div className="flex flex-wrap gap-2">
                {entry.emotion_tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 text-sm rounded-full bg-muted"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Referenced Entries (RAG) */}
        {referencedEntries.length > 0 && (
          <div className="mb-8 p-6 border border-border rounded-lg">
            <h2 className="text-lg font-semibold mb-4">
              Related Past Entries ({referencedEntries.length})
            </h2>
            <div className="space-y-3">
              {referencedEntries.map((refEntry) => {
                // Get similarity label (Option B from planning)
                const getSimilarityLabel = (similarity?: number): { label: string; color: string } => {
                  if (similarity === undefined || similarity === null) {
                    return { label: "Related", color: "bg-muted" };
                  }
                  if (similarity > 0.8) {
                    return { label: "Deep Connection", color: "bg-primary/20 text-primary" };
                  } else if (similarity > 0.7) {
                    return { label: "Related", color: "bg-blue-500/20 text-blue-600" };
                  } else {
                    return { label: "Somewhat Related", color: "bg-muted" };
                  }
                };

                const similarityInfo = getSimilarityLabel(refEntry.similarity);

                return (
                  <Link
                    key={refEntry.id}
                    href={`/dashboard/entries/${refEntry.id}`}
                    className="block p-4 border border-border rounded-md hover:bg-accent transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm text-muted-foreground">
                        {new Date(refEntry.created_at).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-2">
                        {refEntry.similarity !== undefined && (
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${similarityInfo.color}`}>
                            {similarityInfo.label}
                          </span>
                        )}
                        {refEntry.detected_tone && (
                          <span className="px-2 py-1 text-xs rounded-full bg-muted capitalize">
                            {refEntry.detected_tone}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm line-clamp-2 text-muted-foreground">
                      {refEntry.transcription}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

