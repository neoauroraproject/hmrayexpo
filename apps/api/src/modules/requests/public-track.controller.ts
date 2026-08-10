import { Controller, Get, Param } from "@nestjs/common";
import { RequestsService } from "./requests.service";

@Controller("public/track")
export class PublicTrackController {
  constructor(private readonly requests: RequestsService) {}

  @Get(":code")
  track(@Param("code") code: string) {
    return this.requests.getPublicTrack(code);
  }
}
