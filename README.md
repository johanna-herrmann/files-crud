# CRUDFS

REST file storage with CRUD based permissions on directory-level. \
Written in Typescript

## Description
* Stores files, using REST calls (CRUD)
* Supported storages:
  * local file-system
  * S3 Bucket
* Supported authentication/authorization:
  * built-in, username-password-auth, using scrypt
  * cognito
* Application can be run:
  * via nodejs on-prem
  * in-cloud via AWS (must use S3 and cognito)
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
* `READ` &minus; The right to retrieve the content of files
* `UPDATE` &minus; The right to re-upload files, overwriting existing files
* `DELETE` &minus; The right to remove files

## Config
Configuration is done via
* on-prem: A `config.json` file in the application directory (outside of the storage-root), read-in while application startup
* cloud: A `config.json` file in deployment directory, stored as cloud-environment-variables while deployment

Permissions are specified, building "words" of the respective letters `c`, `r`, `u` and `d` for the given rights. \
Examples:
* `'crud'`: for full permission
* `'r'`: for read-only permission
* `'crd'` or `'cr'`: useful to force `write-once, read-many` systems
* `''` (empty): no permission

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
* `user_permissions` &minus; `crud`
* `default_permissions` &minus; `crud` for admins, `r` for users, none for public-access
* `register` &minus; `admin`
* `tokens` &minus; empty

### Example
```json
{
  "sections": {
    "all_users": {
      "admin": "crud",
      "users": "r",
      "public": ""
    },
    "public": {
      "admin": "crud",
      "users": "r",
      "public": "r"
    }
  },
  "use_user_sections": true,
  "user_permissions": "crud",
  "default_permissions": {
    "admin": "crud",
    "users": "",
    "public": ""
  },
  "register": "token",
  "register_token": "8470b83a-b9bd-4054-b8ec-59cb57e855bd"
}
```

## Hosting
First decide, if you want to run a nodejs application or if you want to run an AWS Stack. \
If you want to run in Cloud, just run the deployment script `aws-deploy.sh` and follow the instructions. \
If you want to run nodejs locally (on a server; on-prem), just run the deployment script `prem-deploy.sh` and follow the instructions.

On prem you will be asked:
* Use local file system (you will be asked for the directory) or use S3 Bucket (you will be asked for Bucket and credentials)
* Use built-in-auth (username-password-auth via scrypt) or use Cognito-OAuth

## Social Authentication Providers
Social Authentication Providers like Google, Facebook, etc. will be supported in future releases.

## License
This product is licensed via a [MIT License](./LICENSE.md)
