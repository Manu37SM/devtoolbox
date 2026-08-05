import { Module } from "@nestjs/common";
import { SnippetsController } from "./snippets.controller";
import { SnippetsService } from "./snippets.service";

/** Saved code/text snippets, optionally public — API.md §6. */
@Module({
  controllers: [SnippetsController],
  providers: [SnippetsService],
})
export class SnippetsModule {}
