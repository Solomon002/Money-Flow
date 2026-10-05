import { apiRequest } from "./client.js";

export type Category = {
  id: string;
  name: string;
  kind: "income" | "expense";
  is_default: boolean;
  is_active: boolean;
};

export async function getCategories() {
  return apiRequest("/api/categories", {
    method: "GET",
  });
}