import { llmsSummary } from '@/server/llms';

export const dynamic = 'force-dynamic';

export const GET = () => llmsSummary();
