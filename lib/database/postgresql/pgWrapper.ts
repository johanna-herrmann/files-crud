import { Client, QueryResult } from 'pg';
import { PgDbConf } from '@/types/database/PgDbConf';
import { DbItem } from '@/types/database/DbItem';
import { PgDbValue } from '@/types/database/PgDbValue';

const getNewClient = function (conf: PgDbConf) {
  return new Client(conf);
};

const connect = async function (client?: Client | null) {
  await client?.connect();
};

const end = async function (client: Client | null) {
  await client?.end();
};

const definingQuery = async function (client: Client | null, query: string) {
  await client?.query(query);
};

const writingQuery = async function (client: Client | null, query: string, values?: PgDbValue[]) {
  await client?.query(query, values);
};

const readingQuery = async function <T extends DbItem>(
  client: Client | null,
  query: string,
  values?: PgDbValue[]
): Promise<QueryResult<T> | undefined> {
  return await client?.query<T>(query, values);
};

export { getNewClient, connect, end, definingQuery, writingQuery, readingQuery };
