import type { DealPipeline } from '@/utils/investmentPipeline';
import { getPipelineStageMeta } from '@/utils/investmentPipeline';

export function getPipelineStartupName(pipeline: DealPipeline) {
  return pipeline.opportunity?.startupName
    ?? pipeline.agreement?.startupName
    ?? pipeline.room?.startupName
    ?? pipeline.investment?.startupName
    ?? 'Startup Opportunity';
}

export function getPipelineAmount(pipeline: DealPipeline) {
  return pipeline.agreement?.investmentAmount
    ?? pipeline.room?.investmentAmount
    ?? pipeline.investment?.amount
    ?? pipeline.opportunity?.fundingNeeded
    ?? 0;
}

export function getPipelineThumbnail(pipeline: DealPipeline) {
  return pipeline.opportunity?.imageUrl
    ?? pipeline.investment?.startupImage;
}

export function getPipelineStageLabel(pipeline: DealPipeline) {
  return getPipelineStageMeta(pipeline).label;
}

export function getPipelineStageColor(pipeline: DealPipeline) {
  return getPipelineStageMeta(pipeline).badgeColor;
}
