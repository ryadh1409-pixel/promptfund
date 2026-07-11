import type { DealPipeline } from '@/utils/investmentPipeline';

export function isCancelledPipeline(pipeline: DealPipeline) {
  if (pipeline.completedSteps.completed) {
    return false;
  }

  if (pipeline.opportunity?.status === 'archived' || pipeline.opportunity?.status === 'deleted') {
    return true;
  }

  if (pipeline.interest?.status === 'expired') {
    return true;
  }

  if (pipeline.room?.status === 'archived') {
    return true;
  }

  return false;
}

export function filterVisiblePipelines(pipelines: DealPipeline[]) {
  return pipelines.filter((pipeline) => !isCancelledPipeline(pipeline));
}
