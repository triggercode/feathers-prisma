import { NotFound } from '@feathersjs/errors';
import { OPERATORS_MAP } from './constants';
import { EagerQuery, IdField, QueryParam, QueryParamRecordFilters } from './types';

export const castToNumberBooleanStringOrNull = (value: string | boolean | number) => {
  const asNumber = Number(value);
  const isNumber = !Number.isNaN(asNumber);
  const isBoolean = value === 'true' || value === 'false';
  if (isBoolean || typeof value === 'boolean') {
    return typeof value === 'string' ? value === 'true' : value;
  }
  if (isNumber) {
    return asNumber;
  }
  if (value === 'null') {
    return null;
  }
  return value;
};

export const castFeathersQueryToPrismaFilters = (p: QueryParamRecordFilters, whitelist: string[]) => {
  const filters: Record<string, any> = {};
  Object.keys(p).forEach((k: string) => {
    const key = (k as keyof typeof OPERATORS_MAP);
    const prismaKey = OPERATORS_MAP[key];
    if (prismaKey && key !== '$eager' && whitelist.includes(key)) {
      const value = p[key];
      if (Array.isArray(value)) {
        filters[prismaKey] = value.map((v) => castToNumberBooleanStringOrNull(v));
      } else if (key === '$rawWhere' && typeof value === 'object') {
        Object.keys(value).forEach((rawKey) => {
          filters[rawKey] = value[rawKey];
        });
      } else if (value !== undefined && typeof value !== 'object') {
        filters[prismaKey] = castToNumberBooleanStringOrNull(value);
      }
    }
  });
  return filters;
};

export const castEagerQueryToPrismaInclude = (value: EagerQuery, whitelist: string[], idField: string) => {
  // we don't care about feathers compliance, we want where queries in our include
  // thus just returnung the $eager value as include 1:1
  return value;
  // const include: Record<string, any> = {};
  // if (Array.isArray(value)) {
  //   value.forEach((v) => {
  //     if (Array.isArray(v) && typeof v[0] === 'string' && v.length > 1) {
  //       const [key, ...includes] = v;
  //       const subinclude = castEagerQueryToPrismaInclude(includes, whitelist, idField);
  //       include[key] = {
  //         include: subinclude,
  //       };
  //     } else if (Array.isArray(v) && typeof v[0] === 'string' && v.length === 1) {
  //       const [key] = v;
  //       include[key] = true;
  //     } else if (typeof v[0] !== 'string') {
  //       throw {
  //         code: 'FP1001',
  //         message: 'First Array Item in a sub-array must be a string!',
  //       };
  //     } else if (typeof v === 'string') {
  //       include[v] = true;
  //     }
  //   });
  // } else {
  //   Object.keys(value).forEach((key) => {
  //     const val = value[key];
  //     if (typeof val === 'boolean') {
  //       include[key] = val;
  //     } else if (Array.isArray(val)) {
  //       include[key] = {
  //         select: {
  //           [idField]: true,
  //           ...buildSelect(val),
  //         },
  //       };
  //     }
  //   });
  // }

  // return include;
};

export const mergeFiltersWithSameKey = (
  where: Record<string, any>,
  key: string,
  filter: Record<string, any> | string | number | boolean | null,
): Record<string, any> | string | number | boolean => {
  const current = where[key];
  if (typeof filter === 'object') {
    const currentIsObj = typeof current === 'object';
    return {
      ...(currentIsObj ? current : {}),
      ...filter,
      ...(!currentIsObj && current ? { equals: current } : {})
    };
  }
  return filter;
};

/**
 * WARN: This method is not safe for Feathers queries because unwanted queries can reach the Prisma-Client.
 **/
export const buildIdField = (value: IdField, whitelist: string[]) => {
  if (value !== null && typeof value === 'object') {
    const filters = castFeathersQueryToPrismaFilters(value, whitelist);
    const filterKeys = Object.keys(OPERATORS_MAP);
    filterKeys.forEach((key) => {
      key in value && delete value[key];
    });

    return {
      ...value,
      ...filters,
    };
  }
  return value;
};

export const buildWhereAndInclude = (query: QueryParam, whitelist: string[], idField: string) => {
  const where: Record<string, any> = {};
  let include: Record<string, any> = {};
  Object.keys(query).forEach((k: string | '$or' | '$and') => {
    const value: any = query[k];
    if (k === idField) {
      where[k] = mergeFiltersWithSameKey(where, k, buildIdField(value, whitelist));
    } if (k === '$or' && Array.isArray(value)) {
      where.OR = value.map((v) => buildWhereAndInclude(v, whitelist, idField).where);
    } else if (k === '$and' && Array.isArray(value)) {
      value.forEach((v) => {
        const whereValue = buildWhereAndInclude(v, whitelist, idField).where;
        Object.keys(whereValue).map((subKey) => {
          where[subKey] = mergeFiltersWithSameKey(where, subKey, whereValue[subKey]);
        });
      });
    } else if (k !== '$eager' && typeof value === 'object' && !Array.isArray(value)) {
      where[k] = mergeFiltersWithSameKey(where, k, castFeathersQueryToPrismaFilters(value, whitelist));
    } else if (k !== '$eager' && typeof value !== 'object' && !Array.isArray(value)) {
      where[k] = castToNumberBooleanStringOrNull(value);
    } else if (k === '$eager' && whitelist.includes(k)) {
      const eager = value as EagerQuery;
      include = castEagerQueryToPrismaInclude(eager, whitelist, idField);
    }
  });
  return { where, include };
};

export const buildSelect = ($select: string[]) => {
  const select: Record<string, boolean> = {};
  $select.forEach((f: string) => { select[f] = true; });
  return select;
};

export const buildOrderBy = ($sort: Record<string, any>) => {
  return Object.keys($sort).map((k) => ({ [k]: $sort[k] === 1 ? 'asc' : 'desc' }));
};

export const buildPagination = ($skip: number, $limit: number) => {
  return {
    skip: $skip || 0,
    take: $limit,
  };
};

export const hasIdObject = (where: Record<string, any>, id?: IdField) =>
  id && !where.id && id !== null && typeof id === 'object';


export const buildPrismaQueryParams = (
  { id, query, filters, whitelist }: {
    id?: IdField,
    query: Record<string, any>,
    filters: Record<string, any>,
    whitelist: string[],
  },
  idField: string,
) => {
  let select = buildSelect(filters.$select || []);
  const selectExists = Object.keys(select).length > 0;
  const { where, include } = buildWhereAndInclude(id ? { [idField]: id, ...query } : query, whitelist, idField);
  const includeExists = Object.keys(include).length > 0;
  const orderBy = buildOrderBy(filters.$sort || {});
  const { skip, take } = buildPagination(filters.$skip, filters.$limit);

  if (selectExists) {
    select = {
      [idField]: true,
      ...select,
      ...include,
    };

    return {
      skip,
      take,
      orderBy,
      where: where,
      select,
    };
  }

  if (!selectExists && includeExists) {
    return {
      skip,
      take,
      orderBy,
      where: where,
      include
    };
  }

  return {
    skip,
    take,
    orderBy,
    where: where
  };
};

export const buildSelectOrInclude = (
  { select, include }: { select?: Record<string, boolean>; include?: Record<string, any> },
) => {
  return select ? { select } : include ? { include } : {};
};

export const checkIdInQuery = (id: IdField | null, query: Record<string, any>, idField: string) => {
  if (id && query[idField] && id !== query[idField]) {
    throw new NotFound(`No record found for ${idField} '${id}' and query.${idField} '${id}'`);
  }
};

