export interface IRequestOptions {
    hostname?: string,
    port?: number,
    path?: string,
    method?: string,
    headers: {
        'Authorization': string,
        'Accept'?: string,
        'Content-Type'?: string
    }
}