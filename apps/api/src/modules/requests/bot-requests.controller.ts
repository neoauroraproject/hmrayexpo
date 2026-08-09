import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { BotSecretGuard } from "../../common/guards/bot-secret.guard";
import { RequestsService } from "./requests.service";
import {
  AddRequestItemDto,
  BotActorBodyDto,
  BotActorQueryDto,
  CreateBotRequestDto,
} from "./dto/request.dto";

@Controller("bot/requests")
@UseGuards(BotSecretGuard)
export class BotRequestsController {
  constructor(private readonly requests: RequestsService) {}

  @Post()
  create(@Body() dto: CreateBotRequestDto) {
    return this.requests.createForBot(dto);
  }

  @Get("mine")
  mine(@Query() query: BotActorQueryDto) {
    return this.requests.listForBot(query.telegramUserId, query.page, query.pageSize);
  }

  @Post(":id/items")
  addItem(@Param("id") id: string, @Body() dto: AddRequestItemDto) {
    return this.requests.addItem(id, dto);
  }

  @Delete(":id/items/:itemId")
  removeItem(
    @Param("id") id: string,
    @Param("itemId") itemId: string,
    @Query() query: BotActorQueryDto,
  ) {
    return this.requests.removeItem(id, itemId, query.telegramUserId);
  }

  @Post(":id/finalize")
  finalize(@Param("id") id: string, @Body() dto: BotActorBodyDto) {
    return this.requests.finalize(id, dto.telegramUserId);
  }
}
