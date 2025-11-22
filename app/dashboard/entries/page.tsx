"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { Entry } from "@/types/database";

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function EntriesPage(): JSX.Element {
  const router = useRouter();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const fetchEntries = useCallback(async (page: number = 1, start?: string, end?: string) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
      });
      
      if (start) {
        params.append("startDate", start);
      }
      if (end) {
        params.append("endDate", end);
      }

      const response = await fetch(`/api/entries?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error("Failed to fetch entries");
      }

      const data = await response.json();
      setEntries(data.entries);
      setPagination(data.pagination);
    } catch (err) {
      console.error("Error fetching entries:", err);
      setError(err instanceof Error ? err.message : "Failed to load entries");
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load and when filters change
  useEffect(() => {
    fetchEntries(pagination.page, startDate || undefined, endDate || undefined);
  }, [fetchEntries, pagination.page, startDate, endDate]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, page: newPage }));
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleApplyFilter = () => {
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page on filter
    // fetchEntries will be called by useEffect due to dependency change
  };

  const handleClearFilter = () => {
    setStartDate("");
    setEndDate("");
    setPagination((prev) => ({ ...prev, page: 1 })); // Reset to first page on clear
    // fetchEntries will be called by useEffect due to dependency change
  };

  return (
    <div className="p-8">
      <div className="z-10 max-w-4xl w-full mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Journal Entries</h1>
          <p className="text-muted-foreground">
            View and manage your journal entries
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading entries...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="p-4 bg-destructive/10 text-destructive rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Date Range Filter */}
        <div className="mb-6 p-4 border border-border rounded-lg bg-background">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || undefined}
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleApplyFilter}
                disabled={loading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                Apply Filter
              </button>
              {(startDate || endDate) && (
                <button
                  onClick={handleClearFilter}
                  disabled={loading}
                  className="px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors disabled:opacity-50"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          {(startDate || endDate) && (
            <p className="text-xs text-muted-foreground mt-2">
              Showing entries from{" "}
              {startDate
                ? new Date(startDate).toLocaleDateString()
                : "beginning"}{" "}
              to{" "}
              {endDate
                ? new Date(endDate).toLocaleDateString()
                : "today"}
            </p>
          )}
        </div>

        {/* Entries List */}
        {!loading && !error && (
          <>
            {entries.length > 0 ? (
              <div className="space-y-4 mb-8">
                {entries.map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/dashboard/entries/${entry.id}`}
                    className="block p-6 border border-border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-semibold text-lg">
                        {new Date(entry.created_at).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </h3>
                      {entry.detected_tone && (
                        <span className="px-3 py-1 text-xs rounded-full bg-muted capitalize">
                          {entry.detected_tone}
                        </span>
                      )}
                    </div>
                    
                    <p className="text-muted-foreground mb-3 line-clamp-3">
                      {entry.transcription}
                    </p>

                    {entry.emotion_tags && entry.emotion_tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {entry.emotion_tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 text-xs rounded bg-muted/50"
                          >
                            {tag}
                          </span>
                        ))}
                        {entry.emotion_tags.length > 3 && (
                          <span className="px-2 py-1 text-xs text-muted-foreground">
                            +{entry.emotion_tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}

                    {entry.ai_response && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          <span className="font-medium">AI Response: </span>
                          {entry.ai_response}
                        </p>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 border border-border rounded-lg">
                <p className="text-muted-foreground mb-4">
                  No entries yet. Start recording to create your first entry!
                </p>
                <Link
                  href="/dashboard/journal"
                  className="inline-block px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Start Recording
                </Link>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border pt-6">
                <div className="text-sm text-muted-foreground">
                  Page {pagination.page} of {pagination.totalPages} (
                  {pagination.total} total entries)
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={pagination.page === 1}
                    className="px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={pagination.page === pagination.totalPages}
                    className="px-4 py-2 border border-border rounded-md hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

