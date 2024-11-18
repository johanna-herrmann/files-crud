import { Client, QueryResultRow } from 'pg';
import PgDbConf from '@/types/PgDbConf';

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

const writingQuery = async function (client: Client | null, query: string, values?: (string | number | boolean)[]) {
  await client?.query(query, values);
};

const readingQuery = async function <T extends QueryResultRow>(client: Client | null, query: string, values?: (string | number | boolean)[]) {
  return await client?.query<T>(query, values);
};

export { getNewClient, connect, end, definingQuery, writingQuery, readingQuery };
