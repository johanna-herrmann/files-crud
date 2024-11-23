# files-crud

REST file storage with CRUD based permissions on directory-level. \
Written in Typescript

## Description
* Stores files, using REST calls (CRUD)
* Supported storages:
  * local file-system
  * S3 Bucket (and s3-compatible storages)
* Supported Databases (for user accounts)
  * mongoDB
  * postgresql
  * in-memory (for testing purposes)
* Uses CRUD-based permissions, specified for different directories

## Features
* create, override, read, delete files
* crud-based permissions can be set for different directories via configuration
* user-secific permissions
* different types of users (`normal`, `admin`)
* optional public-access (access without login)
* registration for new users can be open, restricted or disabled

## Directories

### Simple
You don't have to create or delete directories. Just upload a file with a path or remove it. Directories will exist 'virtually'.

### Permissions
You as `crud-files` manager can specify permissions on directory-level, via `config.json`.
You also can define file permissions for the file owner/uploader (none if admin or public).

### User's directory
You as `crud-files` manager can specify, which permissions users will have on their directories (named like their so-called `owner-id`).

Example: There is an user with an ownerId `simsala` and you defined read-only for users, but full-access for the user's directory.
Then the user will have full-access on `simsala/`, but other users only can read files in there.

## Permissions
There are four rights: `CREATE`, `READ`, `UPDATE` and `DELETE`

The follwing list explains the meaning of each right
* `CREATE` &minus; The right to upload new files
* `READ` &minus; The right to retrieve the content of files and list files in directory
* `UPDATE` &minus; The right to re-upload files, overwriting existing files
* `DELETE` &minus; The right to remove files

Permissions are given for:
* `public` &minus; Permissions for calls without login (default: `none`)
* `user` &minus; Permissions for normal users (default: `read-only`)
* `admin` &minus; Permissions for admins (default: `full access`)
* `owner` &minus; Depends on the directory
  * In the user's directory permissions definition: The permissions if the logged-in user acceses their directory
  * In any other definition of directory permissions: The permissions for files, created by the logged-in user

## Config
Configuration is done via `config.json` file in the application directory (outside of the storage-root), read-in during application startup.

### Properties
* `directories` &minus; defines permissions for directories
* `user_dir_permissions` &minus; determines the permissions, user's have on their directory (`$ownerId/`)
* `default_permissions` &minus; defines the permissions for sections where permissions aren't set otherwise
* `register` &minus; determines if and how users can be added/created (`all`, `admin` or `token`)
* `tokens` &minus; list of register tokens

### Defaults
* `directories` &minus; empty
* `user_dir_permissions` &minus; All for the owner and admin, none for other users and public
* `default_permissions` &minus; All for admins, read-only for users, none for public-access
* `register` &minus; `admin`
* `tokens` &minus; empty

### Example
```json
{
  "directories": {
    "all_users": {
      "admin": ["create", "read", "update", "delete"],
      "users": ["read"]
    },
    "public": {
      "admin": ["create", "read", "update", "delete"],
      "users": ["read"],
      "public": ["read"]
    },
    "bin": {
      "admin": ["create", "read", "update", "delete"],
      "owner": ["create", "read", "update", "delete"],
      "users": ["read"]
    }
  },
  "user_dir_permissions": {
    "admin": ["create", "read", "update", "delete"],
    "owner": ["create", "read", "update", "delete"],
    "users": ["read"]
  },
  "default_permissions": {
    "admin": ["create", "read", "update", "delete"],
    "users": []
  },
  "register": "token",
  "register_token": "8470b83a-b9bd-4054-b8ec-59cb57e855bd"
}
```

## Hosting
!TBD!

## Social Authentication Providers
Social Authentication Providers like Google, Facebook, etc. may be supported in future releases.

## License
This product is licensed via a [MIT License](./LICENSE.md)
