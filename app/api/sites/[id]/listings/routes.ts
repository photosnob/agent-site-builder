import { ListingInput, collectionRoutes } from "@/lib/collections";

export const routes = collectionRoutes({ table: "site_listings", create: ListingInput, imageFields: ["photos"], textFields: ["description","address"], pages: ["buy","sell"] });
