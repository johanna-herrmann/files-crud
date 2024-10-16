# CRUDFS

REST file storage with CRUD based permissions on directory-level. \
Written in Typescript

## Description
* stores files and directories, using CRUD
* can be stored on:
  * local file-system
  * S3 Bucket
* can be authenticated:
  * built-in, username-password-auth using scrypt
  * via cognito
* can be run:
  * via nodejs on-prem
  * in-cloud via AWS (must use S3 and cognito)

## Features
* create, move, copy, delete, rename directories
* create, change, copy, move, delete, rename files
* admins can set permissions (crud-based) on directories (on creation or later)
* users can be mapped to directories, setting owner-specific permissions
* configurations, if and how users can be registered

## Permissions
* permissions will be determined by files called ".directory"
* there are 5 levels of permissions, separated by comma, in one single-line, each level specified by using the set letters of crud
  * internal: permissions of the backend it-self (no api usage)
  * admins: permissions for admins via api calls
  * owner: permissions for the owner of the directory via api calls (on this level the dash is used, if the directory has no owner)
  * users: permissions for users via api calls
  * all: all via api-calls (public access)
* The .directory file determines the owner and the permissions for each level
  ('-' if no owner is specified, meaning, every user is the owner, hence owner-level equals users-level)
* examples:
  * peter:crud,crud,cr,r, (peter is owner, internal and admins full access, owner create and read access, other users read-only, no public access)
  * -:crud,crd,r,r, (internal full access, admins worm-access, directory has no owner (read-only), users read-only, no public access)

## Config
Configuration is done via `config.json` file (no api access). Following configurations are supported:

* permissions: directory-level-permissions (will be set, when the directory will be created)
* create_user_dir: boolean determining if user directory should be created when user is created
* default_user_dir_permissions: determines the default permissions for the user dir, set on creation
* register: determines if and how users can be added/created
  possible:
  * any: each person can register themself
  * token: token is required to register
    tokens must be saved manually or by admins using the tokens directory, each token is a file while the filename is the scrypt-hash of the token
  * personal_token: token is required to register
    - tokens must be saved manually or by admins using the tokens directory, each token is a file while the filename is the scrypt-hash of the token
	- the file content is the username (sub for Oauth) which will be used
  * none: only admins can add users

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
