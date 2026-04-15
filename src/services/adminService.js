import { requestRag } from "./ragService";

function withQuery(path, params = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }

    search.set(key, String(value));
  });

  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

export function getAdminDashboardOverview(window = "24h") {
  return requestRag(withQuery("/admin/dashboard/overview", { window }));
}

export function getKnowledgeBases(current = 1, size = 6, name = "") {
  return requestRag(withQuery("/knowledge-base", { current, size, name: name || undefined }));
}

export function getSystemSettings() {
  return requestRag("/rag/settings");
}

export function getSampleQuestionsPage(current = 1, size = 6, keyword = "") {
  return requestRag(withQuery("/sample-questions", { current, size, keyword: keyword || undefined }));
}

export function getUsersPage(current = 1, size = 6, keyword = "") {
  return requestRag(withQuery("/users", { current, size, keyword: keyword || undefined }));
}

export function getRagTraceRuns(current = 1, size = 6, status = "") {
  return requestRag(withQuery("/rag/traces/runs", { current, size, status: status || undefined }));
}
