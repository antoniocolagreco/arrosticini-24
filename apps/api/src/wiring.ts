import {
  catalogRouter,
  DynamoDbProductRepository,
  GetProduct,
  ListProducts,
} from "@arrosticini/catalog";
import type { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

export interface Tables {
  catalog: string;
}

export function createRouter(dynamo: DynamoDBDocumentClient, tables: Tables) {
  const products = new DynamoDbProductRepository(dynamo, tables.catalog);
  return {
    catalog: catalogRouter({
      listProducts: new ListProducts(products),
      getProduct: new GetProduct(products),
    }),
  };
}

export type ApiRouter = ReturnType<typeof createRouter>;
