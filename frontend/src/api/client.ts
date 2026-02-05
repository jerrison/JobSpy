import axios from "axios";
import type { Job, JobListResponse, ScrapeRequest, ScrapeStatus, JobStats, ProxyLogEntry } from "../types/job";

const api = axios.create({ baseURL: "/api/v1/jobs" });

export async function startScrape(req: ScrapeRequest) {
  const { data } = await api.post<{ session_id: string; status: string }>("/scrape", req);
  return data;
}

export async function getScrapeStatus(sessionId: string) {
  const { data } = await api.get<ScrapeStatus>(`/scrape/${sessionId}`);
  return data;
}

export async function listJobs(params: Record<string, unknown>) {
  const { data } = await api.get<JobListResponse>("", { params });
  return data;
}

export async function getJob(id: string) {
  const { data } = await api.get<Job>(`/${id}`);
  return data;
}

export async function deleteJob(id: string) {
  await api.delete(`/${id}`);
}

export async function getStats() {
  const { data } = await api.get<JobStats>("/stats");
  return data;
}

export async function getProxyLog() {
  const { data } = await api.get<ProxyLogEntry[]>("/proxy-log");
  return data;
}
