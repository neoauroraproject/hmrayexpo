import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { NoteVisibility, UserStatus } from "@hmray/database";
import { PaginationQueryDto } from "../../../common/dto/pagination.dto";

export class CreateCustomerNoteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body: string;

  @IsOptional()
  @IsEnum(NoteVisibility)
  visibility?: NoteVisibility;
}

export class ListCustomersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;
}
