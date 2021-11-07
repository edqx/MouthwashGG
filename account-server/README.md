# Mouthwash Account Server
An account server to provide a REST API to interface with Mouthwash accounts, handling everything from:
* In-Game logins
* Signups
* Sessions
* Storing Match Data
* Caching game settings

And also features a private API solely for internal use; allowing you to access private information or upload data to the database such as uploading match data.

Requires a postgres database hosted somewhere, check out the `schema.sql` file for a schema to use with the account server.

I personally run it locally for development with Docker, using [the official image](https://hub.docker.com/_/postgres/).

### Environment Variables
The account server will attempt to read a `.env` file from the current working directory; and will try to create one if it doesn't exist.

You _must_ have the following environment variables set for the server to function fully:

* `POSTGRES_HOST` An `IP:Port` pair locating your postgres database
* `POSTGRES_USER` The username of the postgres database
* `POSTGRES_PASSWORD` The password to use for the postgres database
* `POSTGRES_DATABASE` The name of the database where Mouthwash tables are located
- `INTERNAL_ACCESS_KEY` An access key for the Mouthwash plugin or any other programs to access private endpoints.