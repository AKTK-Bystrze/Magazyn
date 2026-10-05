import type {
  CreditRequest,
  CreateCreditRequestCommand,
  UpdateCreditRequestCommand,
  ReviewCreditRequestCommand,
  LeaderboardItem,
  CreditRequestListResponse,
} from "@/types";
import { DEFAULT_PAGE_SIZE } from "@/lib/config/constants";

interface CreditRequestDTO {
  id: string;
  title: string;
  description: string;
  credits_value: number;
  requestor_id: string | null;
  user_helped_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  helpers: string[];
}

interface CreditRequestListResponseDTO {
  requests: CreditRequestDTO[];
  pagination: { page: number; per_page: number; total_items: number; total_pages: number };
}

interface LeaderboardItemDTO {
  user_id: string;
  username: string;
  total_credits: number;
}

export function transformCreditRequest(dto: CreditRequestDTO): CreditRequest {
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    creditsValue: dto.credits_value,
    requestorId: dto.requestor_id,
    userHelpedId: dto.user_helped_id,
    status: dto.status as CreditRequest["status"],
    createdAt: dto.created_at,
    updatedAt: dto.updated_at,
    helpers: dto.helpers,
  };
}

export function transformCreditRequestList(data: unknown): CreditRequestListResponse {
  const dto = data as CreditRequestListResponseDTO;
  return {
    requests: (dto.requests || []).map(transformCreditRequest),
    pagination: {
      page: dto.pagination?.page ?? 1,
      perPage: dto.pagination?.per_page ?? DEFAULT_PAGE_SIZE,
      totalItems: dto.pagination?.total_items ?? 0,
      totalPages: dto.pagination?.total_pages ?? 0,
    },
  };
}

export function transformLeaderboard(data: unknown): LeaderboardItem[] {
  const dtos = data as LeaderboardItemDTO[];
  return (dtos || []).map((d) => ({
    userId: d.user_id,
    username: d.username,
    totalCredits: d.total_credits,
  }));
}

export function transformCreateCommand(cmd: CreateCreditRequestCommand): Record<string, unknown> {
  return {
    title: cmd.title,
    description: cmd.description,
    credits_value: cmd.creditsValue,
    user_helped_id: cmd.userHelpedId,
    helpers: cmd.helpers,
  };
}

export function transformUpdateCommand(cmd: UpdateCreditRequestCommand): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  if (cmd.title !== undefined) result.title = cmd.title;
  if (cmd.description !== undefined) result.description = cmd.description;
  if (cmd.creditsValue !== undefined) result.credits_value = cmd.creditsValue;
  if (cmd.userHelpedId !== undefined) result.userHelpedId = cmd.userHelpedId;
  if (cmd.helpers !== undefined) result.helpers = cmd.helpers;
  return result;
}

export function transformReviewCommand(cmd: ReviewCreditRequestCommand): Record<string, unknown> {
  const result: Record<string, unknown> = { status: cmd.status };
  if (cmd.creditsValue !== undefined) result.credits_value = cmd.creditsValue;
  if (cmd.helpers !== undefined) result.helpers = cmd.helpers;
  return result;
}
