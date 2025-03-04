import { Prisma } from '@prisma/client';
export interface Models {
}
export declare type IdField = string | number | {
    [key: string]: any;
};
export declare type Paginate = {
    default?: number;
    max?: number;
};
export interface PrismaServiceOptions {
    model: Uncapitalize<Prisma.ModelName>;
    events?: string[];
    multi?: boolean | string[];
    id?: string;
    paginate?: Paginate;
    whitelist?: string[];
    filters?: string[];
}
export declare type EagerQuery = (string | string[] | string[][])[] | Record<string, boolean | string[]>;
export interface QueryParamRecordFilters {
    $in?: (string | boolean | number)[];
    $nin?: (string | boolean | number)[];
    $lt?: string | number;
    $lte?: string | number;
    $gt?: string | number;
    $gte?: string | number;
    $ne?: string | boolean | number;
    $eager?: EagerQuery;
    $rawWhere?: Record<string, any>;
    $contains?: string;
    $search?: string;
    $startsWith?: string;
    $endsWith?: string;
    $mode?: string;
}
export declare type QueryParamRecord = string | boolean | number;
export declare type QueryParamRecordsOr = Record<string, QueryParamRecord | QueryParamRecordFilters>[];
export declare type QueryParam = {
    [key: string]: string | boolean | number | QueryParamRecordFilters | QueryParamRecordsOr;
};
export interface FeathersQueryData {
    id?: IdField;
    query: Record<string, any>;
    filters: Record<string, any>;
    whitelist: string[];
}
