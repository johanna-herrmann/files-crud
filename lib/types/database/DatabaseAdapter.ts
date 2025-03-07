import DbItem from '@/types/database/DbItem';
import DbValue from '@/types/database/DbValue';

/**
 * DatabaseAdapter is used to abstract database operations away from the business logic.
 */
interface DatabaseAdapter {
  /**
   * Opens the database connection.
   */
  open(): Promise<void>;

  /**
   * Closes the database connection.
   */
  close(): Promise<void>;

  /**
   * Creates a new table/collection.
   * Some Adapters may use the first property's key of item as key field (example: dynamoDB).
   * @param table The name of the table.
   * @param item Dummy Item to derive the fields from.
   *             Example: Provide dummy user item, so fields of user can be derived.
   *             The table/collection will be created if it not exists already.
   * @param key The name of the key for dynamodb
   */
  init<T extends DbItem>(table: string, item: T, key: string): Promise<void>;

  /**
   * Adds a new item to the database.
   * @param table The name of the table.
   * @param item The item to add.
   */
  add<T extends DbItem>(table: string, item: T): Promise<void>;

  /**
   * Updates an item in the database.
   * @param table The name of the table.
   * @param filterKey The name of the key to filter for.
   * @param filterValue The value to filter for.
   * @param update All props and values for the update
   */
  update(table: string, filterKey: string, filterValue: string, update: Record<string, DbValue>): Promise<void>;

  /**
   * Finds one item in the database.
   * @param table The name of the table.
   * @param filterKey The name of the key to filter for.
   * @param filterValue The value to filter for.
   * @returns Promise fulfilling with the item or with null if item does not exist.
   */
  findOne<T extends DbItem>(table: string, filterKey: string, filterValue: string): Promise<T | null>;

  /**
   * Finds all items in the database.
   * @param table The name of the table.
   * @returns Promise fulfilling with an array with the items.
   */
  findAll<T extends DbItem>(table: string): Promise<T[]>;

  /**
   * Checks if an item exists in the database.
   * @param table The name of the table.
   * @param filterKey The name of the key to filter for.
   * @param filterValue The value to filter for.
   * @returns Promise fulfilling with a boolean, true and only true, if the item exists.
   */
  exists(table: string, filterKey: string, filterValue: string): Promise<boolean>;

  /**
   * Deletes an item in the database.
   * @param table The name of the table.
   * @param filterKey The name of the key to filter for.
   * @param filterValue The value to filter for.
   */
  delete(table: string, filterKey: string, filterValue: string): Promise<void>;
}

export default DatabaseAdapter;
