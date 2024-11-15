# files-crud

REST file storage with CRUD based permissions on section-level. \
Written in Typescript

## Description
* Stores files, using REST calls (CRUD)
* Supported storages:
  * local file-system
  * S3 Bucket (and s3-compatible storages)
* Supported Databases (for user accounts)
  * mongoDB
  * !TBD!
* Uses CRUD-based permissions, specified for different sections

## Features
* create, override, read, delete files
* crud-based permissions can be set for different sections via configuration
* user-secific permissions
* different types of users (`normal`, `admin`)
* optional public-access (access without login)
* registration for new users can be open, restricted or disabled

## Permissions
There are four rights: `CREATE`, `READ`, `UPDATE` and `DELETE`

The follwing list explains the meaning of each right
* `CREATE` &minus; The right to upload new files
* `READ` &minus; The right to retrieve the content of files and list files in section
* `UPDATE` &minus; The right to re-upload files, overwriting existing files
* `DELETE` &minus; The right to remove files

## Config
Configuration is done via `config.json` file in the application directory (outside of the storage-root), read-in during application startup.

### Properties
* `sections` &minus; defines sections and their permissions
* `use_user_sections` &minus; boolean determining if each user has a section, named with their user-id
* `user_permissions` &minus; determines the permissions, user's have on their section
* `default_permissions` &minus; defines the permissions for sections where permissions aren't set otherwise
* `register` &minus; determines if and how users can be added/created (`all`, `admin` or `token`)
* `tokens` &minus; list of register tokens

### Defaults
* `sections` &minus; empty
* `use_user_sections` &minus; `true`
* `user_permissions` &minus; All
* `default_permissions` &minus; All for admins, read-only for users, none for public-access
* `register` &minus; `admin`
* `tokens` &minus; empty

### Example
```json
{
  "sections": {
    "all_users": {
      "admin": ["create", "read", "update", "delete"],
      "users": ["read"],
      "public": []
    },
    "public": {
      "admin": ["create", "read", "update", "delete"],
      "users": ["read"],
      "public": ["read"]
    }
  },
  "use_user_sections": true,
  "user_permissions": ["create", "read", "update", "delete"],
  "default_permissions": {
    "admin": ["create", "read", "update", "delete"],
    "users": [],
    "public": []
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
