export interface AccountServerConfig {
    postgres: {
        host: string;
        port: number;
        username: string;
        password: string;
        database: string;
    };
    port: number;
}