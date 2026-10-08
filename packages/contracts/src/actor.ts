import { z } from "zod";
import { IdDto } from "./common.js";
import { Role } from "./identity.js";

export const ACTOR_HEADER = "x-actor";

export const ActorDto = z.object({
  userId: IdDto,
  role: Role,
});

export type ActorDto = z.infer<typeof ActorDto>;
