import { TeamInput, collectionRoutes } from "@/lib/collections";

export const routes = collectionRoutes({ table: "team_members", create: TeamInput, imageFields: ["photo"], textFields: ["bio","title"], pages: ["team"] });
