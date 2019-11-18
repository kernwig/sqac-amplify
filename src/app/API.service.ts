/* tslint:disable */
//  This file was automatically generated and should not be edited.
import { Injectable } from "@angular/core";
import API, { graphqlOperation } from "@aws-amplify/api";
import { GraphQLResult } from "@aws-amplify/api/lib/types";
import * as Observable from "zen-observable";

export type ModelCollectionFilterInput = {
  id?: ModelIDFilterInput | null;
  created?: ModelStringFilterInput | null;
  modified?: ModelStringFilterInput | null;
  revision?: ModelIntFilterInput | null;
  name?: ModelStringFilterInput | null;
  author?: ModelStringFilterInput | null;
  authorUserId?: ModelStringFilterInput | null;
  description?: ModelStringFilterInput | null;
  difficulty?: ModelIntFilterInput | null;
  level?: ModelStringFilterInput | null;
  formations?: ModelIntFilterInput | null;
  families?: ModelIntFilterInput | null;
  calls?: ModelIntFilterInput | null;
  modules?: ModelIntFilterInput | null;
  license?: ModelStringFilterInput | null;
  and?: Array<ModelCollectionFilterInput | null> | null;
  or?: Array<ModelCollectionFilterInput | null> | null;
  not?: ModelCollectionFilterInput | null;
};

export type ModelIDFilterInput = {
  ne?: string | null;
  eq?: string | null;
  le?: string | null;
  lt?: string | null;
  ge?: string | null;
  gt?: string | null;
  contains?: string | null;
  notContains?: string | null;
  between?: Array<string | null> | null;
  beginsWith?: string | null;
};

export type ModelStringFilterInput = {
  ne?: string | null;
  eq?: string | null;
  le?: string | null;
  lt?: string | null;
  ge?: string | null;
  gt?: string | null;
  contains?: string | null;
  notContains?: string | null;
  between?: Array<string | null> | null;
  beginsWith?: string | null;
};

export type ModelIntFilterInput = {
  ne?: number | null;
  eq?: number | null;
  le?: number | null;
  lt?: number | null;
  ge?: number | null;
  gt?: number | null;
  contains?: number | null;
  notContains?: number | null;
  between?: Array<number | null> | null;
};

export type GetCollectionQuery = {
  __typename: "Collection";
  id: string;
  created: string;
  modified: string;
  revision: number;
  name: string;
  author: string;
  authorUserId: string;
  description: string;
  difficulty: number;
  level: string;
  formations: number | null;
  families: number | null;
  calls: number | null;
  modules: number;
  license: string;
};

export type ListCollectionsQuery = {
  __typename: "ModelCollectionConnection";
  items: Array<{
    __typename: "Collection";
    id: string;
    created: string;
    modified: string;
    revision: number;
    name: string;
    author: string;
    authorUserId: string;
    description: string;
    difficulty: number;
    level: string;
    formations: number | null;
    families: number | null;
    calls: number | null;
    modules: number;
    license: string;
  } | null> | null;
  nextToken: string | null;
};

@Injectable({
  providedIn: "root"
})
export class APIService {
  async GetCollection(id: string): Promise<GetCollectionQuery> {
    const statement = `query GetCollection($id: ID!) {
        getCollection(id: $id) {
          __typename
          id
          created
          modified
          revision
          name
          author
          authorUserId
          description
          difficulty
          level
          formations
          families
          calls
          modules
          license
        }
      }`;
    const gqlAPIServiceArguments: any = {
      id
    };
    const response = (await API.graphql(
      graphqlOperation(statement, gqlAPIServiceArguments)
    )) as any;
    return <GetCollectionQuery>response.data.getCollection;
  }
  async ListCollections(
    filter?: ModelCollectionFilterInput,
    limit?: number,
    nextToken?: string
  ): Promise<ListCollectionsQuery> {
    const statement = `query ListCollections($filter: ModelCollectionFilterInput, $limit: Int, $nextToken: String) {
        listCollections(filter: $filter, limit: $limit, nextToken: $nextToken) {
          __typename
          items {
            __typename
            id
            created
            modified
            revision
            name
            author
            authorUserId
            description
            difficulty
            level
            formations
            families
            calls
            modules
            license
          }
          nextToken
        }
      }`;
    const gqlAPIServiceArguments: any = {};
    if (filter) {
      gqlAPIServiceArguments.filter = filter;
    }
    if (limit) {
      gqlAPIServiceArguments.limit = limit;
    }
    if (nextToken) {
      gqlAPIServiceArguments.nextToken = nextToken;
    }
    const response = (await API.graphql(
      graphqlOperation(statement, gqlAPIServiceArguments)
    )) as any;
    return <ListCollectionsQuery>response.data.listCollections;
  }
}
