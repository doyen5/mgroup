import { IsArray, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateWorkflowRequestDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  eventId?: string;
}

export class AddWorkflowBudgetDto {
  @IsInt()
  @Min(0)
  budgetAmountFcfa: number;

  @IsOptional()
  @IsString()
  budgetNotes?: string;
}

export class AssignWorkflowPeopleDto {
  @IsArray()
  assignees: Array<{
    userId: string;
    roleNote?: string;
  }>;
}

export class WorkflowDecisionDto {
  @IsOptional()
  @IsString()
  note?: string;
}
