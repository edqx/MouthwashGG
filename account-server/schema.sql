CREATE TABLE "users"(
    "client_id" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "display_name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMP(0) WITHOUT TIME ZONE NOT NULL,
    "banned_until" TIMESTAMP(0) WITHOUT TIME ZONE NULL,
    "muted_until" TIMESTAMP(0) WITHOUT TIME ZONE NULL,
    "game_settings" JSON NOT NULL
);
ALTER TABLE
    "users" ADD PRIMARY KEY("client_id");
ALTER TABLE
    "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");
ALTER TABLE
    "users" ADD CONSTRAINT "users_display_name_unique" UNIQUE("display_name");
CREATE TABLE "sessions"(
    "client_id" VARCHAR(255) NOT NULL,
    "client_token" VARCHAR(255) NOT NULL,
    "ip" VARCHAR(255) NOT NULL
);
CREATE INDEX "sessions_client_id_index" ON
    "sessions"("client_id");
ALTER TABLE
    "sessions" ADD PRIMARY KEY("client_token");
CREATE INDEX "sessions_ip_index" ON
    "sessions"("ip");
ALTER TABLE
    "sessions" ADD CONSTRAINT "sessions_client_id_foreign" FOREIGN KEY("client_id") REFERENCES "users"("client_id");
