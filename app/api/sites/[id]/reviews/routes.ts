import { ReviewInput, collectionRoutes } from "@/lib/collections";

export const routes = collectionRoutes({ table: "testimonials", create: ReviewInput, imageFields: [], textFields: ["quote","context"], pages: ["success-stories"] });
