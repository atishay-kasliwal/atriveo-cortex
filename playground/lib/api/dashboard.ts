import { listActionsReport } from "@/lib/action-idea-memory";
import { listIdeasReport } from "@/lib/action-idea-memory";
import { getOpenLoopsReport } from "@/lib/open-loops";
import { listProjectSummaries } from "@/lib/project-memory";
import { getActionRecurrenceReport, getIdeaRecurrenceReport } from "@/lib/recurrence";
import {
  toActionDTO,
  toIdeaDTO,
  toOpenLoopDTO,
  toProjectDTO,
  toRecurrenceDTO,
  type DashboardOverviewDTO,
} from "./dtos";

const DASHBOARD_LIMIT = 8;

export async function getDashboardOverview(): Promise<DashboardOverviewDTO> {
  const projects = (await listProjectSummaries())
    .slice(0, DASHBOARD_LIMIT)
    .map(toProjectDTO);

  const actionsReport = await listActionsReport(DASHBOARD_LIMIT);
  const ideasReport = await listIdeasReport(DASHBOARD_LIMIT);
  const openLoopsReport = await getOpenLoopsReport();
  const actionRecurrence = await getActionRecurrenceReport(DASHBOARD_LIMIT);
  const ideaRecurrence = await getIdeaRecurrenceReport(DASHBOARD_LIMIT);

  const openLoops = [
    ...openLoopsReport.high,
    ...openLoopsReport.medium,
    ...openLoopsReport.low,
  ]
    .slice(0, DASHBOARD_LIMIT)
    .map(toOpenLoopDTO);

  return {
    projects,
    actions: actionsReport.recurring.slice(0, DASHBOARD_LIMIT).map(toActionDTO),
    ideas: ideasReport.recurring.slice(0, DASHBOARD_LIMIT).map(toIdeaDTO),
    openLoops,
    recurringActions: actionRecurrence.explorer.most_recurring
      .slice(0, DASHBOARD_LIMIT)
      .map(toRecurrenceDTO),
    recurringIdeas: ideaRecurrence.explorer.most_recurring
      .slice(0, DASHBOARD_LIMIT)
      .map(toRecurrenceDTO),
  };
}
