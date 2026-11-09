export type CaseStatus = 'UPCOMING' | 'IN_SESSION' | 'VERDICT_ANNOUNCED' | 'DISMISSED';

export interface CourtCase {
	id: string;
	accuser: string;
	defendant: string;
	reason: string;
	verdict: string;
	status: CaseStatus;
	is_active: boolean;
	display_order: number;
	created_at: string;
	updated_at: string;
}

export type CreateCaseInput = {
	accuser: string;
	defendant: string;
	reason: string;
	verdict?: string;
	status?: CaseStatus;
};

export type UpdateCaseInput = Partial<CreateCaseInput> & {
	is_active?: boolean;
	display_order?: number;
};
