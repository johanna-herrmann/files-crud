# CRUDFS

REST file storage with CRUD based permissions on directory-level. \
Written in Typescript

## Description
* Stores files and directories, using REST calls
* Supported storages:
  * local file-system
  * S3 Bucket
* Supported authentication/authorization:
  * built-in, username-password-auth, using scrypt
  * cognito
* Application can be run:
  * via nodejs on-prem
  * in-cloud via AWS (must use S3 and cognito)
* Uses CRUD-based permissions on directory level

## Features
* create, move, copy, delete, rename directories
* create, change, copy, move, delete, rename files
* crud-based permissions can be set via configuration
* users can be mapped to directories, setting owner-specific permissions
* registration for new users can be open, restricted or disabled

## Permissions
There are four rights in four levels.

### The four levels
* admins: permissions for admins
* owner: permissions for the owner of the directory or file that is been accessed
* users: permissions for users (if not the owner)
* public: permissions for unauthorized access

The permissions are specified by providing the letter for each enabled right, for each level, separating the levels with commata. \
Example: `crud,crd,r,` (the public level is empty, so public access is disabled completely) \
See also: [Config](#config)

### The four rights
The rights are representing the four parts of `CRUD` (`C`reate, `R`ead, `U`pdate, `D`elete).
The follwing list explains the meaning of each right
* `C`: Create &minus; Allowed to create files and directories
* `R`: Read &minus; Allowed to list files and directories and to read file content
* `U`: Update &minus; Allowed to rename files and directories and to change file content
* `D`: Delete &minus; Allowed to delete files and directories

## Config
Configuration is done via
* on-prem: A `config.json` file in the application directory (outside of the storage-root), read-in while application startup
* cloud: A `config.json` file in deployment directory, stored as cloud-environment-variables while deployment

Following configurations are supported:
* dir_permissions: per-directory definition of permissions
  * Example:
    ```json
    {
      "/peter/restricted": "crud,crd,r,",
      "/example2/sub": "crud,cr,,"
    }
    ```
* create_user_dir: boolean determining if user should be mapped to a directory (will be created automatically)
* user_dir_name_base: defines the base value for the user directory name (`username` (`sub` is used for OAuth) or `user_id`)
* user_dir_permissions: determines the permissions for the user dir
* inherit_permissions: boolean determining if permissions are inherited when not set via `user_dir_permissions` or `dir_permissions`
* fallback_permissions: defines the permissions for directories where no permissions are set otherwise
* register: determines if and how users can be added/created
  possible:
  * any: each person can register themself
  * token: token is required to register, specified via `tokens` configuration property (value is just the scrypt-hash of the token)
  * none: only admins can add users
* tokens: list of register tokens (scrypt hash (`salt`:`hash`) of the token itself)
  * example:
    ```json
    [
      "0d61f8370cad1d412f80b84d143e1257:8c2574892063f995fdf756bce07f46c1a5193e54cd52837ed91e32008ccf41ac",
      "4c614360da93c0a041b22e537de151eb:3f39d5c348e5b79d06e842c114e6cc571583bbf44e4b0ebfda1a01ec05745d43"
    ]
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
